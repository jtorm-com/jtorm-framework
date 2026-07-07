'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormGetMethod: gm } = require('../../src/methods/get-method/src/get-method.js');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { makeTssParser } = require('../helpers/parser.js');

test('get-method fetches multi-t artifacts through the real tss/request path in order and caches parts', async () => {
  const d = {
    '/a.tss': 'a { color: red; }',
    '/b.tss': 'b { color: blue; }'
  };
  const u = [];
  const m = gm.models;
  const r = rm.transport;

  try {
    gm.models = { tss: tm };
    tm.c = new Map();
    tm.tssParser = makeTssParser();
    tm.requestModel = rm;
    rm.base = '';
    rm.timeout = 0;
    rm.transport = async (url) => {
      u.push(url);
      return d[url]
        ? { ok: true, status: 200, text: async () => d[url] }
        : { ok: false, status: 404, text: async () => '' };
    };

    const a = await gm.get('tss', ['/a.tss', '/b.tss']);
    const b = await gm.get('tss', ['/a.tss', '/b.tss']);

    assert.deepEqual(a.map(t => t.s), ['a', 'b']);
    assert.deepEqual(b.map(t => t.s), ['a', 'b']);
    assert.deepEqual(u, ['/a.tss', '/b.tss']);
  } finally {
    gm.models = m;
    tm.c = new Map();
    rm.transport = r;
    rm.base = '';
    rm.timeout = 0;
  }
});
