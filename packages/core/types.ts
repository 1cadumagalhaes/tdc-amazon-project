export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell]

export type GameResult = 
  | { type: 'win'; winner: Player }
  | { type: 'draw' }
  | { type: 'ongoing' }
  | { type: 'timeout'; winner: Player }

export interface ClockState {
  baseTimeMs: number
  incrementMs: number
  playerX: {
    remainingMs: number
    lastMoveAt?: number
  }
  playerO: {
    remainingMs: number
    lastMoveAt?: number
  }
}

export interface GameState {
  board: Board
  currentPlayer: Player
  turnCounter: number
  result: GameResult
  clock: ClockState
  startedAt: number
}

export interface Move {
  cellIndex: number // 0-8
  player: Player
  timestamp: number
}

export interface PlayerScore {
  username: string
  wins: number
  draws: number
  losses: number
  totalScore: number
  speedBonuses: number
  isEliminated: boolean
}

export interface ScoreCalculation {
  baseScore: number // wins + (draws * 0.5)
  speedBonus: number // 0.1 per speed win
  totalScore: number
}
