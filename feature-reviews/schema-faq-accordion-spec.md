# FAQPage Accordion Projection — Feature Specification

**Status:** Implemented; automated verification complete; live browser QA pending
**Date:** 2026-07-19
**Author:** /root
**Branch:** `feat/schema-faq-accordion`
**Base:** `origin/dev@8b821b2cdefc5c124c753fc79c9493ca6f340aa7`
**Progress record:** `feature-reviews/schema-faq-accordion.md`
**Threat model:** `feature-reviews/stride-schema-faq-accordion.md`
**Test plan:** `feature-reviews/schema-faq-accordion-test-plan.md`

## Problem

`@jtorm/schema-ui` publishes `FAQPage.default`, but that variant intentionally delegates to `WebPage.default` and does not project `mainEntity` questions into a disclosure UI. The framework already has a canonical, accessible-by-default accordion in `@jtorm/components-ui` and a presentation-only Bootstrap adapter, but there is no safe public seam for a schema projection to create the canonical root and then stream derived items into it.

The feature must render supported Schema.org FAQ data without:

- changing the existing `FAQPage.default` contract;
- rendering caller-controlled HTML or unrelated caller fields;
- duplicating canonical accordion shell or cache ownership in schema UI;
- moving framework-resolution policy into the projection;
- changing JSON-LD serialization or claiming unsupported search-result eligibility; or
- adding runtime imports or dependencies to the dependency-injected `src/` graph.

Schema.org defines `FAQPage` as a page containing FAQs, `Question.acceptedAnswer` as an `Answer` or `ItemList`, and the relevant `name` / `text` values as text. This feature intentionally supports the narrow, common single-`Answer` projection only. Search-engine rich-result eligibility is a separate host/content-policy concern.

## Goals

1. Add an explicit `FAQPage.accordion` schema projection.
2. Project ordered, supported `Question` / `Answer` pairs into canonical `accordion.item` instances.
3. Add a reusable public canonical `accordion.group` root primitive.
4. Allow the existing configured-framework mechanism to add optional Bootstrap classes.
5. Preserve escaping, frozen-input safety, static-fragment cache isolation, JSON-LD root ownership, and existing default variants.
6. Specify exact malformed-input, framework, cache, package-identity, and rollback behavior.

## Scope

### In Scope

- One additive `FAQPage.accordion` projection for the supported dense and partially malformed array shapes specified below.
- One additive public canonical `accordion.group` root and matching optional Bootstrap overlay.
- The minimum refactor required for `accordion.default` to share the canonical root binder.
- Coordinated package/singleton/cache identity changes and metadata dependencies.
- Package documentation, failing-first source/runtime tests, cache/manifest/JSON-LD/framework verification, and browser accessibility QA.

### Out of Scope (Non-goals)

- Changing `FAQPage.default`, `FAQPage.link`, or any existing component output.
- Adding `Question.default` or `Answer.default`. Those types also cover Q&A, voting, and list contexts and do not yet have a presentation-neutral standalone contract.
- Supporting `suggestedAnswer`, `acceptedAnswer` arrays, `ItemList`, multiple answers, type arrays, absolute type IRIs, or rich answer HTML.
- Adding one-open-at-a-time behavior, Bootstrap collapse JavaScript, `data-bs-*`, generated IDs, or ARIA state emulation.
- Propagating an explicit outer `f` framework request through registry fallback. That is a resolver/context feature with a larger compatibility surface.
- Changing the JSON-LD model, its hostile-structure checks, or its output.
- Enforcing a renderer-local item or string-length cap. Hosts continue to own validation and attacker-influenced collection bounds.
- Adding HTTP routes, persistence, database state, authentication, analytics, or runtime third-party dependencies.

## Requirements

### Functional Requirements

