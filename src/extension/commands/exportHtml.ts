import * as vscode from 'vscode';
import * as path from 'path';
import type { ErrorPayload, ReturnPayload, TimingPayload, TablePayload } from '../../common/types';

// VS Code's special stdout/stderr MIME types
const STDOUT_MIME = 'application/vnd.code.notebook.stdout';
const STDERR_MIME = 'application/vnd.code.notebook.stderr';

export async function exportHtml(notebook: vscode.NotebookDocument): Promise<void> {
  const title = path.basename(notebook.uri.fsPath, '.jsnb');
  const cells = notebook.getCells();

  const parts = cells.map((cell) =>
    cell.kind === vscode.NotebookCellKind.Markup
      ? renderMarkdownCell(cell.document.getText())
      : renderCodeCell(cell)
  );

  const html = buildPage(title, parts.join('\n'));

  const suggestedUri = vscode.Uri.file(
    path.join(path.dirname(notebook.uri.fsPath), `${title}.html`)
  );

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: suggestedUri,
    filters: { HTML: ['html'] },
  });
  if (!saveUri) return;

  await vscode.workspace.fs.writeFile(saveUri, Buffer.from(html, 'utf8'));
  vscode.window.showInformationMessage(`Exported to ${path.basename(saveUri.fsPath)}`);
}

// ── Cell renderers ────────────────────────────────────────────────────────────

function renderMarkdownCell(source: string): string {
  return `<div class="cell cell-markdown">${markdownToHtml(source)}</div>`;
}

function renderCodeCell(cell: vscode.NotebookCell): string {
  const lang = cell.document.languageId === 'typescript' ? 'TS' : 'JS';
  const source = escHtml(cell.document.getText());
  const outputsHtml = cell.outputs.map(renderOutput).join('');

  return `<div class="cell cell-code">
  <div class="cell-header"><span class="cell-lang">${lang}</span></div>
  <pre class="cell-source"><code>${source}</code></pre>
  ${outputsHtml ? `<div class="cell-outputs">${outputsHtml}</div>` : ''}
</div>`;
}

// ── Output renderers ──────────────────────────────────────────────────────────

function renderOutput(output: vscode.NotebookCellOutput): string {
  // Use the first item whose MIME we recognise
  for (const item of output.items) {
    const html = renderOutputItem(item);
    if (html !== null) return html;
  }
  return '';
}

function renderOutputItem(item: vscode.NotebookCellOutputItem): string | null {
  const mime = item.mime;
  const text = () => new TextDecoder().decode(item.data);
  const json = <T>() => JSON.parse(text()) as T;

  if (mime === STDOUT_MIME) {
    return `<pre class="out-stdout">${escHtml(text())}</pre>`;
  }
  if (mime === STDERR_MIME) {
    return `<pre class="out-stderr">${escHtml(text())}</pre>`;
  }
  if (mime === 'application/vnd.jsnb.error+json') {
    const p = json<ErrorPayload>();
    const stack = p.stack
      ? `<details><summary>Stack trace</summary><pre>${escHtml(p.stack)}</pre></details>`
      : '';
    return `<div class="out-error"><strong>${escHtml(p.name)}: ${escHtml(p.message)}</strong>${stack}</div>`;
  }
  if (mime === 'application/vnd.jsnb.return+json') {
    const p = json<ReturnPayload>();
    return `<div class="out-return"><span class="ret-arrow">↩</span><span class="ret-value">${escHtml(p.value)}</span></div>`;
  }
  if (mime === 'application/vnd.jsnb.timing+json') {
    const p = json<TimingPayload>();
    const label = p.elapsedMs < 1000 ? `${p.elapsedMs} ms` : `${(p.elapsedMs / 1000).toFixed(2)} s`;
    return `<div class="out-timing">ran in ${escHtml(label)}</div>`;
  }
  if (mime === 'application/vnd.jsnb.table+json') {
    const p = json<TablePayload>();
    return renderTable(p);
  }
  if (mime === 'application/vnd.jsnb.chart+json') {
    // Embed Chart.js from CDN and render inline
    const config = text();
    const canvasId = `chart-${Math.random().toString(36).slice(2)}`;
    return `<div class="out-html">
<canvas id="${canvasId}" style="max-width:640px;height:320px;"></canvas>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"><\/script>
<script>new Chart(document.getElementById('${canvasId}'), ${config});<\/script>
</div>`;
  }
  if (mime === 'text/html') {
    return `<div class="out-html">${text()}</div>`;
  }
  if (mime.startsWith('image/')) {
    const b64 = Buffer.from(item.data).toString('base64');
    return `<img class="out-image" src="data:${mime};base64,${b64}" alt="output image">`;
  }
  if (mime === 'application/json') {
    try {
      return `<pre class="out-json">${escHtml(JSON.stringify(JSON.parse(text()), null, 2))}</pre>`;
    } catch {
      return `<pre class="out-json">${escHtml(text())}</pre>`;
    }
  }
  return null;
}

