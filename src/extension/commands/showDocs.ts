import * as vscode from 'vscode';

let panel: vscode.WebviewPanel | undefined;

export function showDocs(): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'jstsnotebook.docs',
    'JS/TS Notebook — Docs',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = buildHtml();
  panel.onDidDispose(() => { panel = undefined; });
}

// ─────────────────────────────────────────────────────────────────────────────

function buildHtml(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
/* ── Reset & base ───────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--vscode-font-size, 13px);
  line-height: 1.65;
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  display: flex;
  min-height: 100vh;
}

/* ── Layout ─────────────────────────────────────────────────────────────── */
nav {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 20px 0 20px 16px;
  border-right: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
  font-size: 0.85em;
}
main {
  flex: 1;
  padding: 28px 36px 60px;
  max-width: 860px;
  overflow-x: hidden;
}

/* ── TOC ────────────────────────────────────────────────────────────────── */
nav .toc-title {
  font-weight: 700;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.5;
  margin-bottom: 10px;
}
nav a {
  display: block;
  padding: 3px 8px 3px 0;
  color: var(--vscode-foreground);
  text-decoration: none;
  opacity: 0.65;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
nav a:hover { opacity: 1; background: var(--vscode-list-hoverBackground); padding-left: 4px; }
nav a.active { opacity: 1; color: var(--vscode-textLink-foreground, #4fc3f7); }
nav .toc-sub { padding-left: 12px; font-size: 0.9em; }

/* ── Typography ─────────────────────────────────────────────────────────── */
h1 { font-size: 1.7em; font-weight: 700; margin-bottom: 6px; }
h2 {
  font-size: 1.18em; font-weight: 700;
  margin: 36px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
}
h3 { font-size: 1em; font-weight: 600; margin: 20px 0 8px; opacity: 0.85; }
p  { margin: 8px 0; }
ul, ol { margin: 8px 0 8px 20px; }
li { margin: 4px 0; }
strong { font-weight: 600; }
.subtitle { opacity: 0.55; margin-bottom: 24px; }
.badge {
  display: inline-block;
  background: var(--vscode-badge-background, rgba(128,128,128,0.3));
  color: var(--vscode-badge-foreground, inherit);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 0.8em;
  font-weight: 600;
  letter-spacing: 0.04em;
  vertical-align: middle;
  margin-left: 6px;
}
kbd {
  display: inline-block;
  background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.15));
  border: 1px solid var(--vscode-keybindingLabel-border, rgba(128,128,128,0.3));
  border-radius: 4px;
  padding: 1px 6px;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.85em;
}
.note {
  background: var(--vscode-textBlockQuote-background, rgba(128,128,128,0.1));
  border-left: 3px solid var(--vscode-textLink-foreground, #4fc3f7);
  padding: 8px 12px;
  margin: 12px 0;
  border-radius: 0 4px 4px 0;
  font-size: 0.9em;
}
.tip-icon { opacity: 0.7; }

/* ── Code blocks ────────────────────────────────────────────────────────── */
.code-wrap {
  position: relative;
  margin: 10px 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
}
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  background: var(--vscode-editorGroupHeader-tabsBackground,
               var(--vscode-tab-inactiveBackground, rgba(128,128,128,0.1)));
  border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.15));
}
.code-lang {
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  opacity: 0.6;
}
.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85em;
  opacity: 0.5;
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--vscode-foreground);
  transition: opacity 0.15s;
}
.copy-btn:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }
.copy-btn.copied { opacity: 1; color: #4caf50; }
pre {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  background: var(--vscode-textCodeBlock-background,
               var(--vscode-editor-background));
  font-family: var(--vscode-editor-font-family, "SFMono-Regular", Consolas, monospace);
  font-size: var(--vscode-editor-font-size, 13px);
  line-height: 1.5;
  white-space: pre;
}
code { color: var(--vscode-foreground); }
.inline-code {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.9em;
  background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Table ──────────────────────────────────────────────────────────────── */
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 0.9em; }
th {
  text-align: left;
  padding: 5px 10px;
  border-bottom: 2px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.3));
  font-weight: 600;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
