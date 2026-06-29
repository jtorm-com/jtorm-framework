'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// input.json is the html-ui self-doc descriptor SHARED by the whole input family (every
// @f.inputX maps to input.html → input.json). It must document EXACTLY the attributes the
// input `.tss` family sets directly — no stray <img>-only attrs (crossorigin/ismap/
// longdesc/sizes/srcset/usemap were copy-paste junk), no gaps (alt/src/height/width are
// real <input type=image> attrs that input-image.tss reads — Codex PR #13 P2). The shared
// name/value/form/disabled/autofocus + formaction… are set via ->get form-element.tss /
// form-submit.tss (NOT in input*.tss) and documented in their own .json, so they're
// excluded here automatically. Ratchet: the expected set is DERIVED from the .tss, so a
// new variant attribute must be documented in input.json too (or this fails loud).
const FORM_DIR = path.resolve(__dirname, '../../src/uis/html-ui/src/form');

test('input.json documents exactly the attributes the input family sets (no stray img attrs, no gaps)', () => {
    const set = new Set();
    for (const f of fs.readdirSync(FORM_DIR))
        if (/^input.*\.tss$/.test(f))
            for (const m of fs.readFileSync(path.join(FORM_DIR, f), 'utf8').matchAll(/\bn:\s*'([a-z]+)'/g))
                set.add(m[1]);
    const expected = [...set].sort();
    const documented = Object.keys(
        JSON.parse(fs.readFileSync(path.join(FORM_DIR, 'input.json'), 'utf8'))
    ).sort();
    assert.deepEqual(documented, expected);
});

// And its `type.@options` enum must list exactly the `type` literals the variants set —
// input.tss's commented type regex is stale (omits `datetime`, which input-datetime.tss
// sets and the mapper exposes as inputDatetime), so DERIVE the enum from the variants, not
// from that regex (Codex PR #13 P2, round 2).
test('input.json type.@options lists exactly the type values the input variants set', () => {
    const set = new Set();
    for (const f of fs.readdirSync(FORM_DIR))
        if (/^input.*\.tss$/.test(f))
            for (const m of fs.readFileSync(path.join(FORM_DIR, f), 'utf8').matchAll(/\bn:\s*'type'\s*;\s*v:\s*'([a-z-]+)'/g))
                set.add(m[1]);
    const expected = [...set].sort();
    const json = JSON.parse(fs.readFileSync(path.join(FORM_DIR, 'input.json'), 'utf8'));
    const documented = (json.type['@options'] || []).map(o => o.value).sort();
    assert.deepEqual(documented, expected);
});
