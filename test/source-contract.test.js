'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scan } = require('./helpers/source-contract.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function files(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...files(file));
    } else out.push(file);
  }
  return out;
}

const source = files(SRC);
const js = source.filter(file => file.endsWith('.js'));

test('source walk skips package-local dependency trees', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jtorm-source-contract-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'own.js'), '');
  fs.mkdirSync(path.join(dir, 'node_modules', 'dependency'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'node_modules', 'dependency', 'index.js'), 'require("dependency")');

  assert.deepEqual(files(dir).map(file => path.relative(dir, file)), ['own.js']);
});

test('runtime source keeps pure DI and the returned-effect control contract', () => {
  const imports = [];
  const mutableIo = [];
  const bypasses = [];
  const registry = [];
  const missingDispatch = [];

  for (const file of js) {
    const body = fs.readFileSync(file, 'utf8');
    const name = path.relative(ROOT, file);
    const r = scan(body, name);
    if (r.imports) imports.push(name);
    if (r.io) mutableIo.push(name);
    if (r.bypasses) bypasses.push(name);
    if (r.registry) registry.push(name);
    if (r.missingDispatch) missingDispatch.push(name);
  }

  assert.deepEqual(imports, [], 'runtime src must keep zero runtime imports');
  assert.deepEqual(mutableIo, [], 'runtime control flow must never restore an io side channel');
  assert.deepEqual(registry, [], 'method packages must not own the registered-method registry');
  assert.deepEqual(bypasses, [], 'only the handler may invoke arbitrary verb handles');
  assert.deepEqual(missingDispatch, [], 'synthesized verb callers must use handler.dispatch');
});

test('source contract catches bypass families and allows named lifecycle collaborators', () => {
  const positives = [
    ['src/models/x/src/x.js', 'const load = require; load("x")', 'imports'],
    ['src/models/x/src/x.js', 'const key = "io"; v?.[key]', 'io'],
    ['src/models/x/src/x.js', 'const v = {"io": {repeat: true}}', 'io'],
    ['src/methods/attrs-method/src/attrs-method.js', 'this.attrMethod?.["handle"]?.(v)', 'bypasses'],
    ['src/methods/each-method/src/each-method.js', 'const m = this.methods[name]; const {handle} = m; handle(v)', 'registry'],
    ['src/methods/each-method/src/each-method.js', 'const fn = candidate.handle.bind(candidate); fn(v)', 'bypasses'],
    ['src/methods/ui-method/src/ui-method.js', 'const {handle} = this.compilerModel.methods[name]; handle(v)', 'bypasses'],
    ['src/models/ui-compiler-model/src/ui-compiler-model.js', 'const fn = candidate.handle; fn(v)', 'bypasses']
  ];
  for (const [file, body, key] of positives)
    assert.ok(scan(body, file)[key], file + ' must reject ' + key)
  ;

  const safe = [
    ['src/methods/each-method/src/each-method.js', 's.handler.handle(v); s.handlerWrapper.handle(v)'],
    ['src/methods/ui-method/src/ui-method.js', 'this.dataParser.handle(v); this.errorHandler.handle("x", v)'],
    ['src/methods/mediatarget-method/src/mediatarget-method.js', 'this.mediaqueryMethod.process(v.d.q)'],
    ['src/methods/title-method/src/title-method.js', 'module.exports = {handle(v) { return {children: true}; }}'],
    ['src/models/x/src/x.js', 'module.exports = {require() { return true; }}'],
    ['src/models/x/src/x.js', '// require("x"); v.io\n"this.handler.dispatch(v)"']
  ];
  for (const [file, body] of safe) {
    const r = scan(body, file);
    assert.equal(r.imports + r.io + r.bypasses + r.registry + r.dispatches, 0, file);
  }
});

test('all runtime method packages carry the canonical effect editor annotation', () => {
  const dir = path.join(SRC, 'methods');
  const missing = fs.readdirSync(dir)
    .filter(name => name.endsWith('-method'))
    .filter(name => !/import\('@jtorm\/types'\)\.MethodEffect/.test(
      fs.readFileSync(path.join(dir, name, 'src', name + '.js'), 'utf8')
    ));

  assert.deepEqual(missing, []);
});

test('effect-returning packages require the coordinated handler and type contract', () => {
  const dir = path.join(SRC, 'methods');
  const stale = fs.readdirSync(dir)
    .filter(name => name.endsWith('-method'))
    .filter(name => {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, name, 'package.json'), 'utf8'));
      return pkg.dependencies['@jtorm/handler'] !== '^1.0.6'
        || pkg.dependencies['@jtorm/types'] !== '^1.1.1';
    });

  assert.deepEqual(stale, []);

  const compiler = JSON.parse(fs.readFileSync(path.join(SRC, 'models', 'ui-compiler-model', 'package.json'), 'utf8'));
  assert.equal(compiler.dependencies['@jtorm/handler'], '^1.0.6');
  assert.equal(compiler.dependencies['@jtorm/types'], '^1.1.1');
  assert.equal(compiler.dependencies['@jtorm/view-model'], '^1.0.4');
});

test('source stays pure JS except for the generated @jtorm/types declaration artifact', () => {
  const handwritten = source
    .filter(file => /\.d?ts$/.test(file))
    .map(file => path.relative(ROOT, file))
    .filter(file => file !== 'src/types/src/types.d.ts');

  assert.deepEqual(handwritten, []);
});
