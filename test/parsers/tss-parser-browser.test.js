'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../..');
const dir = path.join(repo, 'src/parsers/tss-parser');
const file = path.join(dir, 'tss-parser.min.js');
const source = path.join(dir, 'src/tss-parser.js');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function pkg(name) {
  return JSON.parse(fs.readFileSync(path.join(name, 'package.json'), 'utf8'));
}

function fresh() {
  delete require.cache[require.resolve(source)];
  return require(source).jTormTSSParser;
}

function files(name) {
  const out = [];
  for (const entry of fs.readdirSync(name, { withFileTypes: true })) {
    const item = path.join(name, entry.name);
    if (entry.isDirectory()) out.push(...files(item));
    else if (entry.name.endsWith('.tss')) out.push(item);
  }
  return out;
}

function build() {
  execFileSync(npm, ['run', 'build'], { cwd: dir, stdio: 'pipe' });
  return fs.readFileSync(file);
}

test('package declares a build-only classic-browser artifact without remapping CommonJS', () => {
  const root = pkg(repo), parser = pkg(dir);
  assert.equal(parser.main, 'src/tss-parser.js');
  assert.equal(Object.hasOwn(parser, 'browser'), false);
  assert.equal(parser.unpkg, 'tss-parser.min.js');
  assert.equal(parser.jsdelivr, 'tss-parser.min.js');
  assert.deepEqual(parser.files, ['src/tss-parser.js', 'tss-parser.min.js']);
  assert.equal(parser.scripts.prepack, 'npm run build');
  assert.match(parser.scripts.build, /\bterser\b/);
  assert.doesNotMatch(parser.scripts.build, /mangle-props|source-map/);
  assert.deepEqual(parser.dependencies, {});
  assert.equal(parser.devDependencies.terser, '5.49.0');
  assert.equal(root.devDependencies.terser, '5.49.0');
});

test('Terser build is deterministic, licensed, bounded, and browser-compatible', t => {
  t.after(() => fs.rmSync(file, { force: true }));
  const first = build(), second = build();
  assert.deepEqual(second, first);
  assert.match(first.toString('utf8', 0, 160), /\/\*! \(c\) jTorm/);
  assert.doesNotMatch(first.toString(), /sourceMappingURL|\brequire\s*\(/);
  const integrity = 'sha384-' + crypto.createHash('sha384').update(first).digest('base64');
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  assert.ok(readme.includes(integrity));
  assert.match(readme, /16,575 raw bytes[\s\S]*6,120 bytes at gzip level 9/);
  const compressed = zlib.gzipSync(first, { level: 9 });
  assert.equal(first.length, 16575);
  const withinBudget = value => zlib.gzipSync(value, { level: 9 }).length <= 7168;
  assert.ok(
    compressed.length <= 7168 && withinBudget(first),
    'browser parser exceeds 7 KiB gzip-9'
  );
  const noise = Buffer.alloc(16384);
  let seed = 0xc0ffee;
  for (let i = 0; i < noise.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    noise[i] = seed;
  }
  assert.equal(withinBudget(Buffer.concat([first, noise])), false);

  const context = vm.createContext({});
  vm.runInContext(first.toString(), context, { filename: 'tss-parser.min.js' });
  const browser = context.jTormTSSParser, common = fresh();
  assert.ok(browser && typeof browser.handle === 'function');
  assert.equal(context.module, undefined);
  assert.deepEqual(Object.keys(browser), Object.keys(common));

  browser.config({});
  common.config({});
  assert.deepEqual(Object.keys(browser), Object.keys(common));
  assert.equal(JSON.stringify(browser.max), JSON.stringify(common.max));
  assert.equal(JSON.stringify(browser.limits), JSON.stringify(common.limits));
  assert.deepEqual(
    Object.fromEntries(Object.entries(browser.regexes).map(([k, v]) => [k, [v.source, v.flags]])),
    Object.fromEntries(Object.entries(common.regexes).map(([k, v]) => [k, [v.source, v.flags]]))
  );

  for (const item of files(path.join(repo, 'src')).sort()) {
    const input = fs.readFileSync(item, 'utf8');
    assert.equal(
      JSON.stringify(browser.handle(input)),
      JSON.stringify(common.handle(input)),
      path.relative(repo, item)
    );
  }

  function failure(parser) {
    try {
      parser.handle('a {\n  color: red;');
    } catch (error) {
      return {
        name: error.name, message: error.message, line: error.line,
        column: error.column, offset: error.offset
      };
    }
  }
  assert.deepEqual(failure(browser), failure(common));
  browser.tree = []; browser.pairs = []; browser.tss = '';
  assert.deepEqual([browser.tree, browser.pairs, browser.tss], [[], [], '']);

  const config = {
    opening: '[', closing: ']', propertySeparator: '=', propertyEnd: '!',
    propertyShorthandOpening: '(', propertyShorthandClosing: ')',
    propertyShorthandSeparator: '~', methodSeparator: '=>', quotes: '"'
  };
  browser.config(config);
  common.config(config);
  const input = 'item=>attr(n="class"~v="a~b")[x="a=b!"!]';
  assert.equal(JSON.stringify(browser.handle(input)), JSON.stringify(common.handle(input)));
});
