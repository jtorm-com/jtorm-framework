'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const tag = value => ({name: 'etag', value});
const turn = async () => { await Promise.resolve(); await Promise.resolve(); };

function isolated(name, fn) {
  test(name, async t => {
    const saved = {clock: pm.clock, metadata: pm.metadata, observed: pm.observed};
    pm.metadata = new WeakMap();
    pm.observed = new WeakMap();
    try {
      await fn(t);
    } finally {
      Object.assign(pm, saved);
    }
  });
}

function owner(time, values) {
  pm.clock = () => time.value;
  return Object.assign({c: new Map(), max: 8, ttl: 10, staleWindow: 0}, values);
}

async function seed(o, key, value, validator) {
  const p = pm.get(o, key, {
    validators: true,
    load: tx => {
      assert.equal(tx.validator(), undefined);
      tx.accept(validator);
      return Promise.resolve(value);
    }
  });
  assert.strictEqual(o.c.get(key), p);
  assert.strictEqual(await p, value);
  await turn();
  return {promise: p};
}

isolated('a hard 304 publishes a fresh promise that adopts the exact paired value without sliding ordinary hits', async () => {
  const time = {value: 0}, o = owner(time), value = {id: 1};
  const {promise: old} = await seed(o, 'a', value, tag('"a"'));
  let loads = 0;

  time.value = 10;
  const current = pm.get(o, 'a', {
    validators: true,
    load: tx => (async () => {
      loads++;
      await Promise.resolve();
      const validator = tx.validator();
      assert.deepEqual(validator, tag('"a"'));
      return tx.reuse(validator);
    })()
  });

  assert.notStrictEqual(current, old);
  assert.strictEqual(o.c.get('a'), current);
  assert.strictEqual(await current, value);
  await turn();

  time.value = 19;
  const fresh = pm.get(o, 'a', {validators: true, load: () => { loads++; return Promise.resolve('unused'); }});
  assert.strictEqual(fresh, current);
  assert.equal(loads, 1);

  time.value = 20;
  const expired = pm.get(o, 'a', {validators: true, load: tx => {
    loads++;
    assert.deepEqual(tx.validator(), tag('"a"'));
    tx.accept(undefined);
    return Promise.resolve('new');
  }});
  assert.notStrictEqual(expired, current);
  assert.equal(await expired, 'new');
  assert.equal(loads, 2);
});

isolated('a modified generation publishes staged metadata and missing metadata clears its predecessor', async () => {
  const time = {value: 0}, o = owner(time);
  await seed(o, 'a', 'A', tag('"a"'));

  time.value = 10;
  assert.equal(await pm.get(o, 'a', {validators: true, load: tx => (async () => {
    await Promise.resolve();
    assert.deepEqual(tx.validator(), tag('"a"'));
    tx.accept(undefined);
    return 'B';
  })()}), 'B');
  await turn();

  time.value = 20;
  let seen = 1;
  assert.equal(await pm.get(o, 'a', {validators: true, load: tx => {
    seen = tx.validator();
    tx.accept(tag('"c"'));
    return Promise.resolve('C');
  }}), 'C');
  assert.equal(seen, undefined);
});

isolated('concurrent hard callers share one revalidation promise and one transaction', async () => {
  const time = {value: 0}, o = owner(time), value = {id: 1};
  await seed(o, 'a', value, tag('"a"'));
  let release, loads = 0;

  time.value = 10;
  const operation = {
    validators: true,
    load: tx => (async () => {
      loads++;
      await new Promise(resolve => { release = resolve; });
      const validator = tx.validator();
      return tx.reuse(validator);
    })()
  };
  const a = pm.get(o, 'a', operation), b = pm.get(o, 'a', operation);

  assert.strictEqual(b, a);
  assert.equal(loads, 1);
  release();
  assert.deepEqual(await Promise.all([a, b]), [value, value]);
});

