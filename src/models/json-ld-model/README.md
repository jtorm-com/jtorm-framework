# @jtorm/json-ld-model

Dependency-free policy model for converting one public schema.org-typed view model into bounded,
inline-safe JSON-LD. Runtime source has no imports.

```js
const { jTormJsonLdModel: jsonLd } = require('@jtorm/json-ld-model');

const text = jsonLd.serialize({
  '@type': 'Person',
  name: 'Ana',
  '@meta': { jsonLd: true, internal: 'not published' }
});
```

`serialize(model)` returns `null` unless the root is a plain object with an own, enumerable,
non-blank string `@type`. Root `@meta.jsonLd: false` is an output kill switch. A missing root
`@context` becomes `https://schema.org` in the output without mutating the input; an explicit
context is preserved.

Unknown `@` keys are omitted recursively without reading their values. This includes framework
controls such as `@meta`, `@config`, and `@template`; the complete JSON-LD 1.1 keyword set is
retained. Ordinary keys are never guessed or ontology-filtered. Installing the companion plugin
therefore asserts that every ordinary field in the root model is public page data. An ordinary
`authToken`, `password`, email, or other private value would be published. Keep authentication
material in transport headers and project raw API, domain, session, and authentication records into
a curated public view model before rendering.

Values must be strict JSON data: null, finite numbers, booleans, strings, plain objects, and dense
plain arrays. Accessors, cycles, symbols, BigInt, functions, undefined, non-finite numbers, dates,
class instances, array holes, and enumerable symbol keys fail loud with a path. Filtered metadata
still consumes the structural budget and is never evaluated.

Default limits are:

- `maxText = 1048576`: final UTF-8 output bytes, with raw strings and keys prechecked before encoding.
- `maxValues = 262144`: visited values plus filtered metadata keys.
- `maxDepth = 128`: nested object/array depth.

The singleton limits are host bootstrap policy. Configure them before serving requests and do not
mutate them per request. Output escapes `<`, `>`, `&`, U+2028, and U+2029 as JSON Unicode
escapes, so it can be placed in an HTML raw-text script block without creating markup. The parsed
JSON round-trips to the same public values.
