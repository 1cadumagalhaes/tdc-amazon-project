import { Elysia, t } from 'elysia'
import { openapi } from '@elysiajs/openapi'
import { cors } from '@elysiajs/cors'
import { applyMove } from '@ttt-99/core'
import { MatchmakingService } from './matchmaking.js'
import { ClientMessageSchema } from './schemas.js'

const serverStartTime = Date.now()
const matchmaking = new MatchmakingService()

const app = new Elysia()
  .use(cors())
  .use(openapi({
    documentation: {
      info: {
        title: 'TTT-99 API',
        version: '1.0.0',
        description: 'Tic-Tac-Toe Royale tournament server API'
      },
      tags: [
        { name: 'Tournament', description: 'Tournament status and leaderboard' },
        { name: 'Health', description: 'Server health and status' }
      ]
    }
  }))
  .get('/', () => 'TTT-99 Server', {
    detail: {
      tags: ['Health'],
      summary: 'Server info',
      description: 'Basic server information'
    }
  })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }), {
    detail: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Server health status with timestamp'
    },
    response: t.Object({
      status: t.String(),
      timestamp: t.Number()
    })
  })
  .get('/status', () => {
    const stats = matchmaking.getStats()
    return {
      ...stats,
      serverUptime: Date.now() - serverStartTime,
      timestamp: new Date().toISOString()
    }
  }, {
    detail: {
      tags: ['Tournament'],
      summary: 'Tournament status',
      description: 'Current tournament statistics including queue, matches, and top players'
    },
    response: t.Object({
      playersInQueue: t.Number(),
      activeMatches: t.Number(),
      totalSessions: t.Number(),
      leaderboard: t.Array(t.Object({
        username: t.String(),
        wins: t.Number(),
        draws: t.Number(),
        losses: t.Number(),
        totalScore: t.Number(),
        speedBonuses: t.Number(),
        isEliminated: t.Boolean()
      }))
    })
  })
  .get('/leaderboard', () => ({ leaderboard: matchmaking.getLeaderboard() }), {
    detail: {
      tags: ['Tournament'],
      summary: 'Full leaderboard',
      description: 'Complete player leaderboard sorted by score'
    },
    response: t.Object({
      leaderboard: t.Array(t.Object({
        username: t.String(),
        wins: t.Number(),
        draws: t.Number(),
        losses: t.Number(),
        totalScore: t.Number(),
        speedBonuses: t.Number(),
        isEliminated: t.Boolean()
      }))
    })
  })
  .ws('/ws', {
    message(ws, message) {
      try {
        // Parse message
        let data
        if (typeof message === 'string') {
          data = JSON.parse(message)
        } else {
          data = message
        }

        // Validate with schema
        const parsed = ClientMessageSchema.parse(data)

        // Get session - check both ws.session and sessionToken from message
        let session = (ws as any).session
        if (!session && parsed.sessionToken) {
          // Try to find session by token
          session = matchmaking.getSessionByToken(parsed.sessionToken)
          if (session) {
            // Update WebSocket connection for this session
            session.ws = ws
            ;(ws as any).session = session
            console.log(`Session restored from token for ${session.username}`)
          }
        }

        if (!session && parsed.type !== 'join_queue') {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Must join queue first'
          }))
          return
        }

        switch (parsed.type) {
          case 'join_queue':
            console.log(`[${new Date().toISOString()}] ${parsed.username} joining queue (token: ${parsed.sessionToken ? 'existing' : 'new'})`)
            try {
              const newSession = matchmaking.createSession(parsed.username, ws, parsed.sessionToken)
              ;(ws as any).session = newSession

              // Only join queue if not already in a match
              const existingMatch = matchmaking.findMatchByPlayer(newSession.username)
              if (!existingMatch) {
                matchmaking.joinQueue(newSession)
                console.log(`[${new Date().toISOString()}] ${parsed.username} added to queue (size: ${matchmaking.getQueueSize()})`)
              } else {
                console.log(`[${new Date().toISOString()}] ${parsed.username} reconnected to existing match`)
              }

              // Send lobby update with session token
              ws.send(JSON.stringify({
                type: 'lobby_update',
                playersInQueue: matchmaking.getQueueSize(),
                activeMatches: matchmaking.getActiveMatchCount(),
                sessionToken: newSession.id
              }))

              matchmaking.broadcastLobbyUpdate()
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to join queue'
              }))
            }
            break

          case 'make_move':
            console.log(`[${new Date().toISOString()}] ${session.username} attempting move at cell ${parsed.cellIndex}`)
            const match = matchmaking.findMatchBySession(session)
            if (!match) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not in a match'
              }))
              return
            }

            const playerMark = matchmaking.getPlayerMark(match, session)
            if (!playerMark) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid player'
              }))
              return
            }

            const moveResult = applyMove(match.gameState, {
              cellIndex: parsed.cellIndex,
              player: playerMark,
              timestamp: Date.now()
            })

            if ('error' in moveResult) {
              ws.send(JSON.stringify({
                type: 'error',
                message: moveResult.error
              }))
              return
            }

            // Update match state
            match.gameState = moveResult
            matchmaking.broadcastGameState(match)

            // Check if game ended
            if (moveResult.result.type !== 'ongoing') {
              // Broadcast result
              const resultMessage = {
                type: 'game_result',
                result: moveResult.result
              }
              match.playerX.ws.send(JSON.stringify(resultMessage))
              match.playerO.ws.send(JSON.stringify(resultMessage))

              // Handle game end (scoring, rematch, or elimination)
              matchmaking.handleGameEnd(match)
            }
            break

          case 'resign':
            const resignMatch = matchmaking.findMatchBySession(session)
            if (resignMatch) {
              const opponent = resignMatch.playerX.id === session.id ? resignMatch.playerO : resignMatch.playerX
              const winner = resignMatch.playerX.id === session.id ? 'O' : 'X'

              opponent.ws.send(JSON.stringify({
                type: 'game_result',
                result: { type: 'win', winner }
              }))

              setTimeout(() => {
                matchmaking.joinQueue(opponent)
                matchmaking.broadcastLobbyUpdate()
              }, 1000)

              matchmaking.cleanupMatch(resignMatch.id)
            }
            break
        }
      } catch (error) {
        console.error('Message handling error:', error)
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }))
      }
    },

    open(ws) {
      console.log(`[${new Date().toISOString()}] WebSocket connected`)
    },

    close(ws) {
      const session = (ws as any).session
      if (session) {
        matchmaking.removeSession(session.id)
      }
      console.log('WebSocket disconnected')
    }
  })
  .listen(8080)

console.log(`🚀 Server running at http://localhost:8080`)
