# Snake Game — Project Instructions

## Literate Programming Workflow

This project uses a **literate programming** approach. The `lit/*.md` markdown files and the source code are kept in sync bidirectionally.

### How it works

- **`lit/*.md`** — Markdown files containing English descriptions of every module, function, and behavior, with embedded code blocks annotated `{file=<path>}`
- **`scripts/tangle.mjs`** — Extracts code blocks from the markdown files and assembles them into runnable source files
- **`src/`**, **`index.html`** — Runnable source. Can be edited directly, but lit files must be updated to match.

### Bidirectional workflow

Either direction is valid:

- **Lit → Code:** Edit `lit/*.md`, run `npm run tangle` to regenerate source files.
- **Code → Lit:** Edit source files directly (for quick iteration, debugging, etc.), then update the corresponding `lit/*.md` to reflect the changes — both the code blocks and the prose.

The key invariant: **lit files and source files must stay in sync.** After any edit in either direction, the other side should be updated before the work is considered done.

### Rules

1. **Prose first, code second.** Every code block should be preceded by English text explaining intent and behavior. Code is only needed where precision matters or English is ambiguous.
2. **Keep both sides in sync.** If you edit code directly, update the lit file. If you edit a lit file, re-tangle.
3. **The prose describes intent.** If there's a mismatch, decide which is correct and fix the other.
4. **Code blocks without `{file=...}` are illustrative** — they're for explanation only and are not extracted.

### Code block format

````markdown
```ts {file=src/main.ts}
// This code will be extracted to src/main.ts
```
````

Multiple code blocks targeting the same file are concatenated in order (alphabetical by `.md` filename, then document order within each file).

### Commands

- `npm run tangle` — Extract code from `lit/*.md` into source files
- `npm run dev` — Tangle + start Vite dev server
- `npm run build` — Tangle + TypeScript check + Vite production build

### File organization

| Lit file | Topic |
|----------|-------|
| `01-overview.md` | Game overview, imports, types, constants |
| `02-game-state.md` | Class definition, properties, constructor |
| `03-rendering.md` | Isometric projection, canvas, drawing |
| `04-game-logic.md` | Update loop, collision, food |
| `05-input.md` | Keyboard handling |
| `06-ui-and-state.md` | Screens, pause, UI, high scores |
| `07-progression.md` | Grid expansion, leveling, game lifecycle |
| `08-style.md` | CSS |
| `09-page.md` | HTML |

### When making changes

- **Via lit files:** Edit the relevant `lit/*.md` file (prose + code), run `npm run tangle`
- **Via source files:** Edit source directly, then update the corresponding `lit/*.md` to match (both code blocks and surrounding prose)
- **Adding a feature:** Add prose + code to the appropriate lit file (or create a new one), run `npm run tangle`
- Source files have a header comment noting they are generated from `lit/*.md`