1. A host can select `FAQPage.accordion` without changing the existing FAQ default/link behavior.
2. A supported `mainEntity` array renders one canonical root and one ordered disclosure per supported Question/Answer pair.
3. Unsupported roots render nothing; malformed entries skip independently; empty/all-invalid supported arrays produce one empty group.
4. Schema projection passes only an internal group sentinel or derived `summary` / `content` model to canonical components.
5. Canonical group can be composed directly with canonical items and shares the existing root shell/cache owner.
6. Globally configured Bootstrap adds fixed presentation classes without changing native disclosure behavior.
7. The original root remains unchanged for the existing JSON-LD owner.
8. Existing `accordion.default` / `accordion.item` HTML, validation, attributes, and cache semantics remain exact.

### Non-Functional Requirements

- **Performance:** linear traversal; no per-item artifact acquisition; 1 and 32 items use the same artifact graph; hosts bound attacker-influenced collection/string sizes.
- **Security:** exact narrow gates, explicit derived-data handoff, escaped text sinks, fixed Bootstrap literals, bounded regex policy, and no caller data in shared cache.
- **Privacy:** public-content projection only; no new collection, persistence, logging, analytics, or system of record.
- **Accessibility:** native `details` / `summary` semantics and no-JS operation; browser evidence against WCAG 2.2 AA keyboard, focus, zoom/reflow, and robust-name expectations.
- **Compatibility:** additive mapper keys; no deleted export/package; no runtime import; stable schema asset namespace; exact existing default behavior except the documented constant acquisition ratchet.
- **Reliability:** cold, shared-warm, restart-restored, SSR/SPA, manifest, and rollback behavior must be deterministic and tested.

## Decisions

### D1 — Additive schema variant

Add `FAQPage.accordion`; leave `FAQPage.default` exactly mapped to `@s/faq-page/faq-page-default.tss`. This preserves the published WebPage-compatible default while making FAQ disclosure rendering opt-in.

### D2 — Public canonical `accordion.group`

Add `accordion.group` to `@jtorm/components-ui`. It accepts a non-array object, creates the existing cached accordion root, and applies only the existing optional root attributes `id`, `class`, `lang`, and validated `dir`. It does not require or iterate `items`.

The primitive is independently useful for projected, streamed, or paginated canonical accordion items. It is also the smallest public seam that avoids all three rejected alternatives:

- passing raw Schema.org objects through `accordion.default`, which could expose caller `summary` / `content` fields before projection;
- calling the private `accordion-shell.tss` from schema UI, which crosses package ownership; or
- recreating the root in schema UI, which duplicates canonical cache and markup ownership.

`accordion.default` keeps its exact top-level and `items` array gates. After those gates pass, it acquires the same-package group binder through a required `->get` of `@c/accordion/accordion-group.tss`, then performs its existing item loop. It must not nest an implicit `->ui accordion.group`, because that would introduce framework-resolution behavior inside the canonical default path.

This extraction deliberately adds one constant cold TSS acquisition to `accordion.default`: the measured baseline is seven requests and 4,443 artifact bytes for both one and 32 items; the planned path is eight requests because `accordion-group.tss` sits between default and the existing shell. HTML, rejection, attributes, cache keys/content, and item-count independence remain exact. The added artifact request is the accepted cost of one non-duplicated public binder.

### D3 — Narrow, fail-closed FAQ projection

`FAQPage.accordion` renders only when:

- the root is a non-array object;
- root `@type` is the exact string `FAQPage`; and
- `mainEntity` is an array.

For each own canonical array index, it renders an item only when:

- the entry is a non-array object with exact string `@type: "Question"`;
- `name` is a truthy string;
- `acceptedAnswer` is one non-array object with exact string `@type: "Answer"`; and
- `acceptedAnswer.text` is a truthy string.

The projection creates a nested internal group sentinel and a separate nested object containing only `summary` and `content` for each item. Each component call uses explicit `->append(d: derivedPath)`, so only that nested object—not the data-method’s merged lexical wrapper—crosses the schema-to-component boundary. Unknown root, question, and answer properties remain inert. In particular, caller `open`, `id`, `class`, `lang`, `dir`, `items`, `summary`, `content`, and HTML-like fields do not cross that boundary.

