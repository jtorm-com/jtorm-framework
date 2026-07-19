'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const nativeClock = pm.clock;
const owners = new Set();

function owner(ttl = 10, staleWindow = 10, max = 8) {
  const o = {c: new Map(), max, ttl, staleWindow};
  owners.add(o);
  pm.reset(o);
  return o;
}

function deferred() {
  let reject, resolve;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {promise, reject, resolve};
}

test.afterEach(() => {
  pm.clock = nativeClock;
  for (const o of owners) pm.reset(o);
  owners.clear();
});

test('age === ttl serves the old promise while starting one request-triggered refresh', async () => {
  let now = 0, loads = 0, release;
  const o = owner();
  pm.clock = () => now;

  const old = pm.get(o, 'k', {load: async () => ++loads});
  assert.equal(await old, 1);
  now = 10;

  const stale = pm.get(o, 'k', {
    load: () => {
      loads++;
      return new Promise(resolve => { release = resolve; });
    }
  });

  try {
    assert.strictEqual(stale, old, 'the stale caller receives the settled generation');
    assert.equal(await stale, 1);
    assert.equal(loads, 2, 'the first stale access starts exactly one refresh');
  } finally {
    if (release) release(2);
    await Promise.resolve();
    pm.reset(o);
  }
});

test('strict stale and hard boundaries share one refresh and publish at fulfillment without sliding', async () => {
  let now = 0, loads = 0;
  const o = owner(), firstRefresh = deferred(), secondRefresh = deferred();
  pm.clock = () => now;
  const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
  assert.equal(await old, 'OLD');

  const loadFirst = () => { loads++; return firstRefresh.promise; };
  now = 9;
  assert.strictEqual(pm.get(o, 'k', {load: loadFirst}), old);
  now = 10;
  assert.strictEqual(pm.get(o, 'k', {load: loadFirst}), old);
  assert.strictEqual(pm.get(o, 'k', {load: loadFirst}), old);
  assert.equal(loads, 2);
  assert.strictEqual(o.c.get('k'), old, 'stale service keeps the old public promise');

  now = 19;
  assert.strictEqual(pm.get(o, 'k', {load: loadFirst}), old);
  now = 20;
  const hard = pm.get(o, 'k', {load: loadFirst});
  assert.strictEqual(hard, firstRefresh.promise, 'the exact hard boundary joins exact refresh work');
  assert.equal(loads, 2);

  firstRefresh.resolve('NEW');
  assert.equal(await hard, 'NEW');
  await Promise.resolve();
  assert.strictEqual(o.c.get('k'), firstRefresh.promise);

  now = 29;
  assert.strictEqual(pm.get(o, 'k', {load: loadFirst}), firstRefresh.promise);
  now = 30;
  const loadSecond = () => { loads++; return secondRefresh.promise; };
  assert.strictEqual(pm.get(o, 'k', {load: loadSecond}), firstRefresh.promise);
  assert.equal(loads, 3, 'publication time, not refresh start or hits, owns the new age');
  secondRefresh.resolve('LATEST');
  assert.equal(await secondRefresh.promise, 'LATEST');
});

test('refresh rejection and synchronous throw keep the original deadline and allow request-triggered retry', async () => {
  let now = 0, loads = 0;
  const o = owner(), failed = deferred(), hardFailure = deferred(), replacement = deferred();
  pm.clock = () => now;
  const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
  await old;

  now = 10;
  assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return failed.promise; }}), old);
  failed.reject(new Error('refresh failed'));
  await assert.rejects(failed.promise, /refresh failed/);
  await Promise.resolve();

  now = 19;
  assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return hardFailure.promise; }}), old);
  assert.equal(loads, 3, 'a later eligible request retries once');
  now = 20;
  assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return hardFailure.promise; }}), hardFailure.promise);
  hardFailure.reject(new Error('hard failed'));
  await assert.rejects(hardFailure.promise, /hard failed/);
  await Promise.resolve();

  const cold = pm.get(o, 'k', {load: () => { loads++; return replacement.promise; }});
  assert.strictEqual(cold, replacement.promise, 'failure never slides the old hard deadline');
  replacement.resolve('NEW');
  assert.equal(await cold, 'NEW');

  now = 0;
  const sync = owner();
  const syncOld = pm.get(sync, 'k', {load: async () => 'SYNC-OLD'});
  await syncOld;
  now = 10;
  assert.doesNotThrow(() => {
    assert.strictEqual(pm.get(sync, 'k', {load() { throw new Error('sync failed'); }}), syncOld);
  });
  let retry;
  now = 11;
  assert.strictEqual(pm.get(sync, 'k', {load: () => (retry = Promise.resolve('SYNC-NEW'))}), syncOld);
  await retry;
  await Promise.resolve();
  assert.strictEqual(sync.c.get('k'), retry);
});

