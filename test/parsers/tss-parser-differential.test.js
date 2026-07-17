'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '../..');
const production = path.join(repo, 'src/parsers/tss-parser/src/tss-parser.js');
const oracle = path.join(repo, 'test/fixtures/tss-parser-oracle.js');
const oracleHash = '1a597fe542048ba719d277341ebe840a730b2f2c1152ac92b49821ec19648c27';
const keys = [
  'c',
  'find',
  'whitespace',
  'sortPairs',
  'parseCharacter',
  'parseOpenings',
  'parseClosings',
  'parseChildren',
  'parseFrom',
  'hasChildren',
  'parseShorthandProperties',
  'parseProperties',
  'parsePairs',
  'parse',
  'clean',
  'quotes',
  'config',
  'handle'
];

function fresh(file) {
  delete require.cache[require.resolve(file)];
  return require(file).jTormTSSParser;
}

function parsers(config = {}) {
  const actual = fresh(production);
  const expected = fresh(oracle);
  actual.config(config);
  expected.config(config);
  return { actual, expected };
}

function regexes(p) {
  return Object.fromEntries(
    Object.entries(p.regexes).map(([k, v]) => [k, [v.source, v.flags]])
  );
}

function listTss(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTss(file));
    else if (e.name.endsWith('.tss')) out.push(file);
  }
  return out;
}

function helperSnapshot(p) {
  p.config({});
  const r = {
    whitespace: [p.whitespace(0), p.whitespace(2)],
    characters: p.parseCharacter('{', 'a{b{{'),
    openings: p.parseOpenings('a{b{{'),
    closings: p.parseClosings('a}b}}'),
    children: [
      p.hasChildren(0, [1, 3, 7], [5, 8, 9]),
      p.hasChildren(2, [1, 3, 7], [5, 8, 9])
    ],
    shorthand: p.parseShorthandProperties("attr(n:'class', v:'x')"),
    properties: p.parseProperties(" a : 1; bad; b:'x:y;z'; a:2; tail:3"),
    quotes: p.quotes("'a' \"b\" `c`")
  };

  p.pairs = [
    { from: 0, open: 1, close: 10 },
    { from: 2, open: 3, close: 5 },
    { from: 6, open: 7, close: 9 }
  ];
  p.sortPairs();
  r.sorted = p.pairs;

  p.tss = 'a{b{x:1;}c{y:2;}}';
  p.pairs = [];
  p.parsePairs(p.parseOpenings(p.tss), p.parseClosings(p.tss));
  r.pairs = p.pairs;

  p.tss = 'a->attr{x:1;}';
  p.pairs = [];
  p.parsePairs(p.parseOpenings(p.tss), p.parseClosings(p.tss));
  r.rewritten = [p.parseChildren(), p.tss];

  p.tss = 'a{x:1;}';
  p.pairs = [];
  p.tree = [];
  p.parsePairs(p.parseOpenings(p.tss), p.parseClosings(p.tss));
  r.parseReturn = p.parse(p.tss, p.pairs, p.pairs, 0, []);
  r.rawTree = p.tree;
  r.foundRoot = p.find(0) === p.tree[0];
  p.clean(p.tree);
  r.cleanTree = p.tree;
  return r;
}

function declarations(prefix, count) {
  let out = '';
  for (let i = 0; i < count; i++) out += `${prefix}${i}:${prefix}${i};`;
  return out;
}

function interleaved(lead, children, between, tail) {
  let body = declarations('l', lead);
  for (let i = 0; i < children; i++) {
    body += `c${i}{v:${i};}`;
    if (i < children - 1) body += declarations(`i${i}`, between);
  }
  body += declarations('t', tail);
  return `root{${body}}`;
}

function interleavingSources() {
  const out = [];
  for (let lead = 0; lead < 4; lead++)
    for (let children = 1; children < 5; children++)
      for (let between = 0; between < 4; between++)
        for (let tail = 0; tail < 4; tail++)
          out.push(interleaved(lead, children, between, tail));

  out.push(
    'root { a: 1; child { x: 1; } b: 2; }',
    'root{a:1;child{nested{z:3;}x:1;}b:2;}',
    'root\n{\n a : 1 ;\n child { x : 1 ; }\n b : 2 ;\n}',
    'root{child{a:1;}tail:2;child2{b:2;}end:3;}'
  );
  return out;
}

function generatedSources() {
  const selectors = ['a', '.item', '[data-v="x y"]', ''];
  const chains = [
    '',
    '->one',
    '->one->two',
    "->one(n:'x,y', v:'a:b,c')",
    '->x()',
    '->x( )'
  ];
  const bodies = [
    '',
    'x:1;',
    "x:'a:b;c';y:two;",
    'ignored;x:1;tail:no',
    'x:1;child{y:2;}',
    'x:1;child{->text{v:three;}}sibling{z:4;}',
    "/*a*/x:1;// line\nchild{y:'q:r;s';}",
    "x:' one   two ';child{y:\" three   four \";}"
  ];
  const spaces = [
    (header, body) => header + '{' + body + '}',
    (header, body) => '  ' + header + '  {  ' + body + '  }  ',
    (header, body) => '\n' + header + ' {\n' + body + '\n}\n',
    (header, body) => header + '/*header*/{' + body + '}'
  ];
  const out = [];
  for (const selector of selectors)
    for (const chain of chains)
      for (const body of bodies)
        for (const whitespace of spaces)
          out.push(whitespace(selector + chain, body))
        ;
  return out;
}

