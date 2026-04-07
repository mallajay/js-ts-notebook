import * as vscode from 'vscode';
import * as path from 'path';

export async function exportScript(notebook: vscode.NotebookDocument): Promise<void> {
  const cells = notebook.getCells();

  // Detect primary language (first code cell's language, default js)
  let primaryLanguage = 'javascript';
  for (const cell of cells) {
    if (cell.kind === vscode.NotebookCellKind.Code) {
      primaryLanguage = cell.document.languageId;
      break;
    }
  }
  const ext = primaryLanguage === 'typescript' ? 'ts' : 'js';

  const lines: string[] = [];
  let cellIndex = 0;

  for (const cell of cells) {
    cellIndex++;
    if (cell.kind === vscode.NotebookCellKind.Markup) {
      // Markdown cell → block comment
      const src = cell.document.getText().trim();
      if (src) {
        lines.push(`/* --- Cell ${cellIndex} (markdown) ---`);
        lines.push(src);
        lines.push('*/');
        lines.push('');
      }
    } else {
      // Code cell
      const src = cell.document.getText().trim();
      lines.push(`// --- Cell ${cellIndex} ---`);
      if (src) {
        lines.push(src);
      }
      lines.push('');
    }
  }

  const content = lines.join('\n');

  // Suggest a save path next to the notebook
  const notebookPath = notebook.uri.fsPath;
  const dir = path.dirname(notebookPath);
  const base = path.basename(notebookPath, '.jsnb');
  const suggestedUri = vscode.Uri.file(path.join(dir, `${base}.${ext}`));

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: suggestedUri,
    filters: { 'Script': [ext] },
  });

  if (!saveUri) return;

  await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
  vscode.window.showInformationMessage(`Exported to ${path.basename(saveUri.fsPath)}`);
}
