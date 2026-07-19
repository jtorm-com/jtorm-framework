# STRIDE Threat Model: UI Components Foundation

**Feature:** Framework-neutral UI component foundation
**Date:** 2026-07-19
**Status:** Complete; cache-boundary verification and reviews passed
**Spec:** [ui-components-foundation-spec.md](ui-components-foundation-spec.md)
**Workflow state:** [ui-components-foundation.md](ui-components-foundation.md)

## Decision

A focused STRIDE review is proportionate for this feature. PASTA is not required because the change adds no endpoint, authentication decision, persistence owner, secret, payment flow, executable content boundary, or external service. The material boundaries are untrusted caller render data entering trusted static TSS and the existing optional UI cache receiving rendered static-shell bytes before caller data is bound.

This decision must be revisited if a later slice adds rich HTML slots, arbitrary attributes, behavior/event wiring, direct network data, framework JavaScript, authentication state, telemetry, payment/consent flows, or a new adapter/cache identity that changes native shell structure.

## Security Objectives

1. Caller text remains inert text in both SSR and SPA output.
2. A card action URL cannot bypass the existing attribute URL policy.
3. Only the documented root attributes can enter emitted markup.
4. Visual intent never represents authorization, execution, confirmation, or audit.
5. Top-level non-object and null models are rejected; accordion item rendering visits canonical own enumerable array indices in one linear pass and never mutates caller input.
6. Trusted artifacts and canonical mapper names remain deterministic and ratcheted.
7. Cached canonical fragments contain only trusted, literal shell markup; caller and localized values are freshly bound after every cold or warm shell creation.

## Scope and Assumptions

In scope:

- @jtorm/components-ui mapper metadata and trusted TSS artifacts.
- button, badge, alert, card, accordion, and loading render data.
- Existing ui resolver/compiler, ui-cache-model/plugin and handler-wrapper, get/request/manifest, attr, insert, if, text, and html-ui seams as dependencies, plus narrow each-method own-index and if-method null-gate hardening.
- SSR serialization and live DOM output produced by the existing pipeline.

Out of scope:

- Host authorization and business actions.
- Framework adapter code and visual styling.
- Input collection, new storage ownership, analytics, logging, network requests, and secrets. The existing optional scoped UI cache is in scope only as a static-shell storage boundary.
- Rich HTML or arbitrary child slots.
- Host-side collection limits and meaningful-copy validation.

Assumptions:

- Mapper JavaScript, TSS, and html templates shipped by the package are trusted static artifacts.
- Caller render data is untrusted.
- Required copy is a truthy primitive string; hosts reject whitespace-only accessible names because the current bounded TSS grammar cannot do so Unicode-safely.
- Every canonical component accepts one object model; top-level arrays, scalars, functions, and null emit nothing.
- Button type, root dir, and caller loading labels require primitive strings before use.
- Badge count is contractually a string or number. Numeric zero is presence-gated through data-method because if-method is truthiness-based.
- Existing regex-policy limits remain authoritative. Overlong primitive-string type or dir tokens abort instead of bypassing validation.
- Existing attr-method URL and dangerous-attribute checks are correctly injected by the host.
- Existing UI-cache scope, LRU/TTL, persistence, and atomic publication behavior remain authoritative.
- Hosts that change native resolver/template configuration independently of the components-ui package version purge or isolate the seven canonical shell identities.

## Data Flow

    Caller/host render model [UNTRUSTED]
      -> host invokes canonical ui component
      -> ui-method lifecycle
      -> ui-resolver-model [name/fallback/cache owner]
      -> ui-compiler-model [descriptor/TSS compilation owner]
      -> get-method + manifest/request policy
      -> package mapper/TSS/html templates [TRUSTED STATIC]
      -> null-safe whole-model array/type gate
      -> component required-field gates and explicit approved-field reads from source
      -> append package-versioned cid/default iteration
      -> scoped cache miss: literal shell TSS -> html-ui templates with t: 0
      -> ui-cache-model publishes trusted static shell bytes
         OR scoped cache hit: handler-wrapper restores those bytes into a fresh detached fragment
      -> post-cache binding TSS reads the current canonical model
      -> insert t: [escaped text boundary]
      -> attr [attribute and URL policy boundary]
      -> DOM / SSR serialization

Card actions add one branch:

    source.action.href [UNTRUSTED]
      -> explicit href attr
      -> attr-method unsafe-scheme guard
      -> normal anchor or render failure

