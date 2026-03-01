# UI and State Management

The game uses simple DOM manipulation for UI: showing/hiding screens, updating score displays, and persisting high scores to localStorage.

## Pause

Toggling pause shows or hides the pause overlay. The game loop continues to fire but `update` returns early when paused.

```ts {file=src/main.ts}
  private togglePause() {
    this.isPaused = !this.isPaused
    const pauseScreen = document.getElementById('pause')!
    if (this.isPaused) {
      pauseScreen.classList.remove('hidden')
    } else {
      pauseScreen.classList.add('hidden')
    }
  }
```

## UI updates

The HUD shows the current score, level, and grid dimensions.

```ts {file=src/main.ts}
  private updateUI() {
    document.getElementById('score')!.textContent = this.score.toString()
    document.getElementById('level')!.textContent = this.level.toString()
    document.getElementById('grid-size')!.textContent = `${this.gridSize}x${this.gridSize}`
  }
```

## Screen management

The game has three mutually exclusive screens (menu, game, game-over) plus a pause overlay. `showScreen` hides all non-overlay screens, then reveals the requested one.

```ts {file=src/main.ts}
  private showScreen(screenId: string) {
    document.querySelectorAll('.screen:not(.overlay)').forEach(screen => {
      screen.classList.add('hidden')
    })
    document.getElementById(screenId)!.classList.remove('hidden')
  }
```

## High score persistence

High scores are stored in localStorage under a single key. `loadHighScore` updates the DOM on startup and after new records. `saveHighScore` writes the value and triggers a reload of the display.

```ts {file=src/main.ts}
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
```
