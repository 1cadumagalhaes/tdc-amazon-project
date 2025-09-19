import { describe, it, expect } from 'bun:test'
import { MatchmakingService } from './matchmaking.js'

// Mock WebSocket
const mockWS = {
  send: () => {},
  close: () => {}
} as any

describe('Matchmaking Service', () => {
  it('should create sessions with unique usernames', () => {
    const service = new MatchmakingService()
    
    const session1 = service.createSession('player1', mockWS)
    expect(session1.username).toBe('player1')
    expect(session1.id).toBeDefined()

    // Should reject duplicate username
    expect(() => {
      service.createSession('player1', mockWS)
    }).toThrow('Username already taken')
  })

  it('should track queue and match stats', () => {
    const service = new MatchmakingService()
    
    const stats = service.getStats()
    expect(stats.playersInQueue).toBe(0)
    expect(stats.activeMatches).toBe(0)
    expect(stats.totalSessions).toBe(0)
  })

  it('should add players to queue', () => {
    const service = new MatchmakingService()
    
    const session = service.createSession('player1', mockWS)
    service.joinQueue(session)
    
    const stats = service.getStats()
    expect(stats.playersInQueue).toBe(1)
    expect(stats.totalSessions).toBe(1)
  })
})
