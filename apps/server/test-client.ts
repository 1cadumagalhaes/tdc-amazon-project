#!/usr/bin/env bun

// Simple test client to verify server functionality
const WS_URL = 'ws://localhost:8080/ws'

class TestClient {
  private ws: WebSocket | null = null
  private username: string
  private myMark: 'X' | 'O' | null = null

  constructor(username: string) {
    this.username = username
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL)
      
      this.ws.onopen = () => {
        console.log(`[${this.username}] Connected`)
        resolve()
      }
      
      this.ws.onerror = (error) => {
        console.error(`[${this.username}] Error:`, error)
        reject(error)
      }
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log(`[${this.username}] Received:`, data)
        
        // Auto-play logic for testing
        if (data.type === 'match_found') {
          this.myMark = data.yourMark
          console.log(`[${this.username}] Match found! Playing as ${data.yourMark} vs ${data.opponent}`)
        }
        
        if (data.type === 'state_update' && data.currentPlayer === this.myMark) {
          // Make a random move after a short delay
          setTimeout(() => {
            const emptyCells = data.board
              .map((cell: any, index: number) => cell === null ? index : -1)
              .filter((index: number) => index !== -1)
            
            if (emptyCells.length > 0) {
              const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
              this.makeMove(randomCell)
            }
          }, 500 + Math.random() * 1000) // Random delay 0.5-1.5s
        }
        
        if (data.type === 'game_result') {
          console.log(`[${this.username}] Game ended:`, data.result)
          this.myMark = null
          // Will automatically rejoin queue when server puts us back
        }

        if (data.type === 'lobby_update') {
          console.log(`[${this.username}] Lobby: ${data.playersInQueue} in queue, ${data.activeMatches} active matches`)
        }

        if (data.type === 'error') {
          console.error(`[${this.username}] Server error:`, data.message)
        }
      }
      
      this.ws.onclose = () => {
        console.log(`[${this.username}] Disconnected`)
      }
    })
  }

  joinQueue() {
    if (!this.ws) return
    
    this.ws.send(JSON.stringify({
      type: 'join_queue',
      username: this.username
    }))
    console.log(`[${this.username}] Joined queue`)
  }

  makeMove(cellIndex: number) {
    if (!this.ws) return
    
    this.ws.send(JSON.stringify({
      type: 'make_move',
      cellIndex
    }))
    console.log(`[${this.username}] Made move at cell ${cellIndex}`)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Test scenario: Two clients join and play
async function runTest() {
  console.log('🧪 Starting server test...')
  
  const client1 = new TestClient('Alice')
  const client2 = new TestClient('Bob')
  
  try {
    // Connect both clients
    await client1.connect()
    await client2.connect()
    
    // Join queue
    client1.joinQueue()
    await new Promise(resolve => setTimeout(resolve, 100))
    client2.joinQueue()
    
    // Let them play for a bit
    console.log('⏳ Letting clients play for 15 seconds...')
    await new Promise(resolve => setTimeout(resolve, 15000))
    
    // Disconnect
    client1.disconnect()
    client2.disconnect()
    
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  process.exit(0)
}

// Run if called directly
if (import.meta.main) {
  runTest()
}
