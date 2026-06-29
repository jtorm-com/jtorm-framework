'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_DIR = path.join(ROOT, 'src', 'types');
const pkg = require('../src/types/package.json');

// @jtorm/types ships its ViewModel typedef as a .d.ts GENERATED from the JSDoc at
// prepack (source stays pure-JS). These lock the publish contract that makes
// `import('@jtorm/types').ViewModel` resolvable for downstream TypeScript consumers.

test('@jtorm/types declares the publish wiring for a generated .d.ts', () => {
  assert.equal(pkg.types, 'src/types.d.ts');
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes('src/types.d.ts'),
    'files[] must publish the generated declaration');
  assert.match(pkg.scripts.prepack, /emitDeclarationOnly/,
    'prepack must generate the .d.ts from the JSDoc');
});

test('prepack emits a consumable .d.ts that exports the typedefs', () => {
  const tsc = require.resolve('typescript/bin/tsc');
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
  const out = fs.mkdtempSync(path.join(ROOT, 'tmp', 'dts-'));
  try {
    execFileSync(process.execPath, [tsc,
      '--declaration', '--emitDeclarationOnly', '--allowJs',
      '--rootDir', path.join(PKG_DIR, 'src'), '--outDir', out,
      path.join(PKG_DIR, 'src', 'types.js')], { stdio: 'pipe' });
    const dts = fs.readFileSync(path.join(out, 'types.d.ts'), 'utf8');
    for (const t of ['ViewModel', 'ViewIO', 'ViewContext', 'TssNode', 'Method'])
      assert.match(dts, new RegExp('export type ' + t + '\\b'),
        t + ' must be an exported type so the import specifier resolves downstream');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