test('background refresh rejection is internally observed without a caller rejection handler', async () => {
  let now = 0, unhandled;
  const o = owner(), failed = deferred();
  pm.clock = () => now;
  const old = pm.get(o, 'k', {load: async () => 'OLD'});
  await old;
  now = 10;

  const listener = (reason, promise) => {
    if (promise === failed.promise) unhandled = reason;
  };
  process.on('unhandledRejection', listener);
  try {
    assert.strictEqual(pm.get(o, 'k', {load: () => failed.promise}), old);
    failed.reject(new Error('detached refresh failed'));
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(unhandled, undefined);
    assert.strictEqual(o.c.get('k'), old);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('invalid windows disable stale service while preserving ttl freshness and finite nonnegative windows are admitted', async () => {
  let now = 0;
  pm.clock = () => now;

  for (const value of [null, '10', true, NaN, -1, Infinity]) {
    now = 0;
    const o = owner();
    o.staleWindow = value;
    let loads = 0;
    const first = pm.get(o, 'k', {load: async () => ++loads});
    await first;
    assert.strictEqual(pm.get(o, 'k', {load: async () => ++loads}), first,
      'invalid window ' + String(value) + ' preserves ttl freshness');
    now = 10;
    const replacement = pm.get(o, 'k', {load: async () => ++loads});
    assert.notStrictEqual(replacement, first, 'invalid window ' + String(value) + ' disables stale service');
    assert.equal(await replacement, 2);
  }

  now = 0;
  const throwing = owner();
  Object.defineProperty(throwing, 'staleWindow', {
    configurable: true,
    get() { throw new Error('window unavailable'); }
  });
  const throwingOld = pm.get(throwing, 'k', {load: async () => 'OLD'});
  await throwingOld;
  assert.doesNotThrow(() => {
    assert.strictEqual(pm.get(throwing, 'k', {load: async () => 'unused'}), throwingOld);
  });
  now = 10;
  assert.notStrictEqual(pm.get(throwing, 'k', {load: async () => 'NEW'}), throwingOld);

  now = 0;
  const huge = owner(10, Number.MAX_VALUE), hugeRefresh = deferred();
  const hugeOld = pm.get(huge, 'k', {load: async () => 'OLD'});
  await hugeOld;
  now = 10;
  assert.strictEqual(pm.get(huge, 'k', {load: () => hugeRefresh.promise}), hugeOld);
  hugeRefresh.resolve('NEW');
  await hugeRefresh.promise;

  for (const declared of [false, true]) {
    now = 0;
    const zero = owner();
    if (declared) zero.staleWindow = undefined;
    else delete zero.staleWindow;
    const old = pm.get(zero, 'k', {load: async () => 'OLD'});
    await old;
    now = 9;
    assert.strictEqual(pm.get(zero, 'k', {load: async () => 'unused'}), old);
    now = 10;
    assert.notStrictEqual(pm.get(zero, 'k', {load: async () => 'NEW'}), old);
    now = 0;
  }

  const forever = owner(Infinity);
  Object.defineProperty(forever, 'staleWindow', {get() { throw new Error('must not read window'); }});
  pm.clock = () => { throw new Error('must not read clock'); };
  const infinite = pm.get(forever, 'k', {load: async () => 'FOREVER'});
  await infinite;
  assert.strictEqual(pm.get(forever, 'k', {load: async () => 'unused'}), infinite);

  const pendingOnly = owner(0);
  Object.defineProperty(pendingOnly, 'staleWindow', {get() { throw new Error('must not read zero window'); }});
  const work = deferred();
  const pending = pm.get(pendingOnly, 'k', {load: () => work.promise});
  assert.strictEqual(pm.get(pendingOnly, 'k', {load: async () => 'unused'}), pending);
  work.resolve('DONE');
  await pending;
  await Promise.resolve();
  assert.notStrictEqual(pm.get(pendingOnly, 'k', {load: async () => 'NEXT'}), pending);
});

test('invalid or regressing publication clocks publish to followers but retain no cache generation', async t => {
  for (const c of [
    {name: 'invalid', publish() { return NaN; }},
    {name: 'regressing', publish() { return 9; }}
  ]) await t.test(c.name, async () => {
    let now = 0, loads = 0;
    const o = owner(), refresh = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return refresh.promise; }}), old);

    now = c.publish();
    refresh.resolve('NEW');
    assert.equal(await refresh.promise, 'NEW');
    await Promise.resolve();
    assert.equal(o.c.has('k'), false);

    now = 11;
    const replacement = pm.get(o, 'k', {load: async () => { loads++; return 'RECOVERED'; }});
    assert.notStrictEqual(replacement, old);
    assert.equal(await replacement, 'RECOVERED');
    assert.equal(loads, 3);
  });
});

