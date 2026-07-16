'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  jTormJsonLdModel
} = require('../../src/models/json-ld-model/src/json-ld-model.js');

const LIMITS = {
  maxText: 1048576,
  maxValues: 262144,
  maxDepth: 128
};

test.afterEach(() => {
  Object.assign(jTormJsonLdModel, LIMITS);
});

test('serialize activates only for a plain root with an own enumerable data @type', () => {
  let reads = 0;
  const accessor = { name: 'Accessor' };
  Object.defineProperty(accessor, '@type', {
    enumerable: true,
    get() {
      reads++;
      return 'Thing';
    }
  });

  assert.equal(jTormJsonLdModel.serialize(null), null);
  assert.equal(jTormJsonLdModel.serialize([]), null);
  assert.equal(jTormJsonLdModel.serialize({ name: 'Untyped' }), null);
  assert.equal(jTormJsonLdModel.serialize({ '@type': '' }), null);
  assert.equal(jTormJsonLdModel.serialize({ '@type': '   ' }), null);
  assert.equal(jTormJsonLdModel.serialize(new (class Thing {
    constructor() {
      this['@type'] = 'Thing';
    }
  })()), null);
  assert.equal(jTormJsonLdModel.serialize(accessor), null);
  assert.equal(reads, 0);

  const inherited = Object.create({ '@type': 'Thing' });
  inherited.name = 'Inherited';
  assert.equal(jTormJsonLdModel.serialize(inherited), null);

  const hidden = { name: 'Hidden' };
  Object.defineProperty(hidden, '@type', { value: 'Thing' });
  assert.equal(jTormJsonLdModel.serialize(hidden), null);
});

test('serialize adds the schema.org context, filters framework metadata recursively, and does not mutate', () => {
  let reads = 0;
  const child = {
    '@type': 'Thing',
    '@id': '/child',
    name: 'Child',
    customExtension: 'public'
  };
  Object.defineProperty(child, '@meta', {
    enumerable: true,
    get() {
      reads++;
      return { internal: 'private' };
    }
  });
  Object.defineProperty(child, '@futureControl', {
    enumerable: true,
    get() {
      reads++;
      return 'private';
    }
  });

  const model = Object.freeze({
    '@type': 'Person',
    name: 'Ana',
    customExtension: 'public',
    child: Object.freeze(child),
    '@meta': Object.freeze({ internal: 'private', authToken: 'private' }),
    '@config': Object.freeze({ internal: 'private' }),
    '@template': 'private'
  });

  assert.deepEqual(JSON.parse(jTormJsonLdModel.serialize(model)), {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ana',
    customExtension: 'public',
    child: {
      '@type': 'Thing',
      '@id': '/child',
      name: 'Child',
      customExtension: 'public'
    }
  });
  assert.equal(reads, 0);
  assert.equal(Object.hasOwn(model, '@context'), false);
});

test('serialize preserves an explicit JSON context and every JSON-LD 1.1 keyword', () => {
  const keywords = [
    '@base', '@container', '@context', '@direction', '@graph', '@id',
    '@import', '@included', '@index', '@json', '@language', '@list',
    '@nest', '@none', '@prefix', '@propagate', '@protected', '@reverse',
    '@set', '@type', '@value', '@version', '@vocab'
  ];
  const model = {};
  for (const key of keywords)
    model[key] = key === '@version' ? 1.1 : 'value';
  model['@context'] = { '@vocab': 'https://example.test/' };
  model['@type'] = 'Thing';

  const result = JSON.parse(jTormJsonLdModel.serialize(model));
  for (const key of keywords)
    assert.ok(Object.hasOwn(result, key), key);
  assert.deepEqual(result['@context'], { '@vocab': 'https://example.test/' });
});

test('serialize honors descriptor-only root opt-out without invoking metadata accessors', () => {
  let reads = 0;
  const optedOut = {
    '@type': 'Thing',
    '@meta': { jsonLd: false }
  };
  const metadata = {};
  Object.defineProperty(metadata, 'jsonLd', {
    enumerable: true,
    get() {
      reads++;
      return false;
    }
  });
  const accessor = { '@type': 'Thing', '@meta': metadata };

  assert.equal(jTormJsonLdModel.serialize(optedOut), null);
  assert.equal(JSON.parse(jTormJsonLdModel.serialize(accessor))['@type'], 'Thing');
  assert.equal(reads, 0);
});

