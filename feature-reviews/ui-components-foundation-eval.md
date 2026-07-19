# UI Components Foundation — Evaluation

**Branch:** feat/ui-components-foundation
**Base:** dev at 9ee8cc850224041498282a893eca7451dde8364b
**Integrated base:** dev at 83c5ef6c788893367903d207637e624d75a6dba8
**Date:** 2026-07-19
**Status:** PASS locally; direct-model correction and source-ratchet hardening complete
**Specification:** ui-components-foundation-spec.md
**Threat model:** stride-ui-components-foundation.md
**Workflow:** ui-components-foundation.md

## Scope and outcome

The components-ui package now exposes fourteen canonical variants across button, badge, alert,
card, accordion, and loading families. Their fallback output is dependency-free semantic HTML,
with native button and disclosure behavior, escaped caller-visible text, explicit root attributes,
guarded card links, localized loading copy, stable intent hooks, and no CSS or client behavior.

Existing mapper keys and the four legacy button and anchor recipes remain. The published package
advances from 0.0.6 to 0.1.0 because badge and loading intentionally change markup while the new
canonical API is added. A narrow each-method patch advances 1.0.4 to 1.0.5 and makes array
iteration visit only canonical own enumerable indices, preserving sparse order while ignoring
prototype and named properties.

Each canonical fallback now separates a literal-only, package-versioned static shell from its
per-render binding layer. The existing scoped UI fragment cache may reuse only shell bytes; caller
and localized values are applied after every cold or warm shell creation.

A red-first if-method patch advances 1.0.5 to 1.0.6 so a bare type gate treats a null current model
as a false condition instead of entering compound-binding parsing without a `d:` expression.

Framework adapters, visual tokens, behavior-heavy widgets, rich HTML slots, event wiring, and
business actions remain separate work. Hosts still own authorization, confirmation, audit, undo,
truthful copy, meaningful non-whitespace names, and attacker-influenced collection limits.

## Defect and red-first evidence

The initial component contracts failed before mapper and artifact implementation. Review then
found and proved these material defects before their fixes:

- variant overlays could restyle pre-existing matching descendants;
- top-level arrays could multiply single-component output;
- object-like enum values could pass through string coercion;
- card title and action text could run together without a summary;
- loading claimed a permanent busy lifecycle and accepted malformed caller labels;
- direct accordion.item composition replaced existing target content;
- the raw-HTML source guard missed parameter and comment-interleaved syntax;
- each-method rendered inherited and named enumerable array properties;
- a null top-level model reached if-method compound-binding parsing without a `d:` expression and
  aborted the whole render;
- canonical components created no reusable shell entry before the two-phase design.
- WebPage.default's legacy whole-loading cache captured the first caller's label and root attributes even though loading.default's nested shell cache was data-free.

The final each regression characterizes sparse indices 2 and 5, ascending render order, and existing
public index values. The null regression covers the if-method owner plus every canonical component
entry point. A red 1/19 focused run proves the cache gap before all seven static shell identities
were added. A later red same-tenant WebPage run returned the first loading label, ID, and class on
the second render; removing the enclosing schema-ui cache made it green. All accepted findings now
have focused green evidence.

## Ownership and data flow

| Concern | Owner after this change |
|---|---|
| Canonical names and trusted descriptors | components-ui mapper |
| Invariant semantic shell structure | private components-ui *-shell.tss plus existing html-ui leaves |
| Model validation and direct approved-field binding | canonical components-ui binding TSS |
| Framework fallback, aliases, descriptor cache, and asset expansion | unchanged ui-resolver-model |
| Rendered shell reuse, scope, TTL, persistence, and invalidation | unchanged ui-cache-model/plugin and handler-wrapper lifecycle |
| WebPage loading composition | schema-ui 0.1.2 ordinary append; components-ui private loading shell owns reuse |
| Descriptor compilation | unchanged ui-compiler-model |
| Artifact loading and URL policy | unchanged get, manifest, and request owners |
| Escaped visible text | unchanged insert text path |
| Attribute and href policy | unchanged attr-method |
| Collection traversal | each-method, now canonical own enumerable indices only |
| Type-gate null handling | if-method, now compound-parsing only when a `d:` expression exists |
| Visual conformance and behavior | future adapters and the host |
| Authorization, execution, audit, and undo | host application |

