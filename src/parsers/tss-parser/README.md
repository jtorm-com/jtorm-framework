# jTorm TSS Parser

A dependency-free tokenizer and recursive-descent parser for jTorm TSS. It
returns the established JSON-visible `{s,m,p,c}` tree and reports malformed
source with original line, column, and UTF-16 offset.

## Install

```sh
npm install @jtorm/tss-parser
```

The package exports the mutable CommonJS singleton `jTormTSSParser`. Configure
it before initializing consumers such as `@jtorm/data-parser`.

Historical algorithm-helper names remain callable because they are part of the
published singleton surface. They are compatibility adapters for trusted hosts,
not the active parse entry point; the hard source/token/depth/node/declaration
ceilings apply to `handle()`.

## Basic use

```js
const {jTormTSSParser} = require('@jtorm/tss-parser');

jTormTSSParser.config({});

const tree = jTormTSSParser.handle(
  "a->attr { n: 'class'; v: 'active'; }"
);
```

The result is:

```js
[{
  s: 'a',
  m: false,
  p: {},
  c: [{
    s: 'a',
    m: 'attr',
    p: {n: "'class'", v: "'active'"},
    c: []
  }]
}]
```

## Browser build

The CommonJS source remains the package `main`. For direct browser use, package
prepack generates a separate classic script with Terser:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@jtorm/tss-parser@2.0.0/tss-parser.min.js"
  integrity="sha384-7o3Tks+MOJ5edMDCBmm9vVtGMoZvjP/2JBhn/8LgnD/f9Zmzi/CroZG+ew12daYW6c"
  crossorigin="anonymous"></script>
<script>
  globalThis.jTormTSSParser.config({});
  const tree = globalThis.jTormTSSParser.handle('a { color: red; }');
</script>
```

The browser file publishes the same mutable singleton as
`globalThis.jTormTSSParser`; hosts still inject that singleton into adjacent jTorm
packages. It is not a package-entry remap or an ES module, so CommonJS consumers
continue using `require('@jtorm/tss-parser')` unchanged.

`npm run build` emits the gitignored `tss-parser.min.js`; `npm pack` and publish run
the build through `prepack`. Terser is pinned as a development dependency and no
minifier code ships or executes at runtime. The current artifact is 16,575 raw bytes
and, measured with Node v25.5.0 zlib, 6,120 bytes at gzip level 9, with a portable
7 KiB gzip ratchet.

Rules keep source order. A nested selectorless rule or method inherits the
nearest truthy parent selector. Shorthand properties are inserted before block
properties, so a block declaration with the same key wins without changing key
order.

## Grammar

```text
stylesheet   := trivia* rule* trivia*
rule         := header OPEN body CLOSE
header       := selector? (METHOD method shorthand?)*
body         := trivia* (declaration | rule)* ignored-tail? trivia*
declaration  := raw PROPERTY_SEPARATOR raw PROPERTY_END
             | raw PROPERTY_END
shorthand    := SHORT_OPEN item (SHORT_SEPARATOR item)* SHORT_CLOSE
item         := raw PROPERTY_SEPARATOR raw
ignored-tail := raw
trivia       := whitespace | block-comment | line-comment
```

Configured delimiters inside a configured quote are literal. Quotes do not have
a backslash escape grammar; a quote closes at the next identical delimiter.
Block and line comments are removed before quote recognition for compatibility.
`://` and backslash-protected `//` are not line comments.

Every declaration requires `propertyEnd`. With the defaults, the final
semicolon is therefore required:

```js
jTormTSSParser.handle('a { kept: yes; dropped: no }');
// [{s:'a',m:false,p:{kept:'yes'},c:[]}]
```

The final unterminated declaration fragment is deliberately ignored. This is a
long-standing TSS compatibility rule.

Whitespace outside legacy single- and double-quoted runs is normalized to one
ASCII space. Whitespace in supported quote runs retains the v1 behavior.
Comments concatenate the surrounding tokens exactly as in v1.

## Configuration

Calling `config({})` restores every default and hard resource ceiling.
Historically falsy option values still select the default. Unknown top-level
metadata is ignored. A truthy malformed known option throws
`TypeError('TSS parser config invalid')`.

| Option | Default | Contract |
|---|---|---|
| `opening` | `{` | Block opening, 1–64 UTF-16 code units |
| `closing` | `}` | Block closing, 1–64 UTF-16 code units |
| `propertySeparator` | `:` | Declaration key/value separator, 1–64 code units |
| `propertyEnd` | `;` | Required declaration terminator, 1–64 code units |
| `propertyShorthandOpening` | `(` | Method shorthand opening, 1–64 code units |
| `propertyShorthandClosing` | `)` | Method shorthand closing, 1–64 code units |
| `propertyShorthandSeparator` | `,` | Shorthand item separator, 1–64 code units |
| `methodSeparator` | `->` | Selector/method-chain separator, 1–64 code units |
| `quotes` | `'` | One quote code unit or a non-empty array of one-code-unit quotes |
| `limits` | hard defaults below | Optional lower effective ceilings |

