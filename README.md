# JS/TS Notebook

A VS Code extension that brings Jupyter-style interactive notebooks to JavaScript and TypeScript. Write code in blocks, run them one at a time or all at once, and see rich output inline — with shared state across cells.

---

## Features

- **Code cells** — run JavaScript or TypeScript blocks individually or all at once
- **Shared state** — variables defined in one cell are available in all subsequent cells
- **Top-level `await`** — use `await` directly in any cell without wrapping it
- **`return` values** — end a cell with `return expr` to display the result as an interactive tree
- **`require()` support** — import any Node.js built-in or installed npm package
- **TypeScript cells** — IntelliSense, type squiggles, and transpile-on-run
- **Markdown cells** — documentation cells rendered inline alongside code
- **`$display(html)`** — render arbitrary HTML inline from any cell
- **`$image(data)`** — display PNG, JPEG, or SVG images inline
- **`$chart(config)`** — render Chart.js charts inline
- **`console.table()`** — renders as a real HTML table
- **Interactive object tree** — `return` values that are objects or arrays expand/collapse
- **Cell timing** — every cell shows how long it took to run
- **Variable Inspector** — sidebar panel listing all live kernel variables
- **Configurable timeout** — set execution timeout per workspace
- **Cancel execution** — stop a running batch mid-queue
- **Run Selection** — execute only the highlighted text in a cell
- **Per-notebook TypeScript config** — set `strict`, `target`, etc. in notebook metadata
- **Export as Script** — save all code cells to a `.js` or `.ts` file
- **Export as HTML** — save a self-contained shareable HTML document
- **Cell snippets** — type `jsnb-` in any cell for common patterns

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [VS Code](https://code.visualstudio.com) v1.85 or later

### Install and build

```bash
npm install
npm run build
```

### Run in development

1. Open this folder in VS Code
2. Press **F5** — opens a new Extension Development Host window
3. Open any `.jsnb` file (e.g. `testNotebooks/sample.jsnb`)
4. Click **Run** on any cell, or **Run All** in the toolbar

### Watch mode

```bash
npm run watch
```

---

## Notebook Files (`.jsnb`)

Notebooks are plain **JSON** files — committable, diffable, shareable like any text file.

```json
{
  "version": 1,
  "cells": [
    {
      "kind": "code",
      "language": "javascript",
      "source": "const x = [1, 2, 3];\nconsole.log(x);",
      "outputs": [],
      "metadata": {}
    },
    {
      "kind": "markdown",
      "language": "markdown",
      "source": "## Heading",
      "outputs": [],
      "metadata": {}
    }
  ],
  "metadata": {}
}
```

| Field | Values | Notes |
|---|---|---|
| `kind` | `"code"` \| `"markdown"` | Markdown cells are rendered, not executed |
| `language` | `"javascript"` \| `"typescript"` | Per-cell — mix JS and TS in one notebook |
| `outputs` | array | Persisted on save, shown immediately on reopen |

---

## Core Cell Features

### Shared state

Variables survive across cells. Use `let` or `const` (not `var` — see [Gotchas](#gotchas)).

```javascript
// Cell 1
const users = [
  { name: 'Alice', score: 95 },
  { name: 'Bob',   score: 82 },
];

// Cell 2 — users is available here
const top = users.filter(u => u.score > 90);
console.log(top);
```

### Return values — interactive object tree

End a cell with `return` to display the result inline. Objects and arrays render as a collapsible tree — click `▶` to expand any node.

```javascript
// Returns an object — shown as an expandable tree
return {
  status: 'ok',
  data: { users: 42, active: 38 },
  tags: ['prod', 'v2'],
};
```

```typescript
// TypeScript cell — types stripped at run time
interface Product { id: number; name: string; price: number; }

const products: Product[] = [
  { id: 1, name: 'Widget', price: 9.99 },
  { id: 2, name: 'Gadget', price: 24.99 },
];

return products.sort((a, b) => a.price - b.price);
```

The tree starts expanded one level deep. Nested objects collapse automatically — click to open them. Arrays larger than 100 items show a truncation notice.

### Top-level `await`

```javascript
const res  = await fetch('https://api.github.com/zen');
const text = await res.text();
return text;
```

```javascript
// Parallel requests
const [users, posts] = await Promise.all([
  fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json()),
  fetch('https://jsonplaceholder.typicode.com/posts?_limit=5').then(r => r.json()),
]);
return { users: users.length, posts };
```

### Using npm packages

Any package in your workspace `node_modules` is available via `require()`.

```javascript
const _ = require('lodash');
return _.groupBy(
  [{ dept: 'eng', name: 'Alice' }, { dept: 'eng', name: 'Bob' }, { dept: 'hr', name: 'Carol' }],
  'dept'
);
```

---

## Output Features

### `console.table()` — HTML table

`console.table()` renders as a proper HTML table with column headers and alternating row colors.

```javascript
const data = [
  { name: 'Alice', score: 95, grade: 'A' },
  { name: 'Bob',   score: 82, grade: 'B' },
  { name: 'Carol', score: 78, grade: 'C' },
];

console.table(data);
```

Works with arrays of objects, arrays of primitives, and plain objects:

```javascript
console.table({ a: 1, b: 2, c: 3 });            // key/value table
console.table(['apple', 'banana', 'cherry']);    // index/value table
```

### `$display(html)` — inline HTML

Render any HTML string inline in the output area.

```javascript
$display(`
  <div style="padding: 12px; background: #1a1a2e; border-radius: 8px; color: #e2e2e2">
    <h2 style="margin:0 0 8px">📊 Report</h2>
    <p>Records processed: <strong>1,024</strong></p>
    <p>Errors: <strong style="color:#f55">3</strong></p>
  </div>
`);
```

```javascript
// Progress bar
const pct = 72;
$display(`
  <div style="font-family:sans-serif">
    <div style="background:#333;border-radius:4px;height:20px;width:300px">
      <div style="background:#4caf50;width:${pct}%;height:100%;border-radius:4px"></div>
    </div>
    <small>${pct}% complete</small>
  </div>
`);
```

### `$image(data, mimeType?)` — inline images

Display images from Buffers, Uint8Arrays, or base64 strings.

```javascript
// From a file on disk
const fs = require('fs');
const png = fs.readFileSync('./chart.png');
$image(png);                        // defaults to image/png
```

```javascript
// Generate with the canvas package (npm install canvas)
const { createCanvas } = require('canvas');
const canvas = createCanvas(400, 200);
const ctx    = canvas.getContext('2d');

ctx.fillStyle = '#1e1e1e';
ctx.fillRect(0, 0, 400, 200);
ctx.fillStyle = '#4fc3f7';
ctx.font = '32px sans-serif';
ctx.fillText('Hello from canvas!', 40, 110);

$image(canvas.toBuffer('image/png'));
```

```javascript
// SVG string
$display(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
  <rect width="200" height="100" fill="#2d2d2d" rx="8"/>
  <text x="100" y="60" text-anchor="middle" fill="#4fc3f7" font-size="20">SVG</text>
</svg>`);
```

```javascript
// From a base64 string
$image('iVBORw0KGgoAAAANSUhEUg...', 'image/png');
```

### `$chart(config)` — Chart.js charts

Pass any [Chart.js 4.x](https://www.chartjs.org/docs/latest/) config object. All chart types are supported.

```javascript
// Bar chart
$chart({
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Sales',
      data: [120, 190, 80, 140, 200, 165],
      backgroundColor: 'rgba(79, 195, 247, 0.7)',
    }],
  },
  options: { responsive: true },
});
```

```javascript
// Line chart with multiple datasets
$chart({
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      { label: 'CPU %',  data: [45, 62, 55, 70, 48], borderColor: '#ef5350', tension: 0.4 },
      { label: 'Mem %',  data: [60, 65, 63, 68, 64], borderColor: '#42a5f5', tension: 0.4 },
    ],
  },
});
```

```javascript
// Pie chart
$chart({
  type: 'pie',
  data: {
    labels: ['JavaScript', 'TypeScript', 'Python', 'Other'],
    datasets: [{
      data: [38, 29, 20, 13],
      backgroundColor: ['#f7df1e', '#3178c6', '#3572A5', '#aaa'],
    }],
  },
});
```

```javascript
// Scatter plot
$chart({
  type: 'scatter',
  data: {
    datasets: [{
      label: 'Samples',
      data: Array.from({ length: 50 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      })),
    }],
  },
});
```

### Cell execution timing

Every cell automatically shows how long it ran in a small label below the output:

```
ran in 142 ms    (for fast cells)
ran in 1.42 s    (for slower cells)
```

---

## Developer Experience

### Variable Inspector

Click the **`⊹`** (symbol-variable) icon in the Activity Bar to open the Variables panel. After each cell run, it lists every user-defined variable in the kernel with its type and a value preview.

| Name | Type | Value |
|---|---|---|
| `users` | `Array(3)` | `[ { name: 'Alice', … }, … ]` |
| `total` | `number` | `316` |
| `config` | `object` | `{ host: 'localhost', port: 3000 }` |

The panel updates automatically after each execution and clears on Kernel Restart.

### Run Selection — `Ctrl+Shift+Enter`

Highlight any portion of a cell's code and press `Ctrl+Shift+Enter` (`Cmd+Shift+Enter` on Mac) to execute just that text. Results are appended to the existing cell output rather than replacing it — useful for testing sub-expressions.

```javascript
const items = [10, 20, 30, 40, 50];