Ordinary TSS data paths intentionally follow JavaScript property lookup, including inherited values. This feature does not change that parser-wide contract: an inherited value at a supported path can satisfy the same exact gate in a UI-only render. Hosts should pass plain content objects, and the existing JSON-LD serializer independently applies its stricter plain/own-property rules. Array traversal remains limited to own canonical numeric indices.

### D4 — Deterministic invalid-input behavior

| Input | UI result |
|---|---|
| null, scalar, array, missing/wrong root `@type` | no output |
| missing or non-array `mainEntity` | no output |
| valid root with empty `mainEntity` | one empty canonical group |
| valid root with malformed entries | one group; malformed entries skipped independently |
| valid root with no supported entries | one empty canonical group |
| sparse, inherited, named, or noncanonical array properties | only own canonical numeric indices are considered |
| whitespace-only `name` or `text` | accepted as an existing truthy string |
| type literal exceeding the injected regex-policy limit | existing loud regex-policy failure |

The empty-group behavior matches `accordion.default({items: []})` and keeps projection deterministic without inventing an aggregation/fold verb. Hosts remain responsible for Schema.org/SEO cardinality and useful accessible-name validation.

### D5 — Optional Bootstrap through configured framework

Add `accordion.group` to the Bootstrap mapper as canonical group binding followed by a new root-only literal overlay. Keep the existing `accordion.default` overlay and its `items` array gate unchanged; loosening it could decorate pre-existing hooks for a model that canonical default rejected.

The supported FAQ presentation choices are:

- configured framework `components`: native canonical `details` / `summary`;
- configured framework `bootstrap`: the same native elements plus fixed Bootstrap presentation classes; and
- no Bootstrap CSS: canonical semantics and disclosure behavior still work.

An explicit outer `f: "bootstrap"` that misses in Bootstrap and falls back to schema does not propagate to nested implicit component calls today. This feature characterizes that behavior and does not change it. Hosts wanting Bootstrap FAQ presentation configure Bootstrap globally. Direct explicit `accordion.group` and `accordion.item` selection remains supported.

### D6 — Coordinated package/cache identity

The new public variants require coordinated minor releases:

| Package | Implemented version | Identity/dependency decision |
|---|---:|---|
| `@jtorm/components-ui` | `0.2.0` | advance singleton ID and all seven canonical shell cache IDs to `0.2.0`; 15 public canonical variants |
| `@jtorm/bootstrap-ui` | `0.2.0` | advance singleton ID; depend on `@jtorm/components-ui: ^0.2.0`; keep optional Bootstrap peer; 15 variants |
| `@jtorm/schema-ui` | `0.2.0` | add metadata dependency on `@jtorm/components-ui: ^0.2.0`; retain singleton/asset ID `jtorm/schema-ui-0.0.4/src` |

The schema singleton ID has been stable from package `0.0.5` through `0.1.2` and is a de facto public asset namespace. Changing it is a separate migration, not part of this feature.

Publish order is components UI, Bootstrap UI, then schema UI. Hosts must not combine schema `0.2.x` with an older canonical adapter.

### D7 — JSON-LD parity is proven for valid supported models

The original root model remains unchanged and independently serialized by the JSON-LD plugin. For a valid dense supported FAQ model, tests compare the ordered visible summary/content pairs with the ordered JSON-LD Question/Answer pairs exactly.

For malformed or unsupported entries, UI projection skips unsupported content while JSON-LD still represents the unchanged caller model if that model passes serializer validation. The feature therefore makes no parity claim for invalid models. Sparse arrays and arrays with own named properties retain the JSON-LD model’s existing loud rejection; UI-only ownership tests disable optional JSON-LD instead of weakening that boundary.

## Affected Components

| Component | Change type | Risk | Reason |
|---|---|---:|---|
| `@jtorm/schema-ui` | additive mapper/artifact + metadata | Medium | new public projection and cross-package handoff |
| `@jtorm/components-ui` | additive mapper/artifact + default refactor + identity ratchet | High | published default and all canonical cache namespaces must remain coherent |
| `@jtorm/bootstrap-ui` | additive mapper/overlay + metadata | Medium | optional presentation must not loosen canonical gates |
| full-pipeline/UI package tests | add/modify | Low | contract and hostile-input evidence only |
| cache/manifest package ratchets | modify assertions | Medium | deliberate coordinated cold namespace migration |
| resolver/compiler/handler/request/cache/JSON-LD runtime owners | no change | None | existing DI seams are consumed, not modified |

