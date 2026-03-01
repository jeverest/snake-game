# Styling

The game uses a dark theme with green (#4ade80) as the accent color. The layout centers the content vertically and horizontally. Screens stack as flex columns and are toggled via a `.hidden` class. The pause screen uses a fixed overlay with a dark translucent backdrop.

Buttons use the accent color for borders and text, inverting on hover. The canvas has a subtle green glow via box-shadow. A responsive breakpoint at 768px adjusts font sizes and layout for mobile.

```css {file=src/style.css}
:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  background-color: #1a1a1a;
}

h1 {
  font-size: 3em;
  line-height: 1.1;
  margin: 0 0 1rem 0;
  color: #4ade80;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.screen.hidden {
  display: none;
}

.screen.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 100;
  justify-content: center;
}

.high-score, .final-score {
  font-size: 1.5em;
  color: #fbbf24;
  font-weight: 600;
}

button {
  border-radius: 8px;
  border: 2px solid #4ade80;
  padding: 1em 2em;
  font-size: 1.2em;
  font-weight: 600;
  font-family: inherit;
  background-color: #1a1a1a;
  color: #4ade80;
  cursor: pointer;
  transition: all 0.25s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

button:hover {
  background-color: #4ade80;
  color: #1a1a1a;
  transform: scale(1.05);
}

button:active {
  transform: scale(0.98);
}

#canvas {
  border: 3px solid #333;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
  background-color: #1a1a1a;
}

.game-info {
  display: flex;
  gap: 2rem;
  font-size: 1.2em;
  font-weight: 600;
  color: #e5e5e5;
}

.game-info span {
  color: #4ade80;
}

.controls {
  color: #888;
  font-size: 0.9em;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2em;
  }

  .game-info {
    flex-direction: column;
    gap: 0.5rem;
  }

  button {
    font-size: 1em;
    padding: 0.8em 1.6em;
  }
}
```
