# jTorm Request Model

## Install
```js
npm install @jtorm/request-model
```


## How To

request: url, contentType, method=GET, charset=utf-8

```js
const request = require('@jtorm/request-model').jTormRequestModel;

request.renderContextModel = renderContextModel;
request.base = 'https://cdn.example/';
request.allow = url => new URL(url).hostname === 'cdn.example';

const html = await request.get('/page.html').text();
```

`allow(url)` receives the resolved URL before the transport runs. By default, relative
URLs and URLs on `base`'s origin are allowed; other absolute URLs are blocked.
`renderContextModel` is required and provides bounded, cycle-safe resolution for per-render
request options plus strict own-link resolution for cache authority.

## Shared-cache discriminator

`policy(context)` is the cache-authority decision. It preserves the tagged `tenant`, `origin`,
and effective `base` order for existing non-empty primitive values. `cacheKey(url, context)`
returns that policy plus the resolved URL, or `undefined` when no valid explicit discriminator
exists. The latter is an uncached request, not a URL-only cache key; URL resolution, URL policy,
timeouts, and transport still run normally.

Absent, `null`, or empty discriminator values do not authorize sharing unless a lower-precedence
candidate or the host's configured non-empty base does. Object/function/symbol and
delimiter-bearing discriminator values, plus malformed or cyclic render contexts, fail closed. A
request `base: ''` explicitly disables configured-base caching for that call. Published
`context()` and `option()` overrides continue to define the effective request fields and base.
Only own tenant/origin/base/request properties count as explicit render input; prototype values
cannot opt a render into sharing. Non-array class/prototyped roots with own primitive fields remain
supported. Object-valued view `c` handoffs and traversed `p` links must be own for cache purposes;
ordinary render-context resolution is unchanged. An inherited non-null base, including `''`,
bypasses caching when it remains the effective option because it changes URL/allow behavior without
being explicit cache authority. Inherited `null`/`undefined` continues to use the configured
fallback, and a deliberate `option()` override may replace an inherited raw base with its distinct
effective scoped value.
Set a non-empty `request.base` on each render, or configure a non-empty global `base`, to opt a
single-tenant host into shared caching. The configured base remains the ordinary relative-URL
prefix as before.
