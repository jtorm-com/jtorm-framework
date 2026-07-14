'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { render } = require('../helpers/engine.js');
const { makeTssParser } = require('../helpers/parser.js');
const { jTormIfMethod } = require('../../src/methods/if-method/src/if-method.js');

const TSS = "p->if(d: show, v: 'yes')->attr { n: 'data-ok'; v: show; }";
const REGEX_WORKER = path.join(__dirname, '../helpers/if-regex-worker.js');
const SHIPPED_REGEXES = new Map([
  ['[\\x0A\\x0D\\u2028\\u2029]', ['\n', 'ok']],
  ['\\.json$', ['item.json', 'item.jsonld']],
  ['^(?!ListItem$).+', ['Thing', 'ListItem']],
  ['^([0-9]+x[0-9]+)|(any)$', ['32x32', '32-by-32']],
  ['^([a-z][a-z]-?([A-Z][A-Z]|Hans|Hant|x-default)?)$', ['en-US', 'e-US']],
  ['^(allow-forms|allow-pointer-lock|allow-popups|allow-same-origin|allow-scripts|allow-top-navigation)$', ['allow-forms', 'forms']],
  ['^(alternate|author|bookmark|help|license|next|nofollow|noreferrer|prefetch|prev|search|tag)$', ['alternate', 'canonical']],
  ['^(application\\/x-www-form-urlencoded|multipart\\/form-data|text\\/plain)$', ['text/plain', 'application/json']],
  ['^(auto|metadata|none)$', ['metadata', 'all']],
  ['^(button|reset|submit)$', ['submit', 'image']],
  ['^(captions|chapters|descriptions|metadata|subtitles)$', ['captions', 'audio']],
  ['^(content-type|default-style|refresh|X-UA-Compatible)$', ['refresh', 'location']],
  ['^(get|post)$', ['post', 'put']],
  ['^(hard|soft)$', ['soft', 'wrap']],
  ['^(ltr|rtl)$', ['rtl', 'auto']],
  ['^(no-referrer|no-referrer-when-downgrade|origin|origin-when-cross-origin|unsafe-url)$', ['origin', 'same-origin']],
  ['^(on|off)$', ['off', 'yes']],
  ['^WPFooter', ['WPFooter', 'Footer']],
  ['^WPHeader|SiteNavigationElement', ['SiteNavigationElement', 'WebPage']],
  ['^[0-9]+$', ['123', '12px']],
  ['^[0-9]+(.[0-9])?$', ['12.3', '12.34']],
  ['^https?://schema[.]org/(InStock|OutOfStock|BackOrder|Discontinued|InStoreOnly|LimitedAvailability|MadeToOrder|OnlineOnly|PreOrder|PreSale|Reserved|SoldOut)$', ['https://schema.org/InStock', 'https://schema.org/Unknown']]
]);

function isolated(tss, text) {
  const r = spawnSync(process.execPath, [REGEX_WORKER, JSON.stringify({ tss, text, error: 'Unsafe regex pattern' })], {
    stdio: 'ignore',
    timeout: 2000
  });
  assert.notEqual(r.error && r.error.code, 'ETIMEDOUT', 'regex evaluation exceeded the child-process deadline');
  assert.equal(r.status, 0, `regex worker exited ${r.status}`);
}

function tssFiles(d) {
  const r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) r.push(...tssFiles(f));
    else if (e.name.endsWith('.tss')) r.push(f);
  }
  return r;
}

function regexes(n, r = []) {
  for (const t of n) {
    if (t.m === 'if' && t.p.r === 'true') r.push(t.p.v.slice(1, -1));
    regexes(t.c, r);
  }
  return r;
}

test('if gate passes → the chained method applies', async () => {
  const { body } = await render('<body><p>x</p></body>', TSS, { show: 'yes' });
  assert.equal(body, '<p data-ok="yes">x</p>');
});

test('if gate fails → the chained method is a silent no-op (characterizes #14)', async () => {
  const { body } = await render('<body><p>x</p></body>', TSS, { show: 'no' });
  assert.equal(body, '<p>x</p>');
});

// --- full conditional matrix: if is a normal if/else, not a zero-match gate ---

test('if(d:) truthy applies, falsy no-ops', async () => {
  const t = "p->if(d: ok)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { ok: 'y' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '' })).body, '<p>x</p>');
});

test('if(to: type) gates on the data type', async () => {
  const t = "p->if(d: list, to: 'array')->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { list: [1] })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { list: 'no' })).body, '<p>x</p>');
});

test('if(v:) treats malformed regex data as literal text', async () => {
  const t = "p->if(d: text, v: token)->attr { n: 'data-a'; v: '1'; }";
  const { body } = await render('<body><p>x</p></body>', t, { text: 'abc', token: '[' });
  assert.equal(body, '<p>x</p>');
});

test('if(v:) does not let regex-shaped data overmatch', async () => {
  const t = "p->if(d: text, v: token)->attr { n: 'data-a'; v: '1'; }";
  const { body } = await render('<body><p>x</p></body>', t, { text: 'a---z', token: 'a.*z' });
  assert.equal(body, '<p>x</p>');
});

test('if(r:) treats a quoted TSS value as a trusted regex', async () => {
  const t = "p->if(d: show, v: '^yes$', r: true)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { show: 'yes' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { show: 'yesterday' })).body, '<p>x</p>');
});

