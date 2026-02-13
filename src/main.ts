import './style.css'

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const CANVAS_SIZE = 300

class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private snake: Position[] = []
  private food: Position = { x: 0, y: 0 }
  private direction: Direction = 'RIGHT'
  private nextDirection: Direction = 'RIGHT'
  private gridSize: number = 10
  private cellSize: number = CANVAS_SIZE / this.gridSize
  private initialGridSize: number = 10
  private score: number = 0
  private level: number = 1
  private gameSpeed: number = 200
  private baseSpeed: number = 200
  private gameLoop: number | null = null
  private isPaused: boolean = false
  private isGameOver: boolean = false
  private gameStarted: boolean = false

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.updateCanvasSize()
    this.loadHighScore()
    this.setupEventListeners()
  }

  private updateCanvasSize() {
    this.canvas.width = CANVAS_SIZE
    this.canvas.height = CANVAS_SIZE
    this.cellSize = CANVAS_SIZE / this.gridSize
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyPress.bind(this))
    document.getElementById('new-game')!.addEventListener('click', () => this.startNewGame())
    document.getElementById('play-again')!.addEventListener('click', () => this.startNewGame())
  }

  private handleKeyPress(e: KeyboardEvent) {
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

  private isValidDirection(newDirection: Direction): boolean {
    const opposites: Record<Direction, Direction> = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    }
    return opposites[this.direction] !== newDirection
  }

  private togglePause() {
    this.isPaused = !this.isPaused
    const pauseScreen = document.getElementById('pause')!
    if (this.isPaused) {
      pauseScreen.classList.remove('hidden')
    } else {
      pauseScreen.classList.add('hidden')
    }
  }

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

  private update() {
    if (this.isPaused || this.isGameOver) return

    this.direction = this.nextDirection
    const head = { ...this.snake[0] }

    switch (this.direction) {
      case 'UP': head.y--; break
      case 'DOWN': head.y++; break
      case 'LEFT': head.x--; break
      case 'RIGHT': head.x++; break
    }

    if (this.checkCollision(head)) {
      this.endGame()
      return
    }

    this.snake.unshift(head)

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++
      this.spawnFood()
      this.checkGridExpansion()
    } else {
      this.snake.pop()
    }

    this.draw()
    this.updateUI()
  }

  private checkCollision(head: Position): boolean {
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      return true
    }
    return this.snake.some(segment => segment.x === head.x && segment.y === head.y)
  }

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

  private spawnFood() {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize)
      }
    } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y))
    this.food = newFood
  }

  private draw() {
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.strokeStyle = '#333'
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath()
      this.ctx.moveTo(i * this.cellSize, 0)
      this.ctx.lineTo(i * this.cellSize, this.canvas.height)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(0, i * this.cellSize)
      this.ctx.lineTo(this.canvas.width, i * this.cellSize)
      this.ctx.stroke()
    }

    this.ctx.fillStyle = '#4ade80'
    this.snake.forEach((segment, index) => {
      const brightness = index === 0 ? '#4ade80' : '#22c55e'
      this.ctx.fillStyle = brightness
      this.ctx.fillRect(
        segment.x * this.cellSize + 1,
        segment.y * this.cellSize + 1,
        this.cellSize - 2,
        this.cellSize - 2
      )
    })

    this.ctx.fillStyle = '#ef4444'
    this.ctx.fillRect(
      this.food.x * this.cellSize + 1,
      this.food.y * this.cellSize + 1,
      this.cellSize - 2,
      this.cellSize - 2
    )
  }

  private updateUI() {
    document.getElementById('score')!.textContent = this.score.toString()
    document.getElementById('level')!.textContent = this.level.toString()
    document.getElementById('grid-size')!.textContent = `${this.gridSize}x${this.gridSize}`
  }

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

  private showScreen(screenId: string) {
    document.querySelectorAll('.screen:not(.overlay)').forEach(screen => {
      screen.classList.add('hidden')
    })
    document.getElementById(screenId)!.classList.remove('hidden')
  }

  private getHighScore(): number {
    const stored = localStorage.getItem('snake-high-score')
    return stored ? parseInt(stored, 10) : 0
  }

  private saveHighScore(score: number) {
    localStorage.setItem('snake-high-score', score.toString())
    this.loadHighScore()
  }

  private loadHighScore() {
    const highScore = this.getHighScore()
    document.getElementById('high-score')!.textContent = highScore.toString()
  }
}

new SnakeGame()