td {
  padding: 4px 10px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.1));
}
tr:last-child td { border-bottom: none; }

/* ── Section divider ────────────────────────────────────────────────────── */
hr { border: none; border-top: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.15)); margin: 32px 0; }
</style>
</head>
<body>

<!-- ── Sidebar TOC ────────────────────────────────────────────────────── -->
<nav id="toc">
  <div class="toc-title">Contents</div>
  <a href="#getting-started">Getting Started</a>
  <a href="#shared-state">Shared State</a>
  <a href="#return-values">Return Values &amp; Tree</a>
  <a href="#await">Top-level Await</a>
  <a href="#require">require()</a>
  <a href="#typescript">TypeScript Cells</a>
  <a href="#console-table">console.table()</a>
  <a href="#display">$display(html)</a>
  <a href="#image">$image(data)</a>
  <a href="#chart">$chart(config)</a>
  <a href="#timing">Cell Timing</a>
  <a href="#inspector">Variable Inspector</a>
  <a href="#run-selection">Run Selection</a>
  <a href="#cancel">Cancel Execution</a>
  <a href="#snippets">Snippets</a>
  <a href="#export">Export</a>
  <a href="#config">Configuration</a>
  <a href="#errors">Error Handling</a>
  <a href="#gotchas">Gotchas</a>
</nav>

<!-- ── Main content ───────────────────────────────────────────────────── -->
<main>

<h1>JS/TS Notebook</h1>
<p class="subtitle">Interactive JavaScript &amp; TypeScript notebooks inside VS Code. Run cells with <kbd>Shift+Enter</kbd>, or press <strong>Run All</strong> in the toolbar.</p>

<!-- ── 1. Getting Started ───────────────────────────────────────────── -->
<h2 id="getting-started">Getting Started</h2>
<p>A <span class="inline-code">.jsnb</span> file is a plain JSON notebook. Each cell is either <strong>code</strong> (JS or TS) or <strong>markdown</strong>. All code cells share a single Node.js context — variables flow freely between them.</p>
<ul>
  <li><kbd>Shift+Enter</kbd> — run the focused cell</li>
  <li><strong>Run All</strong> button — run every cell top-to-bottom</li>
  <li><strong>Restart Kernel</strong> (↺ button) — clear all variables</li>
  <li><strong>Doc</strong> button (📖) — this panel</li>
</ul>

<!-- ── 2. Shared State ──────────────────────────────────────────────── -->
<h2 id="shared-state">Shared State</h2>
<p>Variables defined in one cell are available in every cell that runs after it. Use <span class="inline-code">let</span> or <span class="inline-code">const</span> — not <span class="inline-code">var</span> (see <a href="#gotchas">Gotchas</a>).</p>
${code('javascript', `// Cell 1 — define data
const employees = [
  { name: 'Alice', dept: 'Engineering', salary: 95000 },
  { name: 'Bob',   dept: 'Design',      salary: 82000 },
  { name: 'Carol', dept: 'Engineering', salary: 91000 },
];
console.log('Loaded', employees.length, 'employees');`)}
${code('javascript', `// Cell 2 — employees is available here
const engineers = employees.filter(e => e.dept === 'Engineering');
console.log(engineers.map(e => e.name));`)}

<!-- ── 3. Return Values ──────────────────────────────────────────────── -->
<h2 id="return-values">Return Values &amp; Interactive Tree</h2>
<p>End any cell with <span class="inline-code">return expr</span> to display the result inline. Objects and arrays render as a <strong>collapsible tree</strong> — click ▶ to expand nodes. Starts expanded one level deep.</p>
${code('javascript', `// Primitive — flat display
return 42 * Math.PI;`)}
${code('javascript', `// Object — interactive tree, click ▶ to expand nested keys
return {
  status: 'ok',
  meta: { version: 2, pages: 14 },
  data: { users: 42, active: 38, tags: ['prod', 'v2'] },
};`)}
${code('javascript', `// Array of objects — tree with indexed rows
return employees.map(e => ({ ...e, bonus: e.salary * 0.1 }));`)}
<div class="note"><span class="tip-icon">💡</span> Arrays larger than 100 items show a truncation notice. Circular references fall back to a flat <span class="inline-code">util.inspect</span> string.</div>