function renderTable(p: TablePayload): string {
  if (p.headers.length === 0) return '<div class="out-table"><em>(empty)</em></div>';

  const thead = `<thead><tr>${p.headers.map((h) => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody =
    '<tbody>' +
    p.rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escHtml(formatCell(cell))}</td>`).join('')}</tr>`
      )
      .join('') +
    '</tbody>';
  return `<div class="out-table"><table>${thead}${tbody}</table></div>`;
}

function formatCell(v: unknown): string {
  if (v === undefined) return '';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ── Inline markdown → HTML ────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(`<pre class="md-code"><code${lang ? ` class="language-${escHtml(lang)}"` : ''}>${escHtml(codeLines.join('\n'))}</code></pre>`);
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineHtml(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-blank lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^[#`*\-+\d]/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      out.push(`<p>${paraLines.map(inlineHtml).join('<br>')}</p>`);
    } else {
      // Fallback: emit line as paragraph
      out.push(`<p>${inlineHtml(line)}</p>`);
      i++;
    }
  }

  return out.join('\n');
}

function inlineHtml(text: string): string {
  // Order matters: escape HTML first, then apply inline patterns
  let s = escHtml(text);
  // Inline code (must come before bold/italic)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/_(.+?)_/g, '<em>$1</em>');
  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

// ── Page template ─────────────────────────────────────────────────────────────

function buildPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: #24292e;
    background: #fff;
    padding: 32px 16px;
  }
  .notebook { max-width: 920px; margin: 0 auto; }
  .cell { margin-bottom: 16px; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }

  /* Markdown cell */
  .cell-markdown { padding: 16px 24px; background: #fff; }
  .cell-markdown h1,.cell-markdown h2,.cell-markdown h3,
  .cell-markdown h4,.cell-markdown h5,.cell-markdown h6 {
    margin: 16px 0 8px; font-weight: 600; line-height: 1.3;
  }
  .cell-markdown h1 { font-size: 1.8em; border-bottom: 1px solid #e1e4e8; padding-bottom: 8px; }
  .cell-markdown h2 { font-size: 1.4em; border-bottom: 1px solid #e1e4e8; padding-bottom: 6px; }
  .cell-markdown p  { margin: 8px 0; }
  .cell-markdown ul,.cell-markdown ol { margin: 8px 0 8px 24px; }
  .cell-markdown li { margin: 4px 0; }
  .cell-markdown hr { border: none; border-top: 1px solid #e1e4e8; margin: 16px 0; }
  .cell-markdown pre.md-code { background: #f6f8fa; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 0.88em; }
  .cell-markdown code { background: #f3f4f6; border-radius: 3px; padding: 1px 5px; font-size: 0.9em; font-family: "SFMono-Regular", Consolas, monospace; }
  .cell-markdown pre code { background: none; padding: 0; }
  .cell-markdown a { color: #0366d6; text-decoration: none; }
  .cell-markdown a:hover { text-decoration: underline; }
  .cell-markdown strong { font-weight: 600; }

  /* Code cell */
  .cell-code { background: #f6f8fa; }
  .cell-header { padding: 4px 12px; background: #f0f2f5; border-bottom: 1px solid #e1e4e8; display: flex; align-items: center; gap: 8px; }
  .cell-lang { font-size: 0.72em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #6a737d; }
  .cell-source { padding: 12px 16px; overflow-x: auto; }
  .cell-source code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.88em; white-space: pre; color: #24292e; }

  /* Outputs */
  .cell-outputs { border-top: 1px solid #e1e4e8; background: #fff; }
  .out-stdout,.out-stderr,.out-json {
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 0.85em;
    padding: 10px 16px;
    white-space: pre-wrap;
    word-break: break-word;
    border-bottom: 1px solid #f0f2f5;
  }
  .out-stderr { color: #b31d28; background: #fff5f5; }
  .out-error {
    padding: 10px 16px;
    background: #fff5f5;
    border-left: 3px solid #d73a49;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 0.88em;
    color: #b31d28;
  }
  .out-error details { margin-top: 6px; }
  .out-error details summary { cursor: pointer; opacity: 0.75; font-size: 0.9em; }
  .out-error pre { margin-top: 6px; opacity: 0.7; font-size: 0.85em; overflow-x: auto; }
  .out-return {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 16px;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 0.88em;
    color: #6f42c1;
    border-bottom: 1px solid #f0f2f5;
  }
  .ret-arrow { opacity: 0.45; font-style: italic; user-select: none; }
  .ret-value { white-space: pre-wrap; word-break: break-word; }
  .out-timing {
    text-align: right;
    padding: 2px 12px 4px;
    font-size: 0.75em;
    color: #6a737d;
    font-family: "SFMono-Regular", Consolas, monospace;
  }
  .out-html { padding: 10px 16px; }
  .out-image { display: block; max-width: 100%; padding: 10px 16px; }
  .out-table { overflow-x: auto; padding: 8px 0; }
  .out-table table { border-collapse: collapse; min-width: 100%; font-size: 0.88em; font-family: "SFMono-Regular", Consolas, monospace; }
  .out-table th { text-align: left; padding: 4px 12px; border-bottom: 2px solid #e1e4e8; font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: #6a737d; }
  .out-table td { padding: 3px 12px; border-bottom: 1px solid #f0f2f5; color: #24292e; }
  .out-table tr:nth-child(even) td { background: #f9fafb; }
</style>
</head>
<body>
<div class="notebook">
${body}
</div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
