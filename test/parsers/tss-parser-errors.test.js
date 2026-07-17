'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const file = path.resolve(__dirname, '../../src/parsers/tss-parser/src/tss-parser.js');
const hard = {
  source: 131072,
  tokens: 32768,
  depth: 128,
  nodes: 4096,
  declarations: 16384
};

function parser(config = {}) {
  delete require.cache[require.resolve(file)];
  const p = require(file).jTormTSSParser;
  p.config(config);
  p.tree = [];
  p.pairs = [];
  p.tss = '';
  return p;
}

function position(source, offset) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset; i++) {
    const c = source[i];
    if (c === '\r') {
      if (source[i + 1] === '\n' && i + 1 < offset) i++;
      line++;
      column = 1;
    } else if (c === '\n' || c === '\u2028' || c === '\u2029') {
      line++;
      column = 1;
    } else column++;
  }
  return { line, column };
}

function located(p, source, Type, prefix, offset) {
  let error;
  try {
    p.handle(source);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof Type, `${source}: expected ${Type.name}`);
  const at = position(source, offset);
  assert.match(error.message, new RegExp(`^${prefix} at line ${at.line}, column ${at.column}$`));
  assert.equal(error.line, at.line);
  assert.equal(error.column, at.column);
  assert.equal(error.offset, offset);
  return error;
}

function chain(methods) {
  let source = 'a';
  for (let i = 0; i < methods; i++) source += `->m${i}`;
  return source + '{}';
}

function depth(tree) {
  let node = tree[0];
  let count = 0;
  while (node) {
    count++;
    node = node.c[0];
  }
  return count;
}

test('handle() rejects non-string source without source-position fields', () => {
  const p = parser();
  for (const value of [null, undefined, 1, {}, [], new String('a{}')]) {
    assert.throws(
      () => p.handle(value),
      error => {
        assert.ok(error instanceof TypeError);
        assert.equal(error.message, 'TSS source must be a string');
        assert.equal(Object.hasOwn(error, 'line'), false);
        assert.equal(Object.hasOwn(error, 'column'), false);
        assert.equal(Object.hasOwn(error, 'offset'), false);
        return true;
      }
    );
  }
});

test('malformed grammar reports the original opening or offending position', () => {
  const cases = [
    ['}', SyntaxError, 'TSS unexpected closing delimiter', 0],
    ['a{x:1;', SyntaxError, 'TSS unclosed block', 1],
    ["a{x:'unterminated;}", SyntaxError, 'TSS unclosed quote', 4],
    ['a{/* secret-value', SyntaxError, 'TSS unclosed comment', 2],
    ['a->->x{}', SyntaxError, 'TSS empty method', 3],
    ['a->x(n:1{}', SyntaxError, 'TSS malformed shorthand', 4],
    ['orphan;', SyntaxError, 'TSS expected rule', 0]
  ];
  for (const [source, Type, prefix, offset] of cases)
    located(parser(), source, Type, prefix, offset);
});

test('comment recognition remains ahead of quote recognition for diagnostics', () => {
  const source = "a{x:'value/*secret-value';}";
  const offset = source.indexOf('/*');
  const error = located(
    parser(),
    source,
    SyntaxError,
    'TSS unclosed comment',
    offset
  );
  assert.equal(error.message.includes('secret-value'), false);
});

test('line and column tracking handles every supported line break', () => {
  for (const lineBreak of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
    const source = lineBreak + '}';
    located(
      parser(),
      source,
      SyntaxError,
      'TSS unexpected closing delimiter',
      lineBreak.length
    );
  }

  const source = '/* first\nsecond */   \n   }';
  located(
    parser(),
    source,
    SyntaxError,
    'TSS unexpected closing delimiter',
    source.indexOf('}')
  );

  const anchors = [
    ['\n}', 1, 2, 1],
    ['\r\n}', 2, 2, 1],
    ['\r}', 1, 2, 1],
    ['\u2028}', 1, 2, 1],
    ['\u2029}', 1, 2, 1],
    ['/* first\nsecond */   \n   }', 25, 3, 4]
  ];
  for (const [input, offset, line, column] of anchors) {
    let error;
    try {
      parser().handle(input);
    } catch (caught) {
      error = caught;
    }
    assert.ok(error instanceof SyntaxError);
    assert.equal(error.offset, offset);
    assert.equal(error.line, line);
    assert.equal(error.column, column);
  }
});

test('configured quotes protect structural delimiters in selectors and values', () => {
  let p = parser();
  assert.deepEqual(
    p.handle("a[data-v='x}y{z->q'] { value: 'v}w{q;:->'; }"),
    [{
      s: "a[data-v='x}y{z->q']",
      m: false,
      p: { value: "'v}w{q;:->'" },
      c: []
    }]
  );

  p = parser({ quotes: '"' });
  assert.deepEqual(
    p.handle('a[data-v="x}y{z=>q"] { value: "v}w{q;:=>"; }'),
    [{
      s: 'a[data-v="x}y{z=>q"]',
      m: false,
      p: { value: '"v}w{q;:=>"' },
      c: []
    }]
  );

  p = parser();
  assert.deepEqual(
    p.handle("a->one(n:'x,y', v:'a:b;c'){}"),
    [{
      s: 'a',
      m: false,
      p: {},
      c: [{
        s: 'a',
        m: 'one',
        p: { n: "'x,y'", v: "'a:b;c'" },
        c: []
      }]
    }]
  );
});

