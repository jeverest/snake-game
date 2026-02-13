# Snake Game

A classic snake game built with TypeScript and HTML5 Canvas, bundled with Vite.

## Features

- **Expanding grid** - the grid doubles in size when the snake fills 25% of the board, advancing the level and increasing speed
- **Adjustable starting grid** - use `+`/`-` keys to change grid resolution (5x5 to 50x50) before the game starts
- **High score** - persisted in localStorage across sessions
- **Pause/resume** - press `P` at any time during gameplay
- **Dark theme** with a green/red color scheme

## Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Move the snake |
| P | Pause / Resume |
| Shift+R | Reset to menu |
| +/- | Adjust grid size (before game starts) |

The game begins when you press a direction key after starting a new game.

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- TypeScript
- Vite
- HTML5 Canvas
