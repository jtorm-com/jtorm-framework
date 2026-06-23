'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeTssParser } = require('../helpers/parser.js');

test('handle() parses a single selector + property into one tree node', () => {
  const p = makeTssParser();
  const tree = p.handle("a { color: red; }");
  assert.equal(tree.length, 1);
  assert.equal(tree[0].s, 'a');
  assert.equal(tree[0].m, false);
  assert.deepEqual(tree[0].p, { color: 'red' });
  assert.deepEqual(tree[0].c, []);
});

test('handle() parses a method chain (CHARACTERIZATION)', () => {
  const p = makeTssParser();
  const tree = p.handle("a->attr { n: 'class'; v: 'x'; }");
  // Actual output captured: top-level node has selector 'a', method false, empty props,
  // and one child with selector 'a', method 'attr', props { n: "'class'", v: "'x'" }.
  assert.ok(Array.isArray(tree) && tree.length === 1);
  assert.equal(tree[0].s, 'a');
  assert.equal(tree[0].m, false);
  assert.deepEqual(tree[0].p, {});
  assert.equal(tree[0].c.length, 1);
  assert.equal(tree[0].c[0].s, 'a');
  assert.equal(tree[0].c[0].m, 'attr');
  assert.deepEqual(tree[0].c[0].p, { n: "'class'", v: "'x'" });
  assert.deepEqual(tree[0].c[0].c, []);
});

test('handle() drops a final property with no trailing ";" (BY DESIGN — TSS requires ; terminators)', () => {
  const p = makeTssParser();
  const withSemi = p.handle("a { color: red; }");
  const without  = p.handle("a { color: red }");
  assert.deepEqual(withSemi[0].p, { color: 'red' });
  // BY DESIGN: without a trailing semicolon the property is silently dropped.
  // Actual captured output: props is empty object {}.
  assert.deepEqual(without[0].p, {});
});

function listTss(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTss(f));
    else if (e.name.endsWith('.tss')) out.push(f);
  }
  return out;
}

test('fixture-sweep: every src/**/*.tss parses to its locked snapshot hash', () => {
  const repo = path.resolve(__dirname, '../..');
  const files = listTss(path.join(repo, 'src')).sort();
  const p = makeTssParser();
  const actual = {};
  for (const f of files) {
    const rel = path.relative(repo, f);
    let h;
    try {
      const tree = p.handle(fs.readFileSync(f, 'utf8'));
      h = crypto.createHash('sha256').update(JSON.stringify(tree)).digest('hex');
    } catch (e) {
      h = 'ERROR:' + String((e && e.message) || e);
    }
    actual[rel] = h;
  }
  const goldenPath = path.join(repo, 'test/fixtures/tss-snapshot.json');
  if (!fs.existsSync(goldenPath)) {
    fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
    fs.writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + '\n');
  }
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  assert.deepEqual(actual, golden);
});
