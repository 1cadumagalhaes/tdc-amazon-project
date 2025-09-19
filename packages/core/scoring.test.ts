import { describe, it, expect } from 'bun:test'
import { calculateScore, createPlayerScore, updatePlayerScore } from './scoring.js'
import type { ClockState } from './types.js'

describe('Scoring System', () => {
  it('should calculate basic scores correctly', () => {
    expect(calculateScore(3, 2, 1)).toEqual({
      baseScore: 4, // 3 wins + 1 draw
      speedBonus: 0.1, // 1 speed bonus
      totalScore: 4.1
    })

    expect(calculateScore(5, 0, 0)).toEqual({
      baseScore: 5,
      speedBonus: 0,
      totalScore: 5
    })
  })

  it('should create initial player score', () => {
    const score = createPlayerScore('Alice')
    
    expect(score.username).toBe('Alice')
    expect(score.wins).toBe(0)
    expect(score.draws).toBe(0)
    expect(score.losses).toBe(0)
    expect(score.totalScore).toBe(0)
    expect(score.speedBonuses).toBe(0)
    expect(score.isEliminated).toBe(false)
  })

  it('should update score for wins', () => {
    let score = createPlayerScore('Alice')
    
    const clock: ClockState = {
      baseTimeMs: 30000,
      incrementMs: 0,
      playerX: { remainingMs: 20000 }, // Used 10s out of 30s (33% used, 67% remaining)
      playerO: { remainingMs: 25000 }
    }

    // Win with speed bonus (>50% time remaining)
    score = updatePlayerScore(
      score,
      { type: 'win', winner: 'X' },
      'X',
      clock,
      30000
    )

    expect(score.wins).toBe(1)
    expect(score.speedBonuses).toBe(1)
    expect(score.totalScore).toBe(1.1) // 1 win + 0.1 speed bonus
    expect(score.isEliminated).toBe(false)
  })

  it('should update score for wins without speed bonus', () => {
    let score = createPlayerScore('Bob')
    
    const clock: ClockState = {
      baseTimeMs: 30000,
      incrementMs: 0,
      playerX: { remainingMs: 5000 }, // Used 25s out of 30s (83% used, 17% remaining)
      playerO: { remainingMs: 25000 }
    }

    // Win without speed bonus (<50% time remaining)
    score = updatePlayerScore(
      score,
      { type: 'win', winner: 'X' },
      'X',
      clock,
      30000
    )

    expect(score.wins).toBe(1)
    expect(score.speedBonuses).toBe(0)
    expect(score.totalScore).toBe(1) // 1 win, no speed bonus
  })

  it('should update score for draws', () => {
    let score = createPlayerScore('Charlie')
    
    const clock: ClockState = {
      baseTimeMs: 5000,
      incrementMs: 1000,
      playerX: { remainingMs: 3000 },
      playerO: { remainingMs: 2000 }
    }

    score = updatePlayerScore(
      score,
      { type: 'draw' },
      'X',
      clock,
      5000
    )

    expect(score.draws).toBe(1)
    expect(score.totalScore).toBe(0.5) // 0.5 for draw
    expect(score.isEliminated).toBe(false)
  })

  it('should update score for losses', () => {
    let score = createPlayerScore('Dave')
    
    const clock: ClockState = {
      baseTimeMs: 30000,
      incrementMs: 0,
      playerX: { remainingMs: 15000 },
      playerO: { remainingMs: 20000 }
    }

    score = updatePlayerScore(
      score,
      { type: 'win', winner: 'O' },
      'X',
      clock,
      30000
    )

    expect(score.losses).toBe(1)
    expect(score.totalScore).toBe(0)
    expect(score.isEliminated).toBe(true)
  })

  it('should handle timeout wins and losses', () => {
    let winnerScore = createPlayerScore('Winner')
    let loserScore = createPlayerScore('Loser')
    
    const clock: ClockState = {
      baseTimeMs: 10000,
      incrementMs: 1000,
      playerX: { remainingMs: 0 }, // Timed out
      playerO: { remainingMs: 5000 }
    }

    // Winner (O) gets win, no speed bonus for timeout
    winnerScore = updatePlayerScore(
      winnerScore,
      { type: 'timeout', winner: 'O' },
      'O',
      clock,
      10000
    )

    // Loser (X) gets loss and elimination
    loserScore = updatePlayerScore(
      loserScore,
      { type: 'timeout', winner: 'O' },
      'X',
      clock,
      10000
    )

    expect(winnerScore.wins).toBe(1)
    expect(winnerScore.speedBonuses).toBe(0) // No speed bonus for timeout wins
    expect(winnerScore.totalScore).toBe(1)
    expect(winnerScore.isEliminated).toBe(false)

    expect(loserScore.losses).toBe(1)
    expect(loserScore.totalScore).toBe(0)
    expect(loserScore.isEliminated).toBe(true)
  })
})
