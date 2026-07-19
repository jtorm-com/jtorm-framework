# STRIDE — FAQPage Accordion Projection

**Status:** Controls implemented and automated evidence complete; live browser QA pending
**Date:** 2026-07-19
**Feature specification:** `feature-reviews/schema-faq-accordion-spec.md`
**Scope tags:** `FRONTEND`, `SECURITY`

## Scope and Security Objective

The feature reads a potentially attacker-influenced Schema.org `FAQPage` object, projects a narrow allowlist of Question/Answer text into native disclosure markup, and leaves the original root available to the existing JSON-LD plugin.

Security objectives:

1. Only supported type/shape pairs become visible FAQ items.
2. Question and answer strings cannot become markup, selectors, executable behavior, arbitrary attributes, URLs, or framework tokens.
3. No caller content enters shared rendered-fragment cache entries.
4. The caller graph is neither mutated nor normalized in place.
5. Optional Bootstrap presentation cannot weaken canonical validation or semantics.
6. JSON-LD/UI parity claims are limited to inputs for which exact parity is actually proved.
7. Resource use remains linear and host-bounded.

## Assets

- Integrity of canonical accordion DOM and native disclosure semantics.
- Confidentiality of caller fields not selected for projection.
- Integrity and isolation of the seven static canonical fragment cache entries.
- Integrity of the original root passed to the JSON-LD model.
- Resolver/manifest artifact identity and request policy.
- Availability of the SSR/SPA render pipeline.
- Published mapper, package, and asset/cache contracts.

There are no credentials, sessions, authorization decisions, money flows, private database records, audit events, or new persisted caller-data stores in scope.

## Actors and Assumptions

| Actor | Capability / assumption |
|---|---|
| Content producer | may supply malformed, oversized, inherited, sparse, frozen, or markup-like FAQ data |
| Host application | selects the variant/framework, validates business/schema policy, and bounds attacker-influenced collection/string sizes |
| Package maintainer | publishes the coordinated package trio and deterministic static artifacts |
| Browser user | reads and operates independent native disclosures |
| Existing framework models | resolver, compiler, handler, regex policy, request, cache, and JSON-LD owners keep their locked contracts |

The package registry and static UI source configured by the host remain trusted code inputs, as they are before this feature.

## Data Flow and Trust Boundaries

```text
potentially untrusted FAQ root
        |
        v
existing schema mapper + injected shape/regex policy
        |
        +--> derived group sentinel --> existing UI resolver
        |                                  |
        |                                  +--> canonical cached static shell
        |                                  +--> optional literal Bootstrap overlay
        |
        +--> own canonical mainEntity indices
                    |
                    +--> exact Question / Answer gates
                    +--> derived {summary, content}
                                  |
                                  v
                         canonical escaped text sinks

original unchanged root ----------------> existing JSON-LD serializer/plugin
```

Trust boundaries:

- **TB1 — caller model to projection:** untrusted structure and strings enter trusted TSS policy.
- **TB2 — schema package to canonical component:** only a fresh allowlisted model may cross.
- **TB3 — canonical component to DOM/cache:** cached shell must stay static; current strings bind only after restore.
- **TB4 — configured presentation adapter:** only fixed literal classes may be added after canonical binding.
- **TB5 — root to JSON-LD:** existing serializer independently validates and serializes the unchanged root.
- **TB6 — host to artifact resolver/request model:** existing URL, manifest, digest, and registration policy remains unchanged.

No new authentication, network, storage, or process boundary is introduced.

## STRIDE Analysis

### S — Spoofing

**Scenario S1:** A caller labels an unrelated object as FAQ content through a type array, absolute type IRI, or near-match string.

**Control:** Require non-array objects and exact truthy string literals `FAQPage`, `Question`, and `Answer` through the existing injected conditional/regex policy. Do not support type arrays or IRIs in this variant.

