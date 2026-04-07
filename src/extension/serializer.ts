import * as vscode from 'vscode';
import type { JsnbFile, JsnbCell, JsnbOutput } from '../common/types';

export class JsnbSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    const text = new TextDecoder().decode(content);

    let file: JsnbFile;
    if (text.trim().length === 0) {
      file = { version: 1, cells: [], metadata: {} };
    } else {
      file = JSON.parse(text) as JsnbFile;
    }

    const cells = file.cells.map((cell) => {
      const kind =
        cell.kind === 'markdown'
          ? vscode.NotebookCellKind.Markup
          : vscode.NotebookCellKind.Code;

      const outputs = cell.outputs.map((o) => {
        let outputItem: vscode.NotebookCellOutputItem;
        if (isJsonMime(o.mime)) {
          try {
            outputItem = vscode.NotebookCellOutputItem.json(JSON.parse(o.data), o.mime);
          } catch {
            outputItem = vscode.NotebookCellOutputItem.text(o.data, o.mime);
          }
        } else if (isBase64Binary(o.mime)) {
          const bytes = Buffer.from(o.data, 'base64');
          outputItem = new vscode.NotebookCellOutputItem(bytes, o.mime);
        } else {
          outputItem = vscode.NotebookCellOutputItem.text(o.data, o.mime);
        }
        return new vscode.NotebookCellOutput([outputItem]);
      });

      const notebookCell = new vscode.NotebookCellData(kind, cell.source, cell.language);
      notebookCell.outputs = outputs;
      notebookCell.metadata = cell.metadata;
      return notebookCell;
    });

    const data = new vscode.NotebookData(cells);
    data.metadata = file.metadata ?? {};
    return data;
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const cells: JsnbCell[] = data.cells.map((cell) => {
      const kind = cell.kind === vscode.NotebookCellKind.Markup ? 'markdown' : 'code';

      const outputs: JsnbOutput[] = (cell.outputs ?? []).flatMap((output) =>
        output.items.map((item) => {
          const text = new TextDecoder().decode(item.data);
          return { mime: item.mime, data: text };
        })
      );

      return {
        kind,
        language: cell.languageId,
        source: cell.value,
        outputs,
        metadata: (cell.metadata as Record<string, unknown>) ?? {},
      };
    });

    const file: JsnbFile = {
      version: 1,
      cells,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    };

    return new TextEncoder().encode(JSON.stringify(file, null, 2));
  }
}

function isBase64Binary(mime: string): boolean {
  return mime.startsWith('image/') || mime === 'application/octet-stream';
}

function isJsonMime(mime: string): boolean {
  return mime === 'application/json' || mime.startsWith('application/vnd.') || mime.endsWith('+json');
}