Accordion adds one loop:

    source.items [UNTRUSTED ARRAY]
      -> each(d: source.items, a: item)
      -> canonical own enumerable array indices only
      -> approved item fields handed to the child model without caller mutation
      -> accordion.item gate and render
      -> source array/items remain unchanged

## Trust Boundaries

| Boundary | Input | Control | Output |
|----------|-------|---------|--------|
| Host to component | Untrusted render model | Required-field and type gates; explicit documented field reads | Validated current model |
| Static shell to optional UI cache | Trusted literal-only TSS and html-ui leaves | Versioned cid, default variant, exact source closure, existing scoped publication policy | Reusable shell HTML with no caller/localized values |
| Cache to binding layer | Restored trusted shell bytes | Fresh detached fragment; binding executes after every miss/hit | Current-render component shell |
| Static component to html template | Trusted TSS plus untrusted values | html-ui template only with t: 0 | Native semantic element |
| Visible copy to DOM | Caller-localized strings/count | insert t: only | Escaped inert text |
| Card URL to DOM | Untrusted href string | Existing attr-method URL guard | Safe href or loud failure |
| Accordion collection to render loop | Caller array/items | Canonical own-index traversal; alias wrapper; one pass | Ordered disclosures without mutation or prototype/named-property expansion |
| Component intent to host action | Intent name/hook | No event, DI, auth, or execution behavior | Presentation only |

## Assets and Actors

Assets:

- DOM integrity and absence of active injected content.
- Accessible names, roles, and native control semantics.
- Correct intent representation.
- Caller model confidentiality against accidental attribute leakage.
- Caller data immutability.
- Caller/localized data exclusion from persisted shell fragments.
- Stable mapper keys, artifact URLs, and deterministic output.

Actors:

- A malicious or compromised data source supplying markup, URL schemes, unexpected fields, or large arrays.
- An application author accidentally treating a visual variant as authorization or audited execution.
- A future adapter author weakening semantic, escaping, or intent guarantees.
- A maintainer accidentally re-enabling html-ui global propagation or raw HTML.
- A maintainer moving data binding inside a cached cid iteration or reusing a stale shell identity after structural configuration changes.
- A compromised host. This actor already owns the render model and remains a residual risk outside package control.

## STRIDE Analysis

### Spoofing

Threats:

- A primary/destructive class is presented as proof of authority.
- A fabricated badge count or alert status impersonates trustworthy system state.
- A neutral action is visually disguised as destructive, or the inverse.

Controls:

- Canonical intent variants and stable jtorm intent hooks.
- button.default is neutral.
- The unstyled base makes no visual-conformance claim; adapters must visibly distinguish destructive intent.
- Components contain no authentication or verification state.
- Documentation prohibits fabricated counts, urgency, authority, and imbalanced choices.

Residual risk:

- The host controls the truthfulness of supplied copy/counts and adapter styling.

### Tampering

Threats:

- Markup/script payloads become executable content.
- Obfuscated javascript, data, or vbscript URLs enter card links.
- A future edit binds caller values to h: raw HTML.
- A framework/native-template change reuses an old shell identity and restores stale structure.

Controls:

- Every caller-visible field reaches insert t: only.
- Composed html is trusted static template content.
- Card href reaches only explicit attr-method href.
- Source and pipeline ratchets reject raw caller-bound h: and unsafe schemes.
- No arbitrary attribute map is accepted.
- Canonical shell IDs include the components-ui package version; future framework adapters must own distinct versioned identities.

Residual risk:

- A host that replaces or misconfigures the established attr/insert policy owns that expanded boundary.
- A host that changes native resolver configuration outside package versioning must purge or isolate the affected UI-cache scope.

### Repudiation

Threats:

- A destructive-looking button is mistaken for a confirmed, authorized, logged, or undoable action.
- A status alert is mistaken for durable audit evidence.

Controls:

- Package emits no events, network calls, records, telemetry, or audit entries.
- README assigns confirmation, authorization, execution, audit, and undo to the host.
- Mapper/source tests reject di, JS assets, and behavior wiring.

Residual risk:

- Hosts must implement domain-specific audit and recovery.

### Information Disclosure

Threats:

- title, style, tabindex, data-secret, aria attributes, IDs, or classes leak from the root model onto nested leaves.
- each lifecycle metadata mutates or appears in caller objects.
- synthesized IDs collide or reveal implementation state.
- Caller, localized, or previous-render values enter a persisted shell fragment and leak into a later render.

