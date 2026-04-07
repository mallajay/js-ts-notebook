import type { OutputItem } from 'vscode-notebook-renderer';
import type { ErrorPayload } from '../common/types';

export function renderError(outputItem: OutputItem, element: HTMLElement): void {
  const payload = outputItem.json() as ErrorPayload;

  element.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = `
    background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: var(--vscode-editor-font-size, 13px);
    color: var(--vscode-errorForeground, #f48771);
    white-space: pre-wrap;
    word-break: break-word;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
  header.textContent = `${payload.name}: ${payload.message}`;
  container.appendChild(header);

  if (payload.stack) {
    const stackLines = payload.stack
      .split('\n')
      .slice(1) // skip first line which repeats name: message
      .join('\n')
      .trim();

    if (stackLines) {
      const details = document.createElement('details');
      details.style.marginTop = '4px';

      const summary = document.createElement('summary');
      summary.style.cssText = 'cursor: pointer; opacity: 0.7; font-size: 0.9em;';
      summary.textContent = 'Stack trace';
      details.appendChild(summary);

      const pre = document.createElement('pre');
      pre.style.cssText = `
        margin: 6px 0 0 0;
        opacity: 0.8;
        font-size: 0.9em;
        overflow-x: auto;
      `;
      pre.textContent = stackLines;
      details.appendChild(pre);

      container.appendChild(details);
    }
  }

  element.appendChild(container);
}
