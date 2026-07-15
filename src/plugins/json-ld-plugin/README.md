# @jtorm/json-ld-plugin

Optional `after.view` lifecycle plugin that owns one inline JSON-LD data block for the root public
view model. Runtime source has no imports; the host injects `@jtorm/json-ld-model`.

```sh
npm install @jtorm/json-ld-plugin @jtorm/json-ld-model
```

```js
const { jTormJsonLdModel: jsonLdModel } = require('@jtorm/json-ld-model');
const { jTormJsonLdPlugin: jsonLdPlugin } = require('@jtorm/json-ld-plugin');

jsonLdPlugin.jsonLdModel = jsonLdModel;
eventModel.plugins = [
  layerPlugin,
  jsonLdPlugin,
  uiCachePlugin
];
eventModel.init();
```

Inject the model before `eventModel.init()`. The plugin registers at `after.view` weight `50`,
so ordinary render effects finish before publication and a later UI-cache plugin can cache the final
head. Registration is host opt-in. Root `@meta.jsonLd: false` disables publication for one model;
an untyped or otherwise ineligible root also publishes nothing.

A successful lifecycle owns exactly one
`<script data-jtorm-json-ld type="application/ld+json">` in `document.head`. It updates and moves
the first owned block, removes owned duplicates or stale blocks, and never changes an unmarked
hand-authored JSON-LD script. Serialization completes before the DOM is queried or mutated, so a
model validation/limit error leaves the document unchanged.

The input is the same root `v.m` used for rendering. Every ordinary key is therefore public page
data. Unknown `@` controls are filtered, but names such as `authToken`, `password`, or `email`
are not guessed or silently removed. Project raw API, domain, session, and authentication records
into a curated public schema view before render; transport authentication belongs in headers.
See `@jtorm/json-ld-model` for the strict value grammar, default context, filtering rules, and
depth/value/1 MiB UTF-8 limits.

The block uses a non-executable MIME type, static attributes, `textContent`, and an encoder that
escapes HTML raw-text delimiters. The plugin adds no nonce, executable script, `innerHTML` path, or
Content-Security-Policy relaxation; the consuming host remains responsible for its CSP. Existing
external `.jsonld` alternate links are independent and remain unchanged.

To roll back, stop registering the plugin and remove its model injection, then restart/re-render the
host so no owned marker remains. For a live document, first render once with
`@meta.jsonLd: false` or remove only `script[data-jtorm-json-ld]`. Unmarked JSON-LD and existing
head components are unaffected.
