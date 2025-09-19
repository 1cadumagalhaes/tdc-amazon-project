// Player Component
class PlayerComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.data = {
            username: '',
            score: 0,
            timeMs: 30000,
            mark: null,
            isActive: false,
            isEliminated: false
        };
        this.timerInterval = null;
        this.lastUpdateTime = null;
        this.onFlagFall = null; // Callback for when timer hits 0
    }

    update(playerData) {
        // Stop existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.data = { ...this.data, ...playerData };
        this.lastUpdateTime = Date.now();
        
        // Start timer if player is active AND not eliminated
        if (this.data.isActive && this.data.timeMs > 0 && !this.data.isEliminated) {
            this.startTimer();
        }
        
        this.render();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.data.isActive && this.data.timeMs > 0) {
                this.data.timeMs = Math.max(0, this.data.timeMs - 100);
                this.render();
                
                // Flag fall
                if (this.data.timeMs === 0) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                    
                    if (this.onFlagFall) {
                        this.onFlagFall(this.data.mark);
                    }
                }
            }
        }, 100); // Update every 100ms for smooth countdown
    }

    render() {
        const timeSeconds = (this.data.timeMs / 1000).toFixed(1);
        const isLowTime = this.data.timeMs < 10000; // Less than 10s
        const isCriticalTime = this.data.timeMs < 3000; // Less than 3s
        
        this.container.innerHTML = `
            <div class="text-center ${this.data.isEliminated ? 'opacity-50' : ''}">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="badge badge-primary text-lg font-bold">${this.data.score}</div>
                    <div class="text-lg font-semibold ${this.data.isActive ? 'text-primary' : ''}">${this.data.username}</div>
                </div>
                <div class="text-2xl font-mono ${
                    isCriticalTime ? 'text-error animate-bounce' : 
                    isLowTime ? 'text-warning animate-pulse' : ''
                } ${this.data.isActive ? 'text-primary' : ''}">
                    ${timeSeconds}s
                </div>
                <div class="text-sm opacity-70">Playing ${this.data.mark || '?'}</div>
            </div>
        `;
    }

    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}

