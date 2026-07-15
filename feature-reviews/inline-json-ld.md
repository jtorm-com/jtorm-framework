# Feature Development: Inline JSON-LD from typed model

**Status:** COMPLETED
**Claimed:** 2026-07-15T15:02:49Z
**Agent:** /root
**Current Mode:** Delivery - Ready PR publication

---

## Resumption Context

**Last Completed Mode:** Documentation (all local finish-task gates passed)
**Current Mode:** Delivery
**Next Action:** Publish the ready PR, then obtain green CI and a clean current-head Codex review.
**Files Created:**
- `feature-reviews/inline-json-ld.md` - Feature checkpoint and design record.
- `test/models/json-ld-model.test.js` - Seven red-first serializer policy and safety tests.
- `src/models/json-ld-model/package.json` - New published model package metadata.
- `src/models/json-ld-model/src/json-ld-model.js` - Bounded raw-text-safe serializer.
- `src/plugins/json-ld-plugin/package.json` - New published lifecycle plugin metadata.
- `src/plugins/json-ld-plugin/src/json-ld-plugin.js` - Owned head-script reconciliation.
- `test/plugins/json-ld-plugin.test.js` - Five DOM ownership/lifecycle tests.
- `test/pipeline/json-ld.test.js` - Four SSR, reparse, opt-out, and compatibility tests.
- `test/pipeline/wiring.test.js` - Extended DI drift coverage.

**Files Modified:**
- `feature-reviews/framework-architecture-review-2026-07-14.md` - Marked PR #46 done and this item in progress.
- `test/helpers/engine.js` - Registered/reset the injected plugin and added an explicit legacy switch.
**Tests Written:** Nineteen new behavior tests; the focused model/plugin/pipeline/wiring suite passes
22/22 including three pre-existing wiring checks.
**Issues Found (not yet fixed):**
- None. Independent review findings were fixed red-first and are recorded below.
**Design Decisions Made:**
- Deliver the feature as an opt-in `after.view` plugin backed by a separate serialization/policy model.
- Keep existing TSS methods, raw-text guards, schema/head components, and the external `.jsonld` link unchanged.
- Emit only a plain root object with an own non-empty string `@type`; add the schema.org context only in output when absent.
- Serialize strict bounded JSON data, omit framework/unknown `@` keys, and HTML-safely encode raw-text delimiters without mutating the model.
- Treat ordinary root keys as the host-curated public schema view model. Raw API/session/auth records
  must be projected before rendering; the framework does not maintain a stale ontology allowlist or
  guess which ordinary names are sensitive.

**Context for Next Session:**
Implementation and local review are complete on merged-`dev` base `e079924`: two additive packages,
19 new behavior tests, 22/22 focused tests, 498/498 repository tests, typecheck, package dry-runs,
Semgrep, source guards, production readiness, self-adversarial review, and the staged tech-debt
ratchet pass. External Claude review was unavailable and the maintainer explicitly directed a
self-only review. GitHub CI and a clean current-head Codex review remain delivery gates.

---

## Progress Log

### Research Mode
- [x] Identified involved modules
- [x] Mapped typed-model to render/head data flow
- [x] Cataloged existing patterns and constraints
- [x] Recorded open questions without proposing solutions

### Plan Mode
- [x] Wrote complete feature spec
- [x] Completed plan quality gate
- [x] Presented plan for approval

### Design Mode
- [x] Applied required architecture, security, and implementation constraints
- [x] Created threat model

### Implement Mode
- [x] Checkpoint 1: Scaffold
- [x] Checkpoint 2: Core logic
- [x] Checkpoint 3: Edge cases
- [x] Checkpoint 4: Integration

### Test Mode
- [x] Tests written red-first
- [x] Focused tests passing
- [x] Full suite and typecheck passing

### Review Mode
- [x] Applicable review skills pass
- [x] 100/100 code quality
- [x] Verification loop passes

### Documentation Mode
- [x] Architecture backlog updated
- [x] Package/root documentation updated
- [x] Completion evidence recorded

---

## Research Summary

### Current data and render flow

- `view-model.create()` stores the supplied model on `v.m`; child views either retain it or receive
  an explicitly scoped child value. The full-pipeline host passes the original root model again to
  the final `after.view` view.
- `handler.handle()` resolves TSS bindings against `v.m`. `get{d}` can supply fetched data to a child
  scope, but does not replace or enrich the original root model.
- `WebPage.default` renders `head.default` and `head.id` under `<head>`. `head.id` currently emits
  description/canonical metadata, an external `url + '.jsonld'` alternate link, translations, and
  robots/referrer metadata.
- The event lifecycle exposes `before/after` hooks for view, iteration, and method phases. Existing
  document-level asset effects use `after.view` plugins and receive the final DOM wrapper plus the
  root model.

### Existing script and escaping contracts

- `doc.script` uses the generic `rawcontent.tss` slot because script content serializes verbatim.
  That slot is explicitly author-trusted raw HTML and is not a safe data-binding path.
- `insert-method` intentionally rejects `t:` writes inside raw-text elements. Weakening that guard
  would violate the public fail-closed XSS contract locked by `test/pipeline/escaping.test.js`.
