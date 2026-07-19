'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { UIS_DIR, uisDiskPath } = require('../helpers/uis-disk-path.js');
const { makeTssParser } = require('../helpers/parser.js');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT = /['"](@[schb]\/[^'"]+\.(?:tss|html|json))['"]/g;

function walk(d) {
    const a = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) a.push(...walk(p));
        else if (/\.tss$/.test(e.name)) a.push(p);
    }
    return a;
}

function refs(tree) {
    const a = [];
    for (const t of tree) {
        if (t.m === 'get')
            for (const v of Object.values(t.p))
                for (const m of String(v).matchAll(ARTIFACT))
                    a.push(m[1])
        ;
        a.push(...refs(t.c));
    }
    return a;
}

function mapperRefs(o) {
    const a = [];
    if (!o || typeof o !== 'object') return a;
    for (const [k, v] of Object.entries(o)) {
        if ((k === 't' || k === 'h') && Array.isArray(v))
            for (const u of v)
                if (typeof u === 'string' && /^@[schb]\//.test(u))
                    a.push(u)
        ;
        if (v && typeof v === 'object')
            a.push(...mapperRefs(v))
        ;
    }
    return a;
}

function missing(files) {
    const miss = [];
    for (const f of files) {
        const rel = path.relative(ROOT, f);
        for (const u of refs(makeTssParser().handle(fs.readFileSync(f, 'utf8')))) {
            const p = uisDiskPath(u);
            if (!p || !fs.existsSync(p))
                miss.push(`${rel}: ${u} -> ${p ? path.relative(ROOT, p) : 'unserved'}`);
        }
    }
    return miss;
}

function missingMapper(ui, rel) {
    const miss = [];
    for (const u of mapperRefs(ui.mapper)) {
        const p = uisDiskPath(u);
        if (!p || !fs.existsSync(p))
            miss.push(`${rel}: ${u} -> ${p ? path.relative(ROOT, p) : 'unserved'}`);
    }
    return miss;
}

test('uisDiskPath mirrors the harness artifact serving aliases', () => {
    assert.equal(
        path.relative(UIS_DIR, uisDiskPath('@h/@f/input.tss')),
        'html-ui/src/form/input.tss'
    );
    assert.equal(
        path.relative(UIS_DIR, uisDiskPath('@h/form/input.tss')),
        'html-ui/src/form/input.tss'
    );
    assert.equal(
        path.relative(UIS_DIR, uisDiskPath('@c/head/facebook.tss')),
        'components-ui/src/head/facebook.tss'
    );
    assert.equal(
        path.relative(UIS_DIR, uisDiskPath('@b/button/button.tss')),
        'bootstrap-ui/src/button/button.tss'
    );
    assert.equal(uisDiskPath('/plain.tss'), null);
});

test('artifact-path scanner reports a drifted ->get literal', () => {
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    const dir = fs.mkdtempSync(path.join(ROOT, 'tmp', 'artifact-path-'));
    const f = path.join(dir, 'bad.tss');
    try {
        fs.writeFileSync(f, "x->get { t: '@h/missing.tss'; }\ny->get(d: id) { t: '@h/also-missing.tss'; }\n");
        assert.deepEqual(missing([f]), [
            `${path.relative(ROOT, f)}: @h/missing.tss -> src/uis/html-ui/src/missing.tss`,
            `${path.relative(ROOT, f)}: @h/also-missing.tss -> src/uis/html-ui/src/also-missing.tss`
        ]);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('artifact-path scanner sees literals after // inside a string', () => {
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    const dir = fs.mkdtempSync(path.join(ROOT, 'tmp', 'artifact-path-'));
    const f = path.join(dir, 'protocol.tss');
    try {
        fs.writeFileSync(f, "x->get { h: 'https://e.test'; t: '@h/protocol-missing.tss'; }\n");
        assert.deepEqual(missing([f]), [
            `${path.relative(ROOT, f)}: @h/protocol-missing.tss -> src/uis/html-ui/src/protocol-missing.tss`
        ]);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('artifact-path scanner sees literals inside nested get children', () => {
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    const dir = fs.mkdtempSync(path.join(ROOT, 'tmp', 'artifact-path-'));
    const f = path.join(dir, 'nested.tss');
    try {
        fs.writeFileSync(f, "x->get { y { z: 1; } z->get { t: '@h/nested-missing.tss'; } }\n");
        assert.deepEqual(missing([f]), [
            `${path.relative(ROOT, f)}: @h/nested-missing.tss -> src/uis/html-ui/src/nested-missing.tss`
        ]);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('mapper artifact scanner reports drifted t/h literals', () => {
    const ui = {
        mapper: {
            Thing: {
                default: {
                    t: ['@s/missing-mapper.tss'],
                    h: ['@h/missing-template.html']
                }
            }
        }
    };
    assert.deepEqual(missingMapper(ui, 'fake-ui.js'), [
        'fake-ui.js: @s/missing-mapper.tss -> src/uis/schema-ui/src/missing-mapper.tss',
        'fake-ui.js: @h/missing-template.html -> src/uis/html-ui/src/missing-template.html'
    ]);
});

test('every src/uis .tss ->get artifact literal resolves to a served disk file', () => {
    let n = 0;
    const files = walk(UIS_DIR);
    for (const f of files)
        n += refs(makeTssParser().handle(fs.readFileSync(f, 'utf8'))).length
    ;
    assert.ok(n > 0, 'expected to scan the shipped UI artifact graph');
    assert.deepEqual(missing(files), []);
});

test('every schema-ui mapper t/h artifact resolves to a served disk file', () => {
    const { jTormSchemaUi } = require('../../src/uis/schema-ui/src/schema-ui.js');
    assert.deepEqual(missingMapper(jTormSchemaUi, 'src/uis/schema-ui/src/schema-ui.js'), []);
});

test('every components-ui mapper t/h artifact resolves to a served disk file', () => {
    const { jTormComponentsUI } = require('../../src/uis/components-ui/src/components-ui.js');
    assert.deepEqual(missingMapper(jTormComponentsUI, 'src/uis/components-ui/src/components-ui.js'), []);
});

test('every bootstrap-ui mapper t/h artifact resolves to a served disk file', () => {
    const { jTormBootstrapUI } = require('../../src/uis/bootstrap-ui/src/bootstrap-ui.js');
    assert.deepEqual(missingMapper(jTormBootstrapUI, 'src/uis/bootstrap-ui/src/bootstrap-ui.js'), []);
});
