// WebSocket Client for TTT-99
class TTTWebSocketClient {
    constructor(serverUrl = 'ws://localhost:8080/ws') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.isConnected = false;
        this.sessionToken = sessionStorage.getItem('ttt99-session-token');
        
        // Event handlers
        this.onConnect = null;
        this.onDisconnect = null;
        this.onMessage = null;
        this.onError = null;
    }

    connect() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('Connected to TTT-99 server');
                if (this.onConnect) this.onConnect();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Store session token if provided
                    if (data.sessionToken) {
                        this.sessionToken = data.sessionToken;
                        sessionStorage.setItem('ttt99-session-token', data.sessionToken);
                        console.log('Session token stored:', data.sessionToken);
                    }
                    
                    if (this.onMessage) this.onMessage(data);
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.log('Disconnected from server');
                if (this.onDisconnect) this.onDisconnect();
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (this.onError) this.onError(error);
            };

        } catch (error) {
            console.error('Failed to connect:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    send(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            const messageStr = JSON.stringify(message);
            console.log('Sending message:', messageStr);
            this.ws.send(messageStr);
            return true;
        } else {
            console.warn('Cannot send message: not connected');
            return false;
        }
    }

    // Game actions
    joinQueue(username) {
        const message = {
            type: 'join_queue',
            username: username
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        return this.send(message);
    }

    makeMove(cellIndex) {
        const message = {
            type: 'make_move',
            cellIndex: cellIndex
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        return this.send(message);
    }

    ready() {
        const message = {
            type: 'ready'
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        return this.send(message);
    }

    resign() {
        const message = {
            type: 'resign'
        };
        
        if (this.sessionToken) {
            message.sessionToken = this.sessionToken;
        }
        
        return this.send(message);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

// Export for global use
window.TTTWebSocketClient = TTTWebSocketClient;
