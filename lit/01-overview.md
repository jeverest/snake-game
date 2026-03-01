# Game Overview

This is a browser-based snake game built with TypeScript and rendered on an HTML canvas using a 2.5D isometric perspective. The game uses Vite for development and bundling.

The entry point imports the stylesheet and defines the core types used throughout the game: grid positions as `{x, y}` pairs and the four cardinal directions for snake movement.

Two constants bound the isometric viewport width to keep the game playable across screen sizes.

```ts {file=src/main.ts}
import './style.css'

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const ISO_MIN_WIDTH = 300
const ISO_MAX_WIDTH = 1200
```