**Verification:** Root and entry matrices cover wrong case, prefixes/suffixes, arrays, IRIs, missing values, and exact valid strings. Literals beyond the regex-policy input limit must fail through the existing loud policy rather than silently bypass it.

**Residual risk:** Ordinary TSS data paths intentionally include inherited JavaScript properties. An inherited exact supported type can therefore qualify in a UI-only render, although the JSON-LD serializer has stricter plain/own-property rules. Hosts must pass plain content objects and own schema/content validation; qualifying content remains text-only and grants no privilege.

### T — Tampering

**Scenario T1:** Named-array, loop-metadata, or unknown fields alter output or framework behavior.

**Control:** Existing `each` traversal considers only own canonical numeric array indices. Schema creates nested derived group/item objects and uses explicit `->append(d: derivedPath)`, so only the sentinel or `summary` / `content` pair crosses into canonical components. Unknown fields never become selectors, attributes, classes, `open`, or HTML.

**Verification:** Tests use inherited/named/noncanonical array entries, holes, conflicting `summary` / `content` / `items` / `open` / attribute fields, and deeply frozen graphs. Supported inherited data paths are characterized separately so the feature does not smuggle an ownership change into the shared parser. DOM and input snapshots must remain exact.

**Scenario T2:** A refactor changes `accordion.default` validation or allows Bootstrap to decorate a hook after canonical rejection.

**Control:** Default keeps its existing top-level and `items` gates. It acquires the same-package group binder only after validation. Bootstrap gets a separate root-only group overlay; the existing default overlay remains unchanged.

**Verification:** Exact default goldens, invalid pre-existing-hook cases, and artifact acquisition assertions run before and after the refactor.

**Residual risk:** Trusted package publishers can change TSS artifacts. Existing review, manifest digest, request policy, and package release controls own trusted-code integrity.

### R — Repudiation

**Scenario R1:** A render result cannot be related to the supplied model/framework after the fact.

**Control:** This feature performs no user action, mutation, persistence, moderation, or authorization decision requiring a new audit trail. Output is deterministic for the root, configured registries, static artifacts, and existing cache state; package/cache identities are versioned.

**Verification:** Cold, shared-warm, and restart-restored renders of the same input are identical; different current input changes only bound text. Package/manifest identity tests pin the applicable artifacts.

**Residual risk:** Host-level content provenance is outside a pure render package. Hosts needing editorial accountability must log content/version provenance before rendering.

### I — Information Disclosure

**Scenario I1:** Extra caller fields, loop wrappers, or prior render content leak into visible DOM.

**Control:** The group call receives a data-minimal derived object. Each item receives only derived `summary` and `content`. Both bind through existing text sinks. Cache entries contain static shells only and are keyed by the coordinated components version.

**Verification:** Canary secrets in every unknown root/question/answer field must not appear in HTML, DOM attributes, class lists, or cached fragments. Warm and restart tests render different markers and prove no cross-render content.

**Scenario I2:** The feature implies visible/JSON-LD parity for malformed data that the UI skips.

**Control:** Claim and test exact ordered parity only for valid dense supported input. Document that the unchanged JSON-LD root may contain unsupported entries and that serializer-hostile arrays remain loud.

**Verification:** One valid parity test; separate invalid UI-only traversal tests with JSON-LD disabled; existing JSON-LD rejection tests retained.

**Residual risk:** FAQ content is intended for public display and structured-data publication. Hosts must not place private or regulated data in the public root.

### D — Denial of Service

**Scenario D1:** An attacker supplies very large `mainEntity` arrays or strings.

**Control:** Implementation remains single-pass and creates no recursive projection, quadratic lookup, per-item artifact acquisition, or renderer-local retry. Hosts explicitly own collection/string bounds before render.

**Verification:** A 32-item representative test asserts one-to-one ordering and constant artifact acquisition relative to a one-item render. Production-readiness documentation states the host bound.

**Scenario D2:** Pathological type literals stress regular expression execution.

