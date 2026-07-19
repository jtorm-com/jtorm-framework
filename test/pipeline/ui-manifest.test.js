'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { render } = require('../helpers/engine.js');
const { PRODUCT_DYNAMIC, productManifest } = require('../helpers/ui-manifest.js');

const MAX_GZIP_BYTES = 8192;

const STATIC_REQUESTS = [
  '@s/thing/thing-default.tss',
  '@h/@e/section.html',
  '@s/thing/thing-contents.tss',
  '@c/contents/contents-default.tss',
  '@h/@e/div.html',
  '@h/@e/header.html',
  '@h/@t/h1.html',
  '@h/@e/a.html',
  '@h/@e/a.tss',
  '@h/linkable.tss',
  '@h/global.tss',
  '@s/image-object/image-object-default.tss',
  '@s/image-object/figure-default.tss',
  '@h/@m/figure.html',
  '@h/@m/picture.html',
  '@h/@m/img.html',
  '@h/@m/img.tss',
  '@h/media/playable.tss',
  '@h/rawcontent.tss',
  '@h/@e/div.tss',
  '@h/replacable.tss',
  '@h/@e/footer.html',
  '@s/product/product-default.tss',
  '@h/@e/span.html',
  '@h/@e/span.tss',
  '@s/text/text-default.tss',
  '@s/offer/offer-default.tss'
];

function product(image) {
  return {
    '@type': 'Product',
    name: 'Secure widget',
    description: 'A useful widget.',
    image,
    sku: 'SKU-1',
    gtin: '0123456789012',
    brand: {
      '@type': 'Brand',
      name: 'Acme',
      url: 'https://e.com/acme'
    },
    offers: {
      '@type': 'Offer',
      price: '19.99',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: 'https://e.com/widget'
    },
    url: 'https://e.com/widget'
  };
}

const HTML = '<body><div class="a"></div></body>';
const TSS = ".a->ui { c: 'Product.default'; }";
const IMAGE = {
  '@type': 'ImageObject',
  contentUrl: 'https://e.com/widget.jpg',
  name: 'Widget image'
};

test('characterizes the 27-request Product UI waterfall in live and detached modes', async () => {
  const live = await render(HTML, TSS, product(IMAGE));
  const detached = await render(HTML, TSS, product(IMAGE), 'http://localhost/', null, 1);

  assert.deepEqual(live.requests, STATIC_REQUESTS);
  assert.deepEqual(detached.requests, STATIC_REQUESTS);
  assert.equal(live.bytes, 18293);
  assert.equal(detached.bytes, 18293);
  assert.equal(live.handlerDepth, 34);
  assert.equal(detached.handlerDepth, 34);
  assert.equal(Math.max(...live.requestDepths), 32);
  assert.equal(Math.max(...detached.requestDepths), 32);
  assert.equal(detached.body, live.body);
});

test('characterizes Product @id data as the one request outside the static UI closure', async () => {
  const image = { ...IMAGE, '@id': '/product-image' };
  const result = await render(
    HTML,
    TSS,
    product(image),
    'http://localhost/',
    { '/product-image': { json: image } }
  );
  const expected = [...STATIC_REQUESTS];
  expected.splice(13, 0, '/product-image');

  assert.deepEqual(result.requests, expected);
  assert.equal(result.bytes, 18401);
});
test('compiler emits the deterministic model-free Product closure and ten diagnostics', async () => {
  const result = await productManifest();

  assert.equal(result.manifest.assets.length, 37);
  assert.equal(result.manifest.dynamic.length, 10);
  assert.deepEqual(result.manifest.dynamic, PRODUCT_DYNAMIC);
  assert.equal(
    result.hash,
    'sha256-910d349afb6795b7df6fa72fa95d91beff16c3cc5a6aacf8ac6eb65372548cb8'
  );
  assert.equal(Buffer.byteLength(result.json), 32068);
  const gzipBytes = gzipSync(result.json, { level: 9, mtime: 0 }).length;
  assert.ok(gzipBytes <= MAX_GZIP_BYTES, `${gzipBytes} > ${MAX_GZIP_BYTES}`);
  assert.match(result.filename, /^product[.]sha256-[0-9a-f]{64}[.]json$/);
  assert.equal(result.json, JSON.stringify(JSON.parse(result.json)));
});

test('prepared Product closure collapses live/detached static waterfalls to one request', async () => {
  const result = await productManifest();
  const url = '/ui/' + result.filename;
  const descriptors = [{ url, hash: result.hash, mode: 'required' }];
  const fixtures = { [url]: { text: result.json } };
  const baseline = await render(HTML, TSS, product(IMAGE));
  const live = await render(
    HTML, TSS, product(IMAGE), 'http://localhost/', fixtures, 0, descriptors, 1
  );
  const detached = await render(
    HTML, TSS, product(IMAGE), 'http://localhost/', fixtures, 1, descriptors, 1
  );

  assert.deepEqual(live.requests, [url]);
  assert.deepEqual(detached.requests, [url]);
  assert.deepEqual(live.warmRequests, []);
  assert.deepEqual(detached.warmRequests, []);
  assert.equal(live.bytes, Buffer.byteLength(result.json));
  assert.equal(detached.bytes, Buffer.byteLength(result.json));
  assert.equal(live.body, baseline.body);
  assert.equal(detached.body, baseline.body);
});

test('prepared Product closure leaves only model-bound @id data outside the bundle', async () => {
  const result = await productManifest();
  const url = '/ui/' + result.filename;
  const descriptors = [{ url, hash: result.hash, mode: 'required' }];
  const image = { ...IMAGE, '@id': '/product-image' };
  const fixtures = {
    [url]: { text: result.json },
    '/product-image': { json: image }
  };
  const packed = await render(
    HTML, TSS, product(image), 'http://localhost/', fixtures, 0, descriptors
  );

  assert.deepEqual(packed.requests, [url, '/product-image']);
  assert.equal(packed.bytes, Buffer.byteLength(result.json) + 108);
});

test('prepared Product pack revalidates with its paired ETag and a bodyless 304', async () => {
  let now = 0;
  const clock = () => now;
  const result = await productManifest();
  const url = '/ui/' + result.filename;
  const descriptors = [{ url, hash: result.hash, mode: 'required' }];
  const first = await render(
    HTML, TSS, product(IMAGE), 'http://localhost/',
    {[url]: {text: result.json, headers: {etag: '"pack-a"'}}},
    {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}}, descriptors, 0,
    {clock, ttl: 10, validators: true}
  );
  now = 10;
  const validated = await render(
    HTML, TSS, product(IMAGE), 'http://localhost/', {[url]: {status: 304}},
    {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}}, descriptors, 0,
    {reuseSharedCaches: true, clock, ttl: 10, validators: true}
  );

  assert.equal(validated.body, first.body);
  assert.deepEqual(validated.requests, [url]);
  assert.deepEqual(validated.requestHeaders, [{'If-None-Match': '"pack-a"'}]);
  assert.equal(validated.bytes, 0);
});
