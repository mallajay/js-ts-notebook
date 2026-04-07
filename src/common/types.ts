export interface JsnbOutput {
  mime: string;
  /** UTF-8 string data, or Base64-encoded binary */
  data: string;
}

export interface JsnbCell {
  kind: 'code' | 'markdown';
  language: string;
  source: string;
  outputs: JsnbOutput[];
  metadata: Record<string, unknown>;
}

export interface JsnbFile {
  version: 1;
  cells: JsnbCell[];
  metadata: Record<string, unknown>;
}

/** Payload for MIME_ERROR outputs */
export interface ErrorPayload {
  name: string;
  message: string;
  stack?: string;
}

/** Payload for MIME_RETURN outputs */
export interface ReturnPayload {
  value: string;
  type: string;
  /** Raw JSON-serializable value — present for objects and arrays, enables the tree renderer */
  raw?: unknown;
}

/** Payload for MIME_TIMING outputs */
export interface TimingPayload {
  elapsedMs: number;
}

/** Payload for MIME_TABLE outputs */
export interface TablePayload {
  headers: string[];
  rows: unknown[][];
}

/** A single variable entry shown in the Variable Inspector */
export interface VariableInfo {
  name: string;
  type: string;
  preview: string;
}

/** Item pushed onto __displayQueue by $display() / $image() */
export interface DisplayItem {
  mime: string;
  text?: string;
  json?: unknown;
  bytes?: Uint8Array;
}
