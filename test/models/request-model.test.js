'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');

function stub(fn) { const o = global.fetch; global.fetch = fn; return () => { global.fetch = o; }; }

test('get(url).json() returns parsed JSON on ok', async () => {
  const r = stub(async () => ({ ok: true, json: async () => ({ a: 1 }) }));
  try { rm.base = ''; assert.deepEqual(await rm.get('/x').json(), { a: 1 }); } finally { r(); }
});

test('get(url).text() returns text on ok', async () => {
  const r = stub(async () => ({ ok: true, text: async () => 'hi' }));
  try { rm.base = ''; assert.equal(await rm.get('/x').text(), 'hi'); } finally { r(); }
});

test('throws on non-ok response', async () => {
  const r = stub(async () => ({ ok: false, status: 404 }));
  try { rm.base = ''; await assert.rejects(() => rm.get('/x').json(), /404/); } finally { r(); }
});

test('prepends base for relative URLs, leaves absolute URLs alone', async () => {
  try {
    rm.base = 'https://cdn/';
    assert.equal(rm.url('a/b'), 'https://cdn/a/b');
    assert.equal(rm.url('https://x/y'), 'https://x/y');
  } finally { rm.base = ''; }
});

test('uses the injected transport instead of the global fetch', async () => {
  let viaTransport = 0, viaGlobal = 0;
  const r = stub(async () => { viaGlobal++; return { ok: true, text: async () => 'GLOBAL' }; });
  const saved = rm.transport;
  rm.transport = async () => { viaTransport++; return { ok: true, text: async () => 'TRANSPORT' }; };
  try {
    rm.base = '';
    assert.equal(await rm.get('/x').text(), 'TRANSPORT');
    assert.equal(viaTransport, 1);
    assert.equal(viaGlobal, 0);
  } finally { rm.transport = saved; r(); }
});

test('blocks absolute HTTP URLs by default before transport', async () => {
  let calls = 0;
  const saved = rm.transport;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = '';
    await assert.rejects(() => rm.get('http://169.254.169.254/latest').text(), /URL blocked/);
    assert.equal(calls, 0);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('blocks fetch-normalized absolute HTTP URLs before transport', async () => {
  let calls = 0;
  const saved = rm.transport;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = '';
    await assert.rejects(() => rm.get(' http://169.254.169.254/latest').text(), /URL blocked/);
    await assert.rejects(() => rm.get('h\nttp://169.254.169.254/latest').text(), /URL blocked/);
    assert.equal(calls, 0);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('blocks browser-normalized scheme-relative backslash URLs', () => {
  rm.base = '';
  assert.equal(rm.allow('\\\\evil.example/x'), false);
  assert.equal(rm.allow('/\\evil.example/x'), false);
});

test('allows configured base-origin URLs by default', async () => {
  let seen;
  const saved = rm.transport;
  rm.transport = async (u) => { seen = u; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = 'https://cdn.example/assets/';
    await rm.get('a.tss').text();
    assert.equal(seen, 'https://cdn.example/assets/a.tss');
    await rm.get('https://cdn.example/other.tss').text();
    assert.equal(seen, 'https://cdn.example/other.tss');
    await assert.rejects(() => rm.get('https://other.example/x').text(), /URL blocked/);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('uses injected URL guard with the resolved URL before transport', async () => {
  let seen, calls = 0;
  const savedT = rm.transport, savedA = rm.allow;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  rm.allow = function (u) { seen = u; return false; };
  try {
    rm.base = 'https://cdn.example/';
    await assert.rejects(() => rm.get('a.tss').text(), /URL blocked/);
    assert.equal(seen, 'https://cdn.example/a.tss');
    assert.equal(calls, 0);
  } finally { rm.transport = savedT; rm.allow = savedA; rm.base = ''; }
});

test('injected URL guard can opt in an external absolute URL', async () => {
  let seen;
  const savedT = rm.transport, savedA = rm.allow;
  rm.transport = async (u) => { seen = u; return { ok: true, text: async () => 'x' }; };
  rm.allow = function (u) { return u === 'https://api.example/x'; };
  try {
    rm.base = '';
    assert.equal(await rm.get('https://api.example/x').text(), 'x');
    assert.equal(seen, 'https://api.example/x');
  } finally { rm.transport = savedT; rm.allow = savedA; rm.base = ''; }
});

test('per-call context keeps base/timeout stable across an interleaved singleton mutation', async () => {
  let seen, release;
  const savedT = rm.transport, savedA = rm.allow;
  rm.allow = async function (u, c) {
    await new Promise((resolve) => { release = resolve; });
    return savedA.call(this, u, c);
  };
  rm.transport = async (u, o) => {
    seen = { u, signal: !!(o && o.signal) };
    return { ok: true, status: 200, text: async () => 'ok' };
  };

  try {
    rm.base = 'https://a.example/assets/';
    rm.timeout = 0;

    const p = rm.get('item.html', { request: { base: 'https://a.example/assets/', timeout: 5 } }).text();
    await Promise.resolve();
    rm.base = 'https://b.example/assets/';
    release();

    assert.equal(await p, 'ok');
    assert.deepEqual(seen, { u: 'https://a.example/assets/item.html', signal: true });
  } finally {
    rm.transport = savedT;
    rm.allow = savedA;
    rm.base = '';
    rm.timeout = 0;
  }
});