test('stale service touches LRU once and refresh publication preserves that deterministic position', async () => {
  let now = 0;
  const o = owner(10, 10, 2), refresh = deferred();
  pm.clock = () => now;
  const a = pm.get(o, 'a', {load: async () => 'A'});
  const b = pm.get(o, 'b', {load: async () => 'B'});
  await Promise.all([a, b]);
  assert.deepEqual([...o.c.keys()], ['a', 'b']);

  now = 10;
  assert.strictEqual(pm.get(o, 'a', {load: () => refresh.promise}), a);
  assert.deepEqual([...o.c.keys()], ['b', 'a']);
  await pm.get(o, 'c', {load: async () => 'C'});
  assert.deepEqual([...o.c.keys()], ['a', 'c'], 'stale service protects the successful hit');

  refresh.resolve('A2');
  await refresh.promise;
  await Promise.resolve();
  assert.deepEqual([...o.c.keys()], ['a', 'c'], 'publication adds no independent recency touch');
  assert.strictEqual(o.c.get('a'), refresh.promise);
});


test('purge, reset, eviction, map replacement, and newer insertion prevent late refresh resurrection', async t => {
  const cases = [
    {
      name: 'exact purge',
      act(o) { assert.equal(pm.purge(o, 'k'), 1); },
      check(o) { assert.equal(o.c.has('k'), false); }
    },
    {
      name: 'purge all',
      act(o) { assert.equal(pm.purgeAll(o), 1); },
      check(o) { assert.equal(o.c.size, 0); }
    },
    {
      name: 'metadata reset',
      act(o) { pm.reset(o); },
      check(o, old) { assert.strictEqual(o.c.get('k'), old); }
    },
    {
      name: 'cache map replacement',
      act(o) { o.old = o.c; o.c = new Map(); pm.reset(o); },
      check(o, old) {
        assert.equal(o.c.size, 0);
        assert.strictEqual(o.old.get('k'), old);
      }
    },
    {
      name: 'newer untracked insertion',
      act(o) { o.newer = Promise.resolve('MANUAL'); o.c.set('k', o.newer); },
      check(o) { assert.strictEqual(o.c.get('k'), o.newer); }
    },
    {
      name: 'LRU eviction',
      async act(o) { o.max = 1; await pm.get(o, 'other', {load: async () => 'OTHER'}); },
      check(o) {
        assert.equal(o.c.has('k'), false);
        assert.equal(o.c.has('other'), true);
      }
    }
  ];

  for (const c of cases) await t.test(c.name, async () => {
    let now = 0;
    const o = owner(), work = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => 'OLD'});
    await old;
    now = 10;
    assert.strictEqual(pm.get(o, 'k', {load: () => work.promise}), old);
    await c.act(o, old);
    work.resolve('LATE');
    assert.equal(await work.promise, 'LATE');
    await Promise.resolve();
    c.check(o, old);
  });
});

