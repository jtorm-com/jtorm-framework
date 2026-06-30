'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { UIS_DIR, uisDiskPath } = require('../helpers/uis-disk-path.js');
const { makeTssParser } = require('../helpers/parser.js');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT = /['"](@[sch]\/[^'"]+\.(?:tss|html|json))['"]/g;

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

// Mapper-side `t`/`h` arrays in `*.js` are intentionally out of scope for this ratchet:
// two schema-ui mapper entries point at absent files that require authoring decisions,
// not repoints. Extend this guard to mapper arrays only after those files are designed.
test('every src/uis .tss ->get artifact literal resolves to a served disk file', () => {
    let n = 0;
    const files = walk(UIS_DIR);
    for (const f of files)
        n += refs(makeTssParser().handle(fs.readFileSync(f, 'utf8'))).length
    ;
    assert.ok(n > 0, 'expected to scan the shipped UI artifact graph');
    assert.deepEqual(missing(files), []);
});