Multi-character syntax is literal and uses longest-match precedence.
`c.quotes` retains the exact supplied string or array. The compatibility
`regexes` object, including `regexes.quotes`, remains available for injected
data/method consumers; the active TSS parser does not use those regular
expressions for structure.

Syntax delimiters must be distinct, cannot contain whitespace, cannot start a
comment token, and cannot start with a configured quote. These combinations are
ambiguous before grammar parsing and are rejected at configuration time.
RegExp metacharacters are otherwise valid literal syntax; compatibility
regexes use an escaped fallback when v1's raw regex construction could not
compile.

Example custom syntax:

```js
jTormTSSParser.config({
  opening: '{{',
  closing: '}}',
  propertySeparator: '::',
  propertyEnd: ';;',
  propertyShorthandOpening: '((',
  propertyShorthandClosing: '))',
  propertyShorthandSeparator: '||',
  methodSeparator: '=>',
  quotes: '"',
  limits: {source: 65536, depth: 64}
});
```

## Resource limits

Parsing is synchronous and bounded. Overrides may lower a ceiling but cannot
raise it.

| Limit | Hard default | Counts |
|---|---:|---|
| `source` | 131,072 | Source UTF-16 code units |
| `tokens` | 32,768 | Maximal text runs and structural tokens |
| `depth` | 128 | Public AST ancestry, including method-chain nodes |
| `nodes` | 4,096 | Selector and method nodes |
| `declarations` | 16,384 | Terminated block and shorthand items examined |

The exact bound is allowed. One over throws a located `RangeError`. Effective
limits are exposed as frozen `limits`; immutable hard ceilings are exposed as
`max`.

Compatibility-sensitive one-character declaration/child interleavings use a
single bounded method-lowering layout and an implicit piece rope. The layout is
never retokenized, grammar-parsed, or fixed-point rescanned; non-interleaved
sources stay on the direct AST path.

The canonical CommonJS source is ratcheted below 10 KiB gzip and the deployable
browser build below 7 KiB gzip. Test/oracle files, snapshots, and build-dependency
code are not published.

## Diagnostics

`handle()` accepts primitive strings only:

```js
try {
  jTormTSSParser.handle('a {\n  color: red;');
} catch (error) {
  console.log(error.name);   // SyntaxError
  console.log(error.message);
  // TSS unclosed block at line 1, column 3
  console.log(error.line);   // 1
  console.log(error.column); // 3
  console.log(error.offset); // 2
}
```

- Invalid input/config types use `TypeError`.
- Malformed quotes, comments, shorthand, blocks, methods, or top-level text use
  `SyntaxError`.
- Resource ceilings use `RangeError`.
- Source-derived errors end with `at line L, column C` and expose numeric
  `line`, `column`, and `offset`.

Lines and columns are 1-based. Offsets and columns count UTF-16 code units.
LF, CRLF, bare CR, U+2028, and U+2029 are line breaks. Diagnostics never include
source excerpts or declaration values.

`tree`, `pairs`, and `tss` are emptied on failure, so no partial parse state is published.
On success, `tree`, `pairs`, and normalized `tss` remain writable singleton
state for existing reset/snapshot hosts.

## Version 2 migration

Version 2 preserves the JSON output of intentionally supported v1 TSS, including
the checked-in jTorm corpus, rule/property order, inheritance, chains,
shorthand, comments, whitespace, custom syntax, and the required final
terminator.

Adoption is explicit because malformed-source behavior, hard limits, known
config validation, and diagnostics are new:

1. Run existing TSS through the v1/v2 compatibility suite.
2. Fix malformed assets that v1 silently dropped or misparsed.
3. Install and inject `@jtorm/tss-parser@2.0.0`.
4. Keep calling `config()` before data-parser initialization.
5. Browser hosts may instead load the exact-version `tss-parser.min.js` CDN path and
   inject `globalThis.jTormTSSParser`; pin the full package version for rollback.

Quoted structural delimiters now remain literal instead of corrupting brace or
header offsets. This includes a quoted declaration terminator inside method
shorthand.

Literal multi-character delimiters and regex-metacharacter separators have
v2-defined grammar behavior. V1 accepted some such config values but its
single-code-unit offset/regex assumptions did not provide a stable AST baseline,
so equivalent sources may intentionally differ when adopting those extensions.

There is no runtime dual-parser mode and no data or AST migration. To roll back,
pin external consumers to `@jtorm/tss-parser@1.0.0`; source-composed hosts
revert the parser change and rebuild any manifests with the prior toolchain
label. Browser hosts switch their version-pinned CDN URL to the prior tested build.