test('repeated detachment may leave work outstanding but never restores detached ownership', async () => {
  let now = 0, loads = 0;
  const o = owner(), work = [];
  pm.clock = () => now;
  let current = pm.get(o, 'k', {load: async () => { loads++; return 'BASE-0'; }});
  await current;

  for (let i = 1; i <= 3; i++) {
    now += 10;
    const d = deferred();
    work.push(d);
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return d.promise; }}), current);
    assert.equal(pm.purge(o, 'k'), 1);
    current = pm.get(o, 'k', {load: async () => { loads++; return 'BASE-' + i; }});
    assert.equal(await current, 'BASE-' + i);
  }

  assert.equal(loads, 7);
  for (let i = 0; i < work.length; i++) work[i].resolve('DETACHED-' + i);
  assert.deepEqual(await Promise.all(work.map(d => d.promise)), ['DETACHED-0', 'DETACHED-1', 'DETACHED-2']);
  await Promise.resolve();
  assert.strictEqual(o.c.get('k'), current);
  assert.equal(await current, 'BASE-3');
});

test('the same refresh promise stays generation-isolated across keys and detachment', async () => {
  let now = 0, refreshLoads = 0;
  const o = owner(), shared = deferred();
  pm.clock = () => now;
  const a = pm.get(o, 'a', {load: async () => 'A'});
  const b = pm.get(o, 'b', {load: async () => 'B'});
  await Promise.all([a, b]);
  now = 10;

  const load = () => { refreshLoads++; return shared.promise; };
  assert.strictEqual(pm.get(o, 'a', {load}), a);
  assert.strictEqual(pm.get(o, 'b', {load}), b);
  assert.equal(refreshLoads, 2);
  assert.equal(pm.purge(o, 'a'), 1);

  shared.resolve('SHARED');
  await shared.promise;
  await Promise.resolve();
  assert.equal(o.c.has('a'), false);
  assert.strictEqual(o.c.get('b'), shared.promise);
});

test('guarded initial hard classification cannot become an unguarded reuse through a policy re-read', async () => {
  let hits = 0, loads = 0, reads = 0;
  const o = owner();
  pm.clock = () => 0;
  const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
  await old;
  Object.defineProperty(o, 'ttl', {
    configurable: true,
    get() { return ++reads === 1 ? 0 : Infinity; }
  });

  const replacement = pm.get(o, 'k', {
    load: async () => { loads++; return 'NEW'; },
    hit: async () => { hits++; }
  });
  assert.notStrictEqual(replacement, old);
  assert.deepEqual({hits, loads, reads}, {hits: 0, loads: 2, reads: 1});
  assert.equal(await replacement, 'NEW');
  assert.deepEqual({hits, loads}, {hits: 0, loads: 2});
});

test('guard and key-check rejection start no stale refresh while fresh recency remains compatible', async () => {
  let now = 0, loads = 0;
  const o = owner(), gate = deferred();
  pm.clock = () => now;
  const a = pm.get(o, 'a', {load: async () => { loads++; return 'A'; }});
  const b = pm.get(o, 'b', {load: async () => { loads++; return 'B'; }});
  await Promise.all([a, b]);

  const fresh = pm.get(o, 'a', {
    load: async () => { loads++; return 'unused'; },
    hit: () => gate.promise,
    check() { throw new Error('scope changed'); }
  });
  assert.deepEqual([...o.c.keys()], ['b', 'a'], 'fresh guarded hits retain the existing pre-guard touch');
  gate.resolve();
  await assert.rejects(fresh, /scope changed/);
  assert.equal(loads, 2);

  now = 10;
  const staleGate = deferred();
  const stale = pm.get(o, 'b', {
    load: async () => { loads++; return 'unused'; },
    hit: () => staleGate.promise,
    check() { throw new Error('stale scope changed'); }
  });
  assert.deepEqual([...o.c.keys()], ['b', 'a'], 'stale work is not touched before authorization');
  staleGate.resolve();
  await assert.rejects(stale, /stale scope changed/);
  assert.deepEqual([...o.c.keys()], ['b', 'a']);
  assert.equal(loads, 2);
  assert.strictEqual(o.c.get('b'), b);
});

