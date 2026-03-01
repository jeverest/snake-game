# Game State

The entire game lives in a single `SnakeGame` class. Its properties fall into two groups: gameplay state (snake position, score, speed, etc.) and rendering state (isometric projection parameters, canvas dimensions, caches).

## Properties

The gameplay properties track the snake segments, food position, current and queued direction, grid dimensions, scoring, speed, and game lifecycle flags.

The rendering properties define the isometric projection: a configurable rotation angle, perspective ratio for vertical foreshortening, the 2×2 basis vectors for the affine transform, block height, perspective strength and focal length, and a cache of projected grid intersection points.

```ts {file=src/main.ts}
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
  private baseBlockHeight: number = 0
  private perspectiveStrength: number = 0.4
  private focalLength: number = Infinity
  private rawMaxY: number = 0
  private rawCenterX: number = 0
  private isoOriginX: number = 0
  private isoOriginY: number = 0
  private isoCache: { x: number; y: number }[][] = []
```

## Constructor

The constructor grabs the canvas element, loads the persisted high score, wires up event listeners, and installs a resize handler that recomputes the projection and redraws.

```ts {file=src/main.ts}
  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.updateCanvasSize()
    this.loadHighScore()
    this.setupEventListeners()
    window.addEventListener('resize', () => { this.updateCanvasSize(); this.draw() })
  }
```
