import * as ts from 'typescript';

const TARGET_MAP: Record<string, ts.ScriptTarget> = {
  ES3: ts.ScriptTarget.ES3,
  ES5: ts.ScriptTarget.ES5,
  ES2015: ts.ScriptTarget.ES2015,
  ES2016: ts.ScriptTarget.ES2016,
  ES2017: ts.ScriptTarget.ES2017,
  ES2018: ts.ScriptTarget.ES2018,
  ES2019: ts.ScriptTarget.ES2019,
  ES2020: ts.ScriptTarget.ES2020,
  ES2021: ts.ScriptTarget.ES2021,
  ES2022: ts.ScriptTarget.ES2022,
  ESNext: ts.ScriptTarget.ESNext,
};

export function transpileCell(
  source: string,
  language: string,
  extra?: Record<string, unknown>
): string {
  if (language !== 'typescript') return source;

  const defaults: ts.CompilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true,
    esModuleInterop: true,
    strict: false,
  };

  const compilerOptions = extra ? { ...defaults, ...resolveOptions(extra) } : defaults;
  return ts.transpileModule(source, { compilerOptions }).outputText;
}

function resolveOptions(raw: Record<string, unknown>): ts.CompilerOptions {
  const out: ts.CompilerOptions = {};

  if (typeof raw.target === 'string' && TARGET_MAP[raw.target] !== undefined) {
    out.target = TARGET_MAP[raw.target];
  }

  const booleans: (keyof ts.CompilerOptions)[] = [
    'strict', 'strictNullChecks', 'strictFunctionTypes',
    'noImplicitAny', 'noImplicitThis', 'noImplicitReturns',
    'experimentalDecorators', 'emitDecoratorMetadata',
    'esModuleInterop', 'allowSyntheticDefaultImports', 'allowJs',
  ];
  for (const key of booleans) {
    if (typeof raw[key] === 'boolean') {
      (out as Record<string, unknown>)[key] = raw[key];
    }
  }

  return out;
}