test('guarded hard callers adopt exact underlying refresh work without promise identity', async () => {
  let now = 0, checks = 0, loads = 0;
  const o = owner(), refresh = deferred(), gate = deferred();
  pm.clock = () => now;
  const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
  await old;
  now = 10;
  assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return refresh.promise; }}), old);
  now = 20;

  const guarded = pm.get(o, 'k', {
    load: () => { loads++; return Promise.resolve('unused'); },
    hit: () => gate.promise,
    check(q) { checks++; assert.equal(q, 'k'); }
  });
  assert.notStrictEqual(guarded, refresh.promise);
  gate.resolve();
  await Promise.resolve();
  assert.equal(checks, 1);
  assert.equal(loads, 2);

  refresh.resolve('NEW');
  assert.equal(await guarded, 'NEW');
  await Promise.resolve();
  assert.strictEqual(o.c.get('k'), refresh.promise);
});

test('post-guard classification handles boundary, publication, current generations, absence, and rejection once', async t => {
  await t.test('crossing hard starts one cold replacement', async () => {
    let now = 0, loads = 0;
    const o = owner(), gate = deferred(), replacement = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    const guarded = pm.get(o, 'k', {
      load: () => { loads++; return replacement.promise; },
      hit: () => gate.promise,
      check() {}
    });
    now = 20;
    gate.resolve();
    await Promise.resolve();
    assert.equal(loads, 2);
    replacement.resolve('NEW');
    assert.equal(await guarded, 'NEW');
    assert.notStrictEqual(o.c.get('k'), old);
  });

  await t.test('published refresh is adopted without duplicate load', async () => {
    let now = 0, loads = 0;
    const o = owner(), gate = deferred(), refresh = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return refresh.promise; }}), old);
    const guarded = pm.get(o, 'k', {
      load: () => { loads++; return Promise.resolve('duplicate'); },
      hit: () => gate.promise,
      check() {}
    });
    refresh.resolve('NEW');
    await refresh.promise;
    await Promise.resolve();
    gate.resolve();
    assert.equal(await guarded, 'NEW');
    assert.equal(loads, 2);
    assert.strictEqual(o.c.get('k'), refresh.promise);
  });

  await t.test('recognized current generation is reused after purge and replacement', async () => {
    let now = 0, loads = 0;
    const o = owner(), gate = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    const guarded = pm.get(o, 'k', {
      load: async () => { loads++; return 'duplicate'; },
      hit: () => gate.promise,
      check() {}
    });
    assert.equal(pm.purge(o, 'k'), 1);
    const current = pm.get(o, 'k', {load: async () => { loads++; return 'CURRENT'; }});
    await current;
    gate.resolve();
    assert.equal(await guarded, 'CURRENT');
    assert.strictEqual(o.c.get('k'), current);
    assert.equal(loads, 2);
  });

  await t.test('untracked newer work is preserved while caller loads directly', async () => {
    let now = 0, loads = 0;
    const o = owner(), gate = deferred(), newer = Promise.resolve('MANUAL');
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    const guarded = pm.get(o, 'k', {
      load: async () => { loads++; return 'DIRECT'; },
      hit: () => gate.promise,
      check() {}
    });
    o.c.set('k', newer);
    gate.resolve();
    assert.equal(await guarded, 'DIRECT');
    assert.strictEqual(o.c.get('k'), newer);
    assert.equal(loads, 2);
  });

  await t.test('absent state gets one current-map cold insertion', async () => {
    let now = 0, loads = 0;
    const o = owner(), gate = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    const guarded = pm.get(o, 'k', {
      load: async () => { loads++; return 'COLD'; },
      hit: () => gate.promise,
      check() {}
    });
    assert.equal(pm.purge(o, 'k'), 1);
    gate.resolve();
    assert.equal(await guarded, 'COLD');
    assert.equal(loads, 2);
    assert.equal(await o.c.get('k'), 'COLD');
  });

  await t.test('rejected observed refresh is retried once while still stale', async () => {
    let now = 0, loads = 0;
    const o = owner(), failed = deferred(), gate = deferred(), retry = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;
    now = 10;
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return failed.promise; }}), old);
    const guarded = pm.get(o, 'k', {
      load: () => { loads++; return retry.promise; },
      hit: () => gate.promise,
      check() {}
    });
    failed.reject(new Error('failed'));
    await assert.rejects(failed.promise, /failed/);
    await Promise.resolve();
    gate.resolve();
    assert.equal(await guarded, 'OLD');
    assert.equal(loads, 3);
    retry.resolve('RETRY');
    await retry.promise;
  });
});