## Dependencies

- **Depends on:** existing `accordion.item`, accordion shell/item cache owners, `each`, `data`, `if` + regex policy, `append(d:)`, UI resolver/compiler/dispatch, request/manifest, UI cache, and JSON-LD seams.
- **Published metadata:** schema and Bootstrap `0.2.x` depend on components UI `^0.2.0`; this creates no runtime `require()` edge.
- **External:** Bootstrap `^5.3.8` remains an optional peer used only for CSS presentation; canonical behavior is dependency-free.
- **Blocks:** no unrelated feature. Package publication order is components, Bootstrap, then schema.
- **Blocked by:** no implementation dependency; live browser accessibility evidence remains a pre-publish host gate.

## API Contract Applicability

No HTTP endpoint, route, webhook, database schema, event payload, or TypeScript interface is added. The externally consumed API is the three published mapper/model contracts in the next section. Source remains CommonJS/TSS with JSDoc-owned framework types unchanged.

## Public Contracts

### `@jtorm/components-ui`

New mapper entry:

```js
accordion: {
    group: {
        t: ['@c/accordion/accordion-group.tss']
    }
}
```

Model:

```js
{
    id?: string,
    class?: string,
    lang?: string,
    dir?: 'ltr' | 'rtl' | 'auto'
}
```

Output is the existing `<div class="jtorm-accordion">...</div>` shell. The model is not mutated. Invalid top-level arrays/scalars/null render nothing.

Optional attribute lookup matches the existing `accordion.default` data-path behavior, including inherited values; extracting the group binder must not silently change that published default contract. Schema projection prevents caller attributes from reaching this surface by using an internal derived group model.

`accordion.default` and `accordion.item` retain their current published input/output contracts byte-for-byte for existing valid and invalid cases.

### `@jtorm/bootstrap-ui`

New mapper entry:

```js
accordion: {
    group: {
        t: [
            '@c/accordion/accordion-group.tss',
            '@b/accordion/accordion-group.tss'
        ]
    }
}
```

The overlay adds only the fixed `accordion` class to the most recently created canonical group, idempotently. It adds no cache ID, data attribute, script, generated identity, or model field.

### `@jtorm/schema-ui`

New mapper entry:

```js
FAQPage: {
    accordion: {
        t: ['@s/faq-page/faq-page-accordion.tss']
    }
}
```

Supported input:

```js
{
    '@type': 'FAQPage',
    mainEntity: [{
        '@type': 'Question',
        name: 'Question text',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Answer text'
        }
    }]
}
```

Output:

```html
<div class="jtorm-accordion">
  <details class="jtorm-accordion__item">
    <summary class="jtorm-accordion__summary">Question text</summary>
    <div class="jtorm-accordion__content">Answer text</div>
  </details>
</div>
```

Bootstrap configuration adds only the documented Bootstrap classes to these elements.

## Architecture and Data Flow

1. The host supplies the immutable root model to the existing render pipeline and selects `FAQPage.accordion`.
2. Schema TSS validates the narrow root shape with the injected `if` / regex-policy seam.
3. Schema TSS creates a nested internal group sentinel and passes only that object with `->append(d: groupPath)->ui accordion.group`.
4. The resolver selects canonical or configured Bootstrap group composition under its existing global policy.
5. Canonical group restores/builds the data-free cached shell; Bootstrap, when selected, adds a literal class afterward.
6. Schema TSS traverses `mainEntity` with the existing `each` own-index contract.
7. Each supported pair is copied into a nested `{summary, content}` object and only that object is passed with `->append(d: itemPath)->ui accordion.item`.
8. Canonical item restores/builds its data-free shell and binds both strings through escaped `t:` sinks; Bootstrap optionally decorates it.
9. Lexical data/ancestor scopes restore after each subtree. The caller root is never mutated.
10. The existing after-view JSON-LD plugin serializes the original eligible root independently.

