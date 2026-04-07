import * as vm from 'vm';
import * as util from 'util';
import type { DisplayItem, VariableInfo } from '../common/types';
import { MIME_CHART } from '../common/mimeTypes';

// Names injected by createContext — excluded from the variable snapshot
const BUILTIN_NAMES = new Set([
  'require', 'Buffer', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
  'process', 'util', 'console', '__displayQueue', '$display', '$image', '$chart',
]);

export class KernelSession {
  public context: vm.Context;

  constructor() {
    this.context = this.createContext();
  }

  private createContext(): vm.Context {
    const displayQueue: DisplayItem[] = [];

    const sandbox: Record<string, unknown> = {
      // Node globals
      require,
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      setImmediate,
      clearImmediate,
      process: {
        env: process.env,
        argv: process.argv,
        platform: process.platform,
        version: process.version,
        versions: process.versions,
      },
      // Fetch API (Node 18+)
      fetch,
      Headers,
      Request,
      Response,
      // util for user cells
      util,
      // Display queue for $display() — reset each cell execution by executor
      __displayQueue: displayQueue,
      // $display(html): render arbitrary HTML inline
      $display: (html: string) => {
        (sandbox.__displayQueue as DisplayItem[]).push({ mime: 'text/html', text: html });
      },
      // $image(data, mimeType?): render an image inline
      // data: Buffer | Uint8Array | base64 string
      $image: (data: Buffer | Uint8Array | string, mimeType = 'image/png') => {
        let bytes: Uint8Array;
        if (typeof data === 'string') {
          bytes = Buffer.from(data, 'base64');
        } else {
          bytes = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
        (sandbox.__displayQueue as DisplayItem[]).push({ mime: mimeType, bytes });
      },
      // $chart(config): render a Chart.js chart inline
      $chart: (config: unknown) => {
        (sandbox.__displayQueue as DisplayItem[]).push({ mime: MIME_CHART, json: config });
      },
    };

    return vm.createContext(sandbox);
  }

  getVariableSnapshot(): VariableInfo[] {
    const snapshot: VariableInfo[] = [];
    for (const name of Object.keys(this.context)) {
      if (BUILTIN_NAMES.has(name)) continue;
      const value: unknown = this.context[name];
      snapshot.push({ name, type: describeType(value), preview: describeValue(value) });
    }
    return snapshot;
  }

  reset(): void {
    this.context = this.createContext();
  }

  dispose(): void {
    // Nothing explicit needed — let GC collect the context
  }
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `Array(${(value as unknown[]).length})`;
  if (typeof value === 'function') {
    const name = (value as { name?: string }).name;
    return name ? `fn ${name}` : 'function';
  }
  if (typeof value === 'object') {
    const ctorName = (value as object).constructor?.name;
    return ctorName && ctorName !== 'Object' ? ctorName : 'object';
  }
  return typeof value;
}

function describeValue(value: unknown): string {
  try {
    const s = util.inspect(value, {
      depth: 1,
      colors: false,
      breakLength: Infinity,
      compact: true,
      maxArrayLength: 6,
    });
    return s.length > 120 ? s.slice(0, 117) + '…' : s;
  } catch {
    return '[unserializable]';
  }
}
