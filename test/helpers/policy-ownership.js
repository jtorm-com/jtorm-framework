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

function path(n) {
  if (!n) return;
  if (ts.isIdentifier(n)) return n.text;
  if (n.kind === ts.SyntaxKind.ThisKeyword) return 'this';
  if (ts.isPropertyAccessExpression(n)) {
    const p = path(n.expression);
    return p ? p + '.' + n.name.text : undefined;
  }
  if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)) {
    const p = path(n.expression);
    return p ? p + '.' + n.argumentExpression.text : undefined;
  }
}

function scanMethods(body, file, names) {
  const sf = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const wanted = new Set(names);
  const out = {
    accesses: {},
    assetCalls: 0,
    cacheAccess: 0,
    calls: {},
    delegations: {assetPluginModel: 0, promiseCacheModel: 0, renderContextModel: 0},
    found: {},
    ownerEscapes: 0,
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

    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) {
      const p = path(n);
      if (p) out.accesses[p] = (out.accesses[p] || 0) + 1;
      if (p && /(?:^|\.)promiseCacheModel$/.test(p)) {
        const q = n.parent, member = q && (ts.isPropertyAccessExpression(q) || ts.isElementAccessExpression(q));
        const call = member && q.expression === n
          && ts.isCallExpression(q.parent) && q.parent.expression === q;
        const guard = ts.isBinaryExpression(q) && ts.isIfStatement(q.parent)
          && q.parent.expression === q;
        const type = member && q.expression === n && ts.isTypeOfExpression(q.parent);
        if (!call && !guard && !type)
          out.ownerEscapes++
        ;
      }
    }

    if (ts.isCallExpression(n)) {
      const p = path(n.expression);
      if (p) out.calls[p] = (out.calls[p] || 0) + 1;
    }

    if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) && k === 'p')
      out.parentAccess++
    ;
    if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))
      && k === 'c' && ['s', 'this'].includes(receiver(n.expression)))
      out.cacheAccess++
    ;
    if (ts.isBindingElement(n) && key(n.propertyName || n.name) === 'promiseCacheModel'
      && ts.isObjectBindingPattern(n.parent))
      out.ownerEscapes++
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
