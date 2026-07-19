# FAQPage Accordion Projection — Test Plan

**Status:** Automated phases implemented and passing; live browser accessibility QA pending
**Date:** 2026-07-19
**Specification:** `feature-reviews/schema-faq-accordion-spec.md`
**Threat model:** `feature-reviews/stride-schema-faq-accordion.md`

## Execution Summary

- Maintainer approval was received before the failing feature-test gate.
- The initial focused run failed only on the intentionally absent public variants, artifacts, versions, and behavior; the implemented focused suite then passed.
- FAQ-specific prepared-manifest compilation/lookup and persisted-restart cache restoration were added after scoped implementation review.
- Full-suite, typecheck, package dry-run, parser, manifest, source-ratchet, and diff evidence is recorded in `feature-reviews/schema-faq-accordion.md`.
- Phase 9 remains unchecked: this session exposes neither required Chrome MCP integration nor a repository-configured development URL/host page. Native semantics and DOM behavior have automated coverage, but keyboard, accessibility-tree, viewport, focus, Bootstrap CSS, and screenshot evidence remain a pre-publish host gate.

## Test Strategy

Implementation follows the repository’s failing-test-first rule:

1. characterize every existing published contract that a refactor could disturb;
2. add focused tests that fail because the new public variants/artifacts do not exist;
3. implement only enough for the focused phase to pass;
4. run the full pipeline, package-source ratchets, typecheck, package builds, and browser QA; and
5. retain exact evidence for cold/warm/restart, framework resolution, JSON-LD parity, and hostile inputs.

Use Node’s built-in test runner through `npm test`. Do not run `node --test test/`.

The clean feature worktree intentionally reuses the primary checkout’s read-only development dependencies:

```sh
PATH=/home/ubuntu/repos/jtorm-framework/node_modules/.bin:$PATH \
NODE_PATH=/home/ubuntu/repos/jtorm-framework/node_modules \
npm test
PATH=/home/ubuntu/repos/jtorm-framework/node_modules/.bin:$PATH \
NODE_PATH=/home/ubuntu/repos/jtorm-framework/node_modules \
npm run typecheck
```

No dependency installation is planned.

## Test Locations

| File | Purpose |
|---|---|
| `test/uis/components-ui.test.js` | canonical mapper/artifact/cache/package source contracts |
| `test/uis/bootstrap-ui.test.js` | adapter mapper/artifact/literal/package contracts |
| `test/uis/schema-faq.test.js` | schema mapper/package/default/legacy-ID source contracts |
| `test/pipeline/components-ui.test.js` | canonical group/default runtime behavior |
| `test/pipeline/bootstrap-ui.test.js` | group overlay, strict invalid behavior, framework/idempotence |
| `test/pipeline/schema-faq.test.js` | end-to-end projection, invalid matrix, escaping, JSON-LD, cache, framework |
| existing cache/manifest suites | versioned ID enumeration and persistence/manifest regressions |

Prefer extending existing helpers. Add only a narrow local mount/render helper when the existing fixture cannot select schema variants, framework configuration, JSON-LD registration, cache warmth, or request metrics.

## Phase 0 — Clean Baseline

Before any behavioral edit:

- [x] record clean worktree status apart from planning documents;
- [x] run full `npm test`: 912/912 pass;
- [x] run `npm run typecheck`: pass;
- [x] record current exact `FAQPage.default` mapper path;
- [x] record current `accordion.default` valid, empty, and invalid HTML;
- [x] record current canonical cache key set and cold request metrics: seven keys; 7 requests / 4,443 bytes for both 1 and 32 items;
- [x] record the explicit-framework fallback/non-propagation matrix.

Any baseline failure is investigated separately and is not hidden by feature edits.

## Phase 1 — Red Public-Contract Tests

Write these tests before their implementation and confirm they fail for the intended missing-contract reason.

### Components UI source contracts

- [x] mapper exposes `accordion.group -> @c/accordion/accordion-group.tss`;
- [x] mapper still exposes exact `accordion.default` and `accordion.item` paths;
- [x] public canonical variant count advances from 14 to 15;
- [x] package version and singleton ID are exactly `0.2.0`;
- [x] all seven static cache IDs use the package version;
- [x] group binder acquires only the existing accordion shell;
- [x] default acquires the group binder by required same-package `->get`;
- [x] no new runtime dependency or `require()` appears.

### Bootstrap UI source contracts

- [x] mapper exposes group as canonical binder then `@b/accordion/accordion-group.tss`;
- [x] default and item compositions remain exact;
- [x] public adapter variant count advances from 14 to 15;
- [x] group overlay contains only the fixed root `accordion` class and idempotent selector;
- [x] existing default overlay retains its `items` gate;
- [x] package/singleton version is `0.2.0`;
- [x] components dependency is exactly `^0.2.0`;
- [x] optional Bootstrap peer contract remains unchanged;
- [x] overlay has no cache ID, data field, script, behavior attribute, or runtime import.

