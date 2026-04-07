import * as vscode from 'vscode';
import { JsnbSerializer } from './serializer';
import { JsnbController } from './controller';
import { VariableInspectorProvider } from './variableInspector';

let controller: JsnbController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer('jstsnotebook', new JsnbSerializer(), {
      transientOutputs: false,
    })
  );

  const inspector = new VariableInspectorProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VariableInspectorProvider.viewId, inspector)
  );

  controller = new JsnbController(inspector);
  context.subscriptions.push({ dispose: () => controller?.dispose() });
}

export function deactivate(): void {
  controller?.dispose();
}