**Control:** Reuse the injected bounded regex-policy micro-grammar and input limits; do not introduce a native regex sink in schema TSS.

**Verification:** Exact short types work, short near-matches skip, and over-limit type strings take the existing loud policy path.

**Residual risk:** An unbounded trusted host can still exhaust CPU/memory with huge public content. The host must reject or paginate before rendering; this package does not silently truncate authoritative content.

### E — Elevation of Privilege

**Scenario E1:** Caller fields inject behavior, navigation, Bootstrap collapse controls, arbitrary classes, DOM IDs, or privileged method flow.

**Control:** The projection forwards only two strings to canonical text binders. It emits no `h`, `di`, URL, selector, event, script, `data-bs-*`, generated identity, or caller attribute. Bootstrap overlays contain fixed literals and canonical methods continue through existing dispatch/resolver seams.

**Verification:** Hostile values for `open`, `id`, `class`, `lang`, `dir`, handler-like keys, URLs, and HTML remain absent. Assert no `data-bs-toggle`, collapse/button classes, `aria-expanded`, script, or event attributes.

**Residual risk:** Trusted host configuration can register a malicious custom mapper or trusted artifact. That pre-existing privileged configuration boundary is unchanged.

## Attack Tree

```text
Compromise FAQ render
├── execute caller content
│   ├── inject HTML through question/answer  -> blocked by text sinks
│   ├── inject event/URL/selector fields     -> blocked by two-field allowlist
│   └── trigger Bootstrap JS behavior        -> no behavior attrs/scripts emitted
├── corrupt or leak across renders
│   ├── cache caller text                    -> shells cached before binding
│   ├── smuggle loop/unknown fields          -> derived data + own canonical indices
│   └── mutate frozen caller graph           -> lexical copies; immutability tests
├── bypass semantic gates
│   ├── type array/IRI/near match             -> exact narrow string policy
│   └── malformed answer shape               -> independent fail-closed item skip
└── exhaust renderer
    ├── huge item array                       -> linear path; mandatory host bound
    └── pathological regex input              -> injected bounded regex policy
```

## Control-to-Test Traceability

| Control | Evidence |
|---|---|
| Exact type/shape gates | schema root and per-entry matrices, including inherited-path characterization |
| Two boundary allowlists | unknown-field canaries and exact DOM assertions |
| Escaped text sinks | markup/entity/script/style/attribute payload cases |
| Own canonical array indices | sparse/inherited/named/noncanonical UI-only cases |
| Caller immutability | deeply frozen input and pre/post deep equality |
| Data-free cache | cold/warm/restart marker and cache-content assertions |
| Strict Bootstrap layering | invalid-hook, idempotence, no-behavior assertions |
| Bounded regex policy reuse | exact, near-match, and over-limit type cases |
| Host-owned bounds / linearity | 32-item and acquisition-constancy tests |
| Valid-model JSON-LD parity | ordered DOM/JSON-LD pair comparison |
| Published identity isolation | package/singleton/cache/manifest ratchets |
| Deterministic rollback | package trio and manifest restoration procedure |

## Privacy Assessment

- Data class: public FAQ content selected by the host.
- Collection: none added.
- Storage/retention: none added; shared cache remains static HTML-only.
- Sharing: existing visible DOM and JSON-LD output only.
- Data subject rights: no new system of record; correction/erasure occurs in the host content source.
- Logging/analytics: none added.
- Cross-border processing: none introduced by this code.

The privacy control is minimization: only `name` and `acceptedAnswer.text` cross into visible component models, while the host remains accountable for whether public structured content contains personal data.

## Threat-Model Gate

- STRIDE categories analyzed: **6/6**
- Countermeasures promoted to mandatory implementation/test items: **yes**
- PASTA deep dive: **not triggered**; no payment, auth, persistence, PII store, or new trust boundary
- Open runtime security blockers: **none**
- Pre-publish evidence blocker: **live browser accessibility QA requires a configured browser integration and host page**
