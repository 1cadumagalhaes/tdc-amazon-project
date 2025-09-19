import type { ServerWebSocket } from 'bun'
import type { GameState, Player, PlayerScore } from '@ttt-99/core'
import { initGame, initRematch, createPlayerScore, updatePlayerScore } from '@ttt-99/core'

export interface Session {
  id: string
  username: string
  ws: ServerWebSocket<unknown>
  lastSeen: number
  score: PlayerScore
}

export interface Match {
  id: string
  playerX: Session
  playerO: Session
  gameState: GameState
  createdAt: number
  baseTimeMs: number
  isRematch: boolean
  rematchCount: number
  readyPlayers: Set<string> // Track who is ready
}

export class MatchmakingService {
  private sessions = new Map<string, Session>()
  private queue: Session[] = []
  private matches = new Map<string, Match>()

  createSession(username: string, ws: ServerWebSocket<unknown>, sessionToken?: string): Session {
    // If sessionToken provided, try to reconnect to existing session
    if (sessionToken) {
      const existingSession = this.sessions.get(sessionToken)
      if (existingSession && existingSession.username === username) {
        // Update WebSocket connection for existing session
        existingSession.ws = ws
        existingSession.lastSeen = Date.now()
        console.log(`Reconnected session for ${username}`)
        return existingSession
      }
    }

    // Check if username is already taken by a different session
    for (const session of this.sessions.values()) {
      if (session.username === username && (!sessionToken || session.id !== sessionToken)) {
        throw new Error('Username already taken')
      }
    }

    const session: Session = {
      id: sessionToken || crypto.randomUUID(),
      username,
      ws,
      lastSeen: Date.now(),
      score: createPlayerScore(username)
    }

    this.sessions.set(session.id, session)
    return session
  }

  joinQueue(session: Session) {
    // Remove from queue if already there
    this.queue = this.queue.filter(s => s.id !== session.id)
    
    // Add to queue
    this.queue.push(session)
    session.lastSeen = Date.now()

    // Try to make a match
    this.tryMakeMatch()
  }

  private tryMakeMatch() {
    if (this.queue.length < 2) return

    const playerX = this.queue.shift()!
    const playerO = this.queue.shift()!

    // Start with 30s base time for new matches
    const baseTimeMs = 30000
    const gameState = initGame('X', baseTimeMs)
    
    const match: Match = {
      id: crypto.randomUUID(),
      playerX,
      playerO,
      gameState,
      createdAt: Date.now(),
      baseTimeMs,
      isRematch: false,
      rematchCount: 0,
      readyPlayers: new Set() // Initialize empty ready set
    }

    this.matches.set(match.id, match)

    console.log(`[${new Date().toISOString()}] Match created: ${playerX.username} vs ${playerO.username} (ID: ${match.id})`)

    // Notify players
    playerX.ws.send(JSON.stringify({
      type: 'match_found',
      opponent: playerO.username,
      yourMark: 'X',
      baseTimeMs
    }))

    playerO.ws.send(JSON.stringify({
      type: 'match_found',
      opponent: playerX.username,
      yourMark: 'O',
      baseTimeMs
    }))

    // Send initial state
    this.broadcastGameState(match)
  }

  handleGameEnd(match: Match) {
    const result = match.gameState.result
    if (result.type === 'ongoing') return

    // Update player scores
    match.playerX.score = updatePlayerScore(
      match.playerX.score,
      result,
      'X',
      match.gameState.clock,
      match.baseTimeMs
    )

    match.playerO.score = updatePlayerScore(
      match.playerO.score,
      result,
      'O',
      match.gameState.clock,
      match.baseTimeMs
    )

    if (result.type === 'draw') {
      // Handle rematch for draws
      this.handleRematch(match)
    } else {
      // Win or timeout - winner advances, loser eliminated
      const winner = result.type === 'win' ? 
        (result.winner === 'X' ? match.playerX : match.playerO) :
        (result.winner === 'X' ? match.playerX : match.playerO)

      // Add winner back to queue after delay
      setTimeout(() => {
        this.joinQueue(winner)
        this.broadcastLobbyUpdate()
      }, 2000)

      this.cleanupMatch(match.id)
    }
  }

