'use strict';
const ts = require('typescript');

const METHOD = /^src\/methods\/[^/]+\/src\/[^/]+\.js$/;
const UI = 'src/methods/ui-method/src/ui-method.js';
const COMPILER = 'src/models/ui-compiler-model/src/ui-compiler-model.js';
const SYNTHESIZED = new Set([
  'src/methods/attrs-method/src/attrs-method.js',
  'src/methods/each-method/src/each-method.js',
  'src/methods/move-method/src/move-method.js',
  COMPILER
]);
const LIFECYCLE = new Set([
  'dataParser', 'errorHandler', 'handler', 'handlerWrapper', 'tssParser'
]);

function unwrap(n) {
  while (
    ts.isParenthesizedExpression(n)
    || ts.isAsExpression(n)
    || ts.isTypeAssertionExpression(n)
    || ts.isNonNullExpression(n)
    || ts.isSatisfiesExpression(n)
  ) n = n.expression;
  return n;
}

function member(n) {
  n = unwrap(n);
  if (ts.isPropertyAccessExpression(n)) return n.name.text;
  if (ts.isElementAccessExpression(n)) {
    const a = unwrap(n.argumentExpression);
    if (ts.isStringLiteralLike(a) || ts.isNoSubstitutionTemplateLiteral(a)) return a.text;
  }
}

function key(n) {
  if (!n) return;
  n = unwrap(n);
  if (ts.isIdentifier(n) || ts.isStringLiteralLike(n) || ts.isNoSubstitutionTemplateLiteral(n))
    return n.text
  ;
  return member(n);
}

function propertyName(n) {
  const p = n.parent;
  return p && p.name === n && (
    ts.isMethodDeclaration(p)
    || ts.isPropertyAssignment(p)
    || ts.isPropertyDeclaration(p)
    || ts.isGetAccessorDeclaration(p)
    || ts.isSetAccessorDeclaration(p)
  );
}

/** Inspect executable JavaScript, excluding comments and inert string contents. */
function scan(body, file) {
  const sf = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const method = METHOD.test(file);
  const out = { imports: 0, io: 0, bypasses: 0, registry: 0, dispatches: 0 };

  function walk(n) {
    if (
      ts.isImportDeclaration(n)
      || ts.isImportEqualsDeclaration(n)
      || ts.isExportDeclaration(n) && n.moduleSpecifier
      || ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword
    ) out.imports++;

    if (ts.isIdentifier(n) && n.text === 'require' && !propertyName(n)) out.imports++;
    if (ts.isStringLiteralLike(n) && n.text === 'require' && !propertyName(n)) out.imports++;

    if (ts.isIdentifier(n) && n.text === 'io') out.io++;
    if (ts.isStringLiteralLike(n) && n.text === 'io') out.io++;

    if (method && file !== UI && ts.isIdentifier(n) && n.text === 'methods') out.registry++;

    if (
      method
      && (
        ts.isPropertyAccessExpression(n)
        || ts.isElementAccessExpression(n)
      )
      && member(n) === 'handle'
      && !LIFECYCLE.has(member(n.expression))
    ) out.bypasses++;

    if (
      method
      && ts.isBindingElement(n)
      && key(n.propertyName || n.name) === 'handle'
    ) out.bypasses++;

    if (
      method
      && ts.isStringLiteralLike(n)
      && n.text === 'handle'
      && !propertyName(n)
      && !(ts.isElementAccessExpression(n.parent) && member(n.parent.expression) && LIFECYCLE.has(member(n.parent.expression)))
    ) out.bypasses++;

    if (
      file === COMPILER
      && (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))
      && member(n) === 'handle'
    ) out.bypasses++;

    if (
      ts.isCallExpression(n)
      && (ts.isPropertyAccessExpression(unwrap(n.expression)) || ts.isElementAccessExpression(unwrap(n.expression)))
      && member(n.expression) === 'dispatch'
      && member(unwrap(n.expression).expression) === 'handler'
    ) out.dispatches++;

    ts.forEachChild(n, walk);
  }

  walk(sf);
  out.missingDispatch = SYNTHESIZED.has(file) && out.dispatches === 0;
  return out;
}

module.exports = { scan };
