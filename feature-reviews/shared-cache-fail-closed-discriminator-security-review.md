# Security Review: Fail-Closed Shared Cache Discriminator

**Date:** 2026-07-17
**Status:** Post-implementation local security/privacy gate PASS; remote current-head review pending
**Scope:** Weakness #12 fail-open discriminator subproblem only
**Specification:** `feature-reviews/shared-cache-fail-closed-discriminator.md`

**Red-first status:** Confirmed before runtime edits: 20 focused failures reproduced URL-only sharing, in-flight deduplication, seeded-state eviction/recency effects, persisted raw-fragment service, and get/UI pipeline leakage. The explicitly scoped warm compatibility control remained green.

## Security Decision

Shared cache participation is denied unless the request policy owner can derive a valid, non-empty explicit own render discriminator or configured host base from a strict cache root. Render-context-model owns bounded cache resolution through own object-valued `c`/`p` links while leaving ordinary render resolution unchanged. Prototype-inherited candidates, links, request namespaces, and persistence attestation cannot authorize sharing; inherited request and base accessors are rejected before evaluation. NUL-bearing discriminators and resolved URLs are invalid because the existing tagged/NUL-delimited format otherwise admits cross-scope collisions. Denial is availability-preserving: the fetch/render continues through its ordinary uncached path. `undefined` is an absence-of-key control, never an inserted key, sentinel, random identity, or serialized context.

## Assets and Boundary

The affected shared state may contain tenant-confidential data, HTML, TSS/parser identities, validated UI-manifest packs, and rendered fragments. The relevant boundary is host-supplied render/request context entering process-wide singleton caches and host fragment persistence. The existing transport/URL/SSRF boundary is unchanged.

Threat actors are a cross-tenant requester, a misconfigured host that omits context, a caller supplying malformed/cyclic context, and an operator rolling back while legacy raw fragment records remain.

## STRIDE Delta

| Category | Risk | Planned control | Required evidence |
|---|---|---|---|
| Spoofing | unstable/object/NUL-injected discriminator impersonates a stable tenant | primitive-only explicit identity; separator collision rejection; malformed fails closed | malformed/collision tests |
| Tampering | cyclic/prototype-linked context or seeded ambiguous fragment enables reuse | bounded own-link cache root owner; own persistence attestation; reload quarantined by default | cyclic/prototype/migration tests |
| Repudiation | bypass decision is not logged by this library | deterministic policy return; host remains telemetry owner | direct policy tests/documentation |
| Information disclosure | omitted scope reads/shares another render's result | true undefined-key bypass in every shared cache | sequential, concurrent, isolation, pipeline tests |
| Denial of service | omitted scope forces repeated cold work | intentional normal uncached work; no new loop/state; explicit host opt-in | resource characterization and warm scoped tests |
| Elevation of privilege | another tenant's rendered/data view is reused | exact tagged scoped keys; no unscoped persistence/recency | tenant/origin/base isolation tests |

## Attack Trees

```text
OR cross-tenant cache disclosure
  OR missing discriminator uses URL/raw variant
  OR malformed/cyclic context regains configured fallback
  OR valid-looking scopes collide through embedded NUL delimiters
  OR legacy raw persisted fragment is loaded after upgrade

OR unscoped retained state
  OR in-flight/success/rejected promise reaches shared Map
  OR a hit changes recency or evicts a scoped entry
  OR rendered fragment changes cache/order/dirty state
  OR persistence adapter is invoked
```

The controls are respectively: undefined-key bypass, malformed-context denial, NUL rejection plus exact ordinary scoped identity tests, default persisted-input quarantine with explicit post-cleanup attestation, and early returns before any shared state or save adapter access.

## PASTA Applicability

Applicable as a bounded deep dive because arbitrary host content can include PII and the change corrects an existing isolation trust boundary. The seven stages are recorded in the specification: objective, scope, decomposition/DFD, actors/threats, concrete current vulnerabilities, attack trees/risk, and testable countermeasures.

### Enforcer Triage

**Decision:** `PASTA_REQUIRED`

**Reason:** The flow can carry confidential/restricted tenant content across two persistence boundaries (process-wide singleton state and host fragment storage). A successful flaw exposes data from an unrelated render. Per-component STRIDE alone does not prove the cross-cache kill chain is closed.

**Out of scope:** request authentication truth, transport SSRF redesign, TTL/purge, persistent schema redesign, parsers, handler traversal, and sanitizer policy.

