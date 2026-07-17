'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { makeTssParser } = require('../helpers/parser.js');

const sourceFile = path.resolve(__dirname, '../../src/parsers/tss-parser/src/tss-parser.js');

function nested(depth) {
  return 'a{'.repeat(depth) + 'x:1;' + '}'.repeat(depth);
}

function nodeCount(tree) {
  let count = 0;
  const nodes = [...tree];
  while (nodes.length) {
    const node = nodes.pop();
    count++;
    nodes.push(...node.c);
  }
  return count;
}

test('the 128-KiB hard source boundary completes and one code unit over fails first', {
  timeout: 10000
}, () => {
  const p = makeTssParser();
  const exact = 'a{x:' + 'v'.repeat(p.max.source - 6) + ';}';
  assert.equal(exact.length, p.max.source);
  assert.equal(p.handle(exact)[0].p.x.length, p.max.source - 6);

  assert.throws(
    () => p.handle(exact + ' '),
    error => {
      assert.ok(error instanceof RangeError);
      assert.equal(error.offset, p.max.source);
      assert.match(error.message, /^TSS source limit exceeded at line 1, column 131073$/);
      return true;
    }
  );
  assert.deepEqual(p.tree, []);
  assert.deepEqual(p.pairs, []);
});

test('source-limit diagnostics treat a CRLF boundary as one line break', () => {
  const p = makeTssParser();
  const source = 'a'.repeat(p.max.source - 1) + '\r\n';
  assert.throws(
    () => p.handle(source),
    error => {
      assert.ok(error instanceof RangeError);
      assert.equal(error.offset, p.max.source);
      assert.equal(error.line, 2);
      assert.equal(error.column, 1);
      return true;
    }
  );
});

test('recursive rule descent admits the exact effective depth and rejects one over', () => {
  let p = makeTssParser();
  p.config({ limits: { depth: 4 } });
  assert.deepEqual(p.handle(nested(4))[0].c[0].c[0].c[0].p, { x: '1' });

  p = makeTssParser();
  p.config({ limits: { depth: 4 } });
  assert.throws(
    () => p.handle(nested(5)),
    error => error instanceof RangeError && /^TSS depth limit exceeded/.test(error.message)
  );
});

test('hard token, node, and declaration ceilings admit exact and reject plus one', () => {
  let p = makeTssParser();
  const tokens = 'a{' + 'x:0;'.repeat(8191) + '} ';
  assert.equal(p.max.tokens, 32768);
  assert.deepEqual(p.handle(tokens)[0].p, { x: '0' });
  assert.throws(
    () => p.handle(tokens + ';'),
    error => error instanceof RangeError && error.offset === tokens.length
  );

  p = makeTssParser();
  const nodes = '{}'.repeat(p.max.nodes);
  assert.equal(p.max.nodes, 4096);
  assert.equal(p.handle(nodes).length, p.max.nodes);
  assert.throws(
    () => p.handle(nodes + '{}'),
    error => error instanceof RangeError && error.offset === nodes.length
  );

  p = makeTssParser();
  const declarations = 'a{' + ';'.repeat(p.max.declarations) + '}';
  assert.deepEqual(p.handle(declarations)[0].p, {});
  const over = declarations.slice(0, -1) + ';}';
  assert.throws(
    () => p.handle(over),
    error => error instanceof RangeError && error.offset === declarations.length - 1
  );
});

test('method-interleaving offset projection stays bounded near its node ceiling', {
  timeout: 5000
}, () => {
  const p = makeTssParser();
  const count = Math.floor((p.max.nodes - 1) / 2);
  const tree = p.handle('r{' + 'c->m{}x:1;'.repeat(count) + '}');
  assert.equal(tree.length, 1);
  assert.equal(tree[0].c.length, count);
  assert.ok(nodeCount(tree) <= p.max.nodes);
});

test('published runtime stays within its 10-KiB compressed source budget', () => {
  const source = fs.readFileSync(sourceFile);
  const withinBudget = value => zlib.gzipSync(value, { level: 9 }).length <= 10240;
  const compressed = zlib.gzipSync(source, { level: 9 });
  assert.ok(
    withinBudget(source),
    `compressed parser is ${compressed.length} bytes (budget 10240)`
  );

  const noise = Buffer.alloc(16384);
  let seed = 0xc0ffee;
  for (let i = 0; i < noise.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    noise[i] = seed;
  }
  assert.equal(withinBudget(Buffer.concat([source, noise])), false);
});