  private handleRematch(match: Match) {
    // Create rematch with reduced time and alternating first player
    const previousFirstPlayer = match.rematchCount % 2 === 0 ? 'X' : 'O'
    const newGameState = initRematch(
      match.baseTimeMs,
      previousFirstPlayer,
      Date.now()
    )

    const newMatch: Match = {
      ...match,
      id: crypto.randomUUID(),
      gameState: newGameState,
      baseTimeMs: newGameState.clock.baseTimeMs,
      isRematch: true,
      rematchCount: match.rematchCount + 1,
      createdAt: Date.now()
    }

    // Remove old match and add new one
    this.matches.delete(match.id)
    this.matches.set(newMatch.id, newMatch)

    // Notify players of rematch
    match.playerX.ws.send(JSON.stringify({
      type: 'rematch_started',
      baseTimeMs: newMatch.baseTimeMs,
      rematchCount: newMatch.rematchCount
    }))

    match.playerO.ws.send(JSON.stringify({
      type: 'rematch_started',
      baseTimeMs: newMatch.baseTimeMs,
      rematchCount: newMatch.rematchCount
    }))

    // Broadcast new game state
    this.broadcastGameState(newMatch)
  }

  findMatchBySession(session: Session): Match | undefined {
    for (const match of this.matches.values()) {
      if (match.playerX.id === session.id || match.playerO.id === session.id) {
        return match
      }
    }
    return undefined
  }

  getPlayerMark(match: Match, session: Session): Player | null {
    if (match.playerX.id === session.id) return 'X'
    if (match.playerO.id === session.id) return 'O'
    return null
  }

  broadcastGameState(match: Match) {
    const stateUpdate = {
      type: 'state_update',
      board: match.gameState.board,
      currentPlayer: match.gameState.currentPlayer,
      turnCounter: match.gameState.turnCounter,
      clock: {
        playerX: {
          remainingMs: match.gameState.clock.playerX.remainingMs
        },
        playerO: {
          remainingMs: match.gameState.clock.playerO.remainingMs
        }
      },
      baseTimeMs: match.baseTimeMs,
      isRematch: match.isRematch,
      rematchCount: match.rematchCount
    }

    match.playerX.ws.send(JSON.stringify(stateUpdate))
    match.playerO.ws.send(JSON.stringify(stateUpdate))
  }

  broadcastLobbyUpdate() {
    const update = {
      type: 'lobby_update',
      playersInQueue: this.queue.length,
      activeMatches: this.matches.size
    }

    const message = JSON.stringify(update)
    for (const session of this.sessions.values()) {
      session.ws.send(message)
    }
  }

  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Remove from queue
    this.queue = this.queue.filter(s => s.id !== sessionId)

    // Handle active match
    const match = this.findMatchBySession(session)
    if (match) {
      const opponent = match.playerX.id === sessionId ? match.playerO : match.playerX
      const winner = match.playerX.id === sessionId ? 'O' : 'X'

      // Update scores for disconnect
      session.score.losses += 1
      session.score.isEliminated = true
      opponent.score.wins += 1

      // Notify opponent of win by disconnect
      opponent.ws.send(JSON.stringify({
        type: 'game_result',
        result: { type: 'timeout', winner }
      }))

      // Add winner back to queue
      setTimeout(() => {
        this.joinQueue(opponent)
        this.broadcastLobbyUpdate()
      }, 2000)

      this.matches.delete(match.id)
    }

    this.sessions.delete(sessionId)
    this.broadcastLobbyUpdate()
  }

  cleanupMatch(matchId: string) {
    this.matches.delete(matchId)
    this.broadcastLobbyUpdate()
  }

  getLeaderboard(): PlayerScore[] {
    return Array.from(this.sessions.values())
      .map(s => s.score)
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  findMatchBySession(session: Session): Match | undefined {
    for (const match of this.matches.values()) {
      if (match.playerX.username === session.username || match.playerO.username === session.username) {
        return match
      }
    }
    return undefined
  }

  getPlayerMark(match: Match, session: Session): 'X' | 'O' | null {
    if (match.playerX.username === session.username) return 'X'
    if (match.playerO.username === session.username) return 'O'
    return null
  }

  getStats() {
    return {
      playersInQueue: this.queue.length,
      activeMatches: this.matches.size,
      totalSessions: this.sessions.size,
      leaderboard: [], // TODO: Implement leaderboard
    }
  }

  getSessionByToken(sessionToken: string): Session | undefined {
    return this.sessions.get(sessionToken)
  }

  getActiveMatchCount(): number {
    return this.matches.size
  }

  getQueueSize(): number {
    return this.queue.length
  }

  findMatchByPlayer(username: string): Match | undefined {
    for (const match of this.matches.values()) {
      if (match.playerX.username === username || match.playerO.username === username) {
        return match
      }
    }
    return undefined
  }

  getStats() {
    return {
      playersInQueue: this.queue.length,
      activeMatches: this.matches.size,
      totalSessions: this.sessions.size,
      leaderboard: this.getLeaderboard().slice(0, 10) // Top 10
    }
  }
}