The live flow is host model to ui lifecycle to resolver/compiler to required-field gates, then a
private shell append. On a scoped miss the handler-wrapper builds literal native structure and
ui-cache-model publishes it only after successful completion; on a hit it restores the same bytes
into a fresh detached fragment. The binding TSS then applies only the current model through escaped
text and guarded attributes before DOM/SSR insertion.

There is no database, endpoint, analytics, secret, queue, timer, or external service branch. Optional persistence remains the existing UI-cache adapter and receives only static canonical shell bytes.
The mapper is the sole feature entry point. Endpoint/action authorization, transaction, database,
queue, event side effect, and external-service junctions are N/A; the only state junction is the
existing fragment cache, whose miss/hit/disabled/unscoped paths are exercised directly.

## Architecture and compatibility review

- Pure CommonJS singleton metadata and dependency-injected runtime ownership remain intact.
- No source import, runtime dependency, handwritten TypeScript, CSS, JavaScript asset, or DI action
  was added.
- Resolver, compiler, request, manifest, handler, regex, text, and attribute policy ownership did
  not move into components-ui.
- Resolver descriptor caching and UI fragment caching remain separate owners; components-ui supplies
  only versioned cid/default coordinates to the existing lifecycle.
- Every shell parameter is literal, every binding owner references exactly one shell, and all
  caller/localized values are applied after the cached iteration.
- No composition owner may cache the completed binding layer; schema-ui's WebPage loading path now
  delegates reuse exclusively to the versioned literal shell.
- Every canonical descriptor points to one public wrapper. Button and alert wrappers reject invalid
  whole models, inject trusted intent and role data, then fetch their shared structural base.
- html-ui leaves always receive automatic global transforms disabled; component TSS writes only
  documented attributes.
- The each patch preserves non-array wrapping, sparse arrays, numeric-key order, alias scopes,
  published string index values, and the existing dispatch seam.
- The if patch preserves compound `||`/`&&` expressions and ordinary type/else behavior while a
  missing `d:` expression can no longer enter compound-binding parsing.
- All prior package exports, mapper keys, legacy recipes, and singleton identities remain.

**Architecture verdict:** PASS.

## Frontend, accessibility, and ethical UX review

- Buttons are native, named, and type button by default. Primary and destructive prominence must
  be selected explicitly; the default remains neutral.
- Accordion uses independent native details and summary controls and permits multiple open items.
- Alerts are visibly named and use reviewed region, status, and alert roles without redundant
  explicit live-region attributes.
- Loading is visibly named, localizes only its built-in fallback, has a decorative hidden
  indicator, synthesizes no ID, and does not claim permanent aria-busy state.
- Cards remain named articles with an explicit normal action link rather than a whole-card click
  target. A literal separating space remains when the optional summary is absent.
- Badge is inert and non-live; numeric zero is preserved.
- Documentation forbids fabricated counts, urgency, authority, imbalanced consent, hidden terms,
  confirm-shaming, and treating visual intent as authorization.

The fallback is deliberately unstyled, so browser-level contrast, focus appearance, motion,
reflow, target size, and responsive-layout claims are not made. Those are mandatory adapter checks.
DOM and full-pipeline verification are proportionate for this semantic-only slice; browser visual
QA becomes applicable when a visual adapter or demo surface exists.

**Frontend and UX verdict:** PASS at the semantic foundation boundary.

## Security, privacy, and source-ratchet review

The focused STRIDE record covers all six categories. Caller text reaches only escaped text sinks.
Card href reaches the existing unsafe-scheme guard. Unknown attributes do not propagate. Canonical
wrappers reject top-level arrays, scalars, functions, and null. Accordion traversal ignores
inherited and named properties and remains linear in actual enumerable indexed items.

The source ratchet parses the complete canonical and statically referenced support closure and
rejects every h parameter in the AST, runtime CSS or JavaScript verb, DI instruction, framework
name, and pure data-method member copy rooted at source. Its closure equality check prevents
unreviewed support artifacts; focused fixtures cover parenthesized, block, comment-interleaved,
dot, bracket, whitespace, flattened-field, and whole-model syntax without rejecting derived
expressions or alias handoffs. Parser snapshot and frozen-oracle differential gates cover all 278
checked-in TSS files. The shell ratchet additionally rejects dynamic shell methods/parameters,
couples all seven cids to the components-ui package version, and locks the default structural
variant. The cold/warm pipeline regression proves cache bytes are sentinel-free and unchanged
while a second render binds different labels, IDs, state, and URLs.

