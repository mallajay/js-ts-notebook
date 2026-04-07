import type { RendererContext } from 'vscode-notebook-renderer';
import type { TimingPayload } from '../common/types';

export function renderTiming(
  outputItem: { json(): unknown },
  element: HTMLElement,
  _context: RendererContext<void>
): void {
  const payload = outputItem.json() as TimingPayload;
  const { elapsedMs } = payload;

  const label = elapsedMs < 1000
    ? `${elapsedMs} ms`
    : `${(elapsedMs / 1000).toFixed(2)} s`;

  element.style.cssText = `
    display: flex;
    justify-content: flex-end;
    padding: 2px 6px 0;
  `;

  const span = document.createElement('span');
  span.textContent = `ran in ${label}`;
  span.style.cssText = `
    font-size: 0.75em;
    opacity: 0.45;
    font-family: var(--vscode-editor-font-family, monospace);
    user-select: none;
  `;

  element.appendChild(span);
}
