'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { makeDataParser, makeTssParser } = require('../helpers/parser.js');
const { render } = require('../helpers/engine.js');
const { jTormDataParser: dp } = require('../../src/parsers/data-parser/src/data-parser.js');
const { jTormDataMethod: dataMethod } = require('../../src/methods/data-method/src/data-method.js');
const { jTormIfMethod: ifMethod } = require('../../src/methods/if-method/src/if-method.js');
const { jTormAttrsMethod: attrsMethod } = require('../../src/methods/attrs-method/src/attrs-method.js');

const HTML = '<body><main><p></p><a></a><span></span><i></i><b></b><em></em></main></body>';
const TSS = [
  "p->attr { n: 'data-path'; v: user.name; }",
  "a->attrs { n: 'data-name,data-static'; v: user.name,'fixed'; }",
  'span->text(first: user.name, second: first)->inner { h: second; }',
  "i->if(d: primary || secondary)->attr { n: 'data-or'; v: '1'; }",
  "b->if(d: left && right)->attr { n: 'data-and'; v: '1'; }",
  "main->data(bound: primary || secondary)->attr { n: 'data-data'; v: bound; }",
  'em->attr {}'
].join('\n');

function raw(t) {
  return t.map(n => ({ s: n.s, m: n.m, p: n.p, c: raw(n.c) }));
}

function v(t, m) {
  return { t, m, _: _, d: null };
}

test('characterizes every generic binding form before compilation caching', () => {
  const p = makeDataParser();
  const inherited = Object.create({ inherited: { value: 'prototype' } });
  inherited.zero = 0;
  inherited.no = false;
  inherited.ok = 'yes';

  assert.equal(p.parse(inherited, 'inherited.value'), 'prototype');
  assert.equal(p.parse({ a: { b: { c: 'deep' } } }, 'a.b.c'), 'deep');
  assert.equal(p.parse({ a: { first: 'current' } }, 'a.@c'), 'current');
  assert.equal(p.parse(inherited, 'zero'), 0);
  assert.equal(p.parse(inherited, 'no'), false);
  assert.equal(p.parse({}, "''"), '');
  assert.equal(p.parse({}, 'true'), true);
  assert.equal(p.parse({}, 'false'), false);
  assert.equal(p.parse({ 42: 'model-key' }, '42'), 'model-key');
  assert.equal(p.parse({}, '42'), 42);
  assert.equal(p.parse(inherited, "zero + no + ok + '!'"), 'yes!');
  assert.equal(p.parse({}, 'missing'), null);
  assert.equal(p.parse(null, 'missing'), null);
  assert.throws(() => p.parse({ a: null }, 'a.@c'), TypeError);

  const array = { p: { v: ['zero', "'literal'", 'missing'] }, c: [] };
  const av = v(array, { zero: 0 });
  p.handle(av);
  assert.deepEqual(av.d, { v: [0, 'literal', null] });

  const auto = { p: {}, c: [] };
  const uv = v(auto, { n: 'data-auto', v: 'bound' });
  p.handle(uv, { name: 'n', value: 'v', absent: 'missing' });
  assert.deepEqual(uv.d, { n: 'data-auto', v: 'bound', missing: undefined });

  const wrapper = { p: {}, c: [{}] };
  const wv = v(wrapper, { n: 'must-not-bind' });
  p.handle(wv, { name: 'n' });
  assert.deepEqual(wv.d, {});
});

test('reused AST renders every binding form with zero runtime parse and zero warm compile calls', async () => {
  const tree = makeTssParser().handle(TSS);
  const declarations = raw(tree);
  const op = dp.parse;
  const oc = dp.compile;
  let parses = 0, compiles = 0, firstParses, firstCompiles, one, two;

  dp.parse = function () { parses++; return op.apply(this, arguments); };
  if (oc)
    dp.compile = function () { compiles++; return oc.apply(this, arguments); }
  ;

  try {
    one = await render(HTML, tree, {
      user: { name: 'FIRST_MODEL_VALUE' }, primary: '', secondary: 'fallback-a',
      left: 1, right: 1, n: 'data-auto', v: 'auto-a'
    }, 'http://localhost/', null, 0);
    firstParses = parses;
    firstCompiles = compiles;

    two = await render(HTML, tree, {
      user: { name: 'SECOND_MODEL_VALUE' }, primary: 'primary-b', secondary: '',
      left: 1, right: '', n: 'data-auto', v: 'auto-b'
    }, 'http://localhost/', null, 1);
  } finally {
    dp.parse = op;
    if (oc)
      dp.compile = oc
    ;
  }

  assert.equal(one.body, '<main data-data="fallback-a"><p data-path="FIRST_MODEL_VALUE"></p><a data-name="FIRST_MODEL_VALUE" data-static="fixed"></a><span>FIRST_MODEL_VALUE</span><i data-or="1"></i><b data-and="1"></b><em data-auto="auto-a"></em></main>');
  assert.equal(two.body, '<main data-data="primary-b"><p data-path="SECOND_MODEL_VALUE"></p><a data-name="SECOND_MODEL_VALUE" data-static="fixed"></a><span>SECOND_MODEL_VALUE</span><i data-or="1"></i><b></b><em data-auto="auto-b"></em></main>');
  assert.deepEqual(raw(tree), declarations, 'binding compilation must not change raw declarations');
  assert.doesNotThrow(() => JSON.stringify(tree));
  assert.ok(!JSON.stringify(tree).includes('FIRST_MODEL_VALUE'));
  assert.ok(!JSON.stringify(tree).includes('SECOND_MODEL_VALUE'));
  assert.equal(firstParses, 0, 'cold runtime parse calls: ' + firstParses + '; warm runtime parse calls: ' + (parses - firstParses) + '; cold compile calls: ' + firstCompiles);
  assert.equal(parses - firstParses, 0, 'warm runtime parse calls: ' + (parses - firstParses));
  assert.equal(firstCompiles, 29, 'cold compile calls: ' + firstCompiles);
  assert.equal(compiles - firstCompiles, 0, 'warm compile calls: ' + (compiles - firstCompiles));
});

