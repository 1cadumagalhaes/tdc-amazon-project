import type { PlayerScore, ScoreCalculation, GameResult, ClockState, Player } from './types.js'

export function calculateScore(wins: number, draws: number, speedBonuses: number): ScoreCalculation {
  const baseScore = wins + (draws * 0.5)
  const speedBonus = speedBonuses * 0.1
  const totalScore = baseScore + speedBonus
  
  return {
    baseScore,
    speedBonus,
    totalScore
  }
}

export function createPlayerScore(username: string): PlayerScore {
  return {
    username,
    wins: 0,
    draws: 0,
    losses: 0,
    totalScore: 0,
    speedBonuses: 0,
    isEliminated: false
  }
}

export function updatePlayerScore(
  score: PlayerScore,
  result: GameResult,
  playerMark: Player,
  clock: ClockState,
  baseTimeMs: number
): PlayerScore {
  const newScore = { ...score }
  
  if (result.type === 'win') {
    if (result.winner === playerMark) {
      // Player won
      newScore.wins += 1
      
      // Check for speed bonus (>50% time remaining)
      const playerClock = clock[`player${playerMark}`]
      const timeUsedPercent = (baseTimeMs - playerClock.remainingMs) / baseTimeMs
      if (timeUsedPercent < 0.5) {
        newScore.speedBonuses += 1
      }
    } else {
      // Player lost
      newScore.losses += 1
      newScore.isEliminated = true
    }
  } else if (result.type === 'draw') {
    // Both players get draw points
    newScore.draws += 1
  } else if (result.type === 'timeout') {
    if (result.winner === playerMark) {
      // Player won by opponent timeout
      newScore.wins += 1
      // No speed bonus for timeout wins
    } else {
      // Player lost by timeout
      newScore.losses += 1
      newScore.isEliminated = true
    }
  }
  
  // Recalculate total score
  const calculation = calculateScore(newScore.wins, newScore.draws, newScore.speedBonuses)
  newScore.totalScore = calculation.totalScore
  
  return newScore
}