// Select just this line and hit Ctrl+Shift+Enter:
items.filter(n => n > 25)
```

### Cancel Execution

When running multiple cells (Run All), VS Code shows a **Stop** button in the notebook toolbar. Clicking it cancels the remaining queue after the current cell finishes.

### Cell Snippets

Type any `jsnb-` prefix in a code cell for instant snippets:

| Prefix | Inserts |
|---|---|
| `jsnb-fetch` | `await fetch(url)` + `.json()` + `return` |
| `jsnb-require` | `const x = require('module')` |
| `jsnb-display` | `$display(...)` |
| `jsnb-image` | `fs.readFileSync` + `$image(...)` |
| `jsnb-table` | `console.table([...])` with sample rows |
| `jsnb-time` | `Date.now()` timer harness |
| `jsnb-try` | `try { await ... } catch (err) { ... }` |
| `jsnb-readfile` | `fs.readFileSync` + `return` |

---

## Configuration

### Execution timeout

Change the per-cell timeout in VS Code Settings (**Extensions → JS/TS Notebook**):

```json
// .vscode/settings.json
{
  "jstsnotebook.executionTimeoutMs": 60000
}
```

Default is `30000` (30 seconds). Minimum is `1000`.

### Per-notebook TypeScript options

Add a `tsConfig` key to the notebook metadata to override the default TypeScript compiler options for that notebook. Open **Edit → Notebook Metadata** (or edit the `.jsnb` JSON directly):

```json
{
  "version": 1,
  "cells": [...],
  "metadata": {
    "tsConfig": {
      "strict": true,
      "noImplicitAny": true,
      "target": "ES2020"
    }
  }
}
```

Supported options:

| Option | Type | Notes |
|---|---|---|
| `target` | `string` | `"ES5"`, `"ES2015"` … `"ES2022"`, `"ESNext"` |
| `strict` | `boolean` | Enable all strict checks |
| `strictNullChecks` | `boolean` | |
| `noImplicitAny` | `boolean` | |
| `noImplicitReturns` | `boolean` | |
| `experimentalDecorators` | `boolean` | Default `true` |
| `esModuleInterop` | `boolean` | Default `true` |
| `allowJs` | `boolean` | |

---

## Export

### Export as Script

**Toolbar `$(export)` button** or **Command Palette → JS/TS Notebook: Export as Script**

Saves all code cells to a `.js` or `.ts` file. Markdown cells become block comments. A save dialog opens pre-filled with a path next to the `.jsnb` file.

```js
// --- Cell 1 ---
const users = [{ name: 'Alice', score: 95 }];

