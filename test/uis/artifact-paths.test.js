'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { UIS_DIR, uisDiskPath } = require('../helpers/uis-disk-path.js');

const ROOT = path.resolve(__dirname, '../..');

function walk(d) {
    const a = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) a.push(...walk(p));
        else if (/\.tss$/.test(e.name)) a.push(p);
    }
    return a;
}

function clean(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function missing(files) {
    const miss = [];
    for (const f of files) {
        const rel = path.relative(ROOT, f);
        const src = clean(fs.readFileSync(f, 'utf8'));
        for (const g of src.matchAll(/->get(?:\([^)]*\))?\s*\{[\s\S]*?\}/g))
            for (const m of g[0].matchAll(/['"](@[sch]\/[^'"]+\.(?:tss|html|json))['"]/g)) {
                const p = uisDiskPath(m[1]);
                if (!p || !fs.existsSync(p))
                    miss.push(`${rel}: ${m[1]} -> ${p ? path.relative(ROOT, p) : 'unserved'}`);
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

// Mapper-side `t`/`h` arrays in `*.js` are intentionally out of scope for this ratchet:
// two schema-ui mapper entries point at absent files that require authoring decisions,
// not repoints. Extend this guard to mapper arrays only after those files are designed.
test('every src/uis .tss ->get artifact literal resolves to a served disk file', () => {
    let n = 0;
    const files = walk(UIS_DIR);
    for (const f of files) {
        const src = clean(fs.readFileSync(f, 'utf8'));
        for (const g of src.matchAll(/->get(?:\([^)]*\))?\s*\{[\s\S]*?\}/g))
            for (const m of g[0].matchAll(/['"](@[sch]\/[^'"]+\.(?:tss|html|json))['"]/g))
                n++;
    }
    assert.ok(n > 0, 'expected to scan the shipped UI artifact graph');
    assert.deepEqual(missing(files), []);
});