isolated('SWR serves the old promise, runs one conditional refresh, lets hard callers join it, and stamps only publication', async () => {
  const time = {value: 0}, o = owner(time, {staleWindow: 10}), value = {id: 1};
  const {promise: old} = await seed(o, 'a', value, tag('"a"'));
  let release, refresh, loads = 0;
  const operation = {
    validators: true,
    load: tx => {
      loads++;
      refresh = (async () => {
        await new Promise(resolve => { release = resolve; });
        const validator = tx.validator();
        return tx.reuse(validator);
      })();
      return refresh;
    }
  };

  time.value = 10;
  assert.strictEqual(pm.get(o, 'a', operation), old);
  assert.strictEqual(pm.get(o, 'a', operation), old);
  assert.strictEqual(o.c.get('a'), old);
  assert.equal(loads, 1);

  time.value = 20;
  const hard = pm.get(o, 'a', operation);
  assert.strictEqual(hard, refresh);
  release();
  assert.strictEqual(await hard, value);
  await turn();
  assert.strictEqual(o.c.get('a'), refresh);

  time.value = 29;
  assert.strictEqual(pm.get(o, 'a', {validators: true, load: () => Promise.resolve('unused')}), refresh);
  time.value = 30;
  let next;
  assert.strictEqual(pm.get(o, 'a', {validators: true, load: () => {
    next = Promise.resolve('new');
    return next;
  }}), refresh);
  time.value = 40;
  assert.strictEqual(pm.get(o, 'a', {validators: true, load: () => Promise.resolve('unused')}), next);
  assert.notStrictEqual(next, refresh);
});

isolated('a failed SWR refresh retains the exact old content-validator pair and original hard deadline', async () => {
  const time = {value: 0}, o = owner(time, {staleWindow: 10});
  const {promise: old} = await seed(o, 'a', 'A', tag('"a"'));
  let reject;

  time.value = 10;
  assert.strictEqual(pm.get(o, 'a', {validators: true, load: tx => {
    assert.deepEqual(tx.validator(), tag('"a"'));
    return new Promise((resolve, fail) => { reject = fail; });
  }}), old);
  reject(new Error('refresh failed'));
  await turn();
  assert.strictEqual(o.c.get('a'), old);

  time.value = 19;
  let retry, seen;
  assert.strictEqual(pm.get(o, 'a', {validators: true, load: tx => {
    seen = tx.validator();
    retry = Promise.reject(new Error('retry failed'));
    retry.catch(() => {});
    return retry;
  }}), old);
  assert.deepEqual(seen, tag('"a"'));
  await turn();

  time.value = 20;
  const hard = pm.get(o, 'a', {validators: true, load: tx => {
    assert.deepEqual(tx.validator(), tag('"a"'));
    return Promise.resolve('B');
  }});
  assert.notStrictEqual(hard, old);
  assert.equal(await hard, 'B');
});

isolated('purge detaches an in-flight 304 and the bodyless result cannot synthesize or reinsert content', async () => {
  const time = {value: 0}, o = owner(time);
  await seed(o, 'a', 'A', tag('"a"'));
  let release, tx;

  time.value = 10;
  const pending = pm.get(o, 'a', {validators: true, load: value => {
    tx = value;
    return (async () => {
      await new Promise(resolve => { release = resolve; });
      return tx.reuse(tag('"a"'));
    })();
  }});
  assert.equal(pm.purge(o, 'a'), 1);
  assert.equal(o.c.has('a'), false);
  assert.equal(tx.validator(), undefined);
  release();

  await assert.rejects(() => pending, /Cache validator detached/);
  assert.equal(o.c.has('a'), false);
});