### Schema UI source contracts

- [x] `FAQPage.accordion` maps to one `@s/faq-page/faq-page-accordion.tss` artifact;
- [x] `FAQPage.default` remains exactly `@s/faq-page/faq-page-default.tss`;
- [x] `FAQPage.link` remains unchanged;
- [x] no `Question.default` or `Answer.default` mapping exists;
- [x] package version is `0.2.0` with components dependency `^0.2.0`;
- [x] singleton/asset ID remains exactly `jtorm/schema-ui-0.0.4/src`;
- [x] group/item UI calls use explicit `append(d: derivedPath)` and never pass the merged lexical wrapper;
- [x] no runtime `require()` or Bootstrap artifact reference appears.

## Phase 2 — Canonical Group and Default Compatibility

### `accordion.group` valid behavior

- [x] `{}` renders exactly one empty `.jtorm-accordion` root;
- [x] supported string `id`, `class`, and `lang` apply exactly;
- [x] `dir` accepts only `ltr`, `rtl`, or `auto`;
- [x] extra keys, including `items`, `summary`, `content`, and `open`, are inert;
- [x] repeated group calls append independent roots;
- [x] direct `accordion.item` composition beneath the returned root works;
- [x] a deeply frozen model is unchanged.

### `accordion.group` rejection behavior

- [x] null, undefined, booleans, numbers, strings, and arrays render no root;
- [x] wrong types for optional attributes are ignored;
- [x] inherited optional fields follow the current data-parser/default contract exactly;
- [x] malformed `dir` does not become an attribute and does not weaken root creation.

### Exact `accordion.default` regression

For each current case, assert byte-exact HTML and cache behavior before and after the binder extraction:

- [x] one valid item;
- [x] multiple valid/invalid interleaved items;
- [x] empty `items` array gives one empty root;
- [x] null/scalar/array top-level model gives no output;
- [x] missing/non-array `items` gives no output;
- [x] optional root/item attributes and boolean-only `open`;
- [x] escaped text and frozen nested arrays/items;
- [x] direct item composition;
- [x] same canonical shell key and no duplicate root.

The default test must fail if its group acquisition occurs before the `items` gate or goes through nested framework resolution. Cold acquisition intentionally ratchets from the measured seven baseline paths to eight by inserting only `@c/accordion/accordion-group.tss`; one-item and 32-item paths must otherwise be identical and must not scale.

## Phase 3 — FAQ Projection

### Supported dense model

Render at least three distinct entries and assert:

- [x] exactly one canonical root;
- [x] one `details` per input pair in source order;
- [x] each `summary.textContent` equals `Question.name`;
- [x] each content `textContent` equals `acceptedAnswer.text`;
- [x] no item is opened by schema input;
- [x] canonical class names and element semantics are exact;
- [x] Unicode, entity-like strings, newlines, and long words preserve text;
- [x] the root graph is deeply frozen and exactly unchanged.

### Root matrix

Each case is an independent subtest with exact expected root count:

| Case | Expected |
|---|---|
| null / undefined / boolean / number / string / array | 0 |
| object missing `@type` | 0 |
| inherited exact `@type` / supported paths | follows existing data-parser lookup in UI-only mode; output remains escaped/minimized |
| `@type` wrong case, prefix, suffix, IRI, or array | 0 |
| exact FAQPage but missing/null/object/string `mainEntity` | 0 |
| exact FAQPage and empty array | 1 empty group |
| exact FAQPage and nonempty all-invalid array | 1 empty group |
| exact FAQPage and supported entries | 1 populated group |

The data parser already resolves inherited ordinary properties; lock that existing behavior without changing the parser. The JSON-LD plugin may reject the non-plain graph, so this characterization runs with optional JSON-LD unregistered. Inherited/named array entries and unknown fields must still never render.

### Per-entry matrix

Within one valid root, interleave valid entries with:

- [x] null/scalar/array questions;
- [x] missing, non-string, empty, near-match, IRI, or type-array Question `@type`;
- [x] missing, non-string, or empty `name`;
- [x] missing/null/scalar/array `acceptedAnswer`;
- [x] `acceptedAnswer` with missing, near-match, IRI, or array `@type`;
- [x] missing, non-string, or empty answer `text`;
- [x] `suggestedAnswer`, `ItemList`, and multiple-answer shapes;
- [x] valid whitespace-only `name` and `text` to lock the current truthy-string contract.

Assert only supported pairs render, in their relative source order, with no placeholder or partial item.

### Array ownership and JSON-LD split

UI traversal cases run with optional JSON-LD unregistered where necessary:

