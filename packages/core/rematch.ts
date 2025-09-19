import type { Player } from './types.js'
import { initGame } from './engine.js'

export function nextBaseTime(currentBaseMs: number): number {
  // Reduce by 5s each rematch, minimum 1s
  const newBaseMs = currentBaseMs - 5000
  return Math.max(newBaseMs, 1000)
}

export function initRematch(
  previousBaseMs: number,
  previousFirstPlayer: Player,
  currentTime: number = Date.now()
) {
  const newBaseMs = nextBaseTime(previousBaseMs)
  const newFirstPlayer: Player = previousFirstPlayer === 'X' ? 'O' : 'X'
  
  return initGame(newFirstPlayer, newBaseMs, currentTime)
}