<!-- ── 4. Await ─────────────────────────────────────────────────────── -->
<h2 id="await">Top-level Await</h2>
<p>Use <span class="inline-code">await</span> directly in any cell — no async wrapper needed.</p>
${code('javascript', `// Wait for a timer
const result = await new Promise(resolve =>
  setTimeout(() => resolve({ status: 'done', value: 99 }), 300)
);
return result;`)}
${code('javascript', `// Fetch from a public API
const res  = await fetch('https://jsonplaceholder.typicode.com/todos/1');
const todo = await res.json();
return todo;`)}
${code('javascript', `// Parallel requests
const [user, posts] = await Promise.all([
  fetch('https://jsonplaceholder.typicode.com/users/1').then(r => r.json()),
  fetch('https://jsonplaceholder.typicode.com/posts?userId=1&_limit=3').then(r => r.json()),
]);
return { user: user.name, postCount: posts.length, posts };`)}

<!-- ── 5. require() ─────────────────────────────────────────────────── -->
<h2 id="require">require()</h2>
<p>Any Node.js built-in module or package in your workspace <span class="inline-code">node_modules</span> is available.</p>
${code('javascript', `// Built-in modules
const os   = require('os');
const path = require('path');
return {
  platform: os.platform(),
  cpus:     os.cpus().length,
  home:     os.homedir(),
  sep:      path.sep,
};`)}
${code('javascript', `// npm package example (run: npm install lodash)
const _ = require('lodash');
return _.groupBy(employees, 'dept');`)}

<!-- ── 6. TypeScript ────────────────────────────────────────────────── -->
<h2 id="typescript">TypeScript Cells</h2>
<p>Switch a cell's language to <strong>TypeScript</strong> using either method:</p>
<ul style="margin: 8px 0 12px 20px; line-height:2;">
  <li>Click the language badge in the <strong>bottom-right corner</strong> of the cell (shows <code style="background:var(--vscode-textBlockQuote-background);padding:1px 5px;border-radius:3px">JavaScript</code>) → select <strong>TypeScript</strong></li>
  <li>Open the cell <strong>…</strong> menu → <strong>Change Cell Language</strong> → TypeScript</li>
</ul>
<p>Type annotations are stripped at run time — execution is never blocked by type errors.</p>
${code('typescript', `interface Employee {
  name: string;
  dept: string;
  salary: number;
}

function topEarner(list: Employee[]): Employee {
  return list.reduce((best, e) => e.salary > best.salary ? e : best);
}

return topEarner(employees);   // employees is from the JS cells above`)}
${code('typescript', `// Generic utility
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

return groupBy(employees, 'dept');`)}
<div class="note"><span class="tip-icon">⚙️</span> Set per-notebook compiler options in <a href="#config">notebook metadata</a> — e.g. <span class="inline-code">"strict": true</span>.</div>

<!-- ── 7. console.table ────────────────────────────────────────────── -->
<h2 id="console-table">console.table()</h2>
<p><span class="inline-code">console.table()</span> renders as a proper HTML table with column headers and alternating row colors — not a text dump.</p>
${code('javascript', `// Array of objects → column per key
console.table(employees);`)}
${code('javascript', `// Plain object → key / value columns
console.table({ host: 'localhost', port: 3000, debug: true });`)}
${code('javascript', `// Array of primitives → index / value columns
console.table(['alpha', 'beta', 'gamma', 'delta']);`)}

