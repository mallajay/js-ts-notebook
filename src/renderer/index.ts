import type { ActivationFunction, RendererContext } from 'vscode-notebook-renderer';
import { renderError } from './errorRenderer';
import { renderReturn } from './returnRenderer';
import { renderTiming } from './timingRenderer';
import { renderTable } from './tableRenderer';
import { renderChart, disposeChart } from './chartRenderer';
import { MIME_ERROR, MIME_RETURN, MIME_TIMING, MIME_TABLE, MIME_CHART } from '../common/mimeTypes';

export const activate: ActivationFunction = (context) => {
  return {
    renderOutputItem(outputItem, element) {
      const mime = outputItem.mime;

      if (mime === MIME_ERROR) {
        renderError(outputItem, element);
      } else if (mime === MIME_RETURN) {
        renderReturn(outputItem, element);
      } else if (mime === MIME_TIMING) {
        renderTiming(outputItem, element, context as RendererContext<void>);
      } else if (mime === MIME_TABLE) {
        renderTable(outputItem, element);
      } else if (mime === MIME_CHART) {
        renderChart(outputItem, element);
      }
    },
    disposeOutputItem(id) {
      if (id) disposeChart(id);
    },
  };
};
