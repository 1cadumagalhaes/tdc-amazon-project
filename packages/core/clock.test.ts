import { describe, it, expect } from 'bun:test'
import { initGame, applyMove } from './engine.js'
import { nextBaseTime, initRematch } from './rematch.js'

describe('Clock Logic', () => {
  it('should add increment when base time is 5s or less', () => {
    const game = initGame('X', 5000, 1000) // 5s base time
    
    expect(game.clock.incrementMs).toBe(1000) // Should have 1s increment
    expect(game.clock.baseTimeMs).toBe(5000)
  })

  it('should not add increment when base time is more than 5s', () => {
    const game = initGame('X', 30000, 1000) // 30s base time
    
    expect(game.clock.incrementMs).toBe(0) // No increment
    expect(game.clock.baseTimeMs).toBe(30000)
  })

  it('should detect flag fall (timeout)', () => {
    const game = initGame('X', 1000, 1000) // 1s base time
    
    // X takes too long (2 seconds)
    const result = applyMove(game, {
      cellIndex: 4,
      player: 'X',
      timestamp: 3000 // 2s elapsed
    })

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return

    expect(result.result.type).toBe('timeout')
    if (result.result.type === 'timeout') {
      expect(result.result.winner).toBe('O') // X timed out, O wins
    }
  })

  it('should apply increment after move when base <= 5s', () => {
    let game = initGame('X', 3000, 1000) // 3s base, should have increment
    
    expect(game.clock.incrementMs).toBe(1000)
    
    // X makes a move taking 500ms
    const result = applyMove(game, {
      cellIndex: 4,
      player: 'X',
      timestamp: 1500
    })

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return

    // X should have: 3000 - 500 + 1000 = 3500ms remaining
    expect(result.clock.playerX.remainingMs).toBe(3500)
  })
})

describe('Rematch Logic', () => {
  it('should reduce base time by 5s each rematch', () => {
    expect(nextBaseTime(30000)).toBe(25000)
    expect(nextBaseTime(10000)).toBe(5000)
    expect(nextBaseTime(5000)).toBe(1000) // Minimum 1s
    expect(nextBaseTime(1000)).toBe(1000) // Can't go below 1s
  })

  it('should alternate first player on rematch', () => {
    const firstGame = initGame('X', 30000, 1000)
    const rematch = initRematch(30000, 'X', 2000)
    
    expect(rematch.currentPlayer).toBe('O') // Should alternate
    expect(rematch.clock.baseTimeMs).toBe(25000) // Should reduce time
    expect(rematch.startedAt).toBe(2000)
  })

  it('should add increment when rematch reaches 5s or less', () => {
    // Start with 10s, rematch should be 5s with increment
    const rematch = initRematch(10000, 'X', 1000)
    
    expect(rematch.clock.baseTimeMs).toBe(5000)
    expect(rematch.clock.incrementMs).toBe(1000) // Should now have increment
  })
})