test('if(r:) fails closed when the regex policy model is not configured', async (t) => {
  const g = jTormIfMethod.regexPolicyModel;
  t.after(() => { jTormIfMethod.regexPolicyModel = g; });
  jTormIfMethod.regexPolicyModel = null;

  await assert.rejects(
    render(
      '<body><p>x</p></body>',
      "p->if(d: text, v: '^yes$', r: true)->attr { n: 'data-a'; v: '1'; }",
      { text: 'yes' }
    ),
    /Regex policy model not configured/
  );
});

test('if(r:) rejects model-derived regex operands', async () => {
  await assert.rejects(
    render(
      '<body><p>x</p></body>',
      "p->if(d: text, v: token, r: true)->attr { n: 'data-a'; v: '1'; }",
      { text: 'abc', token: '[' }
    ),
    /Unsafe regex/
  );
});

test('if(r:) rejects concatenated regex operands', async () => {
  await assert.rejects(
    render(
      '<body><p>x</p></body>',
      "p->if(d: text, v: '^' + token + '$', r: true)->attr { n: 'data-a'; v: '1'; }",
      { text: 'abc', token: 'abc' }
    ),
    /Unsafe regex/
  );
});

test('if(r:) rejects catastrophic nested quantifiers within a hard deadline', () => {
  isolated(
    "p->if(d: text, v: '^(x+)+$', r: true)->attr { n: 'data-a'; v: '1'; }",
    'x'.repeat(64) + '!'
  );
});

test('if(r:) rejects overlapping quantified alternation within a hard deadline', () => {
  isolated(
    "p->if(d: text, v: '^(x|xx)+$', r: true)->attr { n: 'data-a'; v: '1'; }",
    'x'.repeat(64) + '!'
  );
});

test('if(r:) rejects malformed regex literals', async () => {
  await assert.rejects(
    render(
      '<body><p>x</p></body>',
      "p->if(d: text, v: '[', r: true)->attr { n: 'data-a'; v: '1'; }",
      { text: 'x' }
    ),
    /Unsafe regex pattern/
  );
});

test('if(r:) rejects TSS braces before regex compilation', async () => {
  await assert.rejects(
    render(
      '<body><p>x</p></body>',
      "p->if(d: text, v: '^a{1,2}$', r: true)->attr { n: 'data-a'; v: '1'; }",
      { text: 'a' }
    ),
    (e) => !/Invalid regular expression/.test(e.message),
    'TSS braces must fail before regex compilation'
  );
});

test('if(r:) enforces the subject bound before matching', async () => {
  const t = "p->if(d: text, v: '^[0-9]+$', r: true)->attr { n: 'data-a'; v: '1'; }";
  assert.equal(
    (await render('<body><p>x</p></body>', t, { text: '1'.repeat(1024) })).body,
    '<p data-a="1">x</p>'
  );
  await assert.rejects(
    render('<body><p>x</p></body>', t, { text: '1'.repeat(1025) }),
    /Unsafe regex input/
  );
});

test('if(r:) preserves type and element short-circuiting before subject matching', async () => {
  const text = '1'.repeat(1025);
  const el = "p->if(d: text, el: 'p', v: '^[0-9]+$', r: true)->attr { n: 'data-a'; v: '1'; }";
  const to = "p->if(d: text, to: 'number', v: '^[0-9]+$', r: true)->attr { n: 'data-a'; v: '1'; }";

  assert.equal((await render('<body><p>x</p></body>', el, { text })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', to, { text })).body, '<p>x</p>');
});

test('every distinct shipped if(r:) pattern remains executable', async () => {
  const p = makeTssParser();
  const a = new Set();
  for (const f of tssFiles(path.join(__dirname, '../../src')))
    for (const r of regexes(p.handle(fs.readFileSync(f, 'utf8')))) a.add(r)
  ;

  assert.deepEqual([...a].sort(), [...SHIPPED_REGEXES.keys()].sort());

  for (const [r, [yes, no]] of SHIPPED_REGEXES) {
    const t = `p->if(d: text, v: '${r}', r: true) { ->attr { n: 'data-a'; v: '1'; } ->else { ->attr { n: 'data-b'; v: '0'; } } }`;
    assert.equal((await render('<body><p>x</p></body>', t, { text: yes })).body, '<p data-a="1">x</p>', r);
    assert.equal((await render('<body><p>x</p></body>', t, { text: no })).body, '<p data-b="0">x</p>', r);
  }
});

test('if(v:) preserves ordinary literal matching', async () => {
  const t = "p->if(d: text, v: 'yes')->attr { n: 'data-a'; v: '1'; }";
  const { body } = await render('<body><p>x</p></body>', t, { text: 'say yes' });
  assert.equal(body, '<p data-a="1">x</p>');
});

test('if(v:) preserves boolean matching', async () => {
  const t = "p->if(d: ok, v: true)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { ok: true })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { ok: false })).body, '<p>x</p>');
});

test('if(el: X) gates on element existence — the optional-target idiom', async () => {
  const present = "a->if(el: a)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><a>x</a></body>', present, {})).body, '<a data-a="1">x</a>');
  const absent = "a->if(el: '.none')->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><a>x</a></body>', absent, {})).body, '<a>x</a>'); // no throw — optional
});

test('->else renders the alternate branch when the condition is false', async () => {
  const t = "p->if(d: ok) { ->attr { n: 'data-a'; v: '1'; } ->else { ->attr { n: 'data-b'; v: '0'; } } }";
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '1' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '' })).body, '<p data-b="0">x</p>');
});