<!-- ── 8. $display ─────────────────────────────────────────────────── -->
<h2 id="display">$display(html)</h2>
<p>Render any HTML string inline. Output is appended in order, so you can call <span class="inline-code">$display()</span> multiple times in one cell.</p>
${code('javascript', `// Styled summary card
const avgSalary = Math.round(
  employees.reduce((s, e) => s + e.salary, 0) / employees.length
);
$display(\`
  <div style="padding:14px 18px;background:var(--vscode-editor-background);
              border:1px solid var(--vscode-editorWidget-border);border-radius:8px;
              font-family:var(--vscode-font-family)">
    <h3 style="margin:0 0 10px;font-size:1em;opacity:0.6">TEAM SUMMARY</h3>
    <div style="font-size:1.4em;font-weight:700">\${employees.length} employees</div>
    <div style="opacity:0.7;margin-top:4px">Avg salary: <strong>$\${avgSalary.toLocaleString()}</strong></div>
  </div>
\`);`)}
${code('javascript', `// Progress bar
const pct = 72;
$display(\`
  <div style="font-family:var(--vscode-font-family);padding:8px 0">
    <div style="margin-bottom:4px;font-size:0.85em;opacity:0.7">Processing… \${pct}%</div>
    <div style="background:var(--vscode-editorWidget-border);border-radius:4px;height:8px;width:280px">
      <div style="background:#4caf50;width:\${pct}%;height:100%;border-radius:4px"></div>
    </div>
  </div>
\`);`)}
${code('javascript', `// SVG diagram
$display(\`
  <svg xmlns="http://www.w3.org/2000/svg" width="260" height="80">
    <rect width="260" height="80" rx="8" fill="#1e1e3f"/>
    <circle cx="40"  cy="40" r="20" fill="#4fc3f7" opacity="0.9"/>
    <circle cx="130" cy="40" r="20" fill="#a78bfa" opacity="0.9"/>
    <circle cx="220" cy="40" r="20" fill="#34d399" opacity="0.9"/>
    <line x1="60" y1="40" x2="110" y2="40" stroke="#aaa" stroke-width="2"/>
    <line x1="150" y1="40" x2="200" y2="40" stroke="#aaa" stroke-width="2"/>
    <text x="40"  y="72" text-anchor="middle" fill="#aaa" font-size="11">Input</text>
    <text x="130" y="72" text-anchor="middle" fill="#aaa" font-size="11">Process</text>
    <text x="220" y="72" text-anchor="middle" fill="#aaa" font-size="11">Output</text>
  </svg>
\`);`)}

<!-- ── 9. $image ───────────────────────────────────────────────────── -->
<h2 id="image">$image(data, mimeType?)</h2>
<p>Display images inline from a <span class="inline-code">Buffer</span>, <span class="inline-code">Uint8Array</span>, or base64 string. The image is saved with the notebook output.</p>
${code('javascript', `// Read a PNG from disk (provide your own file)
const fs  = require('fs');
const png = fs.readFileSync('./my-chart.png');
$image(png);                          // defaults to image/png`)}
${code('javascript', `// Read a JPEG
const fs  = require('fs');
$image(fs.readFileSync('./photo.jpg'), 'image/jpeg');`)}
${code('javascript', `// Generate with the 'canvas' package  (npm install canvas)
const { createCanvas } = require('canvas');
const c   = createCanvas(400, 160);
const ctx = c.getContext('2d');

ctx.fillStyle = '#1e1e2e';
ctx.fillRect(0, 0, 400, 160);

// Simple bar chart
const bars = [80, 130, 95, 170, 60];
bars.forEach((h, i) => {
  ctx.fillStyle = \`hsl(\${i * 60}, 70%, 55%)\`;
  ctx.fillRect(30 + i * 70, 160 - h, 50, h);
});

$image(c.toBuffer('image/png'));`)}
${code('javascript', `// From a base64 string
const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
$image(b64, 'image/png');`)}