/* --- Cell 2 (markdown) ---
## Analysis
*/

// --- Cell 3 ---
console.table(users);
```

### Export as HTML

**Toolbar `$(globe)` button** or **Command Palette → JS/TS Notebook: Export as HTML**

Produces a fully self-contained `.html` file with:
- Markdown cells rendered (headings, bold, italic, lists, links, fenced code)
- Code cells with language badge and syntax-highlighted source
- All outputs embedded inline:
  - `console.log` / `console.error` as `<pre>` blocks
  - Errors with collapsible stack trace
  - Return values with type label
  - `console.table()` as an HTML table
  - `$display()` HTML preserved as-is
  - `$image()` images embedded as base64 data URIs
  - `$chart()` charts rendered via Chart.js CDN script
- No external dependencies — open the file in any browser

---

## Commands Reference

| Command | Where | Shortcut |
|---|---|---|
| Run Cell | Cell toolbar | `Shift+Enter` |
| Run All | Notebook toolbar | — |
| Run Selected Text | Command Palette | `Ctrl+Shift+Enter` |
| Restart Kernel | Notebook toolbar (↺) | — |
| Clear All Outputs | Command Palette | — |
| Export as Script | Notebook toolbar / Palette | — |
| Export as HTML | Notebook toolbar / Palette | — |

---

## Architecture

```
vs-code-extension/
├── src/
│   ├── extension/              Node.js Extension Host (CJS bundle)
│   │   ├── extension.ts        activate() — registers serializer, controller, inspector
│   │   ├── serializer.ts       NotebookSerializer — reads/writes .jsnb JSON
│   │   ├── controller.ts       NotebookController — commands, cancel, run-selection
│   │   ├── kernelSession.ts    vm.createContext(), $display/$image/$chart helpers
│   │   ├── executor.ts         6-step cell execution pipeline
│   │   ├── transpiler.ts       ts.transpileModule() with per-notebook tsConfig
│   │   ├── outputCapture.ts    Intercepts console.* on the vm context
│   │   ├── variableInspector.ts  WebviewViewProvider for the Variables sidebar
│   │   └── commands/
│   │       ├── exportScript.ts Export to .js / .ts
│   │       └── exportHtml.ts   Export to self-contained HTML
│   │
│   ├── renderer/               Browser Renderer (ESM bundle, runs in VS Code iframe)
│   │   ├── index.ts            ActivationFunction — dispatches by MIME type
│   │   ├── errorRenderer.ts    Styled error box + collapsible stack trace
│   │   ├── returnRenderer.ts   ↩ return value — collapsible object tree
│   │   ├── timingRenderer.ts   "ran in N ms" label
│   │   ├── tableRenderer.ts    console.table() → HTML table
│   │   └── chartRenderer.ts    $chart() → Chart.js canvas
│   │
│   └── common/                 Shared types (no Node or DOM APIs)
│       ├── types.ts            JsnbFile, all payload interfaces
│       └── mimeTypes.ts        MIME type constants
│
├── snippets/
│   └── jsnb.json               Cell snippet definitions
│
└── out/
    ├── extension.js            Built extension host bundle
    └── renderer.js             Built renderer bundle (includes Chart.js)
