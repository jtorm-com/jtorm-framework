'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormErrorHandler: h } = require('../../src/handlers/error-handler/src/error-handler.js');

const d = h.debug, u = h.util, log = console.log;

test.afterEach(() => {
  h.debug = d;
  h.util = u;
  console.log = log;
});

test('error diagnostics default to disabled', () => {
  assert.equal(h.debug, false);
});

test('disabled diagnostics throw without logging, util, or view observation', () => {
  let keys = 0, reads = 0;
  const v = new Proxy(Object.defineProperty({}, 'secret', {
    enumerable: true,
    get: () => { reads++; return { email: 'private@example.test' }; }
  }), {
    ownKeys: target => { keys++; return Reflect.ownKeys(target); }
  });
  const logs = [];
  h.debug = false;
  h.util = undefined;
  console.log = (...args) => logs.push(args);

  let error;
  try {
    h.handle('drifted selector', v);
  } catch (e) {
    error = e;
  }

  assert.equal(error.constructor, Error);
  assert.equal(error.message, 'drifted selector');
  assert.equal(keys, 0);
  assert.equal(reads, 0);
  assert.deepEqual(logs, []);
});

test('only literal true opts into diagnostics', () => {
  for (const value of ['true', 1, {}]) {
    h.debug = value;
    const v = new Proxy({}, {
      ownKeys: () => { throw new Error('view observed'); }
    });
    assert.throws(() => h.handle('closed by default', v), {
      name: 'Error',
      message: 'closed by default'
    });
  }
});

test('debug mode preserves the diagnostic dump format and skips', () => {
  const data = { email: 'private@example.test' };
  const html = { html: () => '<html>document</html>' };
  const view = { empty: 0, _: { skip: 1 }, m: { skip: 1 }, d: data, html };
  const inspected = [], logs = [];
  h.debug = true;
  h.util = {
    inspect: (...args) => { inspected.push(args); return 'INSPECTED'; }
  };
  console.log = value => logs.push(value);

  assert.throws(() => h.handle('debug drift', view), {
    name: 'Error',
    message: 'debug drift'
  });

  assert.deepEqual(inspected, [[data, false, 10, true]]);
  assert.deepEqual(logs, [
    '',
    '---- Param: d ----',
    'INSPECTED',
    '',
    '',
    '---- Param: html ----',
    '<html>document</html>',
    ''
  ]);
});

test('a debug dump failure cannot replace the requested error', () => {
  h.debug = true;
  h.util = {
    inspect: () => { throw new Error('inspect failed'); }
  };
  console.log = () => {};

  assert.throws(() => h.handle('primary drift', { d: { secret: 1 } }), {
    name: 'Error',
    message: 'primary drift'
  });
});
