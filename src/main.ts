import './style.css'
import { AVAILABLE_BOTS, DEFAULT_BOT_ID, getBotById } from './bots'
import type { BotHelpers, BotState, SnakeBot } from './bots/bot-types'
import { DIRECTIONS, DIRECTION_VECTORS, OPPOSITE_DIRECTIONS, type Direction, type Position } from './game-types'

const ISO_MIN_WIDTH = 300
const ISO_MAX_WIDTH = 1200

class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private snake: Position[] = []
  private snakeSet: Set<string> = new Set()
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
  private botEnabled: boolean = false
  private selectedBotId: string = DEFAULT_BOT_ID
  private activeBot: SnakeBot = getBotById(DEFAULT_BOT_ID) ?? AVAILABLE_BOTS[0]
  private botSelectors: HTMLSelectElement[] = []

  private isoAngle: number = Math.PI / 3 // z-rotation: 30° (45° = standard diamond)
  private perspectiveRatio: number = 0.5  // vertical squash for top-down tilt
  private basisXx: number = 0
  private basisXy: number = 0
  private basisYx: number = 0
  private basisYy: number = 0
  private baseBlockHeight: number = 0
  private perspectiveStrength: number = 0.4
  private focalLength: number = Infinity
  private rawMaxY: number = 0
  private rawCenterX: number = 0
  private isoOriginX: number = 0
  private isoOriginY: number = 0
  private isoCache: { x: number; y: number }[][] = []

  private autoRotating: boolean = false
  private autoRotateRafId: number | null = null
  private autoRotateLastTime: number = 0
  private autoRotateSpeed: number = 0.15 // radians per second
  private autoRotatePausedUntil: number = 0 // timestamp when manual override expires

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.updateCanvasSize()
    this.loadHighScore()
    this.setupEventListeners()
    this.updateBotUI()
    window.addEventListener('resize', () => { this.updateCanvasSize(); this.draw() })
  }

  private getIsoWidth(): number {
    // Leave room for page padding (2rem = 32px each side) and canvas border (3px each side)
    const available = window.innerWidth - 70
    return Math.max(ISO_MIN_WIDTH, Math.min(available, ISO_MAX_WIDTH))
  }

  private toIso(gridX: number, gridY: number): { x: number; y: number } {
    const rawX = gridX * this.basisXx + gridY * this.basisYx
    const rawY = gridX * this.basisXy + gridY * this.basisYy
    const d = this.rawMaxY - rawY
    const scale = this.focalLength === Infinity ? 1 : this.focalLength / (this.focalLength + d)
    return {
      x: (this.rawCenterX + (rawX - this.rawCenterX) * scale) + this.isoOriginX,
      y: (this.rawMaxY - d * scale) + this.isoOriginY
    }
  }

  private updateCanvasSize() {
    const cosA = Math.cos(this.isoAngle)
    const sinA = Math.sin(this.isoAngle)
    const pr = this.perspectiveRatio

    // Scale so the grid fits within the viewport-derived width at any rotation angle
    const isoWidth = this.getIsoWidth()
    const scale = isoWidth / (this.gridSize * Math.SQRT2)

    this.basisXx = cosA * scale
    this.basisXy = sinA * scale * pr
    this.basisYx = -sinA * scale
    this.basisYy = cosA * scale * pr

    // Rotation-invariant block height: use fixed scale * pr * sqrt(2) instead of
    // angle-dependent (basisXy + basisYy) so blocks stay the same height at all angles
    this.baseBlockHeight = scale * pr * Math.SQRT2 * 0.6

    // Compute raw iso corner positions (before perspective and origin offset)
    const N = this.gridSize
    const rawCorners = [
      { x: 0, y: 0 },
      { x: N * this.basisXx, y: N * this.basisXy },
      { x: N * this.basisYx, y: N * this.basisYy },
      { x: N * (this.basisXx + this.basisYx), y: N * (this.basisXy + this.basisYy) }
    ]

    this.rawMaxY = Math.max(...rawCorners.map(c => c.y))
    const rawMinY = Math.min(...rawCorners.map(c => c.y))
    this.rawCenterX = (Math.min(...rawCorners.map(c => c.x)) + Math.max(...rawCorners.map(c => c.x))) / 2

    const depthRange = Math.max(this.rawMaxY - rawMinY, 0.001)
    this.focalLength = this.perspectiveStrength > 0 ? depthRange / this.perspectiveStrength : Infinity

    // Fixed canvas size: max possible extent at any rotation angle
    const padding = 20
    const canvasInnerW = isoWidth
    const canvasInnerH = isoWidth * pr
    this.canvas.width = canvasInnerW + padding * 2
    this.canvas.height = canvasInnerH + padding * 2 + this.baseBlockHeight

    // Anchor grid center to canvas center so rotation pivots smoothly
    const half = this.gridSize / 2
    const gcRawX = half * (this.basisXx + this.basisYx)
    const gcRawY = half * (this.basisXy + this.basisYy)
    const gcD = this.rawMaxY - gcRawY
    const gcS = this.focalLength === Infinity ? 1 : this.focalLength / (this.focalLength + gcD)
    const gcProjX = this.rawCenterX + (gcRawX - this.rawCenterX) * gcS
    const gcProjY = this.rawMaxY - gcD * gcS

    this.isoOriginX = this.canvas.width / 2 - gcProjX
    this.isoOriginY = this.canvas.height / 2 - gcProjY

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

  private getBlockHeight(gx: number, gy: number): number {
    if (this.focalLength === Infinity) return this.baseBlockHeight
    const centerRawY = (gx + 0.5) * this.basisXy + (gy + 0.5) * this.basisYy
    const d = this.rawMaxY - centerRawY
    const scale = this.focalLength / (this.focalLength + d)
    return this.baseBlockHeight * scale
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
    const bh = this.getBlockHeight(gx, gy)
    const ctx = this.ctx

    // Corners clockwise: TL, TR, BR, BL
    const c = [
      this.toIso(gx + inset, gy + inset),
      this.toIso(gx + 1 - inset, gy + inset),
      this.toIso(gx + 1 - inset, gy + 1 - inset),
      this.toIso(gx + inset, gy + 1 - inset)
    ]

    // 4 side faces defined by clockwise edges; classify as front or back
    // Outward normal Y = a.x - b.x; visible (front) when > 0
    const backFaces: number[] = []
    const frontFaces: number[] = []
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4]
      if (a.x > b.x) frontFaces.push(i)
      else if (a.x < b.x) backFaces.push(i)
    }

    // Draw back faces first so front faces paint over them
    for (const i of backFaces) {
      const a = c[i], b = c[(i + 1) % 4]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y - bh)
      ctx.lineTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.lineTo(b.x, b.y - bh)
      ctx.closePath()
      ctx.fillStyle = leftColor
      ctx.fill()
    }

    // Draw front faces; use outward normal X to pick light/dark shading
    for (const i of frontFaces) {
      const a = c[i], b = c[(i + 1) % 4]
      const normalX = b.y - a.y
      ctx.beginPath()
      ctx.moveTo(a.x, a.y - bh)
      ctx.lineTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.lineTo(b.x, b.y - bh)
      ctx.closePath()
      ctx.fillStyle = normalX > 0 ? rightColor : leftColor
      ctx.fill()
    }

    // Top face
    ctx.beginPath()
    ctx.moveTo(c[0].x, c[0].y - bh)
    ctx.lineTo(c[1].x, c[1].y - bh)
    ctx.lineTo(c[2].x, c[2].y - bh)
    ctx.lineTo(c[3].x, c[3].y - bh)
    ctx.closePath()
    ctx.fillStyle = topColor
    ctx.fill()
  }

  private startAutoRotate() {
    if (this.autoRotating) return
    this.autoRotating = true
    this.autoRotateLastTime = 0
    this.autoRotateRafId = requestAnimationFrame(t => this.autoRotateStep(t))
  }

  private stopAutoRotate() {
    this.autoRotating = false
    if (this.autoRotateRafId !== null) {
      cancelAnimationFrame(this.autoRotateRafId)
      this.autoRotateRafId = null
    }
  }

  private autoRotateStep(timestamp: number) {
    if (!this.autoRotating) return

    if (this.autoRotateLastTime > 0 && timestamp > this.autoRotatePausedUntil) {
      const dt = (timestamp - this.autoRotateLastTime) / 1000
      this.isoAngle += this.autoRotateSpeed * dt
      this.updateCanvasSize()
      this.draw()
    }

    this.autoRotateLastTime = timestamp
    this.autoRotateRafId = requestAnimationFrame(t => this.autoRotateStep(t))
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

    // Sort back-to-front (painter's algorithm): lower projected Y drawn first
    objects.sort((a, b) =>
      (a.x * this.basisXy + a.y * this.basisYy) - (b.x * this.basisXy + b.y * this.basisYy)
    )

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
    this.setupBotSelectors()
    document.getElementById('new-game')!.addEventListener('click', () => this.startNewGame())
    document.getElementById('start-demo')!.addEventListener('click', () => {
      this.botEnabled = true
      this.startNewGame()
    })
    document.getElementById('toggle-bot')!.addEventListener('click', () => this.toggleBot())
    document.getElementById('play-again')!.addEventListener('click', () => this.startNewGame())
  }

  private setupBotSelectors() {
    const menuSelect = document.getElementById('menu-bot-select') as HTMLSelectElement | null
    const gameSelect = document.getElementById('game-bot-select') as HTMLSelectElement | null
    this.botSelectors = [menuSelect, gameSelect].filter((select): select is HTMLSelectElement => select !== null)

    for (const select of this.botSelectors) {
      select.innerHTML = ''
      for (const bot of AVAILABLE_BOTS) {
        const option = document.createElement('option')
        option.value = bot.id
        option.textContent = bot.name
        select.appendChild(option)
      }
      select.addEventListener('change', event => {
        const target = event.target as HTMLSelectElement
        this.handleBotSelection(target.value)
      })
    }

    this.syncBotSelectors()
    this.updateBotDescriptions()
  }

  private handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (!this.gameStarted || this.isGameOver) {
        this.startNewGame()
        return
      }
    }

    if (e.key === 'r' || e.key === 'R') {
      this.startNewGame()
      return
    }

    if (e.key === 'p' || e.key === 'P') {
      if (!this.isGameOver && this.gameLoop !== null) {
        this.togglePause()
      }
      return
    }

    if (e.key === 'b' || e.key === 'B') {
      this.toggleBot()
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
      this.snakeSet = new Set([`${center},${center}`])
      this.spawnFood()
      this.updateUI()
      this.draw()
      return
    }

    if (e.key === 'q' || e.key === 'Q') {
      this.isoAngle -= Math.PI / 36  // rotate clockwise by 5°
      this.autoRotatePausedUntil = performance.now() + 3000
      this.updateCanvasSize()
      this.draw()
      return
    }

    if (e.key === 'e' || e.key === 'E') {
      this.isoAngle += Math.PI / 36  // rotate counter-clockwise by 5°
      this.autoRotatePausedUntil = performance.now() + 3000
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
      if (this.botEnabled) return

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
    return OPPOSITE_DIRECTIONS[this.direction] !== newDirection
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

  private toggleBot() {
    this.botEnabled = !this.botEnabled
    this.updateBotUI()

    if (this.botEnabled) {
      this.startAutoRotate()
    } else {
      this.stopAutoRotate()
    }

    const gameScreenVisible = !document.getElementById('game')!.classList.contains('hidden')
    if (this.botEnabled && gameScreenVisible && this.snake.length > 0 && !this.isGameOver && !this.isPaused) {
      this.startLoopIfNeeded()
    }
  }

  private handleBotSelection(botId: string) {
    const selected = getBotById(botId)
    if (!selected) return

    this.selectedBotId = selected.id
    this.activeBot = selected
    this.syncBotSelectors()
    this.updateBotDescriptions()
    this.updateBotUI()
  }

  private syncBotSelectors() {
    for (const select of this.botSelectors) {
      select.value = this.selectedBotId
    }
  }

  private updateBotDescriptions() {
    const menuDescription = document.getElementById('menu-bot-description')
    const gameDescription = document.getElementById('game-bot-description')
    if (menuDescription) {
      menuDescription.textContent = this.activeBot.description
    }
    if (gameDescription) {
      gameDescription.textContent = this.activeBot.description
    }
  }

  private updateBotUI() {
    const status = document.getElementById('bot-status')
    const toggle = document.getElementById('toggle-bot')
    const demoButton = document.getElementById('start-demo')
    if (!status || !toggle || !demoButton) return

    status.textContent = this.botEnabled ? `ON (${this.activeBot.name})` : `OFF (${this.activeBot.name})`
    status.classList.toggle('on', this.botEnabled)
    status.classList.toggle('off', !this.botEnabled)
    toggle.textContent = this.botEnabled ? `Disable Bot (B)` : `Enable Bot (B)`
    demoButton.textContent = this.botEnabled ? `Demo Bot Enabled (${this.activeBot.name})` : `Start Demo Bot (${this.activeBot.name})`
  }

  private startLoopIfNeeded() {
    if (this.gameLoop !== null) return
    this.gameStarted = true
    this.gameLoop = window.setInterval(() => this.update(), this.gameSpeed)
  }

  startNewGame() {
    this.gridSize = this.initialGridSize
    this.updateCanvasSize()
    const center = Math.floor(this.gridSize / 2)
    this.snake = [{ x: center, y: center }]
    this.snakeSet = new Set([`${center},${center}`])
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

    this.updateBotUI()

    if (this.botEnabled) {
      this.startLoopIfNeeded()
      this.startAutoRotate()
    } else {
      this.stopAutoRotate()
    }

    // Draw initial state
    this.draw()
  }

  private update() {
    if (this.isPaused || this.isGameOver) return

    if (this.botEnabled) {
      const botDirection = this.chooseBotDirection()
      if (botDirection) {
        this.nextDirection = botDirection
      }
    }

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
    this.snakeSet.add(`${head.x},${head.y}`)

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++
      this.spawnFood()
      this.checkGridExpansion()
    } else {
      const tail = this.snake.pop()!
      this.snakeSet.delete(`${tail.x},${tail.y}`)
    }

    this.draw()
    this.updateUI()
  }

  private chooseBotDirection(): Direction | null {
    const botState: BotState = {
      snake: this.snake,
      food: this.food,
      gridSize: this.gridSize,
      direction: this.direction
    }

    const botHelpers: BotHelpers = {
      simulateMove: (snake, direction, food) => this.simulateMove(snake, direction, food),
      analyzePosition: (start, snake, targets) =>
        this.analyzePosition(start, snake, targets),
      getCandidateDirections: currentDirection => this.getCandidateDirections(currentDirection)
    }

    const direction = this.activeBot.chooseDirection(botState, botHelpers)
    if (!direction || !this.isValidDirection(direction)) {
      return null
    }
    return this.simulateMove(this.snake, direction, this.food) ? direction : null
  }

  private simulateMove(snake: Position[], direction: Direction, food: Position): Position[] | null {
    const nextHead = this.getMovedPosition(snake[0], direction)
    if (this.wouldCollide(nextHead, snake)) {
      return null
    }

    const nextSnake = [nextHead, ...snake]
    const ateFood = nextHead.x === food.x && nextHead.y === food.y
    if (!ateFood) {
      nextSnake.pop()
    }
    return nextSnake
  }


  private getMovedPosition(position: Position, direction: Direction): Position {
    const vector = DIRECTION_VECTORS[direction]
    return {
      x: position.x + vector.x,
      y: position.y + vector.y
    }
  }

  private inBounds(position: Position): boolean {
    return position.x >= 0 && position.x < this.gridSize && position.y >= 0 && position.y < this.gridSize
  }

  private positionToKey(position: Position): string {
    return `${position.x},${position.y}`
  }

  private wouldCollide(head: Position, snake: Position[], blockedSet?: Set<string>): boolean {
    if (!this.inBounds(head)) {
      return true
    }
    if (blockedSet) {
      return blockedSet.has(`${head.x},${head.y}`)
    }
    return snake.some(segment => segment.x === head.x && segment.y === head.y)
  }

  private getCandidateDirections(currentDirection: Direction): Direction[] {
    return DIRECTIONS.filter(direction => OPPOSITE_DIRECTIONS[currentDirection] !== direction)
  }

  private analyzePosition(
    start: Position,
    snake: Position[],
    targets: { tail: Position; food: Position }
  ): { reachableArea: number; canReachTail: boolean; pathToFood: number | null } {
    const startKey = this.positionToKey(start)
    const tailKey = this.positionToKey(targets.tail)
    const foodKey = this.positionToKey(targets.food)

    // Blocked set matches original countReachableArea: snake minus start.
    // Tail IS blocked (like the original). We detect tail reachability by
    // checking adjacency — if any visited cell neighbors the tail, it's reachable.
    const blocked = new Set<string>()
    for (const segment of snake) {
      const key = this.positionToKey(segment)
      if (key === startKey) continue
      blocked.add(key)
    }

    const queue: Array<{ position: Position; distance: number }> = [{ position: start, distance: 0 }]
    const visited = new Set<string>([startKey])
    let head = 0
    let canReachTail = false
    let pathToFood: number | null = null

    while (head < queue.length) {
      const current = queue[head++]
      const currentKey = this.positionToKey(current.position)

      if (currentKey === foodKey) pathToFood = current.distance

      // Check if current cell is adjacent to tail (tail is blocked, so check neighbors)
      if (!canReachTail) {
        for (const direction of DIRECTIONS) {
          const adj = this.getMovedPosition(current.position, direction)
          if (this.positionToKey(adj) === tailKey) {
            canReachTail = true
            break
          }
        }
      }

      for (const direction of DIRECTIONS) {
        const next = this.getMovedPosition(current.position, direction)
        const nextKey = this.positionToKey(next)
        if (!this.inBounds(next) || blocked.has(nextKey) || visited.has(nextKey)) {
          continue
        }
        visited.add(nextKey)
        queue.push({ position: next, distance: current.distance + 1 })
      }
    }

    return { reachableArea: visited.size, canReachTail, pathToFood }
  }

  private checkCollision(head: Position): boolean {
    return this.wouldCollide(head, this.snake, this.snakeSet)
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
    const totalCells = this.gridSize * this.gridSize
    if (this.snake.length > totalCells * 0.5) {
      // At high fill ratios, collect empty cells directly
      const emptyCells: Position[] = []
      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (!this.snakeSet.has(`${x},${y}`)) {
            emptyCells.push({ x, y })
          }
        }
      }
      if (emptyCells.length > 0) {
        this.food = emptyCells[Math.floor(Math.random() * emptyCells.length)]
        return
      }
    }

    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize)
      }
    } while (this.snakeSet.has(`${newFood.x},${newFood.y}`))
    this.food = newFood
  }

  private updateUI() {
    document.getElementById('score')!.textContent = this.score.toString()
    document.getElementById('level')!.textContent = this.level.toString()
    document.getElementById('grid-size')!.textContent = `${this.gridSize}x${this.gridSize}`
  }

  private endGame() {
    this.isGameOver = true
    this.stopAutoRotate()
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