- No runtime package other than the UI-manifest policy model serializes arbitrary JSON. That model's
  canonical wire-format serializer is scoped to manifest integrity and is not a general shared sink.
- A local JSDOM characterization confirmed that assigning plain JSON containing `</script>` to a
  script and serializing the document creates a live sibling on reparse. Encoding the less-than
  character as a JSON Unicode escape kept one script, created no sibling, and round-tripped to the
  original model value.

### Published-package and host constraints

- Runtime source remains CommonJS, dependency-free, and import-free; collaborators are host-injected.
- Each model/method/plugin directory is an independently published package. Plugin dependencies are
  metadata only and do not create runtime `require()` edges.
- The repository has no runtime umbrella/bootstrap. `test/helpers/engine.js` is the local production
  DI mirror and is where an added lifecycle unit would be exercised end to end.
- Existing released exports and the external JSON-LD alternate-link behavior are public compatibility
  surfaces and cannot be silently removed.

### External format baseline

- Google currently recommends JSON-LD and accepts it in an `application/ld+json` script in either
  `<head>` or `<body>`, including SSR output and dynamically injected DOM content.
- W3C JSON-LD 1.1 defines the same script data block and warns that embedded content must avoid HTML
  comment/script delimiter sequences.
- JSON-LD needs context information to interpret compact schema.org property/type names. Schema.org
  publishes its context at `https://schema.org` / the linked context document.
- Structured data must describe visible page content; emitting the same model that drives the rendered
  component preserves that existing correspondence, while rich-result eligibility remains type- and
  property-specific.

### Open questions carried into planning

- Is activation an explicit plugin/verb opt-in, or part of an existing page-head component contract?
- Does absence of `@context` skip emission, fail loudly, or materialize the schema.org context without
  mutating the caller's model?
- Which non-JSON values and serialization failures are rejected, omitted, or normalized?
- How are repeated live-document renders and pre-existing authored JSON-LD scripts handled?
- Is v1 limited to one root object with `@type`, or does it also accept arrays / `@graph` roots?
- Does the existing external `.jsonld` alternate link remain alongside inline data?

---

# Feature Spec: Inline JSON-LD from the typed root model

**Date:** 2026-07-15
**Author:** /root
**Status:** Approved

## Problem Statement

jTorm application authors already pass a schema.org-typed public view model to render visible SSR/SPA
content, but the rendered page exposes only semantic HTML, metadata, and an external `.jsonld`
alternate link. Crawlers therefore do not receive the same typed graph inline, and the framework's
"schema.org data drives UI and SEO" premise remains incomplete. The observable cost is that an
otherwise valid typed page needs separate host-specific structured-data generation, which can drift
from the model users actually see.

## Scope

### In Scope

- Add a dependency-free JSON-LD policy/serialization package that accepts a strict, bounded JSON
  root model and returns HTML-raw-text-safe JSON.
- Add an opt-in document lifecycle plugin that emits or updates exactly one framework-owned
  `<script type="application/ld+json">` in `<head>` after the visible view is rendered.
- Use the same original root model passed to the handler; do not expand fetched `@id` references or
  synthesize a second domain graph.
- Materialize `"@context":"https://schema.org"` in output when the root has no own `@context`, while
  preserving an explicit valid JSON context and never mutating the caller's object.
- Omit unknown `@`-prefixed keys at every level, including jTorm's `@meta`, `@config`, and
  `@template`; retain all JSON-LD 1.1 keywords and ordinary enumerable data properties.
- Support an established-model opt-out, `@meta.jsonLd: false`, so an opted-in host can suppress a
  page whose root view model is not safe to publish.
- Bound depth, value count, and UTF-8 output bytes; reject cyclic, accessor-backed, non-plain, or
  non-JSON values before touching the DOM.
- Preserve authored/unmarked JSON-LD blocks and the published external `.jsonld` alternate link.
- Cover SSR reparse safety, SPA/live-document idempotency and stale cleanup, immutability, limits,
  DI wiring, and unchanged legacy output when the plugin is not registered.
- Document package APIs, host wiring, public-data responsibility, CSP posture, limits, and rollback.

### Out of Scope (Non-Goals)

- A JSON-LD processor: no context fetching, expansion, compaction, schema.org validation, ontology
  lookup, rich-result type/property validation, or `@id` dereferencing.
- Root arrays, root `@graph` documents without an own string `@type`, or multi-root aggregation in v1.
- Inferring which arbitrary regular properties are sensitive or visible; hosts must supply a curated
  public view model or opt out before this explicitly installed plugin runs.
- Passing raw API responses, session objects, authorization records, or token responses directly to
  the renderer. Hosts must project those records into the public schema-shaped view model first.
- Removing or changing the existing external `.jsonld` link.
- Changing `insert-method`, `rawcontent.tss`, `doc.script`, the sanitizer seam, or any shipped
  schema/components UI descriptor.
- Adding executable JavaScript, CSP exceptions/nonces, runtime imports, third-party dependencies,
  a build step, handwritten TypeScript/declarations, network calls, persistence, or telemetry.