test('multi-character configured syntax uses longest literal matches', () => {
  const p = parser({
    opening: '{{',
    closing: '}}',
    propertySeparator: '::',
    propertyEnd: ';;',
    propertyShorthandOpening: '((',
    propertyShorthandClosing: '))',
    propertyShorthandSeparator: '||',
    methodSeparator: '=>',
    quotes: '"'
  });
  assert.deepEqual(
    p.handle('a=>m((n::"x||y"||v::"z")){{p::"q;;r";;}}'),
    [{
      s: 'a',
      m: false,
      p: {},
      c: [{
        s: 'a',
        m: 'm',
        p: { n: '"x||y"', v: '"z"', p: '"q;;r"' },
        c: []
      }]
    }]
  );
  assert.deepEqual(
    p.handle('r{{a::1;;child{{x::2;;}}b::3;;}}'),
    [{
      s: 'r',
      m: false,
      p: { a: '1', b: '3' },
      c: [{ s: 'child', m: false, p: { x: '2' }, c: [] }]
    }]
  );
});

test('configured syntax is literal even when published regexes need escaping', () => {
  const p = parser({
    opening: '[',
    closing: ']',
    propertySeparator: '*',
    propertyEnd: '!'
  });
  assert.deepEqual(p.handle('a[x*1!]'), [
    { s: 'a', m: false, p: { x: '1' }, c: [] }
  ]);
  assert.ok(p.regexes.propertySeparator instanceof RegExp);
});

test('config preserves falsy fallbacks and rejects malformed truthy known values', () => {
  const p = parser({
    opening: '',
    closing: false,
    propertySeparator: 0,
    quotes: null,
    metadata: 'ignored'
  });
  assert.equal(p.c.opening, '{');
  assert.equal(p.c.closing, '}');
  assert.equal(p.c.propertySeparator, ':');
  assert.equal(p.c.quotes, "'");

  for (const config of [
    { opening: true },
    { methodSeparator: 'x'.repeat(65) },
    { opening: '{', closing: '{' },
    { propertyEnd: 'white space' },
    { opening: '/*' },
    { opening: "'block", quotes: "'" },
    { quotes: ['too-long'] },
    { limits: { source: 0 } },
    { limits: { source: hard.source + 1 } },
    { limits: { unknown: 1 } }
  ]) {
    assert.throws(
      () => parser(config),
      error => error instanceof TypeError && error.message === 'TSS parser config invalid'
    );
  }
});

test('source and token limits allow the exact bound and reject one over', () => {
  const source = 'a{x:1;}';
  let p = parser({ limits: { source: source.length } });
  assert.deepEqual(p.handle(source)[0].p, { x: '1' });

  p = parser({ limits: { source: source.length - 1 } });
  located(
    p,
    source,
    RangeError,
    'TSS source limit exceeded',
    source.length - 1
  );

  p = parser({ limits: { tokens: 7 } });
  assert.deepEqual(p.handle(source)[0].p, { x: '1' });

  p = parser({ limits: { tokens: 6 } });
  located(p, source, RangeError, 'TSS tokens limit exceeded', 6);
});

test('node and declaration limits allow the exact bound and reject one over', () => {
  let p = parser({ limits: { nodes: 2 } });
  assert.equal(p.handle('a{}b{}').length, 2);

  p = parser({ limits: { nodes: 1 } });
  located(p, 'a{}b{}', RangeError, 'TSS nodes limit exceeded', 3);

  p = parser({ limits: { declarations: 2 } });
  assert.deepEqual(p.handle('a{x:1;y:2;}')[0].p, { x: '1', y: '2' });

  p = parser({ limits: { declarations: 1 } });
  located(p, 'a{x:1;y:2;}', RangeError, 'TSS declarations limit exceeded', 6);
});

test('the depth limit counts method-chain nodes at 128/129 ancestry', () => {
  let p = parser();
  const exact = chain(127);
  assert.equal(depth(p.handle(exact)), 128);

  p = parser();
  const over = chain(128);
  located(
    p,
    over,
    RangeError,
    'TSS depth limit exceeded',
    over.lastIndexOf('->')
  );
});

test('handle() publishes no partial tree or pair state after failure', () => {
  const p = parser();
  assert.deepEqual(p.handle('a{x:1;}')[0].p, { x: '1' });
  assert.throws(() => p.handle('b{x:2;'));
  assert.deepEqual(p.tree, []);
  assert.deepEqual(p.pairs, []);
  assert.equal(p.tss, '');

  p.config({ limits: { source: 2 } });
  assert.throws(() => p.handle('abc'));
  assert.equal(p.tss, '');
});

test('config exposes immutable hard ceilings and effective lower limits', () => {
  let p = parser();
  assert.deepEqual(p.max, hard);
  assert.deepEqual(p.limits, hard);

  p = parser({ limits: { source: 100, depth: 4 } });
  assert.deepEqual(p.max, hard);
  assert.deepEqual(p.limits, { ...hard, source: 100, depth: 4 });
  assert.throws(() => {
    p.max.source = hard.source + 1;
  }, TypeError);
});

test('a rejected config cannot partially publish syntax, regex, or limit state', () => {
  const p = parser({
    opening: '[',
    closing: ']',
    propertySeparator: '=',
    propertyEnd: '!'
  });
  const c = p.c;
  const before = { ...c };
  const regexes = p.regexes;
  const limits = p.limits;

  assert.throws(
    () => p.config({ opening: '<', limits: { depth: 0 } }),
    error => error instanceof TypeError && error.message === 'TSS parser config invalid'
  );
  assert.strictEqual(p.c, c);
  assert.deepEqual(p.c, before);
  assert.strictEqual(p.regexes, regexes);
  assert.strictEqual(p.limits, limits);
  assert.deepEqual(p.handle('a[x=1!]')[0].p, { x: '1' });
});