Ownership remains:

- schema recognition/projection: `@jtorm/schema-ui`;
- canonical markup, escaping, attributes, and fragment IDs: `@jtorm/components-ui`;
- Bootstrap presentation literals: `@jtorm/bootstrap-ui`;
- resolution/compilation/dispatch/request/cache/JSON-LD: their existing DI models and plugins.

No runtime `require()` edge is added.

## Framework Resolution Matrix

| Configured framework | Outer selection | Expected nested FAQ presentation |
|---|---|---|
| components | implicit `FAQPage.accordion` | canonical only |
| bootstrap | implicit `FAQPage.accordion` | canonical + Bootstrap |
| bootstrap | explicit `f: "schema"` | canonical + Bootstrap, because nested calls use configured Bootstrap |
| components | explicit `f: "bootstrap"`, then schema fallback | canonical only; explicit framework is not inherited |
| components | explicit `accordion.group`, `f: "bootstrap"` | canonical + Bootstrap group overlay |

The fourth row is a locked characterization for this feature, not an endorsement or resolver change.

## Cache and Manifest Contract

- `accordion.group` and `accordion.default` share the one canonical `accordion-shell` cache owner.
- The canonical cache remains exactly seven nested HTML-only entries; no FAQ data, loop metadata, Bootstrap class, clock value, or context identity is stored.
- Question and answer text is always bound after restore, so cold, warm, and restart-restored renders must reflect the current model.
- Advancing components UI to `0.2.0` deliberately cold-migrates all seven package-owned static fragments together.
- Manifest compilation/runtime lookup continue to discover and load the public resolver graph. The feature must not prime fetch caches or bypass request-model URL policy.
- Canonical `accordion.default` cold acquisition advances from the measured constant 7 requests to 8 because of the shared group binder. FAQ projection may add only its own constant public artifacts; no acquisition may grow with item count.

## Security and Privacy

Scope tags are `FRONTEND` and `SECURITY`. There is no new route, database, authentication, payment, storage, secret, or operational trust boundary.

### Threat Model Link

`feature-reviews/stride-schema-faq-accordion.md`

### Initial STRIDE Concerns

- **S — Spoofing:** near-match/type-array/IRI values pretending to be the narrow supported schema types.
- **T — Tampering:** caller fields, named array properties, or adapter ordering changing canonical output/gates.
- **R — Repudiation:** deterministic package/artifact provenance for a render; no auditable user action is added.
- **I — Information disclosure:** unknown caller fields or prior warm data leaking into DOM/cache.
- **D — Denial of service:** unbounded arrays/strings or over-limit regex subjects.
- **E — Elevation of privilege:** caller data becoming markup, attributes, selectors, events, URLs, or Bootstrap behavior.

### Mandatory Controls

- exact supported type/shape gates;
- derived allowlist objects at both package boundaries;
- text-only escaped binding;
- no caller-controlled selector, URL, attribute name, class token, HTML, script, or Bootstrap behavior;
- no caller data in static fragment cache;
- own canonical array-index iteration and frozen-input safety;
- bounded regex grammar/inputs through the existing injected policy;
- host-owned collection and text-size validation;
- visible/JSON-LD parity proof limited to valid supported models.

The full six-category analysis and residual-risk ownership are in `feature-reviews/stride-schema-faq-accordion.md`. A PASTA deep dive is not required because this is a read-only projection across existing trust boundaries with no auth, payment, persistence, or new code-execution sink.

## Performance and Accessibility

- Rendering is linear in the number of own canonical `mainEntity` indices.
- The test plan uses 32 representative valid entries, asserts one-to-one ordered output, and checks artifact acquisition is constant with respect to item count.
- Hosts must bound attacker-influenced array length and string size before rendering.
- Native independent `details` / `summary` behavior is preserved with or without Bootstrap CSS.
- No custom keyboard handling or simulated ARIA state is introduced.
- Browser QA must verify keyboard toggle, visible focus, screen-reader semantics, zoom/reflow, narrow viewports, long unbroken strings, and CSS-disabled behavior.
- Whitespace-only headings are technically accepted by the framework’s established truthy-string contract; hosts own useful accessible-name validation.

