import * as vm from 'vm';
import * as util from 'util';
import * as vscode from 'vscode';
import { transpileCell } from './transpiler';
import { hoistDeclarations } from './hoistDeclarations';
import { installCapture, CapturedItem } from './outputCapture';
import type { KernelSession } from './kernelSession';
import type { DisplayItem, ErrorPayload, ReturnPayload, TimingPayload } from '../common/types';
import { MIME_ERROR, MIME_JSON, MIME_RETURN, MIME_TIMING } from '../common/mimeTypes';

export async function executeCell(
  source: string,
  language: string,
  session: KernelSession,
  tsConfig?: Record<string, unknown>
): Promise<vscode.NotebookCellOutput[]> {
  const startTime = Date.now();
  const outputs = await runCell(source, language, session, tsConfig);
  outputs.push(makeTimingOutput(startTime));
  return outputs;
}

async function runCell(
  source: string,
  language: string,
  session: KernelSession,
  tsConfig?: Record<string, unknown>
): Promise<vscode.NotebookCellOutput[]> {
  // 1. Transpile TypeScript → JavaScript (with optional per-notebook compiler options)
  let jsCode: string;
  try {
    jsCode = transpileCell(source, language, tsConfig);
  } catch (err) {
    return [makeErrorOutput(err)];
  }

  // 2. Hoist top-level declarations to globalThis so they persist across cells
  jsCode = hoistDeclarations(jsCode);

  // 3. Install output capture (fresh per cell)
  const capture = installCapture(session.context);

  // 4. Reset display queue for this cell
  session.context.__displayQueue = [];

  // 5. Wrap in async IAFE — `return value` inside the cell resolves the promise
  const wrapped = `(async () => {\n${jsCode}\n})()`;

  // 6. Read timeout from configuration
  const timeoutMs = vscode.workspace
    .getConfiguration('jstsnotebook')
    .get<number>('executionTimeoutMs', 30_000);

  // 7. Execute synchronously (starts the async IAFE)
  let cellPromise: Promise<unknown>;
  try {
    cellPromise = vm.runInContext(wrapped, session.context, {
      timeout: timeoutMs,
      filename: `cell.${language === 'typescript' ? 'ts' : 'js'}`,
    }) as Promise<unknown>;
  } catch (err) {
    return [...consoleOutputs(capture.getItems()), makeErrorOutput(err)];
  }

  // 8. Await the IAFE promise; the resolved value is the cell's `return` value
  let returnValue: unknown;
  try {
    returnValue = await cellPromise;
  } catch (err) {
    return [...consoleOutputs(capture.getItems()), makeErrorOutput(err)];
  }

  // 9. Collect console outputs
  const outputs: vscode.NotebookCellOutput[] = consoleOutputs(capture.getItems());

  // 10. Drain $display() / $image() queue
  const displayQueue = session.context.__displayQueue as DisplayItem[];
  for (const item of displayQueue) {
    let outputItem: vscode.NotebookCellOutputItem;
    if (item.bytes !== undefined) {
      outputItem = new vscode.NotebookCellOutputItem(item.bytes, item.mime);
    } else if (item.text !== undefined) {
      outputItem = vscode.NotebookCellOutputItem.text(item.text, item.mime);
    } else {
      outputItem = vscode.NotebookCellOutputItem.json(item.json, item.mime);
    }
    outputs.push(new vscode.NotebookCellOutput([outputItem]));
  }

  // 11. Show return value if the cell explicitly returned something
  if (returnValue !== undefined) {
    outputs.push(makeReturnOutput(returnValue));
  }

  return outputs;
}

function consoleOutputs(items: CapturedItem[]): vscode.NotebookCellOutput[] {
  return items.map((item) => {
    if (item.stream === 'rich') {
      return new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.json(item.data, item.mime),
      ]);
    }
    const outputItem =
      item.stream === 'stderr'
        ? vscode.NotebookCellOutputItem.stderr(item.text)
        : vscode.NotebookCellOutputItem.stdout(item.text);
    return new vscode.NotebookCellOutput([outputItem]);
  });
}

function makeErrorOutput(err: unknown): vscode.NotebookCellOutput {
  let payload: ErrorPayload;
  if (err instanceof Error) {
    payload = { name: err.name, message: err.message, stack: err.stack };
  } else {
    payload = { name: 'Error', message: util.inspect(err) };
  }
  return new vscode.NotebookCellOutput([
    vscode.NotebookCellOutputItem.json(payload, MIME_ERROR),
  ]);
}

function makeReturnOutput(value: unknown): vscode.NotebookCellOutput {
  if (value !== null && typeof value === 'object') {
    // Include raw value for the interactive tree renderer; skip if circular / non-serializable
    let raw: unknown;
    try { JSON.stringify(value); raw = value; } catch { /* circular — omit */ }

    const payload: ReturnPayload = {
      value: util.inspect(value, { depth: 6, colors: false }),
      type: Array.isArray(value) ? 'array' : 'object',
      raw,
    };
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.json(payload, MIME_RETURN),
      vscode.NotebookCellOutputItem.json(value, MIME_JSON),
    ]);
  }

  const payload: ReturnPayload = {
    value: String(value),
    type: typeof value,
  };
  return new vscode.NotebookCellOutput([
    vscode.NotebookCellOutputItem.json(payload, MIME_RETURN),
  ]);
}

function makeTimingOutput(startTime: number): vscode.NotebookCellOutput {
  const payload: TimingPayload = { elapsedMs: Date.now() - startTime };
  return new vscode.NotebookCellOutput([
    vscode.NotebookCellOutputItem.json(payload, MIME_TIMING),
  ]);
}
