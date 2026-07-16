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
    for (const t of ['ViewModel', 'MethodEffect', 'ViewEffect', 'ViewIO', 'ViewContext', 'ViewLayerContext', 'ViewUiCacheContext', 'ViewUiManifestContext', 'ViewRequestContext', 'ViewCssContext', 'ViewJsContext', 'TssNode', 'UiDependency', 'UiArtifact', 'UiCall', 'UiDescriptor', 'UiPackage', 'UiResolution', 'JsonDepth', 'JsonValue', 'UiManifestDescriptor', 'UiManifestRoot', 'UiManifestCompilerRoot', 'UiManifestUi', 'UiManifestDynamic', 'UiManifestAsset', 'UiManifestConfig', 'UiManifestDocument', 'UiManifestPreparedIndex', 'UiManifestSourceRequest', 'UiManifestSourceResult', 'UiManifestSourceAdapter', 'UiManifestCompilerConfig', 'UiManifestCompileResult', 'UiManifestDigest', 'Method'])
      assert.match(dts, new RegExp('export type ' + t + '\\b'),
        t + ' must be an exported type so the import specifier resolves downstream');
    assert.match(dts, /locale\?: string \| null;/,
      'ViewContext must expose optional locale for per-render language lookup');
    assert.match(dts, /css\?: ViewCssContext;/,
      'ViewContext must expose optional css plugin state');
    assert.match(dts, /js\?: ViewJsContext;/,
      'ViewContext must expose optional js plugin state');
    assert.match(dts, /request\?: ViewRequestContext;/,
      'ViewContext must expose optional request model state');
    assert.match(dts, /manifest\?: ViewUiManifestContext;/,
      'ViewContext must expose optional root-local UI manifest state');
    assert.match(dts, /export type ViewIO = ViewEffect;/,
      'the published ViewIO name must remain as an alias of the returned effect');
    assert.doesNotMatch(dts, /\bio: ViewIO;/,
      'ViewModel must not expose the removed mutable control-flow side channel');
    assert.match(dts, /promise\?: Promise<void> \| null;/,
      'manifest preparation state must allow the runtime failure cleanup sentinel');
    const jd = dts.match(/export type JsonDepth = \[([^\]]+)\];/);
    assert.ok(jd, 'manifest values must expose their bounded recursive depth');
    assert.equal(jd[1].split(',').filter((v) => v.trim() === 'unknown').length, 128,
      'manifest value types must match the runtime 128-level nesting limit');
    const js = dts.slice(dts.indexOf('export type JsonValue<'), dts.indexOf('\n/**', dts.indexOf('export type JsonValue<')));
    assert.match(js, /export type JsonValue<D = JsonDepth>/,
      'manifest values must use the shared runtime depth counter by default');
    assert.match(js, /D extends readonly \[unknown, \.\.\.infer R\]/,
      'manifest values must consume one nesting level recursively');
    assert.match(js, /JsonValue<R>\[\] \| \{\n    \[key: string\]: JsonValue<R>;/,
      'manifest arrays and objects must recursively contain JSON-safe values');
    assert.doesNotMatch(js, /\bany\b/,
      'manifest values must stay recursively JSON-safe without any');
    assert.match(dts, /uis: UiManifestUi\[\];/,
      'wire config must not require the build-only UiPackage.mapper field');
    const cs = dts.indexOf('export type UiManifestCompilerConfig =');
    assert.ok(cs >= 0, 'compiler config must be exported');
    const compiler = dts.slice(cs, dts.indexOf('\n};', cs) + 3);
    assert.match(compiler, /roots: UiManifestCompilerRoot\[\];/,
      'compiler roots must expose the runtime-supported default framework input');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('published Method type accepts a data-only verb (no handle) and still requires validate', () => {
  // handler.js runs `data` (optional) -> `validate` (required) -> `handle` (called
  // only when a function). data-method ships validate + data and NO handle, so the
  // generated Method type must accept that shape while still requiring validate.
  const tsc = require.resolve('typescript/bin/tsc');
  fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, 'tmp', 'method-'));
  const run = (include) => {
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { allowJs: true, checkJs: true, strict: true, noEmit: true,
        target: 'ES2022', module: 'CommonJS', moduleResolution: 'node', skipLibCheck: true },
      include: [include]
    }));
    try { execFileSync(process.execPath, [tsc, '-p', path.join(dir, 'tsconfig.json')], { stdio: 'pipe' }); return true; }
    catch { return false; }
  };
  try {
    execFileSync(process.execPath, [tsc, '--declaration', '--emitDeclarationOnly', '--allowJs',
      '--rootDir', path.join(PKG_DIR, 'src'), '--outDir', dir, path.join(PKG_DIR, 'src', 'types.js')],
      { stdio: 'pipe' });
    fs.writeFileSync(path.join(dir, 'ok.js'),
      "'use strict';\n/** @typedef {import('./types').Method} M */\n/** @type {M} */\nconst m = { alias: 'd', params: [], validate: () => 1, data: async (v) => {} };\nmodule.exports = { m };\n");
    assert.ok(run('ok.js'), 'a data-only verb (validate + data, no handle) must satisfy Method');
    fs.writeFileSync(path.join(dir, 'bad.js'),
      "'use strict';\n/** @typedef {import('./types').Method} M */\n/** @type {M} */\nconst m = { handle: async (v) => {} };\nmodule.exports = { m };\n");
    assert.ok(!run('bad.js'), 'a verb missing validate must NOT satisfy Method');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