- Updating an out-of-repository production host; this repository supplies and verifies the DI
  contract that a host must register.

## Requirements

### Functional Requirements

1. `serialize(model)` returns `null` for a non-object root, a non-plain root, a missing/invalid own
   `@type`, or a root data-descriptor opt-out `@meta.jsonLd === false`; these cases are not JSON-LD
   emission requests. Eligibility/opt-out inspection never invokes an accessor.
2. An eligible root has an own, enumerable, non-empty string `@type`. Arrays and inherited/accessor
   `@type` values do not activate emission.
3. An absent own `@context` is represented as `https://schema.org` in the serialized document;
   an explicit JSON-valued `@context` is preserved.
4. The serializer accepts only null, booleans, finite numbers, strings, arrays without holes, and
   plain objects with enumerable data properties. Cycles, getters/setters, `undefined`, functions,
   symbols, BigInt, non-finite numbers, Dates, and class instances fail loudly with a path-aware
   JSON-LD error.
5. Apart from descriptor-only inspection of the root opt-out, unknown keys beginning with `@` are
   omitted recursively without reading their values. The complete JSON-LD 1.1 keyword set remains
   available.
6. The serializer enforces defaults aligned with the existing manifest policy model:
   `maxText = 1,048,576` UTF-8 bytes, `maxValues = 262,144`, and `maxDepth = 128`; hosts may lower
   the singleton fields once during bootstrap, never per request on the shared singleton.
7. Serialized string/key tokens encode `<`, `>`, `&`, U+2028, and U+2029 as JSON Unicode escape
   sequences. `JSON.parse()` must recover the original values, while serialized HTML reparsing must
   never turn `</script>`, `<script`, or HTML comment delimiters into markup.
8. Serialization is read-only and works with deeply frozen input; default-context materialization and
   metadata filtering occur only in the output.
9. The plugin serializes completely before DOM mutation, then owns scripts marked by the static
   `data-jtorm-json-ld` attribute. It moves/reuses the first owned script in `<head>`, removes extra
   owned copies, and leaves every unmarked authored script untouched.
10. A later ineligible/opted-out root removes all previously generated owned scripts so live SPA
    navigation cannot expose stale structured data.
11. An eligible serialization error leaves the DOM unchanged and rejects the render; malformed or
    partial structured data is never silently published.
12. The plugin registers only for `after.view`, between current weight-0 render effects and the
    weight-100 UI-cache save, and returns the same document wrapper.
13. Without host registration of the plugin, all framework output and lifecycle behavior remains
    byte-for-byte on the legacy path.

### Non-Functional Requirements

- **Performance:** O(values + output bytes) time, bounded recursion and allocation, one successful
  document query/update, no network access, and at most 1 MiB generated output by default.
- **Security:** treat the root model as untrusted for HTML; use a dedicated JSON/raw-text encoder and
  `textContent`, never `innerHTML` or the generic raw `h:` sink; mutate the DOM only after validation.
- **Privacy:** plugin installation is explicit, `@meta.jsonLd: false` is a per-model kill switch, and
  documentation must state that every retained ordinary field becomes public page source. Unknown
  framework `@` namespaces are always removed recursively, including `@meta` values containing
  private controls.
- **Compatibility:** pure CommonJS singleton packages, zero `require()` in runtime `src/`, DI-only
  collaboration, no changes to released exports/components/method semantics.
- **Maintainability:** keep the recursive policy behind small `plain`/eligibility/key/path/encode/
  safe-output helpers; each function stays under 50 lines, nesting at or below four, and policy
  constants live on the singleton rather than inline in control flow.
- **Isomorphism:** identical payload semantics in detached SSR documents and live browser documents;
  generated blocks remain data-only and require no executable script/CSP relaxation.
- **Accessibility:** non-visual metadata only; no focus, semantics, ARIA, or interaction changes.

## Affected Components

| Component | Change Type | Risk |
|-----------|-------------|------|
| `src/models/json-ld-model/` | New published serialization/policy package (`1.0.0`) | High |
| `src/plugins/json-ld-plugin/` | New published `after.view` DOM integration package (`1.0.0`) | High |
| `test/models/json-ld-model.test.js` | New policy, limits, immutability, and encoding tests | Low |
| `test/plugins/json-ld-plugin.test.js` | New lifecycle/idempotency/atomicity tests | Low |
| `test/pipeline/json-ld.test.js` | New SSR/SPA pipeline and breakout regression tests | Low |
| `test/helpers/engine.js` | Inject/register new model + plugin in the production-mirror harness | Medium |
| `test/pipeline/wiring.test.js` | Extend DI-drift assertions for the plugin/model | Low |
| `README.md` + new package READMEs | Public behavior, wiring, limits, privacy, rollback docs | Low |
| `feature-reviews/*.md` | Checkpoints and architecture backlog status | Low |

No change is planned for `head-id.tss`, `web-page-default.tss`, `doc.script`, `rawcontent.tss`,
`insert-method`, the UI mapper graph, or `@jtorm/types`.

## Dependencies