There is no new PII, telemetry, cookie, consent, moderation, payment, authentication, or audit data.
The optional existing persistence adapter stores only trusted static shell HTML for canonical
components; visible caller values are absent from those entries and remain intentionally serialized
only into final DOM/SSR output. Hosts must not pass secrets as visible copy.

Semgrep ran 88 JavaScript and security rules over all three changed runtime JavaScript files with
full parse coverage and zero findings. Full and production-only dependency audits report zero
vulnerabilities. No suppression was added.

**Security and privacy verdict:** PASS.

## Production readiness

| Category | Status | Evidence |
|---|---|---|
| Data Scale | PASS | seven identities reuse the existing 512-entry LRU and five-minute TTL; accordion stays sparse-safe O(n); no query, asset, request, timer, or new buffer |
| Resilience | PASS | cold/warm output equivalence; disabled/unscoped cache renders cold; publication follows successful completion; invalid models omit while policy failures stay loud |
| Security Surface | PASS | literal-only cached shells, escaped copy, guarded URL, narrow attrs, no caller/localized value in cache; 88 Semgrep rules and both audits clean |
| User Experience | PASS | native semantics, localized loading fallback, neutral default action, explicit intent; visual styling, touch, contrast, motion, and browser CWV remain adapter-owned and are not claimed |
| Observability | PASS | no service, endpoint, action, external effect, or new resource needs a signal; host action/audit telemetry and existing cache operation remain with their owners |
| Production-Only Failure Modes | PASS | SSR and SPA use the same pipeline; cold and restored fragments bind fresh language/data; persisted bytes contain static structure only |
| Cloudflare + Database Deploy Gates | PASS (N/A surface) | no Worker, route, workflow, environment, database, schema, or migration change; versioned IDs expire or can be purged exactly |

Residual risks are bounded and assigned: host truthfulness, whitespace-only accessible names,
collection caps, adapter visual conformance, and host action authorization. No framework-addressable
High or Medium production risk remains locally.

## Batch 1: Framework-neutral UI primitives

**Date:** 2026-07-19
**Author:** Codex
**Status:** Complete

### Summary

Establish the small cross-framework semantic component contract on which later visual adapters can
depend, while preserving published recipes and the dependency-free isomorphic architecture.

### Changes

#### Added

- fourteen canonical component variants and shared button and alert bases;
- seven private literal-only semantic shell artifacts with package-versioned UI-cache identities;
- card and native accordion artifacts;
- public API, accessibility, ethical UX, adapter, migration, and rollback documentation;
- full-pipeline, mapper, artifact, parser, security, and collection-boundary tests.

#### Modified

- hardened badge and loading defaults;
- removed schema-ui's stale whole-loading parent cache and patch-bumped it to 0.1.2;
- components-ui mapper identity and package version;
- each-method array enumeration and patch version;
- if-method null/type-gate handling and patch version;
- deterministic TSS, manifest, escaping, regex, and output ratchets.

#### Removed

- no package, export, mapper key, runtime capability, or persistent resource.

### Key files