```

### Execution model

Each open notebook gets a **single `vm.Context`**. Every cell runs inside that same context, so variables accumulate — exactly like a Jupyter kernel.

```
Open notebook
  └── KernelSession
        └── vm.Context  ← one shared sandbox per notebook
              ├── require, Buffer, process, util   (Node globals)
              ├── console                          (patched → captured)
              ├── $display, $image, $chart         (display helpers)
              ├── __displayQueue                   (internal, reset each cell)
              └── [user variables accumulate here]
```

**Cell execution pipeline** (`executor.ts`):

1. **Transpile** — TypeScript cells run through `ts.transpileModule()` (syntax-only, never blocks on type errors)
2. **Capture** — fresh console capture installed for this cell
3. **Reset queue** — `__displayQueue` cleared so previous `$display`/`$image`/`$chart` calls don't leak
4. **Wrap** — code wrapped in `(async () => { <code> })()` to enable top-level `await` and `return`
5. **Run** — `vm.runInContext()` with configurable timeout
6. **Await** — promise awaited; resolved value becomes the `return` display value
7. **Drain queue** — `__displayQueue` items emitted as HTML / image / chart outputs
8. **Timing** — elapsed ms appended as a timing output

### Output MIME types

| Output | MIME | Renderer |
|---|---|---|
| `console.log` | `application/vnd.code.notebook.stdout` | VS Code built-in |
| `console.error` | `application/vnd.code.notebook.stderr` | VS Code built-in |
| `console.table()` | `application/vnd.jsnb.table+json` | Custom — HTML table |
| `return` value | `application/vnd.jsnb.return+json` | Custom — interactive tree |
| Objects (raw) | `application/json` | VS Code built-in (fallback) |
| Errors | `application/vnd.jsnb.error+json` | Custom — styled error box |
| Cell timing | `application/vnd.jsnb.timing+json` | Custom — "ran in N ms" |
| `$display()` | `text/html` | VS Code built-in |
| `$image()` | `image/png`, `image/jpeg`, etc. | VS Code built-in |
| `$chart()` | `application/vnd.jsnb.chart+json` | Custom — Chart.js canvas |

### Two-bundle build

| Bundle | Target | Format | External |
|---|---|---|---|
| `out/extension.js` | Node 18 | CommonJS | `vscode`, `typescript` |
| `out/renderer.js` | Browser ES2020 | ESM | *(fully bundled, includes Chart.js)* |

`typescript` stays external (loaded from `node_modules` at runtime) because it is ~7 MB and is needed for TS transpilation.

---

## Gotchas

### `var` doesn't persist across cells

Each cell runs inside an async IIFE. `var` is scoped to that function.

```javascript
var x = 10;   // ❌ not visible in subsequent cells

let y = 10;   // ✅ persists to subsequent cells
const z = 10; // ✅ persists to subsequent cells
```

### Type errors don't block execution

TypeScript cells use `ts.transpileModule()` (syntax transform only — no type checking). The editor shows type squiggles, but the cell still runs. This matches `ts-node --transpile-only`.

### Execution timeout

Cells time out after **30 seconds** by default. Change it with `jstsnotebook.executionTimeoutMs` in settings.

### Kernel state after an error

If a cell throws, the kernel context is **not** reset. Variables defined before the error are still available. Use **Restart Kernel** to get a completely fresh state.

### Circular references in `return` values

The interactive tree renderer requires the value to be JSON-serializable. If the returned object contains circular references, the output falls back to the flat `util.inspect` text display.
