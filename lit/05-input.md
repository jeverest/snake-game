# Input Handling

Keyboard input drives the game. Direction keys (arrows and WASD) steer the snake, while other keys control game state and camera.

## Event listeners

Three listeners are wired up: a global keydown handler and click handlers on the "New Game" and "Play Again" buttons.

```ts {file=src/main.ts}
  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this))
    document.getElementById('new-game')!.addEventListener('click', () => this.startNewGame())
    document.getElementById('play-again')!.addEventListener('click', () => this.startNewGame())
  }
```

## Key handling

`handleKeyPress` routes key events to the appropriate action:

- **Enter** starts a new game from the menu or game-over screen
- **Shift+R** resets the game at any time
- **P** toggles pause during gameplay
- **+/−** adjusts the initial grid size before the game starts
- **Q/E** rotates the isometric camera
- **[/]** adjusts perspective strength
- **Arrow keys / WASD** set the snake direction and start the game on first input

The direction is queued in `nextDirection` (not applied immediately) to prevent the snake from reversing into itself between ticks.

```ts {file=src/main.ts}
  private handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (!this.gameStarted || this.isGameOver) {
        this.startNewGame()
        return
      }
    }

    if (e.key === 'R') {
      this.startNewGame()
      return
    }

    if (e.key === 'p' || e.key === 'P') {
      if (!this.isGameOver && this.gameLoop !== null) {
        this.togglePause()
      }
      return
    }

    if ((e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') &&
      !this.gameStarted && !this.isGameOver &&
      !document.getElementById('game')!.classList.contains('hidden')) {
      if (e.key === '+' || e.key === '=') {
        this.initialGridSize = Math.min(this.initialGridSize + 5, 50)
      } else {
        this.initialGridSize = Math.max(this.initialGridSize - 5, 5)
      }
      this.gridSize = this.initialGridSize
      this.updateCanvasSize()
      const center = Math.floor(this.gridSize / 2)
      this.snake = [{ x: center, y: center }]
      this.spawnFood()
      this.updateUI()
      this.draw()
      return
    }

    if (e.key === 'q' || e.key === 'Q') {
      this.isoAngle -= Math.PI / 36  // rotate clockwise by 5°
      this.updateCanvasSize()
      this.draw()
      return
    }

    if (e.key === 'e' || e.key === 'E') {
      this.isoAngle += Math.PI / 36  // rotate counter-clockwise by 5°
      this.updateCanvasSize()
      this.draw()
      return
    }

    if (e.key === '[') {
      this.perspectiveStrength = Math.max(this.perspectiveStrength - 0.05, 0)
      this.updateCanvasSize()
      this.draw()
      return
    }

    if (e.key === ']') {
      this.perspectiveStrength = Math.min(this.perspectiveStrength + 0.05, 0.8)
      this.updateCanvasSize()
      this.draw()
      return
    }

    if (this.isPaused || this.isGameOver) return

    const keyMap: Record<string, Direction> = {
      'ArrowUp': 'UP',
      'ArrowDown': 'DOWN',
      'ArrowLeft': 'LEFT',
      'ArrowRight': 'RIGHT',
      'w': 'UP',
      'W': 'UP',
      'a': 'LEFT',
      'A': 'LEFT',
      's': 'DOWN',
      'S': 'DOWN',
      'd': 'RIGHT',
      'D': 'RIGHT'
    }

    const newDirection = keyMap[e.key]
    if (newDirection) {
      if (this.isValidDirection(newDirection)) {
        this.nextDirection = newDirection

        // Start the game on first directional input
        if (!this.gameStarted) {
          this.gameStarted = true
          this.gameLoop = window.setInterval(() => this.update(), this.gameSpeed)
        }
      }
    }
  }
```

## Direction validation

A direction change is valid as long as it's not a direct reversal (e.g., pressing LEFT while moving RIGHT). This prevents the snake from immediately colliding with itself.

```ts {file=src/main.ts}
  private isValidDirection(newDirection: Direction): boolean {
    const opposites: Record<Direction, Direction> = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    }
    return opposites[this.direction] !== newDirection
  }
```