| File | Change type | Description |
|---|---|---|
| src/uis/components-ui/src/components-ui.js | Modified | canonical registry while preserving existing keys |
| src/uis/components-ui/src/button and alert | Added | public wrappers plus shared semantic bases |
| src/uis/components-ui/src/*/*-shell.tss | Added | seven invariant semantic shells cached before data binding |
| src/uis/components-ui/src/card and accordion | Added | semantic static compositions |
| src/uis/components-ui/src/badge and loading | Modified | safe hardened defaults |
| src/uis/schema-ui/src/web-page/web-page-default.tss | Modified | loading composition outside the legacy parent cache |
| src/uis/schema-ui/package.json | Modified | 0.1.2 patch release for the cache-isolation fix |
| src/methods/each-method/src/each-method.js | Modified | own enumerable canonical array-index traversal |
| src/methods/if-method/src/if-method.js | Modified | null-safe bare type gates without weakening compound bindings |
| test/pipeline/components-ui.test.js | Added | real-pipeline behavior and hostile-model matrix |
| test/uis/components-ui.test.js | Added | mapper, compatibility, dependency, and source ratchets |

### STRIDE security analysis

| Threat | Status | Notes |
|---|---|---|
| Spoofing | Residual | stable intent and neutral default; host truthfulness and adapter styling remain |
| Tampering | Mitigated | escaped copy, guarded href, no arbitrary attrs or raw caller HTML |
| Repudiation | Mitigated | presentation makes no audit or execution claim; host ownership is explicit |
| Information disclosure | Mitigated | explicit documented field reads; t:0 leaves; literal-only shell cache; post-hit fresh binding; no caller/localized data in cached bytes |
| Denial of service | Mitigated with residual | canonical indexed O(n) pass; host caps attacker-controlled collections |
| Elevation of privilege | Mitigated | no event, authorization, network, or execution behavior exists |

### Test coverage

| Category | Before | After | Delta |
|---|---:|---:|---:|
| Mapper and source contracts | 0 | 4 | +4 |
| Pipeline and integration contracts | 0 | 23 | +23 |
| Browser E2E | 0 | 0 | 0; visual adapter intentionally absent |
| Full repository total | 706 | 733 | +27 |

### Code quality score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | existing owners and DI boundaries preserved |
| Consistency | 10/10 | canonical intent names and repository TSS patterns |
| Type safety | 10/10 | primitive gates and documented object contracts; JSDoc check green |
| Validation | 10/10 | whole-model, required-field, enum, URL, and collection-key matrices |
| Error handling | 10/10 | safe omission for bad models; policy and drift failures remain loud |
| Security and privacy | 10/10 | escaped copy, narrow attrs, literal-only persisted shells, no data collection or new dependency |
| Performance | 10/10 | seven bounded cache identities, one sparse-safe O(n) collection pass, 11,093-byte components-ui tarball |
| Maintainability | 10/10 | small shared bases, thin wrappers, stable adapter invariants |
| Testability | 10/10 | real resolver-to-DOM pipeline plus deterministic ratchets |
| Readability | 10/10 | package README, spec, threat model, and terse source contracts align |
| **Total** | **100/100** | **all completed-review findings resolved; one correction lens explicitly incomplete** |

### Dependencies

- **Blocks:** future framework-specific visual adapters.
- **Blocked by:** none.
- **Related:** schema-ui continues to own schema.org domain composition.

### Migration notes

There is no database or caller-data migration. Existing keys remain. Badge and loading DOM changes
are documented. Versioned 0.1.0 shell entries may be evicted per scoped
null-language/default key (or left unused until TTL/eviction); consumers may pin components-ui
0.0.6 after publication. Published versions are never deleted.

### Ratification

- [x] Local code, architecture, frontend, privacy, security, and production review completed
- [x] STRIDE analysis reviewed
- [x] 786 tests and typecheck passing on the integrated dev head
- [x] Documentation and package payloads verified
- [x] Initial cross-model skeptic, architect, and minimalist review completed
- [x] Accepted null-model finding fixed red-first and focused follow-up review passed
- [x] Direct-binding architect/minimalist review completed and accepted ratchet finding fixed red-first
- [x] Correction skeptic execution failure recorded without inferring a verdict; current-head Codex PR review remains mandatory
- [x] Fresh no-edit convergence and staged-candidate gates passed; local commit created

## Verification ledger

| Gate | Result |
|---|---|
| Red-first component contracts | PASS |
| Review-found defects | PASS; all accepted findings reproduced and fixed |
| Focused if-method and canonical-component suite | PASS; 41/41, including null owner, entry-point, and cold/warm cache coverage |
| WebPage parent-cache regression | PASS; red-first same-scope second render binds only its current loading label/id/class |
| Parser snapshot and v1 differential | PASS; all 278 TSS files |
| Exact npm test | PASS; 786 of 786 on the integrated dev head |
| npm run typecheck | PASS |
| Package dry-runs | PASS; components-ui 0.1.0 has 53 files and an 11,093-byte tarball; schema-ui 0.1.2 has 84 files and a 10,028-byte tarball; each-method 1.0.5 and if-method 1.0.6 have 3 files each |
| Semgrep | PASS; 88 rules, 3 targets, zero findings |
| Full and production dependency audit | PASS; zero vulnerabilities |
| Diff whitespace | PASS |
| Initial external adversarial review | PASS; three lenses, one accepted Low fixed, focused follow-up PASS |
| Direct-binding correction review | PARTIAL COVERAGE; architect and minimalist completed, shared ratchet finding fixed red-first; skeptic execution error recorded; current-head Codex remains mandatory |

## Current verdict

**PASS locally.** The implementation, docs, tests, package payloads, cache isolation, security
analysis, production gates, initial three-lens review, focused null fix, and completed correction
lenses have no unresolved valid finding. The incomplete correction skeptic lens is disclosed and
does not substitute for the repository's required green CI and clean current-head Codex PR review.