test('serialize rejects non-JSON values, accessors, exotic objects, holes, and cycles with paths', () => {
  const invalid = [
    undefined,
    function () {},
    Symbol('value'),
    1n,
    Infinity,
    NaN,
    new Date(),
    new (class Value {})()
  ];

  for (const value of invalid)
    assert.throws(
      () => jTormJsonLdModel.serialize({ '@type': 'Thing', bad: value }),
      /JSON-LD value invalid at \$\.bad/
    );

  const accessor = { '@type': 'Thing' };
  Object.defineProperty(accessor, 'bad', {
    enumerable: true,
    get() {
      throw new Error('must not run');
    }
  });
  assert.throws(
    () => jTormJsonLdModel.serialize(accessor),
    /JSON-LD value invalid at \$\.bad/
  );

  const knownAccessor = { '@type': 'Thing' };
  Object.defineProperty(knownAccessor, '@id', {
    enumerable: true,
    get() {
      throw new Error('must not run');
    }
  });
  assert.throws(
    () => jTormJsonLdModel.serialize(knownAccessor),
    /JSON-LD value invalid at \$\["@id"\]/
  );

  assert.throws(
    () => jTormJsonLdModel.serialize({ '@type': 'Thing', bad: Array(1) }),
    /JSON-LD value invalid at \$\.bad\[0\]/
  );

  const cyclic = { '@type': 'Thing' };
  cyclic.self = cyclic;
  assert.throws(
    () => jTormJsonLdModel.serialize(cyclic),
    /JSON-LD cycle at \$\.self/
  );
});

test('serialize encodes HTML raw-text delimiters while JSON round-trips exactly', () => {
  const value = '</script><img src=x><!--&\u2028\u2029';
  const key = '<unsafe&>';
  const model = {
    '@type': 'Thing',
    [key]: value
  };
  const output = jTormJsonLdModel.serialize(model);

  assert.doesNotMatch(output, /[<>&\u2028\u2029]/u);
  assert.match(output, /\\u003c/);
  assert.match(output, /\\u003e/);
  assert.match(output, /\\u0026/);
  assert.match(output, /\\u2028/);
  assert.match(output, /\\u2029/);
  assert.equal(JSON.parse(output)[key], value);
});

test('serialize enforces configurable value, depth, and UTF-8 output limits', () => {
  jTormJsonLdModel.maxValues = 3;
  assert.throws(
    () => jTormJsonLdModel.serialize({ '@type': 'Thing', name: 'Wide' }),
    /JSON-LD structure limit at \$\.name/
  );

  Object.assign(jTormJsonLdModel, LIMITS);
  jTormJsonLdModel.maxDepth = 1;
  assert.throws(
    () => jTormJsonLdModel.serialize({
      '@type': 'Thing',
      child: { nested: { name: 'Deep' } }
    }),
    /JSON-LD structure limit at \$\.child\.nested/
  );

  Object.assign(jTormJsonLdModel, LIMITS);
  const model = { '@type': 'Thing', name: '😀' };
  const bytes = new TextEncoder().encode(jTormJsonLdModel.serialize(model)).length;
  jTormJsonLdModel.maxText = bytes - 1;
  assert.throws(
    () => jTormJsonLdModel.serialize(model),
    /JSON-LD text limit/
  );
});

test('serialize charges filtered metadata keys to the structure limit without reading them', () => {
  let reads = 0;
  const model = { '@type': 'Thing' };

  for (let k = 0; k < 4; k++)
    Object.defineProperty(model, `@private${k}`, {
      enumerable: true,
      get() {
        reads++;
        return 'private';
      }
    });

  jTormJsonLdModel.maxValues = 5;
  assert.throws(
    () => jTormJsonLdModel.serialize(model),
    /JSON-LD structure limit at \$\["@private2"\]/
  );
  assert.equal(reads, 0);
});

test('serialize rejects oversized strings and keys before tokenization', () => {
  const stringify = JSON.stringify;
  const oversized = 'x'.repeat(65);
  jTormJsonLdModel.maxText = 64;

  JSON.stringify = value => {
    if (value === oversized)
      throw new Error('oversized value was tokenized');
    return stringify(value);
  };

  try {
    assert.throws(
      () => jTormJsonLdModel.serialize({
        '@context': 'x',
        '@type': 'Thing',
        name: oversized
      }),
      /JSON-LD text limit at \$\.name/
    );
    assert.throws(
      () => jTormJsonLdModel.serialize({
        '@context': 'x',
        '@type': 'Thing',
        [oversized]: 'value'
      }),
      /JSON-LD text limit at \$/
    );
  } finally {
    JSON.stringify = stringify;
  }
});
