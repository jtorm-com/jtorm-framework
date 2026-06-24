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
  let seen; const r = stub(async (u) => { seen = u; return { ok: true, text: async () => '' }; });
  try {
    rm.base = 'https://cdn/';
    await rm.get('a/b').text(); assert.equal(seen, 'https://cdn/a/b');
    await rm.get('https://x/y').text(); assert.equal(seen, 'https://x/y');
  } finally { rm.base = ''; r(); }
});