isolated('hard and SWR 304 reject when the exact base validator record is detached in flight', async t => {
  for (const stale of [0, 10]) {
    await t.test(stale ? 'swr' : 'hard', async () => {
      const time = {value: 0}, o = owner(time, {staleWindow: stale});
      const {promise: old} = await seed(o, 'a', 'A', tag('"a"'));
      const base = pm.record(o.c, 'a', old);
      let release, tx;

      time.value = 10;
      const pending = pm.get(o, 'a', {validators: true, load: value => {
        tx = value;
        return (async () => {
          assert.deepEqual(tx.validator(), tag('"a"'));
          await new Promise(resolve => { release = resolve; });
          return tx.reuse(tag('"a"'));
        })();
      }});
      pending.catch(() => {});
      base.validator = tag('"detached"');
      release();

      if (stale) assert.strictEqual(pending, old);
      await turn();
      if (!stale) await assert.rejects(() => pending, /Cache validator detached/);
      assert.equal(base.validator, undefined);
      if (stale) assert.strictEqual(o.c.get('a'), old);
      else assert.equal(o.c.has('a'), false);
    });
  }
});

isolated('a late modified response may resolve its caller after purge but cannot publish content or metadata', async () => {
  const time = {value: 0}, o = owner(time);
  await seed(o, 'a', 'A', tag('"a"'));
  let release, tx;

  time.value = 10;
  const pending = pm.get(o, 'a', {validators: true, load: value => {
    tx = value;
    return (async () => {
      await new Promise(resolve => { release = resolve; });
      tx.accept(tag('"b"'));
      return 'B';
    })();
  }});
  pm.purgeAll(o);
  release();

  assert.equal(await pending, 'B');
  await turn();
  assert.equal(o.c.size, 0);

  time.value = 20;
  let seen = 1;
  assert.equal(await pm.get(o, 'a', {validators: true, load: value => {
    seen = value.validator();
    value.accept(undefined);
    return Promise.resolve('C');
  }}), 'C');
  assert.equal(seen, undefined);
});

isolated('reset, Map replacement, eviction, and manual supersession detach 304 reuse without deleting winners', async t => {
  for (const mode of ['reset', 'map', 'evict', 'manual']) {
    await t.test(mode, async () => {
      const time = {value: 0}, o = owner(time, {max: 1});
      await seed(o, 'a', 'A', tag('"a"'));
      let release, tx;

      time.value = 10;
      const pending = pm.get(o, 'a', {validators: true, load: value => {
        tx = value;
        return (async () => {
          await new Promise(resolve => { release = resolve; });
          return tx.reuse(tag('"a"'));
        })();
      }});
      pending.catch(() => {});

      let winner;
      if (mode === 'reset') {
        pm.reset(o);
        winner = o.c.get('a');
      } else if (mode === 'map') {
        winner = Promise.resolve('MAP');
        o.c = new Map([['winner', winner]]);
      } else if (mode === 'evict') {
        winner = pm.get(o, 'b', {load: () => Promise.resolve('B')});
      } else {
        winner = Promise.resolve('MANUAL');
        o.c.set('a', winner);
      }

      assert.equal(tx.validator(), undefined);
      release();
      await assert.rejects(() => pending, /Cache validator detached/);
      if (mode === 'reset' || mode === 'manual') assert.strictEqual(o.c.get('a'), winner);
      if (mode === 'map') assert.strictEqual(o.c.get('winner'), winner);
      if (mode === 'evict') assert.strictEqual(o.c.get('b'), winner);
    });
  }
});