// Game Board Component
class GameBoardComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.state = {
            board: Array(9).fill(null),
            currentPlayer: 'X',
            gameStatus: 'waiting', // waiting, selecting, playing, finished
            winner: null,
            myMark: null,
            canMove: false,
            premove: null // Store premove cell index
        };
        this.onMove = null; // Callback for moves
        this.onMarkSelect = null; // Callback for mark selection
        this.onPremove = null; // Callback for premoves
        this.onPlayAgain = null; // Callback for play again
        this.onBackToLobby = null; // Callback for back to lobby
    }

    update(gameData) {
        const wasMyTurn = this.state.currentPlayer === this.state.myMark;
        this.state = { ...this.state, ...gameData };
        
        // Check if premove should be executed
        if (this.state.premove !== null && 
            this.state.currentPlayer === this.state.myMark && 
            !wasMyTurn &&
            this.state.board[this.state.premove] === null) {
            
            // Execute premove
            const premoveCell = this.state.premove;
            this.state.premove = null;
            
            setTimeout(() => {
                if (this.onMove) {
                    this.onMove(premoveCell);
                }
            }, 100); // Small delay for visual feedback
        }
        
        this.render();
    }

    setPremove(cellIndex) {
        if (this.state.board[cellIndex] !== null) return; // Can't premove on occupied cell
        if (this.state.currentPlayer === this.state.myMark) return; // Can't premove on your turn
        
        this.state.premove = this.state.premove === cellIndex ? null : cellIndex; // Toggle
        this.render();
        
        if (this.onPremove) {
            this.onPremove(this.state.premove);
        }
    }

    render() {
        let statusHtml = '';
        
        switch (this.state.gameStatus) {
            case 'waiting':
                statusHtml = '<div class="loading loading-spinner"></div><p>Waiting for opponent...</p>';
                break;
            case 'ready':
                statusHtml = `
                    <div class="text-center">
                        <div class="text-2xl font-bold mb-4 text-success">Match Found!</div>
                        <p class="mb-4">Ready to start?</p>
                        <button id="ready-btn" class="btn btn-primary btn-lg">
                            I'm Ready!
                        </button>
                    </div>
                `;
                break;
            case 'selecting':
                statusHtml = `
                    <p class="mb-4">Choose your mark:</p>
                    <div class="flex gap-4 justify-center">
                        <button class="btn btn-primary btn-lg" onclick="gameBoard.selectMark('X')">Play as X</button>
                        <button class="btn btn-secondary btn-lg" onclick="gameBoard.selectMark('O')">Play as O</button>
                    </div>
                `;
                break;
            case 'playing':
                const isMyTurn = this.state.currentPlayer === this.state.myMark;
                const turnText = isMyTurn ? 'YOUR TURN' : 'OPPONENT\'S TURN';
                const turnColor = isMyTurn ? 'text-success' : 'text-warning';
                const premoveText = this.state.premove !== null ? ` (Premove: ${this.state.premove + 1})` : '';
                statusHtml = `
                    <div class="mb-4">
                        <div class="text-4xl sm:text-5xl font-bold ${turnColor} animate-pulse mb-2">
                            ${turnText}
                        </div>
                        <div class="text-lg opacity-70">
                            Playing as ${this.state.currentPlayer}${premoveText}
                        </div>
                    </div>
                `;
                break;
            case 'finished':
                let resultText = '';
                let resultColor = '';
                if (this.state.winner) {
                    const won = this.state.winner === this.state.myMark;
                    resultText = won ? 'YOU WON!' : 'YOU LOST!';
                    resultColor = won ? 'text-success' : 'text-error';
                } else {
                    resultText = 'DRAW!';
                    resultColor = 'text-warning';
                }
                statusHtml = `
                    <div class="text-center">
                        <div class="text-4xl font-bold ${resultColor} mb-6">${resultText}</div>
                        <button id="back-to-lobby-btn" class="btn btn-primary btn-lg">
                            Back to Lobby
                        </button>
                    </div>
                `;
                        </div>
                    </div>
                `;
                break;
        }

        this.container.innerHTML = `
            <div class="text-center mb-6">
                ${statusHtml}
            </div>
            
            <div class="max-w-xs sm:max-w-sm mx-auto mb-6 relative">
                <div class="grid grid-cols-3 gap-1 sm:gap-2 aspect-square">
                    ${this.state.board.map((cell, index) => {
                        const isPremove = this.state.premove === index;
                        const canClick = this.state.gameStatus === 'playing' && !cell;
                        const isMyTurn = this.state.currentPlayer === this.state.myMark;
                        
                        let btnClass = 'btn btn-square text-lg sm:text-2xl h-16 sm:h-20 min-h-16 sm:min-h-20';
                        if (cell) {
                            btnClass += ' btn-disabled';
                        } else if (isPremove) {
                            btnClass += ' btn-warning btn-outline animate-pulse';
                        } else if (canClick && isMyTurn) {
                            btnClass += ' btn-primary btn-outline';
                        }
                        
                        return `
                            <button 
                                class="${btnClass}" 
                                data-cell="${index}"
                                ${!canClick ? 'disabled' : ''}
                            >
                                ${cell || (isPremove ? this.state.myMark : '')}
                            </button>
                        `;
                    }).join('')}
                </div>
                
                ${this.state.gameStatus === 'finished' ? `
                    <div class="absolute inset-0 flex items-center justify-center bg-base-100/90 rounded-lg">
                        <div class="text-center">
                            <div class="text-4xl font-bold ${
                                this.state.winner ? 
                                    (this.state.winner === this.state.myMark ? 'text-success' : 'text-error') : 
                                    'text-warning'
                            } mb-2">
                                ${this.state.winner ? 
                                    (this.state.winner === this.state.myMark ? 'YOU WON!' : 'YOU LOST!') : 
                                    'DRAW!'
                                }
                            </div>
                            <div class="text-sm opacity-70">
                                ${this.state.winner ? `${this.state.winner} wins` : 'No winner'}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${this.state.gameStatus === 'playing' ? `
                <div class="text-center text-xs sm:text-sm opacity-70 mb-4 space-y-1">
                    <p>💡 Click on empty cells during opponent's turn to set premoves</p>
                    <p class="hidden sm:block">⌨️ Use keys 1-9 for moves, ESC to cancel premove</p>
                    ${this.state.premove !== null ? '<p class="text-warning">Premove set! Will play automatically when it\'s your turn.</p>' : ''}
                </div>
            ` : ''}
        `;

        // Add button event listeners
        setTimeout(() => {
            const readyBtn = document.getElementById('ready-btn');
            if (readyBtn && this.onReady) {
                readyBtn.onclick = () => this.onReady();
            }
            
            const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
            if (backToLobbyBtn) {
                backToLobbyBtn.onclick = () => {
                    window.location.href = '/lobby';
                };
            }
        }, 0);

        // Add click handlers
        this.container.querySelectorAll('[data-cell]').forEach(cell => {
            cell.addEventListener('click', () => {
                const cellIndex = parseInt(cell.dataset.cell);
                const isMyTurn = this.state.currentPlayer === this.state.myMark;
                
                if (this.state.gameStatus === 'playing' && !this.state.board[cellIndex]) {
                    if (isMyTurn && this.onMove) {
                        // Normal move
                        this.onMove(cellIndex);
                    } else if (!isMyTurn) {
                        // Premove
                        this.setPremove(cellIndex);
                    }
                }
            });
        });
    }

    selectMark(mark) {
        if (this.onMarkSelect) {
            this.onMarkSelect(mark);
        }
    }

    playAgain() {
        if (this.onPlayAgain) {
            this.onPlayAgain();
        }
    }

    backToLobby() {
        if (this.onBackToLobby) {
            this.onBackToLobby();
        }
    }
}

// Game Container Component (combines players + board)
class GameContainerComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.playerX = null;
        this.playerO = null;
        this.gameBoard = null;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <!-- Players -->
                <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
                    <div id="player-x-component" class="order-1 sm:order-none"></div>
                    <div class="text-xl sm:text-2xl font-bold order-2 sm:order-none">VS</div>
                    <div id="player-o-component" class="order-3 sm:order-none"></div>
                </div>
                
                <!-- Game Board -->
                <div id="game-board-component"></div>
                
                <!-- Actions -->
                <div class="text-center mt-6">
                    <button id="resign-btn" class="btn btn-error btn-sm sm:btn-md" disabled>Resign</button>
                </div>
            </div>
        `;

        // Initialize sub-components
        this.playerX = new PlayerComponent('player-x-component');
        this.playerO = new PlayerComponent('player-o-component');
        this.gameBoard = new GameBoardComponent('game-board-component');
    }

    updatePlayers(playerXData, playerOData) {
        // Set flag fall callbacks
        if (this.playerX && playerXData) {
            this.playerX.onFlagFall = this.onFlagFall;
            this.playerX.update(playerXData);
        }
        if (this.playerO && playerOData) {
            this.playerO.onFlagFall = this.onFlagFall;
            this.playerO.update(playerOData);
        }
    }

    updateGame(gameData) {
        this.gameBoard.update(gameData);
    }

    setCallbacks(onMove, onMarkSelect, onResign, onPremove, onFlagFall, onPlayAgain, onBackToLobby, onReady) {
        this.gameBoard.onMove = onMove;
        this.gameBoard.onMarkSelect = onMarkSelect;
        this.gameBoard.onPremove = onPremove;
        this.gameBoard.onPlayAgain = onPlayAgain;
        this.gameBoard.onBackToLobby = onBackToLobby;
        this.gameBoard.onReady = onReady;
        this.onFlagFall = onFlagFall;
        
        const resignBtn = document.getElementById('resign-btn');
        if (resignBtn && onResign) {
            resignBtn.addEventListener('click', onResign);
        }
    }
}

// Export for global use
window.PlayerComponent = PlayerComponent;
window.GameBoardComponent = GameBoardComponent;
window.GameContainerComponent = GameContainerComponent;
