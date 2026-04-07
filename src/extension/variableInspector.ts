import * as vscode from 'vscode';
import type { VariableInfo } from '../common/types';

export class VariableInspectorProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'jstsnotebook.variableInspector';

  private _view?: vscode.WebviewView;
  private _lastSnapshot: VariableInfo[] = [];

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.buildHtml();

    // Send the last known snapshot when the panel becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._post(this._lastSnapshot);
      }
    });
  }

  update(vars: VariableInfo[]): void {
    this._lastSnapshot = vars;
    this._post(vars);
  }

  clear(): void {
    this.update([]);
  }

  private _post(vars: VariableInfo[]): void {
    this._view?.webview.postMessage({ type: 'update', vars });
  }

  private buildHtml(): string {
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: transparent;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .empty {
    padding: 14px 16px;
    opacity: 0.5;
    font-style: italic;
    font-size: 0.9em;
  }
  .scroll {
    overflow-y: auto;
    flex: 1;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  thead {
    position: sticky;
    top: 0;
    z-index: 1;
  }
  thead th {
    background: var(--vscode-sideBarSectionHeader-background,
                    var(--vscode-sideBar-background, #252526));
    padding: 5px 8px;
    text-align: left;
    font-size: 0.78em;
    font-weight: 600;
    opacity: 0.65;
    border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    user-select: none;
  }
  th:nth-child(1) { width: 28%; }
  th:nth-child(2) { width: 22%; }
  th:nth-child(3) { width: 50%; }
  td {
    padding: 3px 8px;
    border-bottom: 1px solid var(--vscode-editorWidget-border, #2d2d2d);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.88em;
    cursor: default;
  }
  td.col-name  { color: var(--vscode-symbolIcon-variableForeground, #9cdcfe); }
  td.col-type  { color: var(--vscode-symbolIcon-classForeground, #4ec9b0); opacity: 0.85; }
  td.col-value { color: var(--vscode-debugTokenExpression-value, #ce9178); }
  tr:hover td  { background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.05)); }
</style>
</head>
<body>
  <div id="root"><div class="empty">Run a cell to inspect variables.</div></div>
  <script>
    const root = document.getElementById('root');

    window.addEventListener('message', ({ data }) => {
      if (data.type !== 'update') return;
      const vars = data.vars || [];
      if (vars.length === 0) {
        root.innerHTML = '<div class="empty">No variables yet. Run a cell first.</div>';
        return;
      }
      const rows = vars.map(v =>
        '<tr>' +
        '<td class="col-name"  title="' + esc(v.name)    + '">' + esc(v.name)    + '</td>' +
        '<td class="col-type"  title="' + esc(v.type)    + '">' + esc(v.type)    + '</td>' +
        '<td class="col-value" title="' + esc(v.preview) + '">' + esc(v.preview) + '</td>' +
        '</tr>'
      ).join('');
      root.innerHTML =
        '<div class="scroll"><table>' +
        '<thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table></div>';
    });

    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;
  }
}
