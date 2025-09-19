// Sound Effects for TTT-99
class SoundManager {
    constructor() {
        this.enabled = true;
        this.sounds = {};
        this.initSounds();
    }

    initSounds() {
        // Create audio contexts for different sounds
        this.sounds = {
            move: this.createBeep(800, 0.1, 'sine'),
            premove: this.createBeep(600, 0.1, 'triangle'),
            match: this.createBeep(1000, 0.3, 'square'),
            win: this.createChord([523, 659, 784], 0.5),
            lose: this.createBeep(200, 0.8, 'sawtooth'),
            draw: this.createBeep(400, 0.4, 'sine'),
            warning: this.createBeep(1200, 0.2, 'triangle'),
            tick: this.createBeep(300, 0.05, 'sine')
        };
    }

    createBeep(frequency, duration, type = 'sine') {
        return () => {
            if (!this.enabled) return;
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    createChord(frequencies, duration) {
        return () => {
            if (!this.enabled) return;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    this.createBeep(freq, duration / 2)();
                }, index * 100);
            });
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Dev Mode for testing against computer
class DevMode {
    constructor() {
        this.enabled = false;
        this.checkDevMode();
    }

    checkDevMode() {
        // Check URL params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('dev') === 'true') {
            this.enabled = true;
            sessionStorage.setItem('ttt99-dev-mode', 'true');
            console.log('🎮 Dev mode activated! Playing against computer.');
        } else if (sessionStorage.getItem('ttt99-dev-mode') === 'true') {
            this.enabled = true;
        }
    }

    isEnabled() {
        return this.enabled;
    }

    makeRandomMove(board) {
        const emptyCells = board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
        if (emptyCells.length === 0) return null;
        
        // Add slight delay for realism
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    // Simple win detection logic
    checkWin(board) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { type: 'win', winner: board[a] };
            }
        }

        // Check for draw
        if (board.every(cell => cell !== null)) {
            return { type: 'draw' };
        }

        return { type: 'ongoing' };
    }

    simulateOpponentMove(gameContainer, currentBoard, myMark) {
        if (!this.enabled) return;
        
        setTimeout(() => {
            const move = this.makeRandomMove(currentBoard);
            if (move !== null) {
                const newBoard = [...currentBoard];
                const opponentMark = myMark === 'X' ? 'O' : 'X';
                newBoard[move] = opponentMark;
                
                // Check for game end
                const result = this.checkWin(newBoard);
                
                if (result.type !== 'ongoing') {
                    // Game ended - stop all timers
                    gameContainer.updatePlayers(
                        { isActive: false },
                        { isActive: false }
                    );
                    
                    gameContainer.updateGame({
                        board: newBoard,
                        gameStatus: 'finished',
                        winner: result.winner || null
                    });

                    // Play result sound
                    if (result.type === 'win') {
                        const won = result.winner === myMark;
                        if (window.soundManager) {
                            window.soundManager.play(won ? 'win' : 'lose');
                        }
                    } else if (result.type === 'draw') {
                        if (window.soundManager) {
                            window.soundManager.play('draw');
                        }
                    }
                } else {
                    // Continue game - update global game state
                    if (window.gameState) {
                        window.gameState.board = newBoard;
                        window.gameState.currentPlayer = myMark;
                    }
                    
                    gameContainer.updateGame({
                        board: newBoard,
                        currentPlayer: myMark
                    });

                    // Update player timers (switch back to player)
                    gameContainer.updatePlayers(
                        {
                            isActive: myMark === 'X'
                        },
                        {
                            isActive: myMark === 'O'
                        }
                    );

                    // Play move sound
                    if (window.soundManager) {
                        window.soundManager.play('move');
                    }
                }
            }
        }, 500 + Math.random() * 1000); // Random delay 0.5-1.5s
    }
}

// Export for global use
window.SoundManager = SoundManager;
window.DevMode = DevMode;