## Affected Files

Implemented additions:

- `src/uis/components-ui/src/accordion/accordion-group.tss`
- `src/uis/bootstrap-ui/src/accordion/accordion-group.tss`
- `src/uis/schema-ui/src/faq-page/faq-page-accordion.tss`
- `test/uis/schema-faq.test.js`
- `test/pipeline/schema-faq.test.js`

Implemented updates:

- `src/uis/components-ui/src/components-ui.js`
- `src/uis/components-ui/src/accordion/accordion-default.tss`
- `src/uis/components-ui/src/accordion/accordion-item.tss`
- `src/uis/components-ui/src/alert/alert-base.tss`
- `src/uis/components-ui/src/badge/badge-default.tss`
- `src/uis/components-ui/src/button/button-base.tss`
- `src/uis/components-ui/src/card/card-default.tss`
- `src/uis/components-ui/src/loading/loading-default.tss`
- `src/uis/components-ui/package.json`
- `src/uis/components-ui/README.md`
- `src/uis/bootstrap-ui/src/bootstrap-ui.js`
- `src/uis/bootstrap-ui/package.json`
- `src/uis/bootstrap-ui/README.md`
- `src/uis/schema-ui/src/schema-ui.js`
- `src/uis/schema-ui/package.json`
- `src/uis/schema-ui/README.md`
- `test/uis/components-ui.test.js`
- `test/uis/bootstrap-ui.test.js`
- `test/pipeline/components-ui.test.js`
- `test/pipeline/bootstrap-ui.test.js`
- cache/manifest golden assertions that enumerate package IDs or canonical variants
- `.claude-tasks/agent-outcomes.jsonl` in the feature worktree only

No core handler, resolver, compiler, cache, request, JSON-LD, parser, or type source changed.

## Implementation Plan

All behavioral fixes and contracts are test-first.

### Checkpoint 1 — Public surfaces and red tests

1. Add failing mapper/package/identity tests for the three coordinated `0.2.0` contracts.
2. Add failing component tests for `accordion.group`, unchanged `accordion.default`, and the new Bootstrap root overlay.
3. Add failing schema tests for the supported projection, invalid matrix, escaping, frozen models, and unchanged `FAQPage.default`.
4. Add failing framework-characterization, JSON-LD parity, cache, and acquisition tests.

### Checkpoint 2 — Canonical group

1. Add the public mapper and root binder.
2. Refactor `accordion.default` to use the required same-package binder only after its existing `items` array gate.
3. Prove exact existing default output, rejection, attribute, cache, and request behavior.
4. Advance components package/singleton/cache identities and documentation.

### Checkpoint 3 — Presentation adapter

1. Add the Bootstrap public group mapping and root-only overlay.
2. Keep default/item overlays strict and idempotent.
3. Advance Bootstrap package/singleton/dependency metadata and documentation.
4. Prove zero JavaScript/data attributes/ARIA emulation and both global/explicit framework cases.

### Checkpoint 4 — Schema projection and integration

