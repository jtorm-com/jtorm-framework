# Feature Development: TSS Parser Tokenizer + Recursive Descent Rewrite

**Status:** IN_PROGRESS
**Claimed:** 2026-07-16T19:38:23Z
**Agent:** Codex
**Current Mode:** Delivery — ready PR #55; CI and current-head Codex review remain

---

## Resumption Context

**Last Completed Mode:** Design
**Current Mode:** Delivery
**Next Action:** Poll PR #55 CI, request Codex review, resolve any valid finding red-first, and leave the clean PR unmerged
**Files Created:** specification/security records, frozen oracle, and differential/error/resource suites
**Files Modified:** parser package/docs plus direct-consumer propagation tests
**Tests Written:** red-first diagnostics, offset-collision/method-layout compatibility, 260 interleavings, 768 combinatorial forms, 4,096 seeded nested forms, resource ceilings, and consumer propagation
**Issues Found (not yet fixed):** None. Adversarial compatibility and resource findings are fixed and the 200,000-case independent differential reports zero drift
**Design Decisions Made:** Branch `agent/p3-tss-parser-rewrite` starts from current `origin/dev` at merged PR #54 commit `6e352fa`; approved specification below is normative

**Context for Next Session:**
PR #54 was confirmed merged into `dev`; local `dev` was fast-forwarded and the feature branch was created at `6e352fa`. Research, focused green baseline, specification, threat model, two-round adversarial review, plan quality gate, and design-persona gate are complete. The exact v1 source is frozen at SHA-256 `1a597fe542048ba719d277341ebe840a730b2f2c1152ac92b49821ec19648c27`. Differential characterization passes for 260 interleavings and all 257 checked-in TSS files. The 12-test replacement suite was observed fully red before production edits.

---

## Progress Log

### Research Mode
- [x] Confirmed PR #54 merged
- [x] Updated local `dev` and branched from current `dev`
- [x] Read project architecture and parser backlog
- [x] Mapped parser package, direct consumers, tests, and snapshots
- [x] Recorded research summary without proposing changes

### Plan Mode
- [x] Wrote complete feature specification
- [x] Self-reviewed specification

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant agents consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined with review feedback

### Design Mode
- [x] Loaded required agent personas
- [x] Validated design against red flags

### Implement Mode
- [x] Checkpoint 1: Red-first characterization
- [x] Checkpoint 2: Tokenizer and recursive-descent core
- [x] Checkpoint 3: Diagnostics and resource bounds
- [x] Checkpoint 4: Compatibility integration

### Test Mode
- [x] Focused parser/differential tests passing
- [x] Snapshot compatibility passing
- [x] Exact `npm test` passing
- [x] `npm run typecheck` passing
- [x] Package dry-run and source guards passing
- [x] Semgrep, `git diff --check`, and resource tests passing

### Review Mode
- [x] review-router: PASS
- [x] review-architecture: PASS
- [x] differential-review: PASS
- [x] review-refactor: PASS
- [x] tech-debt-ratchet: PASS
- [x] production-readiness: PASS
- [x] 100/100 code quality
- [x] Verification loop passed

### Documentation Mode
- [x] Parser README updated
- [x] Feature/evaluation/security records updated
- [x] Review ledger updated
- [x] Architecture backlog updated

