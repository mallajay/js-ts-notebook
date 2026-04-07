import * as util from 'util';
import * as vm from 'vm';
import type { TablePayload } from '../common/types';
import { MIME_TABLE } from '../common/mimeTypes';

export type CapturedItem =
  | { stream: 'stdout' | 'stderr'; text: string }
  | { stream: 'rich'; mime: string; data: unknown };

export interface Capture {
  getItems(): CapturedItem[];
}

export function installCapture(context: vm.Context): Capture {
  const items: CapturedItem[] = [];

  function format(...args: unknown[]): string {
    return args
      .map((a) =>
        typeof a === 'string'
          ? a
          : util.inspect(a, { depth: 4, colors: false, breakLength: 120 })
      )
      .join(' ');
  }

  context.console = {
    log: (...args: unknown[]) => items.push({ stream: 'stdout', text: format(...args) }),
    info: (...args: unknown[]) => items.push({ stream: 'stdout', text: format(...args) }),
    warn: (...args: unknown[]) => items.push({ stream: 'stderr', text: format(...args) }),
    error: (...args: unknown[]) => items.push({ stream: 'stderr', text: format(...args) }),
    debug: (...args: unknown[]) => items.push({ stream: 'stdout', text: format(...args) }),
    dir: (obj: unknown) => items.push({ stream: 'stdout', text: util.inspect(obj, { depth: 4, colors: false }) }),
    table: (data: unknown) => items.push({ stream: 'rich', mime: MIME_TABLE, data: buildTablePayload(data) }),
  };

  return {
    getItems: () => [...items],
  };
}

function buildTablePayload(data: unknown): TablePayload {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { headers: [], rows: [] };
    }
    const first = data[0];
    if (first !== null && typeof first === 'object') {
      // Array of objects — union all keys as columns
      const allKeys = new Set<string>();
      for (const row of data) {
        if (row !== null && typeof row === 'object') {
          Object.keys(row as object).forEach((k) => allKeys.add(k));
        }
      }
      const cols = Array.from(allKeys);
      return {
        headers: ['(index)', ...cols],
        rows: data.map((row, i) => {
          const r = row as Record<string, unknown>;
          return [i, ...cols.map((k) => r[k])];
        }),
      };
    } else {
      // Array of primitives
      return {
        headers: ['(index)', 'Value'],
        rows: data.map((v, i) => [i, v]),
      };
    }
  } else if (data !== null && typeof data === 'object') {
    // Plain object
    return {
      headers: ['(index)', 'Value'],
      rows: Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, v]),
    };
  } else {
    return {
      headers: ['Value'],
      rows: [[data]],
    };
  }
}