function *adversarialSources(count) {
  const selectors = ['a', '.x', '', '#id', 'a b', 'a>b', '[data-v=x]'];
  const properties = [
    'x:1;',
    'y:two;',
    "z:'a:b;c';",
    'k:v;',
    'ignored;'
  ];
  const methods = [
    '',
    '->attr',
    '->text',
    '->a->b',
    "->m(n:'x',v:'y')",
    '->x()'
  ];
  let seed = 0xc0ffee;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const pick = values => values[next() % values.length];
  function body(depth) {
    let out = '';
    const length = next() % 4;
    for (let i = 0; i < length; i++)
      out += depth && next() % 2 ? rule(depth - 1) : pick(properties)
    ;
    return out;
  }
  function rule(depth) {
    return pick(selectors) + pick(methods) + '{' + body(depth) + '}';
  }
  for (let i = 0; i < count; i++) {
    let source = '';
    const roots = 1 + next() % 3;
    for (let j = 0; j < roots; j++) source += rule(3);
    yield source;
  }
}

test('frozen v1 parser oracle has the reviewed source hash', () => {
  const bytes = fs.readFileSync(oracle);
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(bytes), oracleHash);

  const mutated = Buffer.from(bytes);
  mutated[Math.floor(mutated.length / 2)] ^= 1;
  for (const changed of [
    mutated,
    Buffer.concat([bytes, Buffer.from('\n')]),
    bytes.subarray(0, bytes.length - 1)
  ]) assert.notEqual(hash(changed), oracleHash);

  assert.notEqual(hash(fs.readFileSync(production)), oracleHash);
});

test('published singleton surface, regexes, mutable state, and helpers match v1', () => {
  const actual = fresh(production);
  const expected = fresh(oracle);
  assert.deepEqual(Object.keys(actual), keys);
  assert.deepEqual(Object.keys(expected), keys);
  assert.deepEqual(actual.c, {});

  actual.config({ quotes: ['"', "'", '`'] });
  expected.config({ quotes: ['"', "'", '`'] });
  assert.deepEqual(actual.c, expected.c);
  assert.deepEqual(regexes(actual), regexes(expected));
  assert.equal(actual.regexes.quotes.source, '(\",\',`)+');
  assert.deepEqual(helperSnapshot(actual), helperSnapshot(expected));

  actual.tree = [{ sentinel: 1 }];
  actual.pairs = [{ sentinel: 2 }];
  actual.tss = 'sentinel';
  assert.deepEqual(actual.tree, [{ sentinel: 1 }]);
  assert.deepEqual(actual.pairs, [{ sentinel: 2 }]);
  assert.equal(actual.tss, 'sentinel');
});

test('curated valid grammar remains exactly equal to the v1 oracle', () => {
  const cases = [
    '',
    '/* only */ // comment',
    'a { color: red; } b { color: blue; }',
    'a { x: 1; b { y: 2; ->text { v: three; } } c { z: 4; } }',
    '{ root: yes; ->attr { n: one; v: two; } }',
    "a->attr { n: 'class'; v: 'x'; }",
    'a->one->two->three { value: ok; }',
    "->attr(n:'class', v:'x')->text(v:'hello, world') { final: yes; }",
    "a { x: 'a:b;c'; y: \"d:e;f\"; z: one; }",
    "a { x: ' one   two '; y: \" three   four \"; }",
    "a { x: ' one\n two '; y: \" three\n four \"; }",
    "a { x: 'a/*gone*/b'; y: 'c//gone\nd'; }",
    'a { x:http://example/a; y:a\\//b; z:a//gone\n; }',
    'a { first: one; duplicate: first; duplicate: second; last: done; }',
    'a { kept: yes; dropped: no }',
    'a { ignored; kept: yes; }'
  ];
  const { actual, expected } = parsers();
  for (const source of cases)
    assert.deepEqual(actual.handle(source), expected.handle(source), source);
});

test('v1 quoted-header corruption is frozen outside the v1 differential profile', () => {
  const expected = fresh(oracle);
  expected.config({});
  assert.deepEqual(
    expected.handle("a->one(n:'x,y', v:'a:b;c'){}"),
    [{ s: "c')", m: false, p: {}, c: [] }]
  );
});