test('runtime ttl and stale-window changes reclassify the original settlement without sliding it', async t => {
  await t.test('longer ttl restores freshness only to its original boundary', async () => {
    let now = 0, loads = 0;
    const o = owner(10, 0);
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    now = 12;
    o.ttl = 15;
    assert.strictEqual(pm.get(o, 'k', {load: async () => { loads++; return 'unused'; }}), old);
    now = 15;
    const next = pm.get(o, 'k', {load: async () => { loads++; return 'NEW'; }});
    assert.notStrictEqual(next, old);
    assert.equal(await next, 'NEW');
    assert.equal(loads, 2);
  });

  await t.test('shorter ttl immediately opens the configured stale phase', async () => {
    let now = 0, loads = 0;
    const o = owner(15, 10), refresh = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    now = 12;
    o.ttl = 10;
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return refresh.promise; }}), old);
    assert.equal(loads, 2);
    refresh.resolve('NEW');
    await refresh.promise;
  });

  await t.test('longer window admits the existing age as stale', async () => {
    let now = 0, loads = 0;
    const o = owner(10, 1), refresh = deferred();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    now = 12;
    o.staleWindow = 5;
    assert.strictEqual(pm.get(o, 'k', {load: () => { loads++; return refresh.promise; }}), old);
    assert.equal(loads, 2);
    refresh.resolve('NEW');
    await refresh.promise;
  });

  await t.test('shorter window immediately makes the existing age hard', async () => {
    let now = 0, loads = 0;
    const o = owner(10, 5);
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    now = 12;
    o.staleWindow = 2;
    const next = pm.get(o, 'k', {load: async () => { loads++; return 'NEW'; }});
    assert.notStrictEqual(next, old);
    assert.equal(await next, 'NEW');
    assert.equal(loads, 2);
  });
});

test('future, owner-regressing, and different clock samples fail hard instead of opening SWR', async t => {
  await t.test('a sample before the recorded settlement', async () => {
    let now = 10, loads = 0;
    const o = owner();
    pm.clock = () => now;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    now = 9;
    const next = pm.get(o, 'k', {load: async () => { loads++; return 'NEW'; }});
    assert.notStrictEqual(next, old);
    assert.equal(await next, 'NEW');
    assert.equal(loads, 2);
  });

  await t.test('a regression first observed through another key', async () => {
    let now = 10, loads = 0;
    const o = owner(100, 100);
    pm.clock = () => now;
    const old = pm.get(o, 'a', {load: async () => { loads++; return 'A'; }});
    await old;
    now = 20;
    await pm.get(o, 'b', {load: async () => { loads++; return 'B'; }});

    now = 15;
    const next = pm.get(o, 'a', {load: async () => { loads++; return 'NEW'; }});
    assert.notStrictEqual(next, old);
    assert.equal(await next, 'NEW');
    assert.equal(loads, 3);
  });

  await t.test('a new clock function with the same numeric value', async () => {
    let loads = 0;
    const o = owner();
    pm.clock = () => 10;
    const old = pm.get(o, 'k', {load: async () => { loads++; return 'OLD'; }});
    await old;

    pm.clock = () => 10;
    const next = pm.get(o, 'k', {load: async () => { loads++; return 'NEW'; }});
    assert.notStrictEqual(next, old);
    assert.equal(await next, 'NEW');
    assert.equal(loads, 2);
  });
});
