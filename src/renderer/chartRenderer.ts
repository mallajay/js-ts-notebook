import type { OutputItem } from 'vscode-notebook-renderer';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components (scales, elements, plugins, controllers)
Chart.register(...registerables);

// Track live chart instances so they can be destroyed when outputs are cleared
const instances = new Map<string, Chart>();

export function renderChart(outputItem: OutputItem, element: HTMLElement): void {
  // Destroy any previous chart occupying this output slot
  const prev = instances.get(outputItem.id);
  if (prev) {
    prev.destroy();
    instances.delete(outputItem.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = outputItem.json() as any;

  element.innerHTML = '';
  element.style.cssText = 'padding: 8px 4px; display: flex; justify-content: center;';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 640px;
    height: 320px;
  `;

  const canvas = document.createElement('canvas');
  wrapper.appendChild(canvas);
  element.appendChild(wrapper);

  try {
    // Ensure Chart.js defaults are friendly for VS Code's dark/light themes
    const defaults = Chart.defaults;
    defaults.color = getComputedStyle(document.body)
      .getPropertyValue('--vscode-foreground') || '#ccc';
    defaults.borderColor = getComputedStyle(document.body)
      .getPropertyValue('--vscode-editorWidget-border') || '#444';

    const chart = new Chart(canvas, config);
    instances.set(outputItem.id, chart);
  } catch (err) {
    element.innerHTML = '';
    const msg = document.createElement('div');
    msg.style.cssText = `
      padding: 8px 12px;
      color: var(--vscode-errorForeground, #f44);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.9em;
    `;
    msg.textContent = `$chart error: ${String(err)}`;
    element.appendChild(msg);
  }
}

export function disposeChart(id: string): void {
  const chart = instances.get(id);
  if (chart) {
    chart.destroy();
    instances.delete(id);
  }
}
