# Game Logic

The core game loop runs on a fixed timer. Each tick, the snake advances one cell in its current direction, checks for collisions, and either eats food (growing) or sheds its tail (moving).

## Update

`update` is the per-tick function. It applies the queued direction, computes the new head position, checks for wall or self-collision, and either ends the game or advances the snake. When food is eaten, the score increments, new food spawns, and the grid expansion check runs. Otherwise the tail is removed to maintain length.

```ts {file=src/main.ts}
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
```

## Collision detection

The snake dies if its head moves outside the grid boundaries or overlaps any existing body segment.

```ts {file=src/main.ts}
  private checkCollision(head: Position): boolean {
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      return true
    }
    return this.snake.some(segment => segment.x === head.x && segment.y === head.y)
  }
```

## Food spawning

Food is placed at a random unoccupied grid cell. The do-while loop rerolls until it finds a position that doesn't overlap the snake.

```ts {file=src/main.ts}
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
```