- [x] array holes are skipped;
- [x] inherited numeric properties are skipped;
- [x] own named properties are skipped;
- [x] noncanonical numeric names are skipped;
- [x] own canonical numeric indices render in ascending iteration order;
- [x] loop wrapper fields cannot become visible.

Separately characterize an inherited exact supported Question/Answer path: it may provide escaped `name` / `text` under the existing data-parser contract, but no inherited unknown field may cross the two-field projection.

Separately retain/prove the JSON-LD model’s existing loud rejection for sparse arrays, own named properties, and nonstandard array structures. Do not change the serializer to make the UI-only cases serializable.

### Regex-policy boundary

- [x] exact short type literals render;
- [x] short near-matches skip;
- [x] a type string beyond the policy input limit produces the existing loud regex-policy failure;
- [x] no schema artifact contains a native unbounded regex execution sink.

## Phase 4 — Injection, Minimization, and Immutability

Use distinct canary values in every field so leakage source is attributable.

- [x] markup in question/answer text creates no element, attribute, script, style, URL, or event handler;
- [x] serialized HTML contains escaped text and DOM `textContent` contains the original string;
- [x] root `id`, `class`, `lang`, `dir`, `items`, `summary`, `content`, and handler-like keys are absent;
- [x] question/answer `open`, attributes, URLs, images, HTML fields, and Bootstrap-like keys are absent;
- [x] prototype canaries on unknown paths and named array properties are absent;
- [x] cached shell HTML contains none of the current or previous model markers;
- [x] before/after deep equality and successful render prove no mutation of a deeply frozen graph.

Also assert no `data-bs-*`, `aria-expanded`, collapse/button behavior class, script, generated ID, or handler is introduced in canonical or Bootstrap output.

## Phase 5 — Framework Resolution and Presentation

Use isolated resolver configuration for every row:

| Configured framework | Selection | Root/item classes |
|---|---|---|
| components | implicit FAQ variant | canonical only |
| bootstrap | implicit FAQ variant | canonical plus each fixed Bootstrap class once |
| bootstrap | explicit outer schema | canonical plus Bootstrap |
| components | explicit outer Bootstrap with fallback to schema | canonical only |
| components | direct explicit Bootstrap group | canonical plus root overlay |
| components | direct explicit Bootstrap item | canonical plus item overlay |

Additional assertions:

- [x] repeated decoration is idempotent;
- [x] neutral output contains no Bootstrap class;
- [x] Bootstrap output preserves `details` / `summary` and independent disclosure;
- [x] the existing default invalid model cannot decorate a pre-existing accordion hook;
- [x] group overlay cannot decorate an item or unrelated root;
- [x] no explicit framework value leaks into sibling/subtree renders.

The non-propagating fallback row is a characterization. A failure there is not fixed by modifying core resolver/context code in this feature.

## Phase 6 — JSON-LD

### Valid parity

For a dense supported root with `@context`, render UI and the existing JSON-LD plugin, then:

- [x] parse the script safely;
- [x] extract ordered `Question.name` / `acceptedAnswer.text` pairs;
- [x] extract ordered visible summary/content pairs;
- [x] assert exact deep equality;
- [x] assert the structured root is otherwise the original unchanged model;
- [x] assert script-safe escaping remains intact.

### Invalid-model boundary

- [x] demonstrate a structurally serializable unsupported entry can remain in JSON-LD while the UI skips it;
- [x] label that case unsupported rather than claiming parity;
- [x] retain loud serializer rejection for hostile sparse/named/nonstandard arrays;
- [x] never weaken or pre-normalize the JSON-LD root to match visible output.

## Phase 7 — Cache, Persistence, Manifest, and Acquisition

### Cold and shared-warm

- [x] cold render creates/restores the canonical shell entries expected by the existing cache owner;
- [x] second render with different question/answer markers reuses shells but shows only current markers;
- [x] root/item attributes and Bootstrap literals apply after restoration;
- [x] cache remains exactly seven canonical nested HTML-only entries;
- [x] cache keys all use `jtorm/components-ui-0.2.0`;
- [x] no eighth schema or Bootstrap fragment entry appears.

### Restart/persisted restoration

Using the existing versioned save adapter, scoped flag, deterministic Unix clock, and `uiCacheInit` ordering:

- [x] persist a cold data-free render;
- [x] initialize a fresh process-local cache model;
- [x] restore valid entries;
- [x] render different current FAQ text;
- [x] assert current text only and exact byte/timestamp pairing;
- [x] assert old `0.1.0` keys are cold/unused after the deliberate package ratchet;
- [x] do not invent reload timestamps, clock identity, validators, or stale fallback.

### Artifact requests and manifests

Measure a one-item and 32-item cold render with request metrics:

- [x] output count scales 1 to 32;
- [x] artifact request count does not scale with item count;
- [x] warm repeat has only the expected existing request/cache behavior;
- [x] prepared manifest lookup resolves the new public closure;
- [x] required/optional manifest policy remains unchanged;
- [x] request-model URL policy is still exercised on hits;
- [x] the three fetch-model caches are not primed by this feature.

For canonical default, ratchet the measured baseline from 7 to exactly 8 cold requests with only the new group binder added. Record the schema and Bootstrap constant graphs in their red tests before implementation, then lock them explicitly.

## Phase 8 — SSR, SPA, Scale, and Isolation

- [x] SSR-style cold render returns deterministic canonical HTML;
- [x] SPA-style subsequent render in the same root/context shows only new data;
- [x] a separate render root has isolated resolver/cache context;
- [x] sibling FAQ and non-FAQ renders do not leak ancestor/data scope;
- [x] zero, one, and 32 supported entries produce exactly 0/1/32 items within one valid group;
- [x] runtime grows linearly within a generous non-flaky benchmark envelope;
- [x] no per-item network/artifact acquisition or repeat lifecycle appears;
- [x] host-bound requirement is present in package documentation.

## Phase 9 — Browser and Accessibility QA

After implementation and focused Node tests pass, use the existing browser-QA workflow against canonical and Bootstrap presentation at narrow/mobile, tablet, and desktop widths.

- [ ] Tab reaches every `summary` in source order.
- [ ] Enter and Space toggle the focused disclosure.
- [ ] Each item remains independently operable.
- [ ] Focus indication remains visible with Bootstrap CSS.
- [ ] Screen-reader semantics expose disclosure name/state from native elements.
- [ ] 200% and 400% zoom/reflow do not hide question or answer content.
- [ ] Long words, multiline answers, RTL/Unicode text, and narrow widths do not cause inaccessible clipping.
- [ ] CSS-disabled output remains understandable and operable.
- [ ] No unexpected layout shift or scripted behavior occurs.
- [ ] Screenshots/evidence are captured for canonical and Bootstrap states.

Any real accessibility defect is fixed within canonical or literal-presentation ownership as appropriate; no bespoke disclosure JavaScript is introduced.

## Phase 10 — Full Verification

Run after every implementation checkpoint as scoped, and in full before completion:

```sh
PATH=/home/ubuntu/repos/jtorm-framework/node_modules/.bin:$PATH \
NODE_PATH=/home/ubuntu/repos/jtorm-framework/node_modules \
npm test
PATH=/home/ubuntu/repos/jtorm-framework/node_modules/.bin:$PATH \
NODE_PATH=/home/ubuntu/repos/jtorm-framework/node_modules \
npm run typecheck
```

Then run package build/publish-surface checks for all three touched packages:

- [x] `npm pack --dry-run` from components UI;
- [x] `npm pack --dry-run` from Bootstrap UI;
- [x] `npm pack --dry-run` from schema UI;
- [x] inspect tarball file lists for the new public TSS artifacts;
- [x] verify dependency/peer metadata and main entrypoints;
- [x] run manifest compilation/determinism tests;
- [x] run source ratchets for runtime `require()`, handwritten TS/declarations, unsafe sinks, and cache IDs;
- [x] verify `git diff --check`;
- [x] verify only approved feature-worktree paths changed.

No file is staged, committed, pushed, or published without a separate user request.

## Requirement Traceability

| Requirement | Primary evidence |
|---|---|
| preserve published defaults | source ratchets + exact pipeline goldens |
| canonical reusable group | components mapper and direct-composition tests |
| safe FAQ projection | root/entry matrices + derived-data canaries |
| optional Bootstrap only | framework matrix + literal/idempotence checks |
| escaping and no mutation | injection suite + frozen deep equality |
| cache isolation | cold/warm/restart marker and key-set tests |
| JSON-LD ownership/parity | valid pair comparison + invalid boundary tests |
| host-bounded linear behavior | 32-item/acquisition/runtime evidence |
| package/asset compatibility | version/dependency/legacy-ID/manifest tests |
| accessibility | native semantics assertions + browser/WCAG evidence |
| rollback readiness | package trio and restored-manifest rehearsal/documentation |

## Exit Criteria

Implementation is complete only when:

- every planned red test has been observed failing for the intended reason and then passes;
- all exact existing default contracts remain green;
- the full suite and typecheck pass;
- all three package dry runs contain the intended public artifacts and metadata;
- cache, manifest, framework, JSON-LD, security, scale, and browser evidence is complete;
- no valid unresolved architecture, frontend, privacy, security, performance, or production-readiness finding remains; and
- the primary dirty checkout is still byte/status unchanged.

Until the maintainer approves the specification and this plan, Phase 0 baseline verification is the only test execution permitted and no feature test/source implementation begins.