<!-- ── 10. $chart ──────────────────────────────────────────────────── -->
<h2 id="chart">$chart(config)</h2>
<p>Pass any <a href="https://www.chartjs.org/docs/latest/">Chart.js 4.x</a> config object. Chart.js is bundled — works fully offline. Charts are destroyed and re-created when you re-run the cell.</p>
${code('javascript', `// Bar chart
$chart({
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Revenue ($k)',
      data: [120, 190, 80, 140, 200, 165],
      backgroundColor: 'rgba(79, 195, 247, 0.75)',
      borderColor:     'rgba(79, 195, 247, 1)',
      borderWidth: 1,
    }],
  },
  options: { responsive: true, plugins: { legend: { position: 'top' } } },
});`)}
${code('javascript', `// Multi-line chart
$chart({
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      { label: 'CPU %',  data: [45, 62, 55, 70, 48],
        borderColor: '#ef5350', backgroundColor: 'rgba(239,83,80,0.1)',
        fill: true, tension: 0.4 },
      { label: 'Memory %', data: [60, 65, 63, 68, 64],
        borderColor: '#42a5f5', backgroundColor: 'rgba(66,165,245,0.1)',
        fill: true, tension: 0.4 },
    ],
  },
});`)}
${code('javascript', `// Doughnut chart
$chart({
  type: 'doughnut',
  data: {
    labels: ['JavaScript', 'TypeScript', 'Python', 'Other'],
    datasets: [{
      data: [38, 29, 20, 13],
      backgroundColor: ['#f7df1e', '#3178c6', '#3572A5', '#888'],
      borderWidth: 2,
    }],
  },
  options: { plugins: { legend: { position: 'right' } } },
});`)}
${code('javascript', `// Scatter plot (randomly generated)
$chart({
  type: 'scatter',
  data: {
    datasets: [{
      label: 'Samples',
      data: Array.from({ length: 60 }, () => ({
        x: +(Math.random() * 100).toFixed(1),
        y: +(Math.random() * 100).toFixed(1),
      })),
      backgroundColor: 'rgba(167, 139, 250, 0.65)',
    }],
  },
  options: { scales: { x: { min: 0, max: 100 }, y: { min: 0, max: 100 } } },
});`)}

<!-- ── 11. Cell Timing ──────────────────────────────────────────────── -->
<h2 id="timing">Cell Timing</h2>
<p>Every cell automatically appends a faint <strong>"ran in N ms"</strong> label after its output. No code needed — it's always there.</p>
${code('javascript', `// This cell's timing will show ~250 ms
await new Promise(r => setTimeout(r, 250));
console.log('Done!');`)}

<!-- ── 12. Variable Inspector ──────────────────────────────────────── -->
<h2 id="inspector">Variable Inspector</h2>
<p>Click the <strong>⊹ (symbol-variable)</strong> icon in the Activity Bar (left sidebar) to open the <strong>Variables</strong> panel. After each cell run it lists every user-defined variable with its type and a value preview.</p>
${code('javascript', `// Run this, then check the Variables panel
const config  = { host: 'localhost', port: 3000, debug: false };
const numbers = [1, 4, 9, 16, 25];
const message = 'Hello from the inspector!';
const greet   = (name) => \`Hi, \${name}!\`;`)}
<div class="note"><span class="tip-icon">💡</span> The panel updates automatically after every execution and clears when you Restart Kernel. Switching notebooks updates it to show that notebook's variables.</div>

<!-- ── 13. Run Selection ────────────────────────────────────────────── -->
<h2 id="run-selection">Run Selection</h2>
<p>Highlight any text inside a code cell and press <kbd>Ctrl+Shift+Enter</kbd> (<kbd>Cmd+Shift+Enter</kbd> on Mac) to run <em>only the selected text</em>. The result is <strong>appended</strong> to existing outputs — useful for quickly testing sub-expressions.</p>
${code('javascript', `const items = [10, 20, 30, 40, 50];

// Select just this line, then hit Ctrl+Shift+Enter:
items.filter(n => n > 25)

// Or select just this:
items.reduce((sum, n) => sum + n, 0)`)}
<div class="note"><span class="tip-icon">💡</span> If nothing is selected, Run Selection falls back to executing the whole cell.</div>