test('a reused AST observes in-place raw declaration changes', async () => {
  const tree = makeTssParser().handle("p->attr { n: 'data-value'; v: first; }");
  assert.equal((await render('<body><p></p></body>', tree, { first: 'A', second: 'B' })).body, '<p data-value="A"></p>');

  tree[0].c[0].p.v = 'second';
  assert.equal((await render('<body><p></p></body>', tree, { first: 'A', second: 'B' }, 'http://localhost/', null, 1)).body, '<p data-value="B"></p>');
});

test('grammar changes invalidate compiled bindings without model capture', () => {
  const p = makeDataParser();
  const node = { p: { v: 'a.b' }, c: [] };
  const a = v(node, { a: { b: 'nested' } });
  const o = p.objectSeparator;

  try {
    p.objectSeparator = '.';
    p.handle(a);
    assert.equal(a.d.v, 'nested');

    p.objectSeparator = '/';
    const b = v(node, { 'a.b': 'flat' });
    p.handle(b);
    assert.equal(b.d.v, 'flat');
  } finally {
    p.objectSeparator = o;
  }
});

test('auto-binding cache follows params and rechecks leaf status', () => {
  const p = makeDataParser();
  const node = { p: {}, c: [] };
  const a = v(node, { first: 'A', second: 'B' });

  p.handle(a, { value: 'first' });
  assert.deepEqual(a.d, { first: 'A' });

  p.handle(a, { value: 'second' });
  assert.deepEqual(a.d, { second: 'B' });

  node.c.push({});
  p.handle(a, { value: 'first' });
  assert.deepEqual(a.d, {});
});

test('raw array contents and property order invalidate the whole cache envelope', () => {
  const p = makeDataParser();
  const node = { p: { a: "'A'", b: ["'B'"] }, c: [] };
  const x = v(node, {});

  p.handle(x);
  const a = node.b;
  node.p.b[0] = "'C'";
  p.handle(x);
  assert.deepEqual(x.d, { a: 'A', b: ['C'] });
  assert.notStrictEqual(node.b, a);

  const b = node.b;
  delete node.p.a;
  node.p.a = "'A'";
  p.handle(x);
  assert.notStrictEqual(node.b, b);
});

test('method-owner grammar changes invalidate data, if, and attrs extensions', async () => {
  const dOr = dataMethod.or, iOr = ifMethod.or, aSep = attrsMethod.separator;

  try {
    const d = makeTssParser().handle("div->data(v: first??second)->attr { n: 'data-v'; v: v; }");
    dataMethod.or = '||';
    assert.equal((await render('<body><div></div></body>', d, { 'first??second': 'whole' })).body, '<div data-v="whole"></div>');
    dataMethod.or = '??';
    assert.equal((await render('<body><div></div></body>', d, { first: '', second: 'split' })).body, '<div data-v="split"></div>');

    const i = makeTssParser().handle("p->if(d: a %% b)->attr { n: 'data-v'; v: '1'; }");
    ifMethod.or = '%%';
    assert.equal((await render('<body><p></p></body>', i, { a: '', b: 1 })).body, '<p data-v="1"></p>');
    ifMethod.or = '||';
    assert.equal((await render('<body><p></p></body>', i, { a: '', b: 1 })).body, '<p></p>');

    const a = makeTssParser().handle("a->attrs { n: 'data-a_data-b'; v: first_second; }");
    attrsMethod.separator = '_';
    assert.equal((await render('<body><a></a></body>', a, { first: 'A', second: 'B' })).body, '<a data-a="A" data-b="B"></a>');
    attrsMethod.separator = ',';
    assert.equal((await render('<body><a></a></body>', a, { first_second: 'whole' })).body, '<a data-a_data-b="whole"></a>');
  } finally {
    dataMethod.or = dOr;
    ifMethod.or = iOr;
    attrsMethod.separator = aSep;
  }
});

test('evaluation errors repeat from a reused AST without warm recompilation', async () => {
  const tree = makeTssParser().handle("p->attr { n: 'data-value'; v: a.@c; }");
  const oc = dp.compile;
  let compiles = 0, first;

  if (oc)
    dp.compile = function () { compiles++; return oc.apply(this, arguments); }
  ;

  try {
    await assert.rejects(render('<body><p></p></body>', tree, { a: null }), TypeError);
    first = compiles;
    await assert.rejects(render('<body><p></p></body>', tree, { a: null }, 'http://localhost/', null, 1), TypeError);
  } finally {
    if (oc)
      dp.compile = oc
    ;
  }

  assert.ok(first > 0, 'cold compile calls: ' + first);
  assert.equal(compiles - first, 0, 'warm error compile calls: ' + (compiles - first));
});

test('a compile error never installs a partial default segment', () => {
  const p = makeDataParser();
  if (typeof p.compile !== 'function')
    return
  ;

  const node = { p: { ok: "'ok'", bad: [{}] }, c: [] };
  const x = v(node, {});
  let compiles = 0;
  const oc = p.compile;
  p.compile = function () { compiles++; return oc.apply(this, arguments); };

  try {
    assert.throws(() => p.handle(x), TypeError);
    const first = compiles;
    assert.equal(node.b.p, null);
    assert.throws(() => p.handle(x), TypeError);
    assert.ok(compiles > first, 'failed segment must compile again');
    assert.equal(node.b.p, null);
  } finally {
    p.compile = oc;
  }
});
