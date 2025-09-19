import { z } from 'zod'

// Client -> Server messages
export const JoinQueueSchema = z.object({
  type: z.literal('join_queue'),
  username: z.string().min(1).max(16).regex(/^[a-zA-Z0-9]+$/),
  sessionToken: z.string().optional()
})

export const MakeMoveSchema = z.object({
  type: z.literal('make_move'),
  cellIndex: z.number().int().min(0).max(8),
  sessionToken: z.string().optional()
})

export const ResignSchema = z.object({
  type: z.literal('resign'),
  sessionToken: z.string().optional()
})

export const ReadySchema = z.object({
  type: z.literal('ready'),
  sessionToken: z.string().optional()
})

export const ClientMessageSchema = z.discriminatedUnion('type', [
  JoinQueueSchema,
  MakeMoveSchema,
  ResignSchema,
  ReadySchema
])

// Server -> Client events
export const LobbyUpdateSchema = z.object({
  type: z.literal('lobby_update'),
  playersInQueue: z.number(),
  activeMatches: z.number(),
  sessionToken: z.string().optional()
})

export const MatchFoundSchema = z.object({
  type: z.literal('match_found'),
  opponent: z.string(),
  yourMark: z.enum(['X', 'O']),
  baseTimeMs: z.number()
})

export const StateUpdateSchema = z.object({
  type: z.literal('state_update'),
  board: z.array(z.enum(['X', 'O']).nullable()).length(9),
  currentPlayer: z.enum(['X', 'O']),
  turnCounter: z.number(),
  clock: z.object({
    playerX: z.object({
      remainingMs: z.number()
    }),
    playerO: z.object({
      remainingMs: z.number()
    })
  })
})

export const GameResultSchema = z.object({
  type: z.literal('game_result'),
  result: z.discriminatedUnion('type', [
    z.object({ type: z.literal('win'), winner: z.enum(['X', 'O']) }),
    z.object({ type: z.literal('draw') }),
    z.object({ type: z.literal('timeout'), winner: z.enum(['X', 'O']) })
  ])
})

export const ErrorSchema = z.object({
  type: z.literal('error'),
  message: z.string()
})

export const RematchStartedSchema = z.object({
  type: z.literal('rematch_started'),
  baseTimeMs: z.number(),
  rematchCount: z.number()
})

export const MatchReadySchema = z.object({
  type: z.literal('match_ready'),
  opponent: z.string(),
  yourMark: z.enum(['X', 'O']),
  baseTimeMs: z.number(),
  waitingForReady: z.boolean()
})

export const ServerEventSchema = z.discriminatedUnion('type', [
  LobbyUpdateSchema,
  MatchFoundSchema,
  MatchReadySchema,
  StateUpdateSchema,
  GameResultSchema,
  RematchStartedSchema,
  ErrorSchema
])

export type ClientMessage = z.infer<typeof ClientMessageSchema>
export type ServerEvent = z.infer<typeof ServerEventSchema>