### Stage 1 — Business Objectives

| Asset/objective | Value and sensitivity | Risk appetite |
|---|---|---|
| fetched tenant data/HTML | host-defined; potentially restricted PII/business data | zero known cross-render disclosure |
| TSS and cached parser identities | internal code/content; integrity affects output | no cross-scope reuse without explicit identity |
| validated manifest packs | trusted runtime closure and assets | preserve validation/digest/guard behavior exactly |
| rendered fragments | final tenant/locale/context output; potentially confidential | raw unscoped persistence must be unserviceable |
| render availability | user-visible latency/availability | missing cache scope may increase work but must not throw |
| scoped warm performance | existing host resource contract | preserve exact ordinary keys, identity, dedupe, and LRU |

### Stage 2 — Application Decomposition

```text
host context/config (untrusted for cache authority)
  -> request-model policy boundary
     -> undefined: ordinary request/parser/handler result -> caller only
     -> scoped key: process singleton promise Maps -> caller
     -> UI scope: fragment object + LRU -> host saveModel persistence

host transport <- unchanged request URL/allow/timeout boundary
manifest render root <- root-local prepared promise/index (not cross-render)
```

| Component | Trust/data role | Failure boundary |
|---|---|---|
| render-context-model | ordinary bounded root resolution plus strict own-link cache resolution | null on invalid/cycle/overflow/inherited cache link |
| request-model | cache authority and exact request identity | empty policy/undefined key |
| promise-cache-model | shared promise read/write/recency/LRU | bypass or rejection eviction |
| data/HTML/TSS | host content acquisition/parser | request/parse rejection |
| UI manifest | validated pack cache plus root-local atomic index | acquisition vs validation rejection; root supersession |
| UI cache | rendered fragment sharing/recency/dirty/persistence | miss/no-op or save adapter failure |

### Stage 3 — Threat Analysis

The STRIDE table above covers all six categories at the host-context-to-shared-state and runtime-to-persistence crossings. The relevant actor profiles are: a low-capability tenant able to trigger same-coordinate renders; a medium-capability caller able to shape context values; a host/operator misconfiguration; and an insider/operator controlling persisted fragment input or rollback.

### Stage 4 — Concrete Vulnerabilities

| ID | CWE | Current weakness | Chain enabled |
|---|---|---|---|
| CACHE-01 | CWE-639 / CWE-636 | empty policy falls back to URL/raw fragment and therefore shares | omitted scope -> prior tenant result |
| CACHE-02 | CWE-20 | empty tenant/origin tags can synthesize a truthy policy | apparent scope -> global shared entry |
| CACHE-03 | CWE-20 / CWE-639 | embedded NUL makes distinct tagged/scope tuples collide | crafted explicit scope -> victim scoped result |
| CACHE-04 | CWE-636 | non-null invalid/cyclic root falls back to configured base | malformed context -> unintended host-wide scope |
| CACHE-05 | CWE-639 | manifest JSON-encodes an undefined inner request identity unless bypass propagates first | unscoped pack -> cross-root reuse |
| CACHE-06 | CWE-639 / CWE-922 | UI persistence has no provenance marker; legacy raw/NUL-collision bytes can look newly scoped | seeded legacy fragment -> later render |
| CACHE-07 | CWE-1321 / CWE-639 | inherited render links or migration attestation can select shared authority | prototype pollution -> cross-render content |
| CACHE-08 | CWE-639 | root-only fetch origin/base or a custom effective base can diverge from UI configured scope | isolated fetch keys -> collapsed rendered fragment |
| CACHE-09 | CWE-1321 / CWE-639 | inherited request accessor can manufacture fresh identities across validation reads | prototype authority -> shared fetch/fragment key |
| CACHE-10 | CWE-1321 / CWE-639 | inherited base accessor can change across option/guard reads | prototype authority -> configured-looking shared key |

The chain is behavioral rather than an injection sink: a caller first removes or collides the cache authority, then uses a shared coordinate to reach a previous result. Semgrep can detect nearby unsafe syntax but cannot prove this cross-method identity flow; direct behavioral tests are the primary verification.

### Stage 5 — Attack Enumeration

