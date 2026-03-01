# Progression

The game features a level-up system: when the snake fills 25% of the grid, the grid doubles in size and the game speeds up. This creates an ever-expanding challenge.

## Grid expansion

`checkGridExpansion` fires after each food pickup. When the snake occupies at least 25% of the grid cells, `expandGrid` doubles the grid dimensions, increments the level, halves the tick interval, recomputes the projection, and spawns new food.

```ts {file=src/main.ts}
  private checkGridExpansion() {
    const totalCells = this.gridSize * this.gridSize
    const snakeLength = this.snake.length
    const fillPercentage = snakeLength / totalCells

    if (fillPercentage >= 0.25) {
      this.expandGrid()
    }
  }

  private expandGrid() {
    this.gridSize *= 2
    this.level++
    this.gameSpeed = this.gameSpeed / 2
    this.updateCanvasSize()

    if (this.gameLoop) clearInterval(this.gameLoop)
    this.gameLoop = window.setInterval(() => this.update(), this.gameSpeed)

    this.spawnFood()
  }
```

## Starting a new game

`startNewGame` resets all gameplay state to initial values: grid size, snake position (centered), direction, score, level, and speed. It clears any running timer, shows the game screen, and draws the initial state. The game doesn't start ticking until the player presses a direction key.

```ts {file=src/main.ts}
  startNewGame() {
    this.gridSize = this.initialGridSize
    this.updateCanvasSize()
    const center = Math.floor(this.gridSize / 2)
    this.snake = [{ x: center, y: center }]
    this.direction = 'RIGHT'
    this.nextDirection = 'RIGHT'
    this.score = 0
    this.level = 1
    this.baseSpeed = 200
    this.gameSpeed = this.baseSpeed
    this.isPaused = false
    this.isGameOver = false
    this.gameStarted = false
    this.spawnFood()
    this.updateUI()
    this.showScreen('game')
    document.getElementById('pause')!.classList.add('hidden')

    if (this.gameLoop) clearInterval(this.gameLoop)
    this.gameLoop = null

    // Draw initial state
    this.draw()
  }
```

## Ending the game

`endGame` stops the game loop, checks whether the current score is a new high score, and transitions to the game-over screen showing the final and best scores.

```ts {file=src/main.ts}
  private endGame() {
    this.isGameOver = true
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }

    const highScore = this.getHighScore()
    if (this.score > highScore) {
      this.saveHighScore(this.score)
    }

    document.getElementById('final-score')!.textContent = this.score.toString()
    document.getElementById('game-over-high-score')!.textContent = Math.max(this.score, highScore).toString()
    this.showScreen('game-over')
  }
```

## Class close and instantiation

The class definition is closed and a single instance is created to boot the game.

```ts {file=src/main.ts}
}

new SnakeGame()
```