<!-- ── 14. Cancel Execution ────────────────────────────────────────── -->
<h2 id="cancel">Cancel Execution</h2>
<p>When cells are running, VS Code shows a <strong>Stop ■</strong> button in the notebook toolbar. Clicking it cancels the remaining queued cells after the <em>current</em> cell finishes.</p>
${code('javascript', `// Click Stop while this is running to cancel any queued cells
await new Promise(r => setTimeout(r, 5000));
console.log('Finished (or cancelled before reaching this line)');`)}

<!-- ── 15. Snippets ────────────────────────────────────────────────── -->
<h2 id="snippets">Snippets</h2>
<p>Type a <span class="inline-code">jsnb-</span> prefix in any code cell and press <kbd>Tab</kbd> to expand:</p>
<table>
  <tr><th>Prefix</th><th>Inserts</th></tr>
  <tr><td><span class="inline-code">jsnb-fetch</span></td><td>await fetch(url) + .json() + return</td></tr>
  <tr><td><span class="inline-code">jsnb-require</span></td><td>const x = require('module')</td></tr>
  <tr><td><span class="inline-code">jsnb-display</span></td><td>$display(…) template</td></tr>
  <tr><td><span class="inline-code">jsnb-image</span></td><td>fs.readFileSync + $image(…)</td></tr>
  <tr><td><span class="inline-code">jsnb-table</span></td><td>console.table([…]) with sample rows</td></tr>
  <tr><td><span class="inline-code">jsnb-time</span></td><td>Date.now() timer harness with return</td></tr>
  <tr><td><span class="inline-code">jsnb-try</span></td><td>try { await … } catch (err) { … }</td></tr>
  <tr><td><span class="inline-code">jsnb-readfile</span></td><td>fs.readFileSync + return</td></tr>
</table>

<!-- ── 16. Export ─────────────────────────────────────────────────── -->
<h2 id="export">Export</h2>
<h3>Export as Script</h3>
<p>Toolbar <strong>$(export)</strong> button or <em>Command Palette → JS/TS Notebook: Export as Script</em>. Saves all code cells to a <span class="inline-code">.js</span> / <span class="inline-code">.ts</span> file. Markdown cells become block comments.</p>
${code('javascript', `// Output looks like this:
// --- Cell 1 ---
const employees = [ ... ];

/* --- Cell 2 (markdown) ---
## Analysis
*/

// --- Cell 3 ---
console.table(employees);`)}

<h3>Export as HTML</h3>
<p>Toolbar <strong>$(globe)</strong> button or <em>Command Palette → JS/TS Notebook: Export as HTML</em>. Produces a fully self-contained <span class="inline-code">.html</span> file with:</p>
<ul>
  <li>Markdown rendered (headings, bold, lists, code blocks, links)</li>
  <li>Code cells with language badge</li>
  <li>All outputs embedded: stdout/stderr, errors, return values, tables</li>
  <li><span class="inline-code">$display()</span> HTML preserved, <span class="inline-code">$image()</span> as base64 data URIs</li>
  <li><span class="inline-code">$chart()</span> rendered via Chart.js CDN</li>
</ul>

<!-- ── 17. Configuration ───────────────────────────────────────────── -->
<h2 id="config">Configuration</h2>
<h3>Execution timeout</h3>
<p>Change the per-cell timeout in VS Code Settings (<em>Extensions → JS/TS Notebook</em>) or in <span class="inline-code">.vscode/settings.json</span>:</p>
${code('json', `{
  "jstsnotebook.executionTimeoutMs": 60000
}`)}
<p>Default is <strong>30 000 ms</strong> (30 s). Minimum is 1 000 ms.</p>