The attack trees above are the required AND/OR artifacts. Preconditions are only the ability to trigger two renders with a common URL/fragment coordinate or to supply host context/persisted cache input. The cross-tenant disclosure path requires (1) a shared coordinate AND (2) omitted/colliding scope AND (3) a warm or concurrent victim result. The retention path requires (1) unscoped operation AND one of success/in-flight/failure/UI-save side effects.

### Stage 6 — Risk Matrix

| Attack path | Likelihood | Impact | Risk | Justification |
|---|---|---|---|---|
| omitted scope reuses data/HTML/TSS/fragment | High | High | High | omission is the current default and requires no crafted payload; content may be confidential |
| concurrent unscoped promise/fragment sharing | Medium | High | High | timing/interleaving is needed, but singleton maps are process-wide |
| embedded-NUL scoped collision | Medium | High | High | crafted control character/context is needed; successful collision crosses an explicit tenant boundary |
| malformed cycle revived by configured base | Medium | High | High | requires malformed context plus common configured base; deterministic once present |
| legacy/direct raw UI fragment serving | Medium | High | High | requires persisted/direct entry control or upgrade residue; output is served as final rendered content |
| deliberate unscoped cold-work amplification after fix | High | Medium | Medium | omission always bypasses, but work is the existing bounded normal path and host can explicitly scope/rate-limit |

### Stage 7 — Countermeasures and Verification

| Risk | Countermeasure | Verification | Residual risk |
|---|---|---|---|
| URL/raw fallback sharing | `cacheKey()`/`scope()` return undefined and promise/UI owners return before state | sequential/concurrent/map/order/dirty/persistence tests | host may intentionally reuse a valid discriminator |
| empty/malformed context | field-specific primitive validator, strict own-link cache root, and omitted-vs-invalid root distinction | policy matrix including bounded cycles, inherited links/base, and configured base | hostile Proxy/getter behavior is best-effort fail-closed, not a sandbox boundary |
| NUL collision | reject separator in discriminators, resolved URL, UI variant/language/cid; require exactly one non-leading separator in `put()` | collision witness tests across every coordinate | invalid coordinates still follow normal uncached URL/handler behavior |
| manifest pack sharing | propagate undefined before JSON pack key | separate-root concurrent/validation-failure tests | same-root prepared state intentionally remains |
| legacy UI persistence | quarantine all reload by default; require an own `saveModel.uiCacheScoped === true` only after full-store cleanup | ambiguous-byte, inherited-attestation, and attested-reload tests; migration docs | host can make a false own attestation; external store remains host-owned |
| fetch/UI scope divergence | reject incompatible root-only fetch fields for UI sharing while honoring distinct effective-base overrides | root origin/base and no-request option-facade isolation tests | host remains responsible for truthful explicit scopes |
| resource cost | no new state/loops; explicit stable host scope opt-in | scoped warm byte/output/identity tests and resource note | unscoped workloads intentionally stay cold |

### Red-Team Pre-Implementation Validation

| Attack path | Witness against current code | Verdict before fix |
|---|---|---|
| omitted fetch scope | two calls to the same URL with no context and changing transport source | exploitable: second receives cached first result |
| concurrent scope omission | two unresolved calls to one URL | exploitable: same cached promise identity |
| NUL policy collision | tenant `a\0o:b` versus tenant `a` + origin `b` | exploitable: identical policy bytes |
| NUL UI collision | tenant `a\0b`, variant `c` versus tenant `a`, variant `b\0c` | exploitable: identical fragment variant bytes |
| invalid root/configured base | cyclic `p` chain with non-empty global base | exploitable: configured `b:` policy is returned |
| legacy fragment | persisted `default` variant followed by unscoped `get` | exploitable: raw rendered fragment is served |

Post-implementation these witnesses must fail to reach shared state while ordinary valid scoped witnesses must continue to hit. No destructive or external exploitation is required.

Implementation review added red witnesses for inherited object-valued `c`/`p` links, an inherited effective base crossing the unchanged SSRF guard through a cache hit, prototype-inherited `uiCacheScoped`, root-only origin/base fragment collapse, and a no-request custom `option()` facade collapse. Current-head Codex review then exposed inherited `request` and `base` accessors that changed identity/value across repeated reads and evaded ownership/equality guards; request/UI regressions proved both issues red. The policy rejects the request namespace immediately and rejects an inherited base accessor through bounded descriptor inspection, without evaluating either. The first attempted request-local parent walk was rejected by the ownership ratchet; the converged repair lives in render-context-model and all focused owner/cache regressions pass. Final full-suite/static/differential evidence is recorded only after the no-edit verification pass.

