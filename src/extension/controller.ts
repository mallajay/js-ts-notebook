import * as vscode from 'vscode';
import { KernelSession } from './kernelSession';
import { executeCell } from './executor';
import { exportScript } from './commands/exportScript';
import { exportHtml } from './commands/exportHtml';
import { showDocs } from './commands/showDocs';
import { VariableInspectorProvider } from './variableInspector';

export class JsnbController {
  private readonly controller: vscode.NotebookController;
  private sessions = new Map<vscode.NotebookDocument, KernelSession>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly inspector: VariableInspectorProvider;
  private cancelTokenSource: vscode.CancellationTokenSource | null = null;

  constructor(inspector: VariableInspectorProvider) {
    this.inspector = inspector;

    this.controller = vscode.notebooks.createNotebookController(
      'jstsnotebook-kernel',
      'jstsnotebook',
      'JS/TS Kernel'
    );
    this.controller.supportedLanguages = ['javascript', 'typescript'];
    this.controller.supportsExecutionOrder = true;
    this.controller.description = 'Runs JS/TS cells using Node.js vm module';
    this.controller.executeHandler = this.executeHandler.bind(this);

    // F10 — VS Code shows a Stop button automatically when interruptHandler is set
    this.controller.interruptHandler = async (_notebook) => {
      this.cancelTokenSource?.cancel();
    };

    this.disposables.push(
      vscode.workspace.onDidCloseNotebookDocument((doc) => {
        this.sessions.get(doc)?.dispose();
        this.sessions.delete(doc);
      }),
      // Update inspector when the user switches to a different notebook
      vscode.window.onDidChangeActiveNotebookEditor((editor) => {
        if (!editor) {
          this.inspector.clear();
          return;
        }
        const session = this.sessions.get(editor.notebook);
        this.inspector.update(session ? session.getVariableSnapshot() : []);
      }),
      vscode.commands.registerCommand('jstsnotebook.restartKernel', () => {
        const doc = vscode.window.activeNotebookEditor?.notebook;
        if (!doc) return;
        const session = this.sessions.get(doc);
        if (session) {
          session.reset();
          this.inspector.clear();
          vscode.window.showInformationMessage('JS/TS Notebook: Kernel restarted.');
        }
      }),
      vscode.commands.registerCommand('jstsnotebook.clearOutputs', async () => {
        const editor = vscode.window.activeNotebookEditor;
        if (!editor) return;
        const edit = new vscode.WorkspaceEdit();
        const nbEdit = vscode.NotebookEdit.replaceCellOutput(
          new vscode.NotebookRange(0, editor.notebook.cellCount),
          []
        );
        edit.set(editor.notebook.uri, [nbEdit]);
        await vscode.workspace.applyEdit(edit);
      }),
      vscode.commands.registerCommand('jstsnotebook.exportScript', () => {
        const doc = vscode.window.activeNotebookEditor?.notebook;
        if (!doc) return;
        exportScript(doc);
      }),
      // F12 — Export to HTML
      vscode.commands.registerCommand('jstsnotebook.exportHtml', () => {
        const doc = vscode.window.activeNotebookEditor?.notebook;
        if (!doc) return;
        exportHtml(doc);
      }),
      // Doc panel
      vscode.commands.registerCommand('jstsnotebook.showDocs', () => showDocs()),
      // F9 — Run selected text in the active cell
      vscode.commands.registerCommand('jstsnotebook.runSelection', async () => {
        const notebookEditor = vscode.window.activeNotebookEditor;
        const textEditor = vscode.window.activeTextEditor;
        if (!notebookEditor || !textEditor) return;

        const notebook = notebookEditor.notebook;
        if (notebook.notebookType !== 'jstsnotebook') return;

        const cellIndex = notebookEditor.selection.start;
        const cell = notebook.cellAt(cellIndex);
        if (cell.kind !== vscode.NotebookCellKind.Code) return;

        const sel = textEditor.selection;
        const source = sel.isEmpty
          ? cell.document.getText()
          : cell.document.getText(sel);

        const session = this.getSession(notebook);
        const tsConfig = notebook.metadata?.tsConfig as Record<string, unknown> | undefined;

        const execution = this.controller.createNotebookCellExecution(cell);
        execution.start(Date.now());

        try {
          const outputs = await executeCell(source, cell.document.languageId, session, tsConfig);
          await execution.appendOutput(outputs);
          execution.end(true, Date.now());
        } catch (err) {
          const errOutput = new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.error(
              err instanceof Error ? err : new Error(String(err))
            ),
          ]);
          await execution.appendOutput([errOutput]);
          execution.end(false, Date.now());
        }

        this.inspector.update(session.getVariableSnapshot());
      })
    );
  }

  private getSession(doc: vscode.NotebookDocument): KernelSession {
    let session = this.sessions.get(doc);
    if (!session) {
      session = new KernelSession();
      this.sessions.set(doc, session);
    }
    return session;
  }

  private async executeHandler(
    cells: vscode.NotebookCell[],
    notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): Promise<void> {
    const session = this.getSession(notebook);
    const tsConfig = notebook.metadata?.tsConfig as Record<string, unknown> | undefined;

    // F10 — set up cancellation for this execution batch
    this.cancelTokenSource?.dispose();
    this.cancelTokenSource = new vscode.CancellationTokenSource();
    const { token } = this.cancelTokenSource;

    try {
      for (const cell of cells) {
        if (token.isCancellationRequested) break;
        await this.doExecuteCell(cell, session, tsConfig);
      }
    } finally {
      this.cancelTokenSource.dispose();
      this.cancelTokenSource = null;
    }

    // Update inspector once after all queued cells finish
    this.inspector.update(session.getVariableSnapshot());
  }

  private async doExecuteCell(
    cell: vscode.NotebookCell,
    session: KernelSession,
    tsConfig?: Record<string, unknown>
  ): Promise<void> {
    const execution = this.controller.createNotebookCellExecution(cell);
    execution.start(Date.now());
    execution.clearOutput();

    try {
      const outputs = await executeCell(
        cell.document.getText(),
        cell.document.languageId,
        session,
        tsConfig
      );
      await execution.replaceOutput(outputs);
      execution.end(true, Date.now());
    } catch (err) {
      const errOutput = new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.error(
          err instanceof Error ? err : new Error(String(err))
        ),
      ]);
      await execution.replaceOutput([errOutput]);
      execution.end(false, Date.now());
    }
  }

  dispose(): void {
    this.cancelTokenSource?.cancel();
    this.cancelTokenSource?.dispose();
    for (const session of this.sessions.values()) {
      session.dispose();
    }
    this.sessions.clear();
    this.controller.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