test('v1-compatible custom separators and quote configurations remain exact', () => {
  const config = {
    opening: '[',
    closing: ']',
    propertySeparator: '=',
    propertyEnd: '!',
    propertyShorthandOpening: '(',
    propertyShorthandClosing: ')',
    propertyShorthandSeparator: '~',
    methodSeparator: '=>',
    quotes: '"'
  };
  let pair = parsers(config);
  const custom = [
    'item [ color=blue! ]',
    'item=>attr(n="class"~v="a~b") [ x="a=b!"! ]',
    'item[child[value=ok!]tail=end!]'
  ];
  for (const source of custom)
    assert.deepEqual(pair.actual.handle(source), pair.expected.handle(source), source);

  pair = parsers({ quotes: ['"', "'", '`'] });
  const arrays = [
    'a { x: "a:b;c"; y: \'d:e;f\'; z: `g:h;i`; }',
    'a { x: one; y: two; }',
    'root{x:\'a:b;c\';child{y:`q:r;s`;}z:"d:e;f";}',
    'root{child{y:\'a:b;c\';}z:`d:e;f`;next{x:"q:r;s";}}'
  ];
  for (const source of arrays)
    assert.deepEqual(pair.actual.handle(source), pair.expected.handle(source), source);
});

test('selectorless document-root offset collisions remain exactly compatible', () => {
  const cases = [
    '{child{y:2;}}',
    '{child{y:2;}x:1;}',
    '{b{c{x:1;}}y:2;}',
    '{b{}c{}x:1;}',
    '{{b{}x:1;}}',
    '{a->x{}}',
    '{a->b->c{x:1;}}',
    '{plain{}a->x{}}',
    '{a->x{}plain{}}',
    '{b->m{x:1;}y:2;}',
    ' {child{y:2;}x:1;}',
    '{x:1;child{y:2;}}'
  ];
  const { actual, expected } = parsers();
  for (const source of cases)
    assert.deepEqual(actual.handle(source), expected.handle(source), source);

  const config = {
    opening: '[',
    closing: ']',
    propertySeparator: '=',
    propertyEnd: '!',
    propertyShorthandOpening: '(',
    propertyShorthandClosing: ')',
    propertyShorthandSeparator: '~',
    methodSeparator: '=>',
    quotes: '"'
  };
  const custom = parsers(config);
  for (const source of [
    '[child[y=2!]]',
    '[child[y=2!]x=1!]',
    '[a=>m[x=1!]y=2!]'
  ]) assert.deepEqual(custom.actual.handle(source), custom.expected.handle(source), source);
});

test('method expansion offsets preserve interleaved parent declarations', () => {
  const cases = [
    'r{c->m{}x:1;d{}y:2;}',
    'r{c->m{x:1;}x:1;d{}y:2;}',
    'r{c->m->n{}x:1;d{}y:2;}',
    '{c->m{}x:1;d{}y:2;}',
    '{c->m{x:1;}x:1;d{}y:2;}',
    '{->m{}x:1;d{}y:2;}'
  ];
  const { actual, expected } = parsers();
  for (const source of cases)
    assert.deepEqual(actual.handle(source), expected.handle(source), source);
});

test('balanced declaration/child interleavings match the frozen v1 projection', () => {
  const sources = interleavingSources();
  const { actual, expected } = parsers();
  const frozen = sources.map(source => [source, expected.handle(source)]);
  const hash = crypto.createHash('sha256').update(JSON.stringify(frozen)).digest('hex');
  assert.equal(sources.length, 260);
  assert.equal(hash, '860ab1f0cc22c2a1b4a864900227c28d1e520338cbc876e4b568b04233d6209d');
  for (const [source, tree] of frozen)
    assert.deepEqual(actual.handle(source), tree, source);
});

test('768 generated valid selector/method/shorthand/nesting forms match v1', () => {
  const sources = generatedSources();
  const { actual, expected } = parsers();
  const frozen = sources.map(source => [source, expected.handle(source)]);
  const hash = crypto.createHash('sha256').update(JSON.stringify(frozen)).digest('hex');
  assert.equal(sources.length, 768);
  assert.equal(hash, '91b878566d30f856592c6219742cd9d8faf51548d80cd2fd09159ee59acff3ba');
  for (const [source, tree] of frozen)
    assert.deepEqual(actual.handle(source), tree, source);
});

const seededCount = Number(process.env.TSS_PARSER_DIFFERENTIAL_CASES || 4096);

test(`${seededCount} seeded nested/interleaved forms match the frozen v1 oracle`, {
  timeout: seededCount > 4096 ? 180000 : 30000
}, () => {
  assert.ok(Number.isSafeInteger(seededCount) && seededCount > 0);
  const sources = adversarialSources(seededCount);
  const { actual, expected } = parsers();
  const digest = crypto.createHash('sha256');
  let count = 0;
  digest.update('[');
  for (const source of sources) {
    const tree = expected.handle(source);
    assert.deepEqual(actual.handle(source), tree, source);
    digest.update((count ? ',' : '') + JSON.stringify([source, tree]));
    count++;
  }
  digest.update(']');
  const hash = digest.digest('hex');
  assert.equal(count, seededCount);
  if (seededCount === 4096)
    assert.equal(hash, '3d274ffe1c4bf7db6b46ab9e428ed34536f9c5fccbe2bd57d16db676aca07875');
});

test('all 257 checked-in TSS files are directly equal to the v1 oracle', () => {
  const files = listTss(path.join(repo, 'src')).sort();
  const { actual, expected } = parsers();
  assert.equal(files.length, 257);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.deepEqual(
      actual.handle(source),
      expected.handle(source),
      path.relative(repo, file)
    );
  }
});
