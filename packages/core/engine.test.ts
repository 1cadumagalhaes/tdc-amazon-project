import { describe, it, expect } from 'bun:test'
import { initGame, applyMove, checkWinOrDraw } from './engine.js'
import type { Board } from './types.js'

describe('Game Engine - Basic Flow', () => {
  it('should initialize a new game correctly', () => {
    const game = initGame('X', 30000, 1000)
    
    expect(game.currentPlayer).toBe('X')
    expect(game.turnCounter).toBe(0)
    expect(game.result.type).toBe('ongoing')
    expect(game.board.every(cell => cell === null)).toBe(true)
    expect(game.clock.baseTimeMs).toBe(30000)
    expect(game.clock.incrementMs).toBe(0) // No increment for 30s base
  })

  it('should apply valid moves correctly', () => {
    const game = initGame('X', 30000, 1000)
    
    const result = applyMove(game, {
      cellIndex: 4, // center
      player: 'X',
      timestamp: 1500
    })

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return

    expect(result.board[4]).toBe('X')
    expect(result.currentPlayer).toBe('O')
    expect(result.turnCounter).toBe(1)
    expect(result.result.type).toBe('ongoing')
  })

  it('should reject invalid moves', () => {
    const game = initGame('X', 30000, 1000)
    
    // Wrong player
    const wrongPlayer = applyMove(game, {
      cellIndex: 0,
      player: 'O',
      timestamp: 1500
    })
    expect(wrongPlayer).toHaveProperty('error', 'Not your turn')

    // Invalid cell index
    const invalidCell = applyMove(game, {
      cellIndex: 9,
      player: 'X',
      timestamp: 1500
    })
    expect(invalidCell).toHaveProperty('error', 'Invalid cell index')
  })

  it('should reject moves on occupied cells', () => {
    let game = initGame('X', 30000, 1000)
    
    // First move
    const firstMove = applyMove(game, {
      cellIndex: 0,
      player: 'X',
      timestamp: 1500
    })
    expect(firstMove).not.toHaveProperty('error')
    if ('error' in firstMove) return
    
    // Try to play on same cell
    const secondMove = applyMove(firstMove, {
      cellIndex: 0,
      player: 'O',
      timestamp: 2000
    })
    expect(secondMove).toHaveProperty('error', 'Cell already occupied')
  })

  it('should detect horizontal wins', () => {
    const board: Board = [
      'X', 'X', 'X',
      'O', 'O', null,
      null, null, null
    ]
    
    const result = checkWinOrDraw(board)
    expect(result.type).toBe('win')
    if (result.type === 'win') {
      expect(result.winner).toBe('X')
    }
  })

  it('should detect vertical wins', () => {
    const board: Board = [
      'O', 'X', null,
      'O', 'X', null,
      'O', null, null
    ]
    
    const result = checkWinOrDraw(board)
    expect(result.type).toBe('win')
    if (result.type === 'win') {
      expect(result.winner).toBe('O')
    }
  })

  it('should detect diagonal wins', () => {
    const board: Board = [
      'X', 'O', null,
      'O', 'X', null,
      null, null, 'X'
    ]
    
    const result = checkWinOrDraw(board)
    expect(result.type).toBe('win')
    if (result.type === 'win') {
      expect(result.winner).toBe('X')
    }
  })

  it('should detect draws', () => {
    const board: Board = [
      'X', 'O', 'X',
      'O', 'O', 'X',
      'O', 'X', 'O'
    ]
    
    const result = checkWinOrDraw(board)
    expect(result.type).toBe('draw')
  })

  it('should play a complete game to win', () => {
    let game = initGame('X', 30000, 1000)
    
    // X plays center (4)
    game = applyMove(game, { cellIndex: 4, player: 'X', timestamp: 1500 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // O plays corner (0)
    game = applyMove(game, { cellIndex: 0, player: 'O', timestamp: 2000 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // X plays top-left corner (0 is taken, so top-right 2)
    game = applyMove(game, { cellIndex: 2, player: 'X', timestamp: 2500 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // O plays bottom-left (6)
    game = applyMove(game, { cellIndex: 6, player: 'O', timestamp: 3000 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // X wins with bottom-right (8) - completes anti-diagonal 2,4,6
    // Wait, that's wrong. Let me make X win with main diagonal 0,4,8
    // But 0 is taken by O. Let me try row win instead.
    
    // Actually, let's make X win the middle row: 3,4,5
    game = applyMove(game, { cellIndex: 3, player: 'X', timestamp: 3500 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // O blocks
    game = applyMove(game, { cellIndex: 1, player: 'O', timestamp: 4000 }) as any
    expect(game.result.type).toBe('ongoing')
    
    // X completes middle row with position 5
    game = applyMove(game, { cellIndex: 5, player: 'X', timestamp: 4500 }) as any
    expect(game.result.type).toBe('win')
    if (game.result.type === 'win') {
      expect(game.result.winner).toBe('X')
    }
  })
})