isolated('synchronous pre-install detachment leaves work caller-only with no cache, record, LRU, or cleanup resurrection', async t => {
  for (const mode of ['purge', 'purgeAll', 'reset', 'map', 'evict', 'manual']) {
    await t.test(mode, async () => {
      const time = {value: 0}, o = owner(time, {max: 1});
      const {promise: old} = await seed(o, 'a', 'A', tag('"a"'));
      let tx, winner;

      time.value = 10;
      const caller = pm.get(o, 'a', {validators: true, load: value => {
        tx = value;
        assert.deepEqual(tx.validator(), tag('"a"'));
        if (mode === 'purge') pm.purge(o, 'a');
        if (mode === 'purgeAll') pm.purgeAll(o);
        if (mode === 'reset') { pm.reset(o); winner = old; }
        if (mode === 'map') { winner = Promise.resolve('MAP'); o.c = new Map([['winner', winner]]); }
        if (mode === 'evict') winner = pm.get(o, 'b', {load: () => Promise.resolve('B')});
        if (mode === 'manual') { winner = Promise.resolve('MANUAL'); o.c.set('a', winner); }

        return Promise.resolve().then(() => {
          assert.equal(tx.validator(), undefined);
          tx.accept(tag('"b"'));
          return 'B';
        });
      }});

      assert.equal(await caller, 'B');
      await turn();
      if (mode === 'purge' || mode === 'purgeAll') assert.equal(o.c.size, 0);
      if (mode === 'reset' || mode === 'manual') assert.strictEqual(o.c.get('a'), winner);
      if (mode === 'map') assert.deepEqual([...o.c.entries()], [['winner', winner]]);
      if (mode === 'evict') assert.deepEqual([...o.c.entries()], [['b', winner]]);
    });
  }
});

isolated('paired hard guard rejection removes only its exact expired generation', async () => {
  const time = {value: 0}, o = owner(time);
  await seed(o, 'a', 'A', tag('"a"'));
  time.value = 10;

  const pending = pm.get(o, 'a', {
    validators: true,
    hit: async () => { throw new Error('guard failed'); },
    check: () => {},
    load: () => Promise.resolve('must not load')
  });

  await assert.rejects(() => pending, /guard failed/);
  assert.equal(o.c.has('a'), false);
});

isolated('late hard guard rejection loses to purge, Map replacement, and another guarded caller', async t => {
  for (const mode of ['purge', 'map', 'success']) {
    await t.test(mode, async () => {
      const time = {value: 0}, o = owner(time);
      await seed(o, 'a', 'A', tag('"a"'));
      time.value = 10;
      let reject;

      const failed = pm.get(o, 'a', {
        validators: true,
        hit: () => new Promise((resolve, fail) => { reject = fail; }),
        check: () => {},
        load: () => Promise.resolve('failed loader')
      });
      await Promise.resolve();
      assert.equal(typeof reject, 'function');

      let winner;
      if (mode === 'purge') pm.purge(o, 'a');
      if (mode === 'map') { winner = Promise.resolve('MAP'); o.c = new Map([['winner', winner]]); }
      if (mode === 'success') {
        await pm.get(o, 'a', {
          validators: true,
          hit: async () => {},
          check: () => {},
          load: tx => { tx.accept(tag('"b"')); return Promise.resolve('B'); }
        });
        winner = o.c.get('a');
      }

      reject(new Error('late guard failure'));
      await assert.rejects(() => failed, /late guard failure/);
      if (mode === 'purge') assert.equal(o.c.has('a'), false);
      if (mode === 'map') assert.strictEqual(o.c.get('winner'), winner);
      if (mode === 'success') assert.strictEqual(o.c.get('a'), winner);
    });
  }
});

isolated('absent, false, truthy non-boolean, and bypass validator options keep zero-argument loader behavior', async () => {
  const cases = [undefined, false, 1, 'true'];

  for (let i = 0; i < cases.length; i++) {
    const time = {value: 0}, o = owner(time, {ttl: Infinity});
    let count;
    const options = {validators: cases[i], load: function () {
      count = arguments.length;
      return Promise.resolve(i);
    }};
    assert.equal(await pm.get(o, 'k', options), i);
    assert.equal(count, 0);
  }

  const time = {value: 0}, o = owner(time);
  let count;
  assert.equal(await pm.get(o, undefined, {validators: true, load: function () {
    count = arguments.length;
    return Promise.resolve('bypass');
  }}), 'bypass');
  assert.equal(count, 0);
  assert.equal(o.c.size, 0);
});