## Privacy Assessment

- No new collection, disclosure, logging, or serialization.
- Unscoped content is no longer retained or linked across renders.
- Existing valid scope strings remain in the same in-memory/persisted key positions after explicit post-cleanup reload opt-in.
- Legacy fragment variants are not read or served on the default upgrade path.
- TTL/purge retention remains unresolved and explicitly tracked as the next independent follow-up.

## Migration and Rollback Security

Old unscoped and new scoped fragment bytes are not always distinguishable because legacy `cs` and discriminator values admitted NUL. Upgraded UI-cache therefore quarantines all persisted input by default. Hosts must fully clear or replace the old store, then explicitly set an own `saveModel.uiCacheScoped = true` to reload the unchanged scoped shape; inherited/prototype-polluted signals are ignored. A false own attestation remains a host trust-boundary violation. Rollback requires a clean/scoped-only snapshot or disabling UI-cache persistence/plugin participation.

Single-tenant hosts opt in with a real stable configured request base or a stable explicit render tenant/origin/base. A constant sentinel unrelated to the host boundary is not recommended. Multi-tenant hosts must use the actual isolation boundary.

## Checklist Disposition

| Gate | Pre-implementation result |
|---|---|
| Authorization / multi-tenancy | PASS by design: missing authority to share denies sharing (OWASP A01; CWE-639) |
| Insecure defaults / safety friction | PASS by design: omission is safe and non-throwing; explicit opt-in is required |
| Injection | PASS by design: no object serialization/dynamic execution; malformed objects cannot become keys |
| SSRF / external requests | Regression required: URL resolution, allow policy, timeouts, and guarded manifest hits unchanged |
| Resource abuse | Accepted bounded tradeoff: unscoped calls repeat normal work; scoped asymptotics remain |
| Dependency security | PASS by design: no new package or runtime dependency |
| Privacy | PASS by design pending differential evidence: retention/disclosure is reduced |
| Threat modeling | PASS pre-code: DFD, assets, actors, all STRIDE categories, attack trees, PASTA, residual risk, and test mapping exist |
| Authentication, secrets, crypto, headers, API assets, audit logs, mobile, queue, AI/LLM, anomaly detection, RLS, secret rotation | N/A: no affected surface |

## Residual Risk

The framework cannot determine whether a host-provided non-empty discriminator truthfully identifies one tenant. A host that deliberately reuses one value across tenants still shares their entries. This is an integration-policy risk documented in migration guidance and must be re-evaluated if automatic tenant discovery or a new persistence schema is proposed.

## Post-Implementation Gate

PASS locally. Architecture, differential, refactor, insecure-defaults, safety-friction, privacy,
bounded threat-model, source-ratchet, tech-debt applicability, and production-readiness reviews were
routed. Three independent final reviews report no remaining reproducible architecture,
security/privacy, or readiness finding.

The final implementation review fixed red witnesses for inherited effective-base SSRF/cache hits,
prototype-inherited context links and persistence attestation, UI root-only fetch/fragment scope
collapse, and deliberate effective-base facade compatibility. Current-head Codex review additionally
found fresh-identity/value inherited request and base accessors; both accepted findings were
reproduced red-first and fixed by denying accessor-derived authority before evaluation. A later
compatibility review also restored configured-base opt-in for the nullish optional create flags
emitted by `ViewModel.create()`; non-null malformed flags still bypass. The request-local parent-walk
attempt was removed after the ownership ratchet correctly rejected it; strict render-context
traversal resides only in render-context-model.

Evidence at this gate:

- focused model/cache/manifest/get/UI/isolation/pipeline/source matrix: 225/225;
- exact `npm test`: 636/636; typecheck and syntax checks pass;
- Semgrep: 83 rules over eight changed runtime files, zero findings;
- nine package dry-runs contain exactly README, package metadata, and runtime source;
- source ownership/no-import guards, JSONL validation, production/full dependency audits, and diff
  hygiene pass;
- no new runtime import/dependency, endpoint, log, collection, export, third-party transfer, or
  persistence schema exists.

Residual risk is limited to a host deliberately reusing one discriminator or falsely setting its
own post-cleanup attestation. TTL and explicit purge remain the next independent weakness #12
follow-up. Remote CI and a clean Codex review against the final PR head remain delivery gates, not
substitutes for this local security decision.
