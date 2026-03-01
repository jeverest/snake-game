# Rendering

All rendering uses a 2.5D isometric projection with optional perspective foreshortening. Grid coordinates are transformed to screen space via a pair of basis vectors derived from the current rotation angle and perspective ratio.

## Viewport width

The isometric viewport is sized to fit the browser window, clamped between minimum and maximum bounds. A 70px deduction accounts for page padding and canvas border.

```ts {file=src/main.ts}
  private getIsoWidth(): number {
    // Leave room for page padding (2rem = 32px each side) and canvas border (3px each side)
    const available = window.innerWidth - 70
    return Math.max(ISO_MIN_WIDTH, Math.min(available, ISO_MAX_WIDTH))
  }
```

## Isometric projection

`toIso` transforms a grid coordinate to screen space. It computes the raw affine position using the precomputed basis vectors, then applies perspective scaling based on depth (distance from the front edge). Points further from the viewer are scaled toward the vanishing point.

```ts {file=src/main.ts}
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
```

## Canvas sizing and projection setup

`updateCanvasSize` recomputes the entire projection whenever the grid size, rotation angle, or window size changes. It derives the 2×2 basis matrix from the angle and perspective ratio, scales it to fit the viewport, computes the perspective focal length from depth range, sizes the canvas, centers the grid, and builds a cache of all projected grid intersection points.

```ts {file=src/main.ts}
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
```

## Ground plane

The ground is a checkerboard of dark and darker tiles. Each cell is drawn as a diamond (quadrilateral) using the four cached corner projections. Two `Path2D` objects batch all light and dark tiles to minimize draw calls.

```ts {file=src/main.ts}
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
```

## Grid lines

Faint white grid lines are drawn along both axes, but only when tiles are large enough to be visible (at least 5px wide). This prevents visual noise at high zoom levels.

```ts {file=src/main.ts}
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
```

## Ground border

A subtle white border outlines the full grid perimeter using the four corner projections.

```ts {file=src/main.ts}
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
```

## Block rendering

Blocks are the 3D-looking cubes that represent the snake and food. Each block has a top face and up to four side faces. `getBlockHeight` scales the base height by perspective so blocks near the front appear larger.

`drawBlockShadow` draws a dark footprint on the ground plane beneath the block. A small inset prevents shadow bleeding into adjacent tiles.

`drawBlock` renders the full 3D block. It classifies each of the four side faces as front-facing or back-facing using the outward normal, draws back faces first (so front faces paint over them), then draws front faces with light/dark shading based on normal direction, and finally the top face.

```ts {file=src/main.ts}
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
```

## Main draw loop

`draw` clears the canvas, renders the ground (checkerboard, grid lines, border), then collects all game objects (snake segments and food) and sorts them back-to-front by projected Y for correct depth ordering. Shadows are drawn in a first pass, then blocks in a second pass so shadows appear beneath all blocks.

```ts {file=src/main.ts}
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
```
