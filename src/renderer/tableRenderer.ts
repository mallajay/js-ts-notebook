import type { TablePayload } from '../common/types';

export function renderTable(
  outputItem: { json(): unknown },
  element: HTMLElement
): void {
  const payload = outputItem.json() as TablePayload;
  const { headers, rows } = payload;

  element.style.cssText = `
    padding: 4px 0;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: var(--vscode-editor-font-size, 13px);
  `;

  if (headers.length === 0) {
    const empty = document.createElement('span');
    empty.textContent = '(empty table)';
    empty.style.opacity = '0.5';
    element.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.style.cssText = `
    border-collapse: collapse;
    min-width: 100%;
  `;

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText = `
      text-align: left;
      padding: 3px 12px 3px 6px;
      border-bottom: 1px solid var(--vscode-editorWidget-border, #444);
      color: var(--vscode-foreground);
      opacity: 0.7;
      font-weight: 600;
      white-space: nowrap;
    `;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body rows
  const tbody = document.createElement('tbody');
  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    if (rowIdx % 2 === 1) {
      tr.style.background = 'var(--vscode-list-hoverBackground, rgba(255,255,255,0.04))';
    }
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = formatCell(cell);
      td.style.cssText = `
        padding: 2px 12px 2px 6px;
        border-bottom: 1px solid var(--vscode-editorWidget-border, #333);
        color: var(--vscode-debugTokenExpression-value, inherit);
        white-space: nowrap;
      `;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  element.appendChild(table);
}

function formatCell(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
