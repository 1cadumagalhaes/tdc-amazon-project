import type { GameState, Board, Player, Move, GameResult, ClockState } from './types.js'

export function initGame(
  firstPlayer: Player = 'X',
  baseTimeMs: number = 30000, // 30 seconds
  currentTime: number = Date.now()
): GameState {
  const emptyBoard: Board = [null, null, null, null, null, null, null, null, null]
  
  const clock: ClockState = {
    baseTimeMs,
    incrementMs: baseTimeMs <= 5000 ? 1000 : 0, // +1s increment when base ≤ 5s
    playerX: { remainingMs: baseTimeMs },
    playerO: { remainingMs: baseTimeMs }
  }

  return {
    board: emptyBoard,
    currentPlayer: firstPlayer,
    turnCounter: 0,
    result: { type: 'ongoing' },
    clock,
    startedAt: currentTime
  }
}

export function checkWinOrDraw(board: Board): GameResult {
  // Win patterns (rows, columns, diagonals)
  const patterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ]

  for (const [a, b, c] of patterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { type: 'win', winner: board[a] as Player }
    }
  }

  // Check for draw (board full)
  if (board.every(cell => cell !== null)) {
    return { type: 'draw' }
  }

  return { type: 'ongoing' }
}

export function applyMove(
  state: GameState,
  move: Move
): GameState | { error: string } {
  // Validate move
  if (move.player !== state.currentPlayer) {
    return { error: 'Not your turn' }
  }

  if (move.cellIndex < 0 || move.cellIndex > 8) {
    return { error: 'Invalid cell index' }
  }

  if (state.board[move.cellIndex] !== null) {
    return { error: 'Cell already occupied' }
  }

  if (state.result.type !== 'ongoing') {
    return { error: 'Game already finished' }
  }

  // Check for flag fall - calculate time used for this move
  const playerClock = state.clock[`player${move.player}`]
  const turnStartTime = playerClock.lastMoveAt || state.startedAt
  const timeUsed = move.timestamp - turnStartTime
  const newRemaining = playerClock.remainingMs - timeUsed

  if (newRemaining <= 0) {
    const winner: Player = move.player === 'X' ? 'O' : 'X'
    return {
      ...state,
      result: { type: 'timeout', winner },
      clock: {
        ...state.clock,
        [`player${move.player}`]: { 
          ...playerClock, 
          remainingMs: 0,
          lastMoveAt: move.timestamp
        }
      }
    }
  }

  // Apply move
  const newBoard = [...state.board] as Board
  newBoard[move.cellIndex] = move.player

  const result = checkWinOrDraw(newBoard)
  const nextPlayer: Player = move.player === 'X' ? 'O' : 'X'

  // Update clock with increment
  const finalRemaining = newRemaining + state.clock.incrementMs

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    turnCounter: state.turnCounter + 1,
    result,
    clock: {
      ...state.clock,
      [`player${move.player}`]: {
        remainingMs: finalRemaining,
        lastMoveAt: move.timestamp
      }
    }
  }
}
