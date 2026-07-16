'use strict';
const ts = require('typescript');

function key(n) {
  if (!n) return;
  if (ts.isIdentifier(n) || ts.isStringLiteralLike(n)) return n.text;
  if (ts.isPropertyAccessExpression(n)) return n.name.text;
  if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression))
    return n.argumentExpression.text
  ;
}

function receiver(n) {
  if (ts.isIdentifier(n)) return n.text;
  if (n.kind === ts.SyntaxKind.ThisKeyword) return 'this';
}

function scanMethods(body, file, names) {
  const sf = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wanted = new Set(names);
  const out = {
    assetCalls: 0,
    cacheAccess: 0,
    delegations: {assetPluginModel: 0, promiseCacheModel: 0, renderContextModel: 0},
    found: {},
    parentAccess: 0,
    promiseCatch: 0,
    stateWrites: 0,
    statements: {}
  };

  function collect(n) {
    if (ts.isPropertyAssignment(n) && wanted.has(key(n.name))
      && (ts.isFunctionExpression(n.initializer) || ts.isArrowFunction(n.initializer))) {
      const k = key(n.name);
      out.found[k] = (out.found[k] || 0) + 1;
      out.statements[k] = ts.isBlock(n.initializer.body) ? n.initializer.body.statements.length : 1;
      return;
    }
    ts.forEachChild(n, collect);
  }

  function inspect(n) {
    const k = key(n);

    if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) && k === 'p')
      out.parentAccess++
    ;
    if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))
      && k === 'c' && ['s', 'this'].includes(receiver(n.expression)))
      out.cacheAccess++
    ;
    if (ts.isBindingElement(n) && key(n.propertyName || n.name) === 'c'
      && ts.isObjectBindingPattern(n.parent) && ts.isVariableDeclaration(n.parent.parent)
      && ['s', 'this'].includes(receiver(n.parent.parent.initializer)))
      out.cacheAccess++
    ;
    if (ts.isBindingElement(n) && key(n.propertyName || n.name) === 'p'
      && ts.isObjectBindingPattern(n.parent))
      out.parentAccess++
    ;
    if (ts.isCallExpression(n) && key(n.expression) === 'get'
      && receiver(n.expression.expression) === 'Reflect'
      && ['c', 'p'].includes(key(n.arguments[1]))) {
      if (key(n.arguments[1]) === 'c') out.cacheAccess++;
      else out.parentAccess++;
    }
    if (ts.isCallExpression(n) && key(n.expression) === 'catch')
      out.promiseCatch++
    ;
    if (ts.isCallExpression(n) && ['parseUrl', 'createElement', 'appendChild', 'allow', 'url'].includes(key(n.expression)))
      out.assetCalls++
    ;
    if (ts.isNewExpression(n) && key(n.expression) === 'URL')
      out.assetCalls++
    ;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ['layer', 'uiCache', 'css', 'js'].includes(key(n.left)))
      out.stateWrites++
    ;
    if (ts.isIdentifier(n) && Object.prototype.hasOwnProperty.call(out.delegations, n.text))
      out.delegations[n.text]++
    ;

    ts.forEachChild(n, inspect);
  }

  collect(sf);
  inspect(sf);
  return out;
}

module.exports = { scanMethods };
