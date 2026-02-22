import './style.css'

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const ISO_MAX_WIDTH = 500

class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private snake: Position[] = []
  private food: Position = { x: 0, y: 0 }
  private direction: Direction = 'RIGHT'
  private nextDirection: Direction = 'RIGHT'
  private gridSize: number = 10
  private initialGridSize: number = 10
  private score: number = 0
  private level: number = 1
  private gameSpeed: number = 200
  private baseSpeed: number = 200
  private gameLoop: number | null = null
  private isPaused: boolean = false
  private isGameOver: boolean = false
  private gameStarted: boolean = false

  private isoAngle: number = Math.PI / 3 // z-rotation: 30° (45° = standard diamond)
  private perspectiveRatio: number = 0.5  // vertical squash for top-down tilt
  private basisXx: number = 0
  private basisXy: number = 0
  private basisYx: number = 0
  private basisYy: number = 0
  private blockHeight: number = 0
  private isoOriginX: number = 0
  private isoOriginY: number = 0
  private isoCache: { x: number; y: number }[][] = []

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.updateCanvasSize()
    this.loadHighScore()
    this.setupEventListeners()
  }

  private toIso(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.basisXx + gridY * this.basisYx + this.isoOriginX,
      y: gridX * this.basisXy + gridY * this.basisYy + this.isoOriginY
    }
  }

  private updateCanvasSize() {
    const cosA = Math.cos(this.isoAngle)
    const sinA = Math.sin(this.isoAngle)
    const pr = this.perspectiveRatio

    // Scale so the diamond's horizontal extent = ISO_MAX_WIDTH
    const scale = ISO_MAX_WIDTH / (this.gridSize * (cosA + sinA))

    this.basisXx = cosA * scale
    this.basisXy = sinA * scale * pr
    this.basisYx = -sinA * scale
    this.basisYy = cosA * scale * pr

    // Tile vertical span (top-to-bottom of one diamond tile)
    this.blockHeight = (this.basisXy + this.basisYy) * 0.6

    // Compute diamond extents from corner positions
    const N = this.gridSize
    const corners = [
      { x: 0, y: 0 },
      { x: N * this.basisXx, y: N * this.basisXy },
      { x: N * this.basisYx, y: N * this.basisYy },
      { x: N * (this.basisXx + this.basisYx), y: N * (this.basisXy + this.basisYy) }
    ]
    const minX = Math.min(...corners.map(c => c.x))
    const maxX = Math.max(...corners.map(c => c.x))
    const minY = Math.min(...corners.map(c => c.y))
    const maxY = Math.max(...corners.map(c => c.y))

    const padding = 20
    this.canvas.width = (maxX - minX) + padding * 2
    this.canvas.height = (maxY - minY) + padding + padding + this.blockHeight

    this.isoOriginX = -minX + padding
    this.isoOriginY = -minY + padding

    // Build isoCache[gy][gx] for grid intersection points
    this.isoCache = []
    for (let gy = 0; gy <= this.gridSize; gy++) {
      this.isoCache[gy] = []
      for (let gx = 0; gx <= this.gridSize; gx++) {
        this.isoCache[gy][gx] = this.toIso(gx, gy)
      }
    }
  }

  private drawGroundPlane() {
    const ctx = this.ctx
    const lightPath = new Path2D()
    const darkPath = new Path2D()

    for (let gy = 0; gy < this.gridSize; gy++) {
      for (let gx = 0; gx < this.gridSize; gx++) {
        const top = this.isoCache[gy][gx]
        const right = this.isoCache[gy][gx + 1]
        const bottom = this.isoCache[gy + 1][gx + 1]
        const left = this.isoCache[gy + 1][gx]

        const path = (gx + gy) % 2 === 0 ? lightPath : darkPath
        path.moveTo(top.x, top.y)
        path.lineTo(right.x, right.y)
        path.lineTo(bottom.x, bottom.y)
        path.lineTo(left.x, left.y)
        path.closePath()
      }
    }

    ctx.fillStyle = '#2a2a2a'
    ctx.fill(lightPath)
    ctx.fillStyle = '#222222'
    ctx.fill(darkPath)
  }

  private drawGridLines() {
    // Skip grid lines when tiles are too small
    const tileScreenWidth = Math.abs(this.basisXx) + Math.abs(this.basisYx)
    if (tileScreenWidth < 5) return

    const ctx = this.ctx
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.lineWidth = 0.5

    // Lines along the gx axis (varying gy)
    for (let gy = 0; gy <= this.gridSize; gy++) {
      const start = this.isoCache[gy][0]
      const end = this.isoCache[gy][this.gridSize]
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
    }

    // Lines along the gy axis (varying gx)
    for (let gx = 0; gx <= this.gridSize; gx++) {
      const start = this.isoCache[0][gx]
      const end = this.isoCache[this.gridSize][gx]
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
    }

    ctx.stroke()
  }

  private drawGroundBorder() {
    const ctx = this.ctx
    const topCorner = this.isoCache[0][0]
    const rightCorner = this.isoCache[0][this.gridSize]
    const bottomCorner = this.isoCache[this.gridSize][this.gridSize]
    const leftCorner = this.isoCache[this.gridSize][0]

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 2
    ctx.moveTo(topCorner.x, topCorner.y)
    ctx.lineTo(rightCorner.x, rightCorner.y)
    ctx.lineTo(bottomCorner.x, bottomCorner.y)
    ctx.lineTo(leftCorner.x, leftCorner.y)
    ctx.closePath()
    ctx.stroke()
  }

  private drawBlockShadow(gx: number, gy: number) {
    const inset = 0.05
    const top = this.toIso(gx + inset, gy + inset)
    const right = this.toIso(gx + 1 - inset, gy + inset)
    const bottom = this.toIso(gx + 1 - inset, gy + 1 - inset)
    const left = this.toIso(gx + inset, gy + 1 - inset)

    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(right.x, right.y)
    ctx.lineTo(bottom.x, bottom.y)
    ctx.lineTo(left.x, left.y)
    ctx.closePath()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fill()
  }

  private drawBlock(gx: number, gy: number, topColor: string, rightColor: string, leftColor: string) {
    const inset = 0.05
    const bh = this.blockHeight
    const ctx = this.ctx

    const topLeft = this.toIso(gx + inset, gy + inset)
    const topRight = this.toIso(gx + 1 - inset, gy + inset)
    const bottomRight = this.toIso(gx + 1 - inset, gy + 1 - inset)
    const bottomLeft = this.toIso(gx + inset, gy + 1 - inset)

    // Left face (front-left side)
    ctx.beginPath()
    ctx.moveTo(bottomLeft.x, bottomLeft.y - bh)
    ctx.lineTo(bottomLeft.x, bottomLeft.y)
    ctx.lineTo(bottomRight.x, bottomRight.y)
    ctx.lineTo(bottomRight.x, bottomRight.y - bh)
    ctx.closePath()
    ctx.fillStyle = leftColor
    ctx.fill()

    // Right face (front-right side)
    ctx.beginPath()
    ctx.moveTo(bottomRight.x, bottomRight.y - bh)
    ctx.lineTo(bottomRight.x, bottomRight.y)
    ctx.lineTo(topRight.x, topRight.y)
    ctx.lineTo(topRight.x, topRight.y - bh)
    ctx.closePath()
    ctx.fillStyle = rightColor
    ctx.fill()

    // Top face
    ctx.beginPath()
    ctx.moveTo(topLeft.x, topLeft.y - bh)
    ctx.lineTo(topRight.x, topRight.y - bh)
    ctx.lineTo(bottomRight.x, bottomRight.y - bh)
    ctx.lineTo(bottomLeft.x, bottomLeft.y - bh)
    ctx.closePath()
    ctx.fillStyle = topColor
    ctx.fill()
  }

  private draw() {
    const ctx = this.ctx
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawGroundPlane()
    this.drawGridLines()
    this.drawGroundBorder()

    // Collect all objects to render
    const objects: { x: number; y: number; type: 'head' | 'body' | 'food' }[] = []

    this.snake.forEach((segment, index) => {
      objects.push({ x: segment.x, y: segment.y, type: index === 0 ? 'head' : 'body' })
    })
    objects.push({ x: this.food.x, y: this.food.y, type: 'food' })

    // Sort back-to-front (painter's algorithm): lower (x+y) drawn first
    objects.sort((a, b) => (a.x + a.y) - (b.x + b.y))

    // Draw shadows first
    for (const obj of objects) {
      this.drawBlockShadow(obj.x, obj.y)
    }

    // Draw blocks
    for (const obj of objects) {
      switch (obj.type) {
        case 'head':
          this.drawBlock(obj.x, obj.y, '#4ade80', '#22c55e', '#16a34a')
          break
        case 'body':
          this.drawBlock(obj.x, obj.y, '#22c55e', '#16a34a', '#15803d')
          break
        case 'food':
          this.drawBlock(obj.x, obj.y, '#ef4444', '#dc2626', '#b91c1c')
          break
      }
    }
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
