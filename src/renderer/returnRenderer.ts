import type { OutputItem } from 'vscode-notebook-renderer';
import type { ReturnPayload } from '../common/types';

const MAX_ARRAY_ITEMS = 100;

// Inject tree styles once per renderer activation
function ensureStyles(): void {
  if (document.getElementById('jsnb-tree-styles')) return;
  const s = document.createElement('style');
  s.id = 'jsnb-tree-styles';
  s.textContent = `
    .jsnb-tree {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
      padding: 2px 0;
    }
    .jsnb-tree .ret-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .jsnb-tree .ret-arrow {
      font-style: italic;
      opacity: 0.5;
      user-select: none;
      flex-shrink: 0;
      padding-top: 1px;
    }
    .jsnb-tree details { margin-left: 0; }
    .jsnb-tree details > summary {
      cursor: pointer;
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      user-select: none;
    }
    .jsnb-tree details > summary::before {
      content: '▶';
      font-size: 0.65em;
      opacity: 0.6;
      transition: transform 0.1s;
      flex-shrink: 0;
    }
    .jsnb-tree details[open] > summary::before { content: '▼'; }
    .jsnb-tree ul {
      list-style: none;
      margin: 0;
      padding-left: 20px;
      border-left: 1px solid var(--vscode-editorIndentGuide-background, rgba(128,128,128,0.2));
    }
    .jsnb-tree li { padding: 1px 0; }
    .jsnb-tree .t-key    { color: var(--vscode-debugTokenExpression-name, #9cdcfe); }
    .jsnb-tree .t-str    { color: var(--vscode-debugTokenExpression-string, #ce9178); }
    .jsnb-tree .t-num    { color: var(--vscode-debugTokenExpression-number, #b5cea8); }
    .jsnb-tree .t-bool   { color: var(--vscode-debugTokenExpression-boolean, #569cd6); }
    .jsnb-tree .t-null   { color: var(--vscode-debugTokenExpression-value, #569cd6); opacity: 0.7; }
    .jsnb-tree .t-obj    { color: var(--vscode-foreground); opacity: 0.8; }
    .jsnb-tree .t-fn     { color: var(--vscode-symbolIcon-functionForeground, #dcdcaa); }
    .jsnb-tree .t-plain  { color: var(--vscode-debugTokenExpression-value, #ce9178); white-space: pre-wrap; word-break: break-word; }
    .jsnb-tree .t-trunc  { opacity: 0.5; font-style: italic; }
  `;
  document.head.appendChild(s);
}

export function renderReturn(outputItem: OutputItem, element: HTMLElement): void {
  ensureStyles();
  const payload = outputItem.json() as ReturnPayload;
  element.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'jsnb-tree';

  // If we have a raw JSON-serializable object/array, render interactive tree
  if (payload.raw !== undefined && payload.raw !== null && typeof payload.raw === 'object') {
    const row = document.createElement('div');
    row.className = 'ret-row';

    const arrow = document.createElement('span');
    arrow.className = 'ret-arrow';
    arrow.textContent = '↩';
    row.appendChild(arrow);

    row.appendChild(buildNode(payload.raw, 0));
    container.appendChild(row);
  } else {
    // Primitive or circular — flat display
    const row = document.createElement('div');
    row.className = 'ret-row';

    const arrow = document.createElement('span');
    arrow.className = 'ret-arrow';
    arrow.textContent = '↩';
    row.appendChild(arrow);

    const val = document.createElement('span');
    val.className = 't-plain';
    val.textContent = payload.value;
    row.appendChild(val);
    container.appendChild(row);
  }

  element.appendChild(container);
}

// ── Tree builder ──────────────────────────────────────────────────────────────

function buildNode(value: unknown, depth: number): HTMLElement | Text {
  if (value === null)      return colorSpan('null', 't-null');
  if (value === undefined) return colorSpan('undefined', 't-null');

  if (typeof value === 'string') {
    const s = value.length > 200 ? value.slice(0, 197) + '…' : value;
    return colorSpan(`"${s}"`, 't-str');
  }
  if (typeof value === 'number')  return colorSpan(String(value), 't-num');
  if (typeof value === 'boolean') return colorSpan(String(value), 't-bool');

  if (typeof value === 'function') {
    const name = (value as { name?: string }).name;
    return colorSpan(`ƒ ${name || '(anonymous)'}()`, 't-fn');
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return colorSpan('[]', 't-obj');
    return buildExpandable(
      colorSpan(`Array(${value.length})`, 't-obj'),
      () => buildArrayChildren(value, depth + 1),
      depth < 1
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return colorSpan('{}', 't-obj');
    const ctor = (value as object).constructor?.name;
    const label = ctor && ctor !== 'Object' ? `${ctor} {${keys.length}}` : `{${keys.length}}`;
    return buildExpandable(
      colorSpan(label, 't-obj'),
      () => buildObjectChildren(value as Record<string, unknown>, keys, depth + 1),
      depth < 1
    );
  }

  return colorSpan(String(value), 't-plain');
}

function buildExpandable(
  summary: HTMLElement,
  buildChildren: () => HTMLElement,
  open: boolean
): HTMLElement {
  const details = document.createElement('details');
  if (open) details.open = true;

  const sum = document.createElement('summary');
  sum.appendChild(summary);
  details.appendChild(sum);

  // Lazy-render children on first expand to keep initial render fast
  let rendered = false;
  const render = () => {
    if (rendered) return;
    rendered = true;
    details.appendChild(buildChildren());
  };

  if (open) {
    render();
  } else {
    details.addEventListener('toggle', render, { once: true });
  }

  return details;
}

function buildArrayChildren(arr: unknown[], depth: number): HTMLElement {
  const ul = document.createElement('ul');
  const limit = Math.min(arr.length, MAX_ARRAY_ITEMS);
  for (let i = 0; i < limit; i++) {
    ul.appendChild(buildEntry(String(i), arr[i], depth));
  }
  if (arr.length > MAX_ARRAY_ITEMS) {
    const li = document.createElement('li');
    const trunc = document.createElement('span');
    trunc.className = 't-trunc';
    trunc.textContent = `… ${arr.length - MAX_ARRAY_ITEMS} more items`;
    li.appendChild(trunc);
    ul.appendChild(li);
  }
  return ul;
}

function buildObjectChildren(
  obj: Record<string, unknown>,
  keys: string[],
  depth: number
): HTMLElement {
  const ul = document.createElement('ul');
  for (const key of keys) {
    ul.appendChild(buildEntry(key, obj[key], depth));
  }
  return ul;
}

function buildEntry(key: string, value: unknown, depth: number): HTMLElement {
  const li = document.createElement('li');
  const keySpan = colorSpan(`${key}: `, 't-key');
  li.appendChild(keySpan);
  li.appendChild(buildNode(value, depth) as HTMLElement);
  return li;
}

function colorSpan(text: string, cls: string): HTMLElement {
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = text;
  return span;
}