1. Add `FAQPage.accordion` with exact gates and derived data.
2. Advance schema package metadata while preserving the legacy singleton asset ID.
3. Prove ordered projection, malformed-entry skipping, input immutability, escaped sinks, valid-model JSON-LD parity, and invalid-model serialization boundaries.
4. Run cold/warm/restart cache, manifest, SSR/SPA, larger-collection, browser accessibility, full-suite, typecheck, and package prepack/dry-run verification.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---:|---:|---|---|
| Existing default behavior changes during refactor | Medium | High | exact HTML/rejection/cache characterization plus an explicit 7-to-8 constant acquisition ratchet | components UI |
| Schema fields leak into DOM or cache | Low | High | group sentinel + item allowlist + escaped sinks + warm-data tests | schema/components UI |
| Bootstrap invalid models decorate unrelated hooks | Low | Medium | new group-only overlay; unchanged default gate | Bootstrap UI |
| Explicit framework expectation is misunderstood | Medium | Medium | public resolution matrix and regression characterization | resolver contract/docs |
| JSON-LD/UI mismatch is overclaimed | Medium | Medium | exact parity only for valid dense supported input; host validation for malformed data | host/schema UI |
| Cache namespace collides across releases | Low | High | coordinated `0.2.0` ID/cache ratchet | package maintainers |
| Legacy schema asset URLs break | Low | High | retain `jtorm/schema-ui-0.0.4/src`; separate future migration | schema UI |
| Large public FAQ causes resource exhaustion | Medium | High | linear implementation, constant acquisition, explicit host bounds | host |
| Native disclosure is degraded by presentation CSS | Low | Medium | no behavior emulation; browser/WCAG QA with CSS on/off | Bootstrap/host |

## Trade-offs Considered

| Decision | Alternatives considered | Why this plan |
|---|---|---|
| Add `FAQPage.accordion` | replace/extend `FAQPage.default` | additive opt-in preserves the published WebPage default |
| Publish `accordion.group` | raw schema model into default; private shell get; schema-owned root | one reusable canonical owner prevents data leakage and markup/cache duplication |
| Default uses required same-package group get | duplicate root code; nested implicit UI | prevents drift without introducing framework resolution inside canonical default; accepts one constant request |
| Add Bootstrap group-only overlay | loosen default overlay; schema-local Bootstrap; behavior JS | keeps invalid default gates strict and presentation literal-only |
| Use globally configured Bootstrap | propagate outer `f`; schema hard-codes framework | matches current resolver ownership and avoids a core compatibility change |
| No Question/Answer defaults | broad standalone mappings | FAQ-only projection is narrow; general Q&A/voting contexts lack a neutral contract |
| Coordinated `0.2.0` trio | patch releases; mismatched adapters; schema ID migration | additive public APIs are minor; coordinated identities isolate cache/manifests; legacy schema URLs remain stable |
| Empty group for empty/all-invalid supported arrays | no root; aggregate valid-count fold | matches canonical empty-array behavior and avoids inventing a new aggregation verb |
| Host-owned collection bounds | renderer truncation; unbounded claim | preserves authoritative content and existing ownership while making DoS responsibility explicit |

## Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | schema/components/Bootstrap mapper artifacts; `if` + regex policy; `each`; `data`; `append`; UI resolver/compiler/dispatch; request/manifest; seven canonical cache IDs; JSON-LD plugin |
| Direct dependents | hosts selecting `FAQPage.accordion` or canonical accordion; Bootstrap adapter; compiled UI manifests; persisted static-fragment caches; package consumers of the three mapper singletons |
| Cascade on outage | a missing required group artifact fails the affected render loudly; because default shares it, canonical `accordion.default` also fails until the coherent package/artifact set is restored |
| Cascade on slow | one added constant group acquisition delays cold default/FAQ renders; in-flight/cache policy remains existing-owner behavior and item count adds no requests |
| Cascade on bad data | invalid roots render nothing; bad entries skip within one group; escaped supported text cannot affect siblings; unchanged JSON-LD may still expose host-supplied invalid public data |
| Compromised-session impact | none—no session/auth state exists; at most the already supplied public `name` / `text` values become escaped visible text |
| Fault isolation boundary | required acquisition/regex failure stops the current render root; lexical scope restores; no caller content is persisted; other roots and prior package versions remain isolated by context/version keys |

## Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | stop selecting the variant, pin the coherent `schema-ui@0.1.2` / `components-ui@0.1.0` / `bootstrap-ui@0.1.0` trio, and regenerate/restore manifests |
| Schema rollback | no database or wire schema exists; package model support is additive |
| Data rollback | no caller data is written; cached fragments are static/data-free and version-isolated |
| Auto-rollback trigger | not repository-owned: these are libraries, not a deployed service; host deployment should roll back on any FAQ smoke failure or its own render-error SLO breach |
| Manual rollback runbook | the six steps below; package documentation will repeat the coherent-version rule |
| Last rollback drill | first release of this feature; package/manifests rollback rehearsal is a pre-publish Phase 10 exit criterion |