### Delivery Mode
- [x] Ready PR opened into `dev` (#55)
- [ ] CI green at current head
- [ ] Clean Codex review at current head
- [x] PR left unmerged

---

## Research Summary

- **Modules involved:** `@jtorm/tss-parser` is the only runtime implementation in scope. Direct runtime consumers are `view-model` and `tss-model` through `handle()`, `data-parser` and `attrs-method` through `c.quotes`/`regexes.quotes`/`quotes()`, and `if-method` transitively through `dataParser.tssParser.c.quotes`. The build-only UI manifest compiler calls `handle()` and snapshots/restores parser singleton state.
- **Existing parser:** `handle()` removes comments, collapses out-of-quote whitespace, repeatedly rewrites method chains into nested source, discovers brace pairs recursively, parses declarations, inherits parent selectors, removes internal pair metadata, and reverses traversal order into the public `{s,m,p,c}` tree.
- **Published surface:** Before configuration the enumerable singleton keys are `c`, `find`, `whitespace`, `sortPairs`, `parseCharacter`, `parseOpenings`, `parseClosings`, `parseChildren`, `parseFrom`, `hasChildren`, `parseShorthandProperties`, `parseProperties`, `parsePairs`, `parse`, `clean`, `quotes`, `config`, and `handle`; `config()` adds `regexes`. Mutable `tree`, `pairs`, and `tss` are created/reset by callers and snapshotted by tooling.
- **Compatibility corpus:** `test/fixtures/tss-snapshot.json` has exactly 257 sorted `src/**/*.tss` entries and zero `ERROR:` values. Those files currently produce 1,564 AST nodes and 1,832 declarations; observed maxima are 5,359 source bytes, depth 16, 74 nodes/file, 12 direct children, and 73 declarations/file.
- **Existing syntax behavior:** The parser preserves declaration order, source rule order, selector inheritance, long/nested method chains, shorthand declarations, quoted property/shorthand separators, comments, selector whitespace, and the required final `;`. A declaration without that terminator is dropped. Existing malformed structures either disappear, misparse, or throw unlocated native errors.
- **Constraints discovered:** Runtime source is dependency-free CommonJS with no `require()`; source stays pure JS; singleton reset behavior and every published export remain available; the locked arithmetic is not to be edited in place; data binding, traversal, scoping, and adjacent method/model behavior remain out of scope.
- **Baseline:** `node --test test/parsers/tss-parser.test.js` passes 4/4 on `dev` at `6e352fa`.
- **Open questions:** None from repository mapping; specification must make malformed-input, diagnostic, resource-limit, SemVer, migration, and rollback policy explicit.

---

# Feature Spec: Bounded TSS Tokenizer and Recursive-Descent Parser

**Date:** 2026-07-16
**Author:** Codex
**Status:** Approved by task authorization after self-review

## Problem Statement

TSS authors and host maintainers depend on `@jtorm/tss-parser` for every inline, fetched, and build-time stylesheet, but malformed input is currently processed by repeated whole-source rewriting and recursive brace-pair arithmetic that can silently drop text, misparse a rule, or surface an unlocated native exception. This makes the framework's primary DSL difficult to evolve and expensive to diagnose. The parser must gain a bounded, legible grammar and useful source positions without changing the JSON-visible AST of any valid existing TSS or breaking the singleton fields used by runtime and manifest consumers.

## Scope

### In Scope

- Replace the production `handle()` path with a hand-written lexical scanner/tokenizer and recursive-descent grammar.
- Preserve the public `{s,m,p,c}` AST shape, property/rule insertion order, selector inheritance, nested rules, method chains, shorthand declarations, comments, normalized whitespace, quoted separators, custom syntax configuration, and required declaration terminator.
- Preserve every existing enumerable singleton field/method name, `c`, `regexes` (including `regexes.quotes`), `config()`, `handle()`, `quotes()`, and mutable `tree`/`pairs`/`tss` state used by reset/snapshot callers.
- Add 1-based line/column diagnostics with a 0-based UTF-16 offset for malformed source.
- Add configurable source, token, nesting-depth, node, and declaration bounds with conservative defaults.
- Freeze the current implementation as a test-only differential oracle; expand curated, generated, custom-config, full-corpus, surface, malformed-input, and resource characterization before switching production code.
- Keep the existing 257-entry `src/**/*.tss` snapshot file byte-for-byte/JSON-compatible.
- Major-bump and document `@jtorm/tss-parser`; update feature, evaluation, security, review-ledger, architecture-backlog, and canonical reviewer-contract records.

### Out of Scope (Non-Goals)

- No change to data-parser binding syntax, compilation, evaluation, or quote-removal grammar.
- No change to handler dispatch/traversal, selector scoping, fetched-component scope, zero-match behavior, methods, models, UI resolution/compilation, or manifest wire format.
- No new TSS verb, selector syntax, declaration value semantics, AST field, source-map payload, runtime import, dependency, package, TypeScript source, or handwritten declaration file.
- No edit-in-place to the legacy `i <= ps.length`, pair, whitespace-padding, brace, or offset arithmetic; the old implementation moves intact to a test-only oracle and leaves the production path.
- No runtime dual-parser flag or compatibility fallback. Rollback is package/commit pinning, not shipping both engines.
- No package publication, downstream host deployment, or PR merge in this task.

## Requirements

### Functional Requirements

1. For every v1-compatible valid input/configuration, `JSON.stringify(newParser.handle(source))` equals the frozen v1.0.0 oracle output exactly. Validity is defined by the grammar below, not by whether the legacy implementation happened to return a tree.
2. Every current `src/**/*.tss` file retains its existing SHA-256 snapshot value; the 257-key golden JSON is not regenerated or edited.
3. Rule arrays and declaration objects retain source insertion order; duplicate declaration keys retain JavaScript's existing first-insertion position and last value.
4. A selector rule produces `{s: <trimmed selector>, m:false, p:{}, c:[]}`; selectorless rules use `s:false`; nested selectorless/method rules inherit the nearest truthy parent selector exactly as today.
5. `selector->a(...)->b { ... }` produces a selector wrapper followed by nested method nodes; a leading `->a` produces a method node directly; every chain node carries the effective selector.
6. Shorthand declarations are applied to their method node before block declarations, so a later block declaration with the same key wins without changing key order.
7. Block and line comments retain the current token-concatenation behavior; URL-style `://` and backslash-protected `//` remain non-comments.
8. Whitespace outside a quoted literal collapses to one ASCII space; supported quoted whitespace and delimiters remain literal; selectors/keys/values/method names retain the existing trim points.
9. Declaration separators, terminators, shorthand punctuation, method separators, and block delimiters inside a configured quote do not split that literal. There is no backslash escape grammar for quote delimiters; an unclosed configured quote is malformed. Quoted structural/header delimiters are required by this rewrite and receive explicit expected-output tests rather than false oracle-equivalence claims where v1 misparsed them (including brace/arrow corruption and `parseFrom` truncation on a quoted shorthand terminator).
10. A declaration is recognized only when terminated by `propertyEnd`. The final unterminated declaration fragment is silently dropped, including the default missing-final-`;` behavior.
11. Balanced declaration/child interleavings remain valid. Their parent-property survival/order must equal v1 exactly, including offset-era results that depend on preceding declarations. A frozen permutation fixture (leading declarations 0–3, children 1–4, inter-child/trailing declarations 0–3, plus whitespace/nested variants) is generated from the oracle before production replacement; implementation must satisfy it without executing the old rewrite at runtime.
12. `config({})` restores all default syntax and hard ceilings. V2 supports custom 1–64-code-unit literal string separators. `quotes` preserves the exact caller-supplied v1 value/type and accepts either one non-empty quote-character string or an array of non-empty single-code-unit delimiters; the active tokenizer derives its quote set without changing `c.quotes` or compatibility regex construction observed by adjacent consumers. Multi-character separators are matched literally using longest-match precedence; because v1's offsets and regex construction assumed single code units, multi-character and raw-regex-metacharacter configs are explicit v2 grammar extensions rather than oracle-equivalence cases. Exact duplicate delimiters, whitespace-bearing delimiters, comment-token prefixes, and delimiters beginning with a configured quote are rejected as lexically ambiguous. Existing unknown top-level config keys and historically-falsy known values retain v1 fallback behavior; malformed truthy known values and invalid limits fail explicitly.
13. `handle()` accepts only strings. Configuration/input type failures use explicit `TypeError`; malformed grammar uses `SyntaxError`; resource-bound failures use `RangeError`.
14. Every source-derived parser error message ends with `at line <L>, column <C>` and exposes numeric `line`, `column`, and `offset` properties. Diagnostics do not echo declaration values or the full source; native error class plus message identifies the condition without minting a large machine-code taxonomy.
15. Every existing enumerable singleton method/property name remains present. Documented/directly consumed behavior (`c`, all compatibility regex source/flags, `config()`, `handle()`, `quotes()`, and writable reset state) is exact. Legacy algorithm-helper signatures and representative v1 behavior are characterized before replacement; they remain trusted-host compatibility adapters outside `handle()`'s resource contract, and no key, callable signature, characterized result, or side effect may become a hollow/deprecated stub.
16. `tree`, `pairs`, and `tss` remain writable state fields after a parse, may be reset externally, and can be snapshotted/restored by the UI manifest compiler without affecting subsequent parses.
17. The scanner processes original source directly. Every emitted token retains its normalized range and original UTF-16 start offset; diagnostics derive line/column from that original source position. Comment removal and whitespace collapse therefore cannot shift later diagnostics. Legacy whitespace protection for both single- and double-quoted runs remains separately characterized from the configured tokenizer quote set.
18. `config()` continues to create `c`/`regexes` before `dataParser.init()`. For v1-compatible configurations, every compatibility regex retains its v1 source/flags, especially `regexes.quotes`, because consumer grammar/cache keys observe them even though the active parser does not.
19. All transient scanner/parser state (cursor, line starts, token buffer, stacks, counters, diagnostic context) is call-local. The singleton mutates only the legacy `tree`, `pairs`, `tss`, `c`, `regexes`, and configured limit fields known to reset/snapshot callers.
20. `handle()` publishes the completed AST atomically. On syntax/resource failure, `tree`, `pairs`, and `tss` are empty rather than partially parsed; fetched-model rejection still evicts through the existing promise-cache path, and original error identity plus position fields propagate through view/model/compiler callers.

### Grammar and AST Contract

The production implementation will follow this grammar; `raw` means normalized token text reconstructed without unquoting:

```text
stylesheet   := trivia* rule* trivia*
rule         := header OPEN body CLOSE
header       := selector? (METHOD method shorthand?)*
body         := trivia* (declaration | rule)* ignored-tail? trivia*
declaration  := raw PROPERTY_SEPARATOR raw PROPERTY_END
               | raw PROPERTY_END                 # ignored: no separator
shorthand    := SHORT_OPEN shorthand-item
               (SHORT_SEPARATOR shorthand-item)* SHORT_CLOSE
shorthand-item := raw PROPERTY_SEPARATOR raw
ignored-tail  := raw                              # no PROPERTY_END; dropped by design
trivia        := whitespace | block-comment | line-comment
```

Parser semantics supplement the compact grammar:

- At least one `METHOD` token changes a header into a method chain. With an explicit selector, the selector wrapper is the outer node; without one, the first method is outermost.
- Parent declarations and child rules are stored separately as `p` and `c`. Compatibility-sensitive one-character interleavings lower the already parsed rule tree once into a bounded virtual layout and apply legacy blanking coordinates through an implicit piece rope. That layout is scanned once for legacy coordinates and its frame slices are decoded without retokenizing, re-entering the grammar, or fixed-point rescanning; non-interleaved sources stay on the direct AST path and the old engine is never executed.
- `()` remains part of the method name as today; shorthand activates only when content exists between the delimiters. Whitespace-only shorthand activates and yields no declaration.
- Empty/comment-only stylesheets return `[]`. Empty selectors are valid for component-root scoping. Empty method names, unexpected closing delimiters, unmatched blocks, unterminated quotes/comments/shorthand, and non-whitespace top-level fragments are malformed.
- Comment recognition retains legacy precedence over quote recognition. `/*` consumes through the next `*/` and removes the whole span even inside quote text; missing `*/` is located at the opening. `//` begins a comment at line start or when its immediately preceding source code unit is neither `\` nor `:`, consumes through but not including the line break, and retains the preceding code unit; this preserves token concatenation plus URL/backslash exceptions. Outside comments, configured delimiters are significant only outside the configured quote set.
- Whitespace normalization reproduces the v1 `cleanWhiteSpace` observable contract: each differential case pins collapse/preservation around both `'` and `"` independently of configured `quotes`, including multiline runs. Tokens retain normalized text plus original spans, so normalization does not erase locations.
- The v1-compatible differential profile comprises structurally balanced inputs and single-code-unit syntax the v1 engine handled intentionally, including declaration/child interleavings and documented custom quote arrays. Quoted structural/header delimiters, literal multi-character syntax, and regex-metacharacter separators receive required v2 expected outputs because v1 did not provide a grammar-stable result; old corrupt/throwing witnesses are not reclassified as valid AST contracts. Legacy inputs with unbalanced blocks, unterminated comments/quotes/shorthand, empty method segments, or stray top-level text are malformed even if v1 silently returned a partial/garbage tree.

### Diagnostics Contract

| Condition | Error class | Message prefix | Position |
|---|---|---|---|
| Non-string source | `TypeError` | `TSS source must be a string` | no source position |
| Invalid known syntax/limits config | `TypeError` | `TSS parser config invalid` | no source position |
| Unexpected closing delimiter | `SyntaxError` | `TSS unexpected closing delimiter` | closing delimiter start |
| Missing closing delimiter | `SyntaxError` | `TSS unclosed block` | unmatched opening start |
| Unterminated configured quote | `SyntaxError` | `TSS unclosed quote` | opening quote |
| Unterminated block comment | `SyntaxError` | `TSS unclosed comment` | comment opening |
| Empty method segment | `SyntaxError` | `TSS empty method` | method separator |
| Unclosed/malformed shorthand | `SyntaxError` | `TSS malformed shorthand` | shorthand opening/offending token |
| Unexpected top-level fragment | `SyntaxError` | `TSS expected rule` | fragment start |
| Resource limit exceeded | `RangeError` | `TSS <name> limit exceeded` | triggering token/source position |

Lines and columns are 1-based; offsets and columns count UTF-16 code units, matching JavaScript string indexing. LF, CRLF, bare CR, U+2028, and U+2029 each count as one line break; CRLF is consumed atomically, so no diagnostic points between its two code units. Positions refer to original source, not comment-stripped/whitespace-normalized text. EOF diagnostics use `offset === source.length`.

### Resource Bounds

| Limit | Default | Counts | Exact-bound behavior |
|---|---:|---|---|
| `source` | 131,072 | `source.length` UTF-16 code units | allowed |
| `tokens` | 32,768 | each maximal normalized text run plus each configured delimiter token | allowed |
| `depth` | 128 | maximum public AST ancestry, counting nested rule blocks and method-chain nodes | allowed |
| `nodes` | 4,096 | selector and method AST nodes | allowed |
| `declarations` | 16,384 | terminated declaration/shorthand items examined | allowed |

Defaults are hard ceilings, not suggestions: configuration may lower but never raise them. All configured limits are positive safe integers; missing keys use hard defaults, unknown limit names and invalid/over-ceiling values fail configuration. Separate token/node/declaration ceilings bound intermediate and AST memory below the source ceiling and allow hosts to lower one resource class independently. Normalization, tokenization, and recursive descent are O(source length + token count); the gated compatibility piece operations are O(nodes log nodes), with no full-source fixed-point rescan and O(source length + token count + AST) bounded memory. Method chains are constructed iteratively, but each chain node consumes the same depth budget as a nested rule so downstream recursive `clean`/handler/serialization remains stack-bounded.

### Non-Functional Requirements

- **Compatibility:** exact valid-output differential equality, unchanged golden hashes, no removed singleton key/export/package, and no downstream package edit unless a failing compatibility test proves a seam change.
- **Security:** deterministic bounded parsing; no `eval`, dynamic code loading, runtime imports, source excerpt leakage, or unbounded input-controlled recursion/loop.
- **Performance:** linear normalization/tokenization phases plus one grammar pass; the longest checked-in fixture and synthetic near-limit cases complete without fixed-point growth.
- **Bundle budget:** production source is measured at 9,037 bytes gzip level 9 and ratcheted at 10 KiB; the test oracle and characterization never ship.
- **Maintainability:** explicit token types and grammar phases; functions kept cohesive and shallow; legacy implementation present only in the test oracle.
- **Type safety:** pure strict-mode JavaScript/JSDoc conventions; no handwritten `.ts`/`.d.ts`; existing type package remains unchanged because `{s,m,p,c}` is unchanged.
- **Testability:** deterministic fixtures/generation, singleton reset after every config/state mutation, exact-bound and over-bound witnesses, and source-position assertions.
- **Accessibility/privacy:** N/A for UI; diagnostics expose location/code only and do not copy source values.

## Affected Components

| Component | Change Type | Risk |
|---|---|---:|
| `src/parsers/tss-parser/src/tss-parser.js` | Replace active engine; retain singleton surface | High — framework-wide DSL compatibility and synchronous resource boundary |
| `src/parsers/tss-parser/package.json` | Major version `1.0.0` → `2.0.0` | Low |
| `src/parsers/tss-parser/README.md` | Grammar, config, diagnostics, bounds, migration/rollback | Low |
| `test/fixtures/tss-parser-oracle.js` | Add frozen v1.0.0 implementation for tests only | Low — intentionally legacy, never packaged/runtime |
| `test/parsers/tss-parser.test.js` | Expand public, grammar, diagnostic, and limit tests | Medium |
| `test/parsers/tss-parser-differential.test.js` | Add curated/generated/full-corpus oracle comparison | Medium |
| `test/fixtures/tss-snapshot.json` | Verification only; no content change permitted | High compatibility sentinel |
| `AGENTS.md` | Retain the DEBUNKED/do-not-edit warning for the frozen oracle, forbid restoring its arithmetic to production, and reconcile the current 257 count | Medium — canonical reviewer contract |
| `tooling/ui-manifest-compiler` and direct parser consumers | Verification only; no source/package change unless a failing seam test proves need | High compatibility boundary |
| `src/handlers/handler-wrapper` | Verification only for inherited-selector/cached-AST behavior | Medium downstream mutation boundary |
| `feature-reviews/tss-parser-rewrite*.md` | Spec, evaluation, and security evidence | Low |
| `feature-reviews/framework-architecture-review-2026-07-14.md` | Reconcile stale 252 references to 257 and mark P3 complete with PR/current-head evidence | Low |
| `.claude-tasks/agent-outcomes.jsonl` | Append applicable review outcomes | Low |

## Dependencies

- **Depends on:** PR #54 merged; branch starts at `dev` commit `6e352fa`.
- **Runtime dependencies:** none; production source remains import-free and package `dependencies` remains `{}`.
- **Test dependencies:** Node built-ins and the local frozen oracle only.
- **Direct dependents:** `view-model`, `tss-model`, `data-parser`, `attrs-method`, transitive `if-method`, and build-only `ui-manifest-compiler`; none is planned to change.
- **Blocks:** future TSS diagnostics/source-map/DSL evolution; no current code item is coupled to delivery.

## Public API Contract

```js
const {jTormTSSParser} = require('@jtorm/tss-parser');

jTormTSSParser.config({
  opening: '{',
  closing: '}',
  propertySeparator: ':',
  propertyEnd: ';',
  propertyShorthandOpening: '(',
  propertyShorthandClosing: ')',
  propertyShorthandSeparator: ',',
  methodSeparator: '->',
  quotes: "'", // or an array of one-code-unit delimiters; c.quotes preserves the supplied type
  limits: {
    source: 131072,
    tokens: 32768,
    depth: 128,
    nodes: 4096,
    declarations: 16384
  }
});

const tree = jTormTSSParser.handle("a->attr { n: 'class'; v: 'x'; }");
// [{s:'a',m:false,p:{},c:[{s:'a',m:'attr',p:{n:"'class'",v:"'x'"},c:[]}]}]
```

Required object-literal enumerable keys remain:

```text
c find whitespace sortPairs parseCharacter parseOpenings parseClosings
parseChildren parseFrom hasChildren parseShorthandProperties parseProperties
parsePairs parse clean quotes config handle
```

As in v1, `config()` lazily adds `regexes`; v2 also adds the effective lower-only `limits`. `handle()` lazily assigns `tree`, `pairs`, and `tss`; tests must not falsely require those keys before their owning call. `regexes` continues to expose `clean`, `cleanWhiteSpace`, `propertySeparator`, `propertyEnd`, `propertyShorthandOpening`, `propertyShorthandClosing`, `propertyShorthandSeparator`, and `quotes` with v1-compatible source/flags. `config()` must run before `dataParser.init()`. Intermediate pair/token contents are implementation-owned, but reset/snapshot fields remain writable, replaceable by reference, and restorable. `handle()` remains synchronous, so one call cannot interleave with another; the existing manifest compiler lock protects its async sequence around calls. New transient scan state never lives on the singleton and therefore needs no compiler snapshot seam.

## Compatibility Strategy

1. Copy the exact v1.0.0 source into a clearly test-only oracle before editing production and pin that fixture's source hash so future arithmetic edits fail loud.
2. Add characterization for all listed syntax/surface/helper behaviors and confirm structurally valid v1 compatibility cases pass against the old implementation. Pin duplicate-key first-position/last-value behavior, dual-quote whitespace, lazy key/config ordering, and representative legacy helper signatures/results explicitly.
3. Add diagnostics/resource tests and observe them fail against the old implementation before production replacement.
4. Compare the new parser and oracle by deep equality over curated cases, deterministic combinatorial structurally-valid cases, string/array custom quote configurations, the interleaving matrix, 4,096 seeded nested/interleaved forms, and all 257 checked-in TSS files. Generated expected values come from the frozen oracle, never from a guessed re-description of offset arithmetic; independently run a 200,000-case adversarial differential before review completion.
5. Independently retain the existing per-file SHA-256 snapshot gate and assert the golden key count/file set remains 257.
6. Keep structurally malformed-input expectations separate from valid-output differential tests using the objective balance/termination rules above. Pin old silent/garbage witnesses (unclosed block/comment/quote and stray close) as red-first located-error cases; no structurally valid oracle output may drift.
7. Keep oracle differential cases deliberately small (at most depth 32 and 1,024 nodes); exact/over resource-bound tests use direct expected behavior and never drive the unbounded oracle near pathological limits.
8. Run direct-consumer, handler-wrapper, tss/view-model rejection, and manifest-compiler suites to prove `c`, byte-observed quote regexes, error identity/properties through propagation/cache eviction, reset state, selector inheritance, and AST scanning remain compatible.

## Security Assessment and Threat Model

### Data-flow diagram and trust boundaries

```text
trusted host syntax config ───────────────┐
inline/fetched/build-time TSS source ─────┼─> bounded tokenizer/parser ─> {s,m,p,c} AST
                                         │          │
test-only frozen oracle ─ differential ───┘          └─ malformed/over-limit ─> located error
                                                        │
AST ─> view/tss model cache or manifest compiler ─> existing handler traversal (unchanged)
```

TSS is authored/trusted framework input, but fetched asset corruption, deployment drift, or a host exposing parser input can still present adversarial size/shape. This change adds no network fetch, identity, persistence, PII, endpoint, queue, database, cryptography, or third-party boundary. The production/test boundary is explicit: the legacy oracle is never shipped.

### Assets and actors

| Item | Classification / capability |
|---|---|
| Valid TSS → AST mapping | Integrity-critical public framework contract |
| Render/build availability | Availability-critical synchronous work |
| Parser diagnostics | Internal metadata; must not copy source values |
| Host syntax/limit config | Trusted mutable singleton configuration |
| Framework/UI author | Supplies valid static TSS and custom syntax |
| Broken/compromised asset source | Can supply malformed, deeply nested, or oversized TSS to an existing host fetch path |
| External package consumer | Can call any enumerable singleton property and mutate reset fields |

### STRIDE

| Category | Status | Control / verification |
|---|---|---|
| Spoofing | N/A | Parser performs no identity/authentication decision and creates no principal. |
| Tampering | Mitigated | Exact oracle/snapshot equality protects valid AST integrity; malformed structure fails at the first located inconsistency instead of producing a partial tree. |
| Repudiation | N/A | No durable action/audit event is introduced; deterministic code/location makes host logs attributable without source content. |
| Information Disclosure | Mitigated | Diagnostics contain native class/message and position, never a source excerpt/value; no new logging or external sink. |
| Denial of Service | Mitigated | Source/token/depth/node/declaration caps, iterative chain construction, bounded recursive descent, linear scan/grammar passes, and gated logarithmic piece operations replace fixed-point rescans/pair recursion. |
| Elevation of Privilege | N/A | Parser executes no source, loads no module, grants no method authority, and leaves handler registry checks unchanged. |

### Attack tree

```text
Exhaust or corrupt a host through TSS parsing
OR
├── oversized source                    → source cap before scanning
├── delimiter/token explosion           → token cap during scanning
├── deeply nested blocks                → depth cap before recursion
├── huge rule/method chain               → iterative construction + node cap
├── huge declaration set                 → declaration cap
├── malformed quote/comment/block        → single-pass located rejection
├── regex catastrophic backtracking      → active parser uses hand-written scans
└── valid-source semantic drift           → oracle + 257 snapshots + consumer tests
```

### Threat-model depth and residual risk

Full PASTA is not triggered because no high-value identity/payment/PII flow or new trust boundary is added. Residual risk: parsing the maximum allowed 128 KiB remains synchronous CPU/memory work, and an external host can expose trusted-author syntax to untrusted callers. Production-readiness measurement rejected the originally proposed 1 MiB ceiling (about 180 MiB peak RSS), then lowered the node ceiling again after the exact compatibility layout exposed a denser adversarial shape. The final 128 KiB/32,768-token/4,096-node/16,384-declaration ceilings peak at about 66–76 MiB for direct hard-bound shapes and about 83 MiB/0.18 s for the near-node-ceiling method/interleaving witness, versus a 5,359-byte/74-node/73-declaration corpus maximum. Hard ceilings cannot be raised through config; host-level request/fetch controls remain outside this package. Re-evaluate if TSS becomes direct untrusted user input or gains executable semantics.

## Risk Assessment

| Priority | Risk | Likelihood | Impact | Owner | Mitigation |
|---:|---|---:|---:|---|---|
| 1 | A valid but obscure TSS form changes AST shape/order | High | High | Parser implementer | Frozen oracle, full direct AST differential, unchanged 257 hashes, curated/generated custom-config cases. |
| 2 | Quote/comment/whitespace normalization drifts | High | High | Parser implementer | Dedicated characterization and oracle generation around delimiters, URLs, comments, quoted spacing, selectors, and shorthand. |
| 3 | Resource limit rejects legitimate production TSS | Low | High | Package maintainer | Full-corpus maxima recorded per measurable dimension (depth has 8× headroom); exact-bound tests; lower-only overrides; explicit major-version adoption. |
| 4 | New diagnostics leak source data | Low | Medium | Security reviewer | Native class/message plus line/column/offset only; no excerpts; adversarial security review. |
| 5 | Recursive descent overflows or scanner becomes superlinear | Medium | High | Parser implementer | Depth 128, iterative chains, source/token caps, complexity witnesses, source review for rescans/backtracking. |
| 6 | Singleton helper/state compatibility breaks tooling | Medium | High | Parser implementer | Required-key/type/reset tests plus UI manifest compiler success/failure restoration suites. |
| 7 | Test-only oracle accidentally ships | Low | Medium | Release reviewer | Oracle resides under `test/fixtures`; package dry-run must list only README/package/source. |

## Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Hand-written tokenizer + recursive descent | Parser generator; incremental repair of pair arithmetic; keep rewriting plus diagnostics | Required architecture direction; zero runtime dependency/build; direct source positions and explicit bounds; avoids touching debunked arithmetic. |
| Frozen test oracle | Golden hashes only; delete old implementation entirely; runtime fallback | Direct trees explain drift and cover generated/custom inputs; test-only copy preserves evidence without shipping two engines. |
| Preserve all singleton names without the old active engine | Remove dead helpers in a major; compatibility facade package | The user/locked export rule requires names in place. `handle()` never calls the historical algorithm helpers; directly consumed behavior stays exact, representative helper behavior remains characterized for trusted hosts, and hard resource guarantees are explicitly scoped to `handle()`. |
| Major `2.0.0` release | Patch `1.0.1`; minor `1.1.0` | Hard limits, located native error classes, stricter known config, malformed-source rejection, and algorithm-helper semantic changes narrow accepted behavior even though valid shipped AST JSON stays exact; opt-in major adoption is honest SemVer. |
| Located `SyntaxError`/`RangeError` | One generic `Error`; custom exported error class; per-condition machine codes | Native classes and concise messages communicate caller action without adding an export or over-specified code taxonomy. |
| Lower-only configurable bounds | Fixed hard bounds; no bounds; host-only timeout | Library is synchronous and must self-bound; immutable ceilings contain worst-case cost while lower overrides let constrained hosts tighten one resource dimension. |
| No source excerpts in errors | Include line text/caret; include full token | Line/column/offset are useful to hosts/editors without copying trusted template values into logs; richer presentation stays outside the parser. |
| Preserve interleaved declaration outputs by bounded layout projection | Reject interleaving; rerun the old rewrite; approximate original spans; parse all declarations naturally | The locked v1 output remains normative. A frozen permutation fixture plus adversarial offset-collision/method cases make the ugly contract explicit; one lowering pass and an implicit rope compose legacy coordinates without fixed-point rescans or quadratic source copies. |
| Longest literal custom delimiter match | Restrict all syntax to one character; regex-driven custom syntax | Preserves and improves configured syntax without regex metacharacter hazards; deterministic precedence handles prefixes. |
| No production feature flag | Ship old/new toggle; auto-fallback on error | A fallback doubles attack/maintenance surface and can silently accept malformed source; package pin/revert is clean rollback. |

## Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Trusted syntax config and TSS strings only; no runtime package/import/service dependency. |
| Direct dependents | `view-model`, `tss-model`, `data-parser`, `attrs-method`, transitive `if-method`, handler-wrapper/cached AST traversal, UI manifest compiler, and external hosts using the singleton. |
| Cascade on outage | A parser exception rejects creation/fetch/manifest compilation for the current TSS asset; no partial AST reaches traversal. |
| Cascade on slow | Parsing is synchronous, so pathological work can block the current event loop; measured linear scan/grammar phases, gated piece operations, and hard caps bound that delay. |
| Cascade on bad data | Malformed TSS stops at parser with location; valid AST continues through existing caches/handler unchanged; no durable mutation. |
| Compromised-session impact | N/A: no session/record access. A caller able to choose TSS can consume only bounded local parse resources and cannot execute code. |
| Fault isolation boundary | Current synchronous `handle()` call and its requesting render/build; fetched promise rejection follows existing cache eviction behavior. |

## Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | In-repo/source-DI adoption reverts the feature PR/commit; external npm adoption pins `@jtorm/tss-parser@1.0.0`. No feature flag or state migration. |
| Schema rollback | N/A — AST wire shape and manifest schema are unchanged; no database/schema. |
| Data rollback | N/A — parser writes no durable data. Existing content-addressed manifests remain valid because valid AST JSON is identical. |
| Auto-rollback trigger | CI/differential/snapshot/Codex failure blocks PR. After release, any valid-input AST/hash drift or legitimate default-limit rejection triggers immediate pin to `1.0.0`. |
| Manual rollback runbook | External hosts restore the lockfile/parser pin to `1.0.0`; source-composed hosts revert the parser/AGENTS/tests/docs commit together; rebuild manifests with the prior toolchain label if needed and redeploy. |
| Last rollback drill | Static package-pin/manifest compatibility drill in this feature; package is not published or deployed by this task. |

## Migration and SemVer

- Publish as `@jtorm/tss-parser@2.0.0` after this PR is merged by the maintainer; this task only prepares metadata.
- Existing `^1.0.0` dependents do not auto-adopt v2. Hosts explicitly install/inject `2.0.0` after their compatibility run. Existing dependent metadata remains untouched unless a failing local seam test proves a source change is required; runtime code has no package import edge.
- Hosts call `config()` before `dataParser.init()` exactly as today. New limits default to immutable hard ceilings and may only be lowered.
- Hosts or manifest builds that record a `toolchain.tssParser` fingerprint report `2.0.0` when adopting it; the manifest wire version and existing packs do not change.
- Malformed assets that were silently dropped/misparsed may now reject with a located native error. Fix the source; do not catch-and-fallback to v1 parsing.
- `quotes` keeps v1 surface semantics: string or documented array values remain stored unchanged in `c.quotes`, and compatibility regexes remain byte-observable as before. The tokenizer additionally derives the configured quote delimiters locally; adjacent data/if binding grammar is neither normalized nor rewritten in this task.
- Unknown top-level config metadata remains ignored. Invalid known separator/quote/limit values now throw and are part of the explicit major-version migration.
- Multi-character delimiters and regex-metacharacter separators use v2 literal semantics; v1's single-unit/raw-regex behavior is not an oracle-compatible profile.
- Rollback is an exact parser pin/revert; no consumer package downgrade, AST migration, cache flush, database action, or compatibility shim is required.

## Testing Strategy and Red-First Implementation Order

1. Freeze the current parser unchanged as `test/fixtures/tss-parser-oracle.js` and add the required singleton-surface inventory test.
2. Add valid characterization/differential cases for rule order, inheritance, nested/selectorless rules, chains, shorthand merge/duplicates, comments/URLs, dual-quote whitespace, quoted declaration separators, string/array custom quotes, trailing declarations, and the interleaving permutation matrix. Confirm these pass against v1 behavior.
3. Add malformed-input diagnostic and low-limit exact/over-bound tests; include positions after multi-line comments/collapsed whitespace and every supported line break, plus 128/129-node method chains. Run them against v1 and record the expected red failures.
4. Implement original-span normalization/tokenization, writable compatibility state/adapters, iterative header/chain construction, recursive block descent, interleaving projection, diagnostics, and limits in focused checkpoints; all scratch state stays local.
5. Run new-vs-oracle deep equality for curated/generated/full 257-file corpora and retain the independent hash snapshot.
6. Run direct consumer suites (`data-parser`, `attrs`, `if`, `view-model`, `tss-model`), handler-wrapper inheritance, rejection/cache eviction, and manifest compiler restoration/determinism tests.
7. Record actual tokenizer maxima for all 257 files and run requested local gates: focused parser/differential/resource tests, exact `npm test`, `npm run typecheck`, package dry-run, source/oracle-integrity guards, Semgrep, `git diff --check`, syntax checks, dependency audit, and complexity/resource evidence.
8. Apply review-router, architecture, differential, refactor, tech-debt, production-readiness, and fresh 100/100 verification loops; fix every valid finding red-first.
9. Update README/spec/evaluation/security/ledger/backlog, commit conventionally, open a ready PR into `dev`, and iterate CI/current-head Codex review until clean without merging.

## Planning Constraints and Delivery Shape

- **Relative size:** Large. Reference class: the prior UI-closure manifest parser/graph slice (PR #46) and returned-effects rewrite (PR #49), both of which needed broad compatibility fixtures plus a current-head review loop. Parser normalization is the highest-uncertainty uphill scope and is sequenced first through characterization.
- **Appetite:** One cohesive parser-package PR. Scope may be hammered only by removing non-required diagnostics presentation or extra generated cases; exact compatibility, bounds, docs, and review quality never decrease.
- **Critical path:** merged base → frozen oracle/characterization → observed diagnostic reds → production parser → exact differential/snapshot green → consumer/full/static gates → records → ready PR → CI → current-head Codex review.
- **Assumptions:** checked-in TSS represents the production v1 syntax envelope; TSS remains trusted author input; external hosts call `config()` before data-parser initialization; repository evidence finds no direct consumer of algorithm-specific helper return values beyond required name/callability and writable state.
- **Resolved uncertainties:** comment-before-quote/token-concatenation, dual-quote whitespace normalization, helper behavior, custom quote arrays, and declaration interleavings are pinned directly from the oracle; structurally malformed-v1 tree outputs are not treated as valid merely because v1 failed to throw.
- **Stakeholders:** package/framework maintainer (product and release authority), external TSS authors/hosts (compatibility users), Codex review (quality gate), and CI (mechanical gate). The user authorization supplies decisions and directs autonomous execution; material decisions and evidence stay in this shared spec/evaluation record.
- **Definition of Done:** all success criteria pass, no valid-output drift or unresolved review finding remains, package/docs/records are complete, ready PR targets `dev`, CI and current-head Codex review are clean, and the PR is left unmerged.

## Success Criteria

- [x] New active parser is a bounded hand-written tokenizer plus recursive descent with no fixed-point source rewrite.
- [x] Curated/generated/custom/full-corpus differential comparisons are exact.
- [x] All 257 snapshot hashes and JSON keys are unchanged.
- [x] Diagnostics provide native class/message and original line/column/offset without source excerpts, including after multi-line comments, collapsed whitespace, and CRLF.
- [x] Source/token/depth/node/declaration exact-bound and over-bound tests pass; no unbounded chain recursion/rescan remains.
- [x] Every pre-existing singleton key/export and known mutable reset/snapshot field is preserved.
- [x] No runtime import/dependency, adjacent package change, handwritten TS/d.ts, or parser-scope leak is introduced.
- [x] `@jtorm/tss-parser` is documented and versioned `2.0.0`; package dry-run contains only intended files.
- [ ] All requested tests, static/security/review gates, CI, and clean current-head Codex review pass.
- [ ] Ready PR targets `dev` and remains unmerged.

## Open Questions

None. The repository contract and user requirements resolve implementation ownership, the v1-compatible validity grammar, v2 quoted-delimiter extension, bounds, diagnostics, SemVer, migration, rollback, review, and delivery. Any newly discovered grammar-valid v1 behavior that cannot satisfy exact oracle output and bounded parsing is a genuine product-level blocker; legacy behavior outside the grammar follows the specified located-error contract.

## Plan Quality Gate

| Dimension | Score | Evidence before implementation |
|---|---:|---|
| Architecture | 10/10 | Production becomes a single bounded tokenizer/recursive-descent owner; DI, package, AST, and consumer boundaries remain unchanged. |
| Consistency | 10/10 | Public singleton names, lazy mutable fields, regex/config behavior, AST order, and all valid v1 outputs are characterized. |
| Type Safety | 10/10 | Pure JavaScript/JSDoc remains; native error classes and input/config validation are explicit; no type-package change. |
| Validation | 10/10 | Grammar validity, custom syntax, exact/over bounds, and malformed conditions have objective tests and positions. |
| Error Handling | 10/10 | Atomic publication, native error taxonomy, original UTF-16 locations, propagation, and cache-eviction behavior are specified. |
| Security/Privacy | 10/10 | STRIDE and attack tree cover integrity, synchronous DoS, source leakage, and the test-only oracle boundary. |
| Performance | 10/10 | Linear-pass requirement, local scratch state, immutable ceilings, iterative chains, and complexity witnesses are specified. |
| Maintainability | 10/10 | Grammar/token phases, compatibility projection, oracle integrity, SemVer, migration, and rollback are documented. |
| Testability | 10/10 | Red-first diagnostics, frozen differential oracle, generated interleavings, 257 hashes, consumer seams, and resource tests are ordered. |
| Readability | 10/10 | Compact grammar, tables, explicit non-goals, and condition-by-condition contracts make the replacement reviewable. |

**Plan score:** 100/100. No unresolved issue remains at the specification gate.

### Design-persona constraints applied

- Architecture/planning/backend/platform personas: isolate lexical, grammar, compatibility, and publication phases; preserve the DI/runtime boundary; keep rollback and operational blast radius explicit.
- Code-review and threat-modeling enforcers: require red-first evidence, original-position diagnostics, hard resource ceilings, no source excerpts, and no partial AST publication.
- Bun/Elysia/TypeScript specialist checklists: runtime-specific framework guidance is N/A; applicable JavaScript runtime safety, package, validation, and no-handwritten-types constraints are included.
- Database architect: N/A because this change has no database, schema, query, RLS, persistence, or migration surface. The recommended-profile resource index contains no database-architect persona; database checklists were still reviewed and found inapplicable.

### Two-round adversarial specification review

Skeptic, architect, and minimalist lenses first found a guessed declarations-before-children simplification, missing original-source mapping detail, under-specified helper/limit/SemVer behavior, and ambiguous rollback. The specification was corrected to preserve balanced interleavings exactly, retain original UTF-16 spans, major-version the package, pin the oracle source hash, count method nodes in depth, keep scratch state call-local, separate external package pinning from source-DI rollback, characterize both legacy quote modes, and bound oracle-only tests well below production ceilings.

The second pass confirmed those corrections and added line-break semantics, propagated error identity/position checks, explicit zero-error corpus evidence, and retention of the canonical DEBUNKED warning for the frozen oracle. Lead judgment rejected suggestions to remove published helper names, drop defense-in-depth token/node/declaration bounds, omit the full-corpus oracle pass, or abandon quoted structural delimiters: each conflicts with an explicit user or repository contract. The resulting verdict is **PASS** for implementation.

### Implementation adversarial correction

The first implementation skeptic pass found two grammar-valid classes absent from the initial generated matrix: a selectorless document root gives its first nested pair the same legacy `from = 0`, and nested method lowering composes offset changes before a parent with interleaved declarations is blanked. The original-span approximation therefore diverged on 8,218 of 200,000 broad generated forms, including quote-free minimized witnesses such as `{a->b{x:1;}}`, `{b{}x:1;}`, and `r{c->m{}x:1;d{}y:2;}`.

Each class was pinned red-first. The compatibility phase now lowers the recursive parse tree once into virtual legacy coordinates and applies the historical blanking sequence through a bounded implicit piece rope only when a nested collision/interleaving requires it; it never runs or reparses the frozen implementation. The checked-in characterization adds the minimized collision/method cases and a frozen 4,096-form seeded nested matrix. A fresh independent 200,000-case run reports 200,000 accepted by both implementations and zero JSON divergences.

Resource review of that exact projection then found the former 8,192-node ceiling could exceed a 128 MiB isolate on a dense method/interleaving shape. A red-first near-ceiling witness lowered the immutable node cap to 4,096 and gated non-interleaved inputs onto the direct AST path. Replacing quadratic parent discovery with coordinate-compressed predecessor lookup brought the final witness to about 83 MiB/0.18 s; direct hard-bound shapes use about 66–76 MiB. Exact compatibility measures 9,046 bytes gzip, so the explicit source ratchet is 10 KiB rather than hiding the required compatibility machinery.

## Approval

- [x] Requirements clear
- [x] Scope agreed
- [x] Risks acceptable
- [x] Threat model complete
- [x] Specification self-review complete

**Approved by:** User task authorization after feature-dev quality gate and Codex lead judgment
**Date:** 2026-07-16