Controls:

- html-ui templates are composed with t: 0, so global.tss does not run.
- Components bind only documented fields through explicit TSS reads; direct source copies through data-method are rejected rather than treated as an isolation control.
- Child text/action leaves use explicit sinks and templates with t: 0.
- Accordion uses each alias item and never writes metadata into the source item.
- No implicit loading ID is generated.
- Every cid-bearing shell uses only literal parameters and contains no data, text, each, if, nested cache identity, or runtime method.
- Binding executes outside the cached iteration against a fresh detached fragment on both cold and warm paths.
- Source closure and cold/warm sentinel tests prove all seven cached byte strings exclude caller/localized values and remain unchanged when the next render uses different data.
- DOM and frozen-input tests ratchet these controls.

Residual risk:

- Visible caller text is intentionally public in output; callers must not render secrets as labels/content.
- Existing UI-cache persistence, TTL/LRU, encryption, and physical access remain host-owned; the package restricts only what canonical shell bytes contain.

### Denial of Service

Threats:

- A top-level non-object model could otherwise multiply a single-component render unexpectedly.
- A null current model could abort the entire render before component omission.
- A very large accordion items array creates excessive markup or render work.
- Inherited or named enumerable array properties could inflate output beyond the caller's indexed collection.
- Excessive string values stress rendering or regex validation.
- Variant/base composition accidentally becomes super-linear.
- Cache identity growth becomes unbounded.

Controls:

- One each pass, no nested scan over the collection, JS asset, CSS asset, request per item, timer, or retry.
- each-method enumerates own keys and accepts only canonical indices within the array length.
- Canonical wrappers reject top-level arrays, scalars, functions, and null before source iteration.
- if-method enters compound-binding parsing only when the TSS rule has a `d:` expression.
- Existing regex policy bounds token validation.
- Representative ordered-list and larger-count tests assert one disclosure per valid item.
- The package introduces exactly seven versioned/default shell identities and reuses the existing bounded UI-cache LRU/TTL owner.
- README assigns collection-size limits to the host.

Residual risk:

- There is intentionally no component-level item cap. Direct exposure of attacker-controlled unbounded arrays requires host limits and a new threat review.

### Elevation of Privilege

Threats:

- A button variant performs or authorizes a privileged operation.
- A future adapter adds hidden behavior that crosses the presentation boundary.
- An unsafe link is treated as an execution seam.

Controls:

- Components emit only native markup and attributes.
- No event handler, dispatch instruction, auth state, external script, or runtime dependency is added.
- Authorization remains before every host action regardless of visual intent.
- Adapter invariants forbid changing the action/auth boundary.
- Card link remains an ordinary guarded anchor.

Residual risk:

- A compromised host can attach behavior after rendering; that authority already exists outside this package.

## Attack Trees

### Goal: Execute caller-controlled content

- Bind caller copy to raw h:
  - Prevented by t:-only component artifacts and source ratchet.
- Smuggle a script through a visible field:
  - Prevented by insert-method escaped text processing.
- Smuggle an executable card URL:
  - Prevented by explicit href attr and unsafe-scheme policy.
- Smuggle an event/style/srcdoc attribute through the model:
  - Prevented by no arbitrary attributes and t: 0 html-template composition.

### Goal: Leak or corrupt caller data

- Cache a completed data-bearing component:
  - Prevented by literal-only shell iterations and post-cache binding.
- Reuse a first render's caller/localized values in a second render:
  - Prevented by fresh detached restoration plus cold/warm sentinel regression.
- Let html-ui global.tss copy unknown root fields:
  - Prevented by t: 0 on every semantic template.
- Let root id/class propagate to child leaves:
  - Prevented by explicit child scopes and template-only children.
- Let each add isLoop/index to caller items:
  - Prevented by a: item wrapper iteration.
- Expand output with inherited or named array properties:
  - Prevented by canonical own-enumerable-index filtering in each-method.
- Synthesize global IDs:
  - Prevented by caller-owned IDs only.

### Goal: Misrepresent authority or urgency

- Make default action primary:
  - Prevented by neutral default hook.
- Hide destructive intent:
  - Base exposes destructive hook; adapters must provide visible treatment.
- Fabricate badge/alert claims:
  - Prohibited by ethical-use contract; truth remains host-owned.
- Treat presentation as authorization:
  - Prevented architecturally by no action/auth behavior; host authorization remains mandatory.

## Control-to-Test Traceability

