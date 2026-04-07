import * as ts from 'typescript';

/**
 * Transforms top-level variable / function / class declarations in
 * (already-transpiled) JavaScript so they are assigned to `globalThis`.
 *
 * `globalThis` inside a vm.Context IS the sandbox object, so properties
 * set on it persist across cell executions.
 *
 * Examples:
 *   const x = 5;             →  globalThis.x = 5;
 *   let y = 10, z = 20;      →  globalThis.y = 10; globalThis.z = 20;
 *   const { a, b } = obj;    →  const { a, b } = obj; globalThis.a = a; globalThis.b = b;
 *   function foo() {}         →  globalThis.foo = function foo() {}
 *   class Bar {}              →  globalThis.Bar = class Bar {}
 *
 * Statements that are NOT at the top level (inside if-blocks, for-loops,
 * inner functions, etc.) are left untouched.
 */
export function hoistDeclarations(jsCode: string): string {
  const sf = ts.createSourceFile(
    'cell.js',
    jsCode,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.JS
  );

  const lines: string[] = [];

  for (const stmt of sf.statements) {
    lines.push(...transformTopLevelStatement(stmt, sf));
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────

function transformTopLevelStatement(stmt: ts.Statement, sf: ts.SourceFile): string[] {
  // Variable declarations: const / let / var
  if (ts.isVariableStatement(stmt)) {
    return transformVarStatement(stmt, sf);
  }

  // Function declarations: function foo() {}
  if (ts.isFunctionDeclaration(stmt) && stmt.name) {
    return [`globalThis.${stmt.name.text} = ${stmt.getText(sf)}`];
  }

  // Class declarations: class Foo {}
  if (ts.isClassDeclaration(stmt) && stmt.name) {
    return [`globalThis.${stmt.name.text} = ${stmt.getText(sf)}`];
  }

  // Everything else (expressions, if-blocks, loops, return, try/catch…)
  return [stmt.getText(sf)];
}

function transformVarStatement(stmt: ts.VariableStatement, sf: ts.SourceFile): string[] {
  const decls = stmt.declarationList.declarations;
  const hasDestructuring = decls.some((d) => !ts.isIdentifier(d.name));

  if (hasDestructuring) {
    // Keep the original declaration so the bound names are available as
    // locals within this cell's IIFE, then copy each to globalThis.
    const extras = decls.flatMap((d) =>
      getBoundNames(d.name).map((n) => `globalThis.${n} = ${n};`)
    );
    return [stmt.getText(sf), ...extras];
  }

  // All simple identifiers — replace each with a globalThis assignment.
  return decls.map((d) => {
    const name = (d.name as ts.Identifier).text;
    const init = d.initializer ? d.initializer.getText(sf) : 'undefined';
    return `globalThis.${name} = ${init};`;
  });
}

/** Recursively collect every identifier bound by a binding pattern. */
function getBoundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];

  const result: string[] = [];
  for (const el of (name as ts.ObjectBindingPattern | ts.ArrayBindingPattern).elements) {
    if (ts.isOmittedExpression(el)) continue;
    if (ts.isBindingElement(el)) result.push(...getBoundNames(el.name));
  }
  return result;
}