### Manual Runbook

1. Stop selecting `FAQPage.accordion` before package downgrade.
2. Pin schema UI to `0.1.2`, components UI to `0.1.0`, and Bootstrap UI to `0.1.0`.
3. Restore or regenerate manifests using those exact package identities.
4. Reinitialize resolver registrations before rendering new roots.
5. Evict `0.2.0` static entries if operationally useful, or leave them unused under their distinct keys.
6. No caller-data migration or persistence rollback is required because cached fragments remain static and data-free.

Rollback must restore the package trio; schema `0.2.x` must not run against an older components adapter.

## Open Questions

- [x] All seven handoff decisions are resolved in this specification.
- [x] Architecture, framework, malformed-input, version/cache, JSON-LD, accessibility, security, and rollback policies have no open design blocker.
- [x] Maintainer approval was received before red feature tests and implementation.

## Success Criteria

- [x] Existing `FAQPage.default`, `accordion.default`, and `accordion.item` contracts remain exact.
- [x] `FAQPage.accordion` renders one ordered native disclosure per supported pair and skips malformed entries fail-closed.
- [x] Caller markup renders only as text; caller objects remain deeply unchanged.
- [x] Canonical and Bootstrap presentations follow the documented resolution matrix.
- [x] No Bootstrap behavior, runtime import, core-owner change, or data-bearing cache entry is introduced.
- [x] Valid dense models have exact ordered visible/JSON-LD pair parity.
- [x] Cold, warm, and restart-restored output reflects current data with the same seven data-free cache entries.
- [x] Acquisition is constant in item count and representative 32-item output is one-to-one.
- [x] Package IDs, dependencies, variants, prepared manifests, and rollback instructions are internally consistent.
- [ ] Live browser accessibility QA and screenshots remain a pre-publish host gate; all automated tests, typecheck, package dry-runs, and rollback/cache-generation evidence pass.

## Authoritative References

- [Schema.org FAQPage](https://schema.org/FAQPage)
- [Schema.org Question](https://schema.org/Question)
- [Schema.org Answer](https://schema.org/Answer)
- [Schema.org acceptedAnswer](https://schema.org/acceptedAnswer)
- [Schema.org name](https://schema.org/name)
- [Schema.org text](https://schema.org/text)
- [Google structured-data general policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google’s 2023 FAQ/HowTo rich-result availability change](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

## Plan Quality Gate

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | package owners and DI seams preserved; no core changes |
| Consistency | 10/10 | additive mapper/TSS patterns; default contracts characterized |
| Type Safety | 10/10 | no new JS API/type surface; exact runtime shape gates |
| Validation | 10/10 | complete root/entry/answer and hostile-array matrix |
| Error Handling | 10/10 | skip/no-output/loud-policy cases explicitly distinguished |
| Security/Privacy | 10/10 | full STRIDE, allowlists, escaping, data-free cache, no PII store |
| Performance | 10/10 | linear behavior, 32-item case, constant acquisition, host bounds |
| Maintainability | 10/10 | one reusable group owner; no duplicated shell/adapter model |
| Testability | 10/10 | failing-first phases and cold/warm/framework/JSON-LD seams |
| Readability | 10/10 | narrow contracts, exact matrices, terse implementation target |

**Total:** 100/100
**STRIDE:** complete, 6/6 categories analyzed
**Approval gate:** implementation must not begin until the maintainer approves this specification and test plan.

## Approval

- [x] Discovery and architecture design complete.
- [x] Requirements, non-goals, test evidence, risks, trade-offs, blast radius, and rollback are explicit.
- [x] Scope agreed by maintainer.
- [x] Risks and trade-offs accepted by maintainer.
- [x] Approved to begin failing feature tests and implementation.

**Approved by:** maintainer
**Approval date:** 2026-07-19