| Control | Planned evidence |
|---------|------------------|
| Canonical names and stable intent hooks | test/uis/components-ui.test.js mapper catalog and descriptor assertions |
| No JS, di, dependencies, or framework leakage | mapper/package/source assertions |
| Legacy recipes unchanged | test/pipeline/components-ui.test.js exact four legacy goldens |
| Required-field omission | pipeline tests for empty button/alert/card/item data |
| Button safe type default | valid reset/submit and invalid/missing type pipeline cases |
| Escaped caller copy | payload matrix across labels, headings, messages, summaries, action labels, accordion text, and loading |
| Guarded card href | safe href golden and javascript/data/vbscript rejection cases |
| Whole-model contract | arrays, ordinary scalars, property-bearing functions, and null emit no canonical component |
| Bare type-gate null handling | red-first if-method owner test plus every canonical component entry point |
| Strict enum typing | string-coercible non-string button type and root dir cases |
| Variant/direct scope isolation | pre-existing button/alert descendants and accordion.item target content remain unchanged |
| Badge zero and label precedence | zero, label-only, count-only, and both pipeline cases |
| Root-only allowed attributes | leak-trap model with title/style/tabindex/data-secret and duplicate id/class assertions |
| Alert role/name mapping | one exact semantic golden per variant; no explicit aria-live |
| Native accordion and immutability | multi-item/open golden plus deeply frozen source equality |
| Loading status/localization | caller-label, invalid-label, and translated fallback goldens; no implicit ID or permanent busy state |
| Artifact determinism | components-ui artifact scanner and TSS snapshot fixture |
| Literal-only cache boundary | parsed source closure requires exactly one versioned/default shell per binding and rejects dynamic methods/params, data verbs, and nested cache identities |
| Cold/warm cache isolation | seven cache IDs contain no first/second-render sentinel; warm output binds only fresh values and cached bytes remain identical |
| Linear collection shape | representative larger array produces exactly one details element per valid item |
| Collection-key integrity | each pipeline regression with inherited and named enumerable array properties |

## Role and Accessibility Safety Notes

- error/alert and success/status are for newly inserted, time-sensitive feedback. Static informational content should use default or info region semantics to avoid noisy announcements.
- Alert and card title copy is visibly emphasized with strong rather than a fixed heading level; the root accessible name is the visible title string. Hosts place surrounding document headings according to page hierarchy.
- Native button and details/summary own keyboard behavior. Adapters own contrast, focus visibility, motion, layout, and target size.
- Whitespace-only names are invalid at the host/adaptor boundary even though the current TSS truthiness gate cannot distinguish them Unicode-safely.
- Loading status does not set permanent aria-busy; a host updating another region owns that region's busy lifecycle and must clear it.

## Residual Risk Acceptance

The approved feature accepts these bounded residual risks:

- Host truthfulness for badge counts, status copy, urgency, and authority.
- Host enforcement of meaningful non-whitespace copy and declared badge count types.
- Host collection-size limits for attacker-influenced accordion arrays.
- Adapter visual conformance, especially destructive treatment, contrast, focus, motion, and target size.
- Host authorization, confirmation, audit, and undo for actions.
- Loud failure for token values beyond existing regex-policy limits.
- Host purge/isolation when native resolver or framework structure changes independently of the components-ui package version.

These risks do not expand package runtime authority. They must be re-reviewed when the corresponding owner is introduced.

## Verification and Re-evaluation Triggers

Completion evidence:

- Targeted mapper, artifact, pipeline, and parser tests passed.
- Exact npm test and npm run typecheck passed.
- Diff review found no raw `h:`, arbitrary attrs, runtime imports/dependencies, `di`/event wiring, missing `t: 0`, unguarded href, source mutation, or unbounded nested iteration.
- README ownership and ethical-use guidance were confirmed.
- The initial three-lens adversarial review passed; its one Low null-model finding was fixed red-first and the focused follow-up passed.
- A later direct-binding review completed architect and minimalist lenses, fixed their shared source-ratchet coverage finding red-first, and records the skeptic lens as incomplete after an execution error rather than inferring a clean result.

Re-run threat modeling if any future change adds:

- rich content or arbitrary attributes;
- behavior-heavy widgets, event handlers, portals, or focus state;
- direct untrusted network data;
- auth/permission state or destructive action execution;
- PII, telemetry, storage, consent, payment, or secrets;
- framework JavaScript/CSS that changes semantics;
- component-level caching or persistence;
- nested/unbounded collection traversal.