<h3>Per-notebook TypeScript options</h3>
<p>Add a <span class="inline-code">tsConfig</span> key to the notebook metadata (<em>Edit → Notebook Metadata</em>):</p>
${code('json', `{
  "version": 1,
  "cells": [],
  "metadata": {
    "tsConfig": {
      "strict": true,
      "noImplicitAny": true,
      "target": "ES2020"
    }
  }
}`)}
<table>
  <tr><th>Key</th><th>Type</th><th>Default</th></tr>
  <tr><td><span class="inline-code">target</span></td><td>string</td><td>"ES2022" — ES5 / ES2015…ESNext</td></tr>
  <tr><td><span class="inline-code">strict</span></td><td>boolean</td><td>false</td></tr>
  <tr><td><span class="inline-code">noImplicitAny</span></td><td>boolean</td><td>false</td></tr>
  <tr><td><span class="inline-code">experimentalDecorators</span></td><td>boolean</td><td>true</td></tr>
  <tr><td><span class="inline-code">esModuleInterop</span></td><td>boolean</td><td>true</td></tr>
  <tr><td><span class="inline-code">allowJs</span></td><td>boolean</td><td>false</td></tr>
</table>

<!-- ── 18. Error Handling ─────────────────────────────────────────── -->
<h2 id="errors">Error Handling</h2>
<p>Unhandled errors render in a styled box with the error name, message, and a collapsible stack trace. The kernel context is <strong>not</strong> reset — variables before the error are still available.</p>
${code('javascript', `// Handled error — no red output
try {
  const data = JSON.parse('{ bad json }');
} catch (err) {
  console.error('Parse failed:', err.message);
  return { error: err.message, recovered: true };
}`)}
${code('javascript', `// Unhandled — shows the styled error renderer
throw new Error('Something went wrong!');`)}
${code('javascript', `// Async rejection
await Promise.reject(new TypeError('Network unreachable'));`)}
<div class="note"><span class="tip-icon">🔄</span> Use the <strong>↺ Restart Kernel</strong> button to wipe all variables and start fresh after an error.</div>

<!-- ── 19. Gotchas ────────────────────────────────────────────────── -->
<h2 id="gotchas">Gotchas</h2>

<h3>var doesn't persist across cells</h3>
<p>Each cell runs inside an async IIFE. <span class="inline-code">var</span> is scoped to that function and won't be visible in subsequent cells.</p>
${code('javascript', `var x = 10;   // ❌ gone after this cell
let y  = 10;  // ✅ persists
const z = 10; // ✅ persists`)}

<h3>Type errors don't block execution</h3>
<p>TypeScript cells use <span class="inline-code">ts.transpileModule()</span> — syntax transform only, no type-checking. The editor shows squiggles, but the cell still runs even if types are wrong.</p>

<h3>Circular references in return values</h3>
<p>The interactive tree needs a JSON-serialisable value. If your object has circular references, the output falls back to a flat <span class="inline-code">util.inspect</span> string.</p>
${code('javascript', `const a = {};
a.self = a;   // circular
return a;     // → flat text, no tree`)}

<h3>Execution timeout</h3>
<p>Cells time out after 30 s by default. Change it with <span class="inline-code">jstsnotebook.executionTimeoutMs</span>.</p>

<hr>
<p style="opacity:0.4;font-size:0.85em;text-align:center">JS/TS Notebook · Close this tab when done</p>

</main>

<script>
  // ── Active TOC highlight on scroll ──────────────────────────────────
  const sections = document.querySelectorAll('h2[id]');
  const links    = document.querySelectorAll('nav a');

  function updateActive() {
    let current = '';
    sections.forEach(s => {
      if (s.getBoundingClientRect().top <= 80) current = s.id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  document.querySelector('main').addEventListener('scroll', updateActive);
  window.addEventListener('scroll', updateActive);
  updateActive();

  // ── Copy buttons ─────────────────────────────────────────────────────
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-wrap').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋 Copy';
          btn.classList.remove('copied');
        }, 1800);
      });
    });
  });
</script>
</body>
</html>`;
}

// ── Helper: render a fenced code block with header + copy button ──────────────

function code(lang: string, src: string): string {
  const badge = lang === 'typescript' ? 'TS' : lang === 'json' ? 'JSON' : 'JS';
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div class="code-wrap">
  <div class="code-header">
    <span class="code-lang">${badge}</span>
    <button class="copy-btn">📋 Copy</button>
  </div>
  <pre><code>${escaped}</code></pre>
</div>`;
}