- [x] Depends on the existing `event-model` `after.view` lifecycle and DOM wrapper contract.
- [x] Plugin package metadata declares `@jtorm/json-ld-model@^1.0.0`; runtime collaboration remains DI.
- [x] Plugin metadata declares `@jtorm/types@^1.1.0` for its existing `ViewModel` JSDoc import;
  the model has no collaborator/dependency and validates `*` at its public boundary.
- [x] External format contract: W3C [JSON-LD 1.1 embedded data blocks](https://www.w3.org/TR/json-ld11/#embedding-json-ld-in-html-documents)
  and Google [structured-data format guidance](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).
- [x] Blocks no existing backlog item; establishes a safe serializer seam future graph/multi-root work can extend.
- [x] Adds no service, database, queue, dependency install, or network dependency.

## Public Package/API Contract

No HTTP endpoint or request/response schema changes.

```js
// @jtorm/json-ld-model (runtime source contains no imports)
const { jTormJsonLdModel } = require('@jtorm/json-ld-model');

jTormJsonLdModel.context;   // 'https://schema.org'
jTormJsonLdModel.maxText;   // 1048576 UTF-8 output bytes
jTormJsonLdModel.maxValues; // 262144 visited JSON values
jTormJsonLdModel.maxDepth;  // 128 containers below the root
jTormJsonLdModel.serialize(model); // string | null; throws on eligible invalid input

// Shared singleton policy is configured once during host bootstrap, not per request.

// @jtorm/json-ld-plugin (host wiring)
const { jTormJsonLdPlugin } = require('@jtorm/json-ld-plugin');
jTormJsonLdPlugin.jsonLdModel = jTormJsonLdModel; // DI
eventModel.plugins = [...eventModel.plugins, jTormJsonLdPlugin];
eventModel.init();
```

The plugin reserves `data-jtorm-json-ld` as its ownership marker. Unmarked
`<script type="application/ld+json">` elements are never altered. A missing injected model is a host
wiring error and fails loudly when the plugin runs.

## Security Assessment and Threat Model

### Assets and trust boundary

- **Assets:** document executable integrity, structured-data integrity, confidentiality of non-public
  model fields, render availability, and caller-owned model immutability.
- **Actors:** a malicious content author seeking XSS or search-identity manipulation; an accidental
  host integrator misclassifying a domain/session record as public; and a browser/crawler passively
  reparsing SSR output.
- **Data flow:** host-curated root `v.m` -> injected JSON-LD policy model -> bounded JSON/raw-text
  encoding -> plugin-owned DOM data block -> SSR HTML or live DOM -> browser/crawler.
- **New trust boundary:** application-controlled model values cross into an HTML raw-text element.
  The dedicated encoder is the policy enforcement point; the plugin is only the DOM owner.

### Data-flow diagram and sensitivity

```text
[Host root v.m: PUBLIC view data; possibly misclassified confidential data]
                 |
                 | untrusted for HTML
                 v
[JSON-LD model: eligibility -> filter -> strict bounds -> raw-text encoding]
       | null                         | error
       v                              v
[plugin removes stale marker]   [render rejects; DOM unchanged]
                 |
                 | PUBLIC HTML-safe JSON
                 v
[after.view plugin -> owned <head> data block -> SSR/live DOM -> browser/crawler]
```

Sensitivity is intended to remain **public -> public**. A host passing confidential/restricted
ordinary fields is a boundary-contract violation captured as the explicit residual disclosure risk.
There is no fallback to raw output, external fetch, log payload, storage, or partial DOM mutation.

### STRIDE analysis

| Category | Attack scenario | Required control | Verification |
|----------|-----------------|------------------|--------------|
| Spoofing | Attacker-controlled `@type`, name, URL, or identity claims impersonate another entity in search metadata. | Emit only the same host-curated root used for visible UI; do no remote expansion; document that content truth/authorization remains a host boundary. | Pipeline test proves one root reference drives visible render and parsed JSON-LD; docs state residual content-authenticity responsibility. |
| Tampering | `</script>`, `<script`, or comment delimiters terminate/reshape the data block; repeated SPA renders leave duplicate/stale blocks. | JSON Unicode-escape raw-text delimiters; static attributes; serialize before mutation; marker-based replace/dedupe/remove; preserve authored blocks. | SSR serialize/reparse witness tests plus plugin repeat/stale/authored-block tests. |
| Repudiation | A host cannot explain which input produced crawler-visible metadata. | Deterministic same-input serialization contract, stable marker, path-aware errors, and no hidden network/fetch/enrichment step. | Unit golden/round-trip tests and documented one-way data-flow map; no PII logging is introduced. |
| Information Disclosure | Unused secret/PII fields on the root model become public page source. | Feature is opt-in at host wiring; unknown framework `@` metadata is omitted; per-model `@meta.jsonLd:false` kill switch; package docs require a curated public view model. | Tests omit `@meta/@config/@template` recursively and honor opt-out; README contains explicit public-data warning. Residual ordinary-field classification remains host-owned. |
| Denial of Service | Cyclic, extremely deep/wide, huge-string, accessor, or exotic values consume CPU/memory or repeatedly fail rendering. | Strict data-only values; no accessor invocation; cycle/path checks; depth/value/UTF-8 byte caps; fail before DOM mutation. | Unit tests for every rejection class and each configurable limit; performance remains bounded by documented caps. |
| Elevation of Privilege | Model text becomes executable script/HTML or gains access through a sanitizer/CSP exception. | Non-executable MIME type, static attributes, `textContent`, dedicated encoder, no `innerHTML`/raw `h:`/sanitizer path, no nonce or CSP relaxation. | Reparse test demonstrates no sibling node/executable markup; source ratchet/search verifies no raw DOM sink or runtime import. |

### Attack tree

```text
Compromise inline structured-data emission
OR
├─ Execute markup/script via data value
│  └─ Supply an HTML parser delimiter -> blocked by JSON Unicode raw-text encoding
├─ Publish stale or attacker-shaped graph
│  ├─ Duplicate generated blocks -> blocked by marker dedupe
│  ├─ Navigate to untyped page -> blocked by stale removal
│  └─ Supply false public claims -> host content authorization (residual)
├─ Disclose private model data
│  ├─ Smuggle framework metadata -> blocked by unknown-@ filtering
│  └─ Put secret in ordinary field -> public-view contract / opt-out (residual)
└─ Exhaust the renderer
   ├─ Cycle or exotic object -> strict rejection
   ├─ Deep/wide graph -> depth/value limits
   └─ Huge text/output -> UTF-8 byte limit
```

### Residual risk requiring approval

The framework cannot infer whether an ordinary schema.org-named field is authorized, visible, or
sensitive. Installing the plugin asserts that the root is a public presentation model; a host that
passes a broader domain/session record can disclose it. This risk is mitigated by opt-in wiring,
framework-metadata filtering, a per-model kill switch, and explicit documentation, but final field
classification remains the consuming host's responsibility.

Re-evaluate this threat model before changing the feature to default host registration, accepting
domain/session records, emitting multiple roots or fetched expansions, raising/removing bounds,
using executable script types, or adding any network/storage path.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Raw-text breakout creates SSR XSS | Medium without controls | Critical | Unicode-escape all HTML delimiter characters; `textContent`; reparse witness test |
| Public HTML discloses unused model fields | Medium | High | Opt-in package, public-view contract, internal-key filter, per-model opt-out, explicit residual-risk approval |
| Large/cyclic/exotic input degrades or crashes render | Medium | High | Strict plain JSON, no getters, cycle detection, three configurable caps, atomic failure |
| Invalid context/claims produce misleading or ineligible rich results | Medium | Medium | Default schema.org context, preserve explicit context, same-root/no-enrichment contract, host validation responsibility |
| Live navigation leaves stale/duplicate JSON-LD | Medium | Medium | One reserved marker, document-wide dedupe/update/removal tests |
| New feature breaks existing UI/head consumers | Low | High | New opt-in packages; no existing TSS/method/export behavior changed; legacy-unwired test |

## Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|----------|------------------------|--------------|
| Opt-in `after.view` plugin | Add a TSS verb and call it from `head.id`; embed logic in schema/components UI | The lifecycle already owns document-wide side effects and receives the original final root. New TSS would make an existing published UI package depend on host registration of an unknown verb and could break upgraded consumers. |
| Separate policy model + thin plugin | One plugin containing validation/serialization/DOM code; reuse manifest serializer | It keeps the raw-text trust policy independently testable and DI-replaceable while the plugin owns only lifecycle/DOM state. Manifest canonicalization has a different wire-integrity responsibility. |
| Dedicated strict encoder | Plain `JSON.stringify`; generic raw `h:` or sanitizer; relax `t:` raw-text guard | Plain output is exploitable on SSR reparse, HTML sanitizers can corrupt JSON, and weakening `t:` violates a locked fail-closed contract. |
| Default schema.org context only when absent | Require callers to add `@context`; always overwrite; wrap in a new `@graph` | Existing typed view models omit context, overwriting violates caller intent, and graph wrapping expands v1 scope. Output-only defaulting preserves input and makes compact schema terms meaningful. |
| Omit unknown `@` keys recursively | Serialize everything; hard-code only `@meta/@config/@template`; reject unknown keys | JSON-LD reserves `@` keywords, and generic filtering covers current/future framework controls without leaking or failing on them. Ordinary keys remain untouched. |
| Public view-model contract instead of a bundled schema.org property allowlist | Ship and version a complete ontology registry; silently drop unknown ordinary keys; require a duplicate JSON-LD projection | A hard-coded registry becomes stale, blocks legitimate extensions/custom contexts, and still cannot determine whether valid schema.org properties such as email are authorized for publication. jTorm's existing contract keeps schema data in ordinary keys and framework controls under `@` namespaces, so hosts must project raw transport/domain records at that boundary. |
| Strict JSON-only values with loud bounded failure | JSON.stringify's silent omission/coercion; silently skip invalid eligible roots | Silent coercion can make crawler data diverge from the visible model. Explicit, path-aware failure is auditable, and limits bound the new traversal. |
| Reserved marker with replace/remove | Append on every render; overwrite all JSON-LD scripts; use a fixed `id` | The marker gives narrow ownership, preserves authored blocks, prevents stale SPA data, and avoids collisions with public fragment IDs. |
| Keep the external alternate link | Remove it once inline output exists | It is a published compatibility surface and may serve non-crawler consumers; the additive plugin does not need to disturb it. |
| Single typed object in v1 | Arrays, untyped `@graph`, fetched-reference expansion | Matches the framework's current `@type` component dispatch and bounds semantics. Later aggregation can build on the model without changing the plugin. |

## Blast Radius

| Dimension | Answer |
|-----------|--------|
| Direct dependencies | Native JSON/string/DOM primitives, `TextEncoder`, the injected JSON-LD model, and event-model's `after.view`; no DB/API/queue/cache/network dependency |
| Direct dependents | Hosts that explicitly register the new plugin; their SSR HTML/live DOM and crawlers consuming the generated block |
| Cascade on outage | An eligible invalid model rejects that one render before DOM mutation; unregistered hosts, untyped/opted-out models, existing UI methods, and authored JSON-LD remain unaffected |
| Cascade on slow | The render's `after.view` latency increases linearly until the fixed depth/value/1 MiB caps reject; no queue or shared resource backs up inside this library |
| Cascade on bad data | Only the generated data block and crawler interpretation are affected; visible DOM rendering uses the original existing path. False ordinary claims can reach crawlers, while parser delimiters cannot become markup |
| Compromised-session impact | No session/store is accessed. An attacker who can already control the public root can alter that page's structured-data claims, but cannot execute code through the block; broader secret fields are exposed only if the host violates the public-view contract |
| Fault isolation boundary | Synchronous model serialization in one render, completed before one document mutation; no persistence. Removing the plugin registration restores the exact legacy path |

## Rollback Plan

| Item | Answer |
|------|--------|
| Code rollback | Remove `jTormJsonLdPlugin` from `eventModel.plugins` (immediate host kill switch) or revert the additive packages/harness wiring |
| Schema rollback | None; no database or wire-schema migration |
| Data rollback | None; generated DOM is ephemeral and caller models are never mutated |
| Auto-rollback trigger | Publication is blocked by any focused/full/typecheck/security-ratchet failure. This repo has no deployment telemetry; consuming hosts should disable registration if JSON-LD-tagged render errors exceed 0.5% for 5 minutes |
| Manual rollback runbook | New plugin README section: unregister plugin, remove its DI assignment/package, restart host workers, verify no `data-jtorm-json-ld` marker while legacy head links remain |
| Last rollback drill | Library feature not yet deployed; implementation tests will characterize that an unregistered event model emits no owned block and preserves legacy output |

## Open Questions

None. Research choices are resolved above; changes require a plan amendment before implementation.

## Success Criteria

- [x] A frozen typed root produces exactly one owned head script whose parsed JSON equals the public
  root plus default context and minus unknown `@` metadata; explicit context remains unchanged.
- [x] `</script><img ...>`, script/comment delimiters, ampersands, and U+2028/U+2029 round-trip as
  data, and reparsing the full SSR HTML creates no attacker-controlled node.
- [x] Missing/invalid type and `@meta.jsonLd:false` emit nothing and remove stale owned blocks on a
  repeated live-document lifecycle; authored JSON-LD blocks remain byte-for-byte intact.
- [x] Cycles, accessors, non-JSON values, and depth/value/byte overruns fail with path-aware errors
  before DOM mutation; frozen models remain unchanged.
- [x] The production-mirror harness proves injected model/plugin identity and event ordering, while
  an unregistered characterization preserves the legacy path.
- [x] The existing external `.jsonld` link test remains green without modification to its component.
- [x] New runtime source contains zero `require()` calls and adds zero third-party dependencies.
- [x] Focused tests, full `npm test`, `npm run typecheck`, tech-debt/source ratchets, and applicable
  security/architecture reviews all pass.
- [x] Package and root documentation state the public-data/residual-risk contract, limits, wiring,
  marker ownership, CSP behavior, and rollback steps.

## Implementation Sequence (after approval)

1. Add failing model tests for eligibility/default context/filtering/strict values/limits,
   immutability, and raw-text-safe round trips; confirm the missing package is red.
2. Scaffold `@jtorm/json-ld-model@1.0.0`, implement the bounded serializer, and make model tests green.
3. Add failing plugin tests for DI/event registration, atomic insertion, marker reuse/dedupe/removal,
   authored-script preservation, and error atomicity; implement `@jtorm/json-ld-plugin@1.0.0`.
4. Add failing pipeline tests, then inject/register the model/plugin in `test/helpers/engine.js` and
   extend the wiring drift guard.
5. Run focused tests and inspect serialized/reparsed SSR plus live DOM behavior; fix edge cases without
   weakening limits or raw-text encoding.
6. Write package/root docs, update the feature checkpoint/backlog, and run the full verification and
   review gates.

## Approval

- [x] Requirements clear
- [x] Scope defined
- [x] Risks accepted

**Approved by:** maintainer
**Date:** 2026-07-15

---

## Plan Quality Gate

**Scope tags:** SECURITY
**Gate status:** PASSED
**Selected personas:** security-architect, threat-modeling-enforcer, code-review-enforcer
**New trust boundary:** public root model -> inline HTML raw-text data block

### Threat Model Deep Dive Triage

**Decision:** STRIDE_SUFFICIENT
**Flow:** Typed root model to inline JSON-LD data block
**Reason:** The change introduces one local source-to-sink boundary but no auth, payment, PII-by-
contract, external service, persistence, or multi-step workflow. The data is public presentation data,
the sink is non-executable, traversal is bounded, and the full six-category STRIDE model above covers
the attack surface. PASTA would not add proportionate assurance.
**Scope:** serializer policy, plugin DOM ownership, SSR serialization/reparse, and live stale-state cleanup.
**Out of scope:** host content authorization/data classification, crawler ranking policy, and any
out-of-repository deployment pipeline.

### Persona Reviews

- **security-architect — APPROVE WITH EXPLICIT RESIDUAL-RISK ACCEPTANCE.** The model/plugin boundary,
  context-specific encoding, atomic DOM write, bounded traversal, public-data contract, opt-out,
  CSP-neutral data block, and tests form defense in depth. The maintainer must accept that regular
  field classification remains host-owned before implementation begins.
- **threat-modeling-enforcer — APPROVE PLAN.** The linked threat model precedes code, classifies assets
  and actors, maps the trust/error paths, covers all six STRIDE categories, supplies an attack tree,
  maps controls to tests, and names re-evaluation triggers. Phase-1 deep-dive triage found no PASTA-
  level multi-step/high-value flow.
- **code-review-enforcer — APPROVE PLAN.** The two new packages have single responsibilities and a
  narrow DI interface; no stable package is made dependent on a new verb. The plan uses pure JS/JSDoc,
  named limits, helper-level complexity caps, explicit errors, red-first tests, and zero new imports
  or dependencies. Generic TypeScript/Elysia/DomainError rules are N/A and do not override this
  repository's pure-JS locked contract.

### Authoritative Checklist Disposition

- **Relevant security topics — PASS at plan level:** `security/threat-modeling`,
  `security/injection`, the public-field minimization item in `security/secrets-handling`, resource
  exhaustion items in `security/rate-limiting-and-abuse`, and no-new-dependency items in
  `security/dependency-security`. `security/security-headers` is host-owned; this change adds no
  executable script or CSP relaxation.
- **Security topics fully evaluated and N/A:** authentication, authorization, zero-trust architecture,
  crypto, SSRF/external requests, API asset management, audit-trail integrity, mobile, queues, AI/LLM,
  anomaly detection, Supabase RLS, and secrets rotation. The plan adds no corresponding endpoint,
  identity, secret, crypto, network, database, mobile, queue, model, or monitoring surface.
- **Relevant engineering topics — PASS at plan level:** package SRP/DIP/minimal public surface in
  `engineering/domain-architecture`; context-specific safe serialization and human verification in
  `engineering/code-quality-review`; pure-JS strict/JSDoc boundaries in `engineering/type-safety`;
  function/nesting/module-depth limits in `engineering/complexity-maintainability`; atomic failure
  propagation in `engineering/error-taxonomy`; and bounded synchronous traversal plus startup-only
  singleton configuration in `engineering/runtime-safety`.

### Issues Found and Resolved During Gate

1. Added an explicit DFD with sensitivity transitions, null/error paths, and no-raw-fallback statement.
2. Made mutable singleton limits bootstrap-only to avoid cross-request policy races.
3. Specified descriptor-only `@meta.jsonLd` inspection so the opt-out cannot invoke attacker getters.
4. Replaced optional package metadata language with exact plugin/type dependencies and a dependency-
   free model contract.
5. Added concrete helper/function/nesting constraints so the recursive serializer remains reviewable.

### Pre-Review Score

| Dimension | Score | Plan evidence |
|-----------|-------|---------------|
| Architecture | 10/10 | Dedicated policy model + thin lifecycle plugin; DI-only; no TSS/method responsibility regression |
| Consistency | 10/10 | CommonJS singleton/package/event patterns and existing manifest-limit conventions |
| Type Safety | 10/10 | Pure JS strict mode, existing `ViewModel` JSDoc, runtime narrowing at `*` boundary, no handwritten types |
| Validation | 10/10 | Own/data descriptor activation, strict JSON grammar, keyword filter, cycle/path/three-limit checks |
| Error Handling | 10/10 | Path-aware loud failures, no catch/swallow, full serialization before atomic DOM mutation |
| Security/Privacy | 10/10 | Full STRIDE + attack tree, context encoder, public-data boundary, opt-out, residual-risk checkpoint |
| Performance | 10/10 | Linear traversal, running text/value/depth limits, exact final UTF-8 cap, one DOM reconciliation |
| Maintainability | 10/10 | Two SRP modules, narrow API, named constants, helper/function/nesting bounds, no duplication with unrelated manifest policy |
| Testability | 10/10 | Red-first unit/plugin/pipeline strategy; every STRIDE control maps to a named test class |
| Readability | 10/10 | Path-aware terminology, explicit marker/ownership semantics, terse helpers with rationale comments only |

**STRIDE status:** Complete (6/6 categories, controls and verification mapped)
**Threat deep-dive status:** Enforcer triage complete; `STRIDE_SUFFICIENT`
**Issues found and resolved:** 5
**Gate result:** Implementation-ready after maintainer approval and residual-risk acceptance

---

## Post-Implementation Review

**Verdict:** APPROVED — no unresolved findings

### Architecture boundary audit

1. **Trust boundary:** the explicitly public root `v.m` crosses into an HTML raw-text JSON data
   block through the injected serializer; the plugin owns only DOM reconciliation.
2. **Input validation:** root eligibility and recursive values use own data descriptors, strict plain
   JSON shapes, accessor rejection, cycle detection, and text/value/depth limits.
3. **Secrets:** no secret is introduced or read. Every retained ordinary property is intentionally
   public page source; raw API/session/auth records must be projected, and auth material stays in
   transport headers rather than the rendered body.
4. **Dependencies:** two additive first-party packages, zero third-party runtime dependencies, zero
   runtime imports, and DI-only collaboration.
5. **Data lifecycle:** no collection, persistence, retention, erasure, or telemetry change; the output
   is an ephemeral public copy for the current page/render.
6. **External endpoints:** none; the serializer performs no context fetch or network request.
7. **Logging:** none. Errors contain structural paths, not data values.
8. **Blast radius:** one synchronous render and one owned document marker, bounded by 1 MiB,
   262,144 visited values, and depth 128; unregistering the plugin restores the prior path.

### Review findings

| Severity | CWE | Finding | Resolution |
|----------|-----|---------|------------|
| High | CWE-400 | Oversized strings/keys and filtered metadata could consume work before all structural limits applied. | **FIXED red-first:** strings and keys are bounded before tokenization, object traversal avoids eager key arrays, and filtered `@` keys consume the value budget. |
| Medium | CWE-200 | Package/root docs did not yet make the public-data classification and host wiring responsibility explicit enough. | **FIXED:** docs now require projection of raw API/session/auth records, keep auth in headers, explain opt-in/opt-out, and enumerate limits/ownership/CSP/rollback behavior. |
| Low | CWE-459 | Patch-tool `.orig` artifacts remained in the working tree. | **FIXED:** all generated backup artifacts were removed. |

### Privacy disposition

- Intended classification is **PUBLIC view data -> PUBLIC page source**. Any confidential ordinary
  field is a host-side misclassification; this residual risk was explicitly accepted by the
  maintainer when approving the feature.
- Unknown `@` namespaces, including all `@meta` contents, are filtered recursively; the plugin is
  opt-in and `@meta.jsonLd:false` is a per-model kill switch.
- No logging, persistence, analytics, moderation, retention, erasure, audit-trail, or lawful-basis
  behavior changes. Package docs assign data minimization and projection to the consuming host.

### Performance evidence

The bounded synchronous serializer was measured on this branch:

| Fixture | Output | Runs | p50 | p95 | p99 |
|---------|--------|------|-----|-----|-----|
| 1,000 ordinary properties | 80,939 bytes | 200 | 1.418 ms | 1.787 ms | 1.987 ms |
| Near-limit string | 900,049 bytes | 30 | 2.960 ms | 4.451 ms | 5.275 ms |

### Production-readiness disposition

| Category | Result | Evidence |
|----------|--------|----------|
| Data scale | PASS | Linear synchronous traversal is capped at 1 MiB UTF-8 output, 262,144 values, and depth 128; near-limit p99 is 5.275 ms. |
| Resilience | PASS | Serialization completes before DOM mutation; errors stay loud; unregistering the plugin or using the per-model kill switch restores/removes output. |
| Security surface | PASS | Dedicated raw-text encoding, `textContent`, non-executable MIME, descriptor validation, recursive metadata filtering, and no network/dependency/secret path. |
| User experience | PASS / N/A | The emitted block is nonvisual and noninteractive; visible content, focus, accessibility semantics, and event input do not change. |
| Observability | PASS / N/A | This library adds no service, endpoint, persistence, or logging; structural errors contain paths but not model values, and hosts retain render-error monitoring. |
| Production-only failures | PASS | Detached SSR, HTML reparse, live DOM reuse/removal, Unicode, UTF-8 limits, repeated lifecycle, and rollback paths are covered. |
| Deploy gates | PASS | Additive packages only; both publication dry-runs, syntax/source guards, Semgrep, typecheck, 22 focused tests, 498 full tests, and the staged tech-debt ratchet pass. |

Auth, authorization, database, queue, external-service, audit-log, anomaly-detection, incident-response,
Cloudflare Worker, email, financial, and WCAG interaction controls are N/A because the diff adds none
of those surfaces. The applicable dependency audit passes: the model has no dependencies and the
plugin declares only first-party DI/type metadata.

### Final quality score

| Dimension | Score |
|-----------|-------|
| Architecture | 10/10 |
| Consistency | 10/10 |
| Type Safety | 10/10 |
| Validation | 10/10 |
| Error Handling | 10/10 |
| Security/Privacy | 10/10 |
| Performance | 10/10 |
| Maintainability | 10/10 |
| Testability | 10/10 |
| Readability | 10/10 |
| **Total** | **100/100** |
