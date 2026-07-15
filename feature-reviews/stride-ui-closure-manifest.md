# STRIDE Threat Model — UI Closure Manifest

**Status:** Implementation-validated; final delivery gates pending
**Date:** 2026-07-15
**Feature record:** [ui-closure-manifest.md](ui-closure-manifest.md)
**Scope:** @jtorm/ui-manifest-compiler, @jtorm/ui-manifest-model, the optional
@jtorm/get-method overlay, local host-mirror wiring, and generated manifest files.

## Enforcer Triage

**Classification:** PASTA_REQUIRED. The feature introduces an executable build boundary, a
deployment/transport boundary, an untrusted JSON parsing boundary, and a render-context cache
boundary. Entry points are the trusted CommonJS compiler config/source adapter, runtime manifest
descriptors and response text, and root-context preparation. Security-sensitive assets are the
host-pinned expected hash, request URL policy/context key, trusted UI source, and prepared index;
the feature handles no credentials, authorization state, PII, or tenant/model data. Stages 1–7
below are therefore mandatory and complete.

## Security Objective

Collapse the trusted static UI closure into a content-addressed bundle without allowing the new
build/runtime boundary to bypass existing URL policy, execute manifest content, leak render state,
cross-contaminate request contexts, or turn malformed input and concurrency into a denial of
service. Existing parser, resolver, compiler, sanitizer, selector, scope, and transport-policy
owners remain authoritative.

## Data Flow and Trust Boundaries

    Trusted repository/config/source adapters
                    |
                    | TB1: executable build boundary
                    v
        UI manifest compiler + existing resolver/parsers
                    |
                    | canonical JSON + source/mapper/value digests
                    v
          Content-addressed manifest artifact
                    |
                    | TB2: deployment/transport boundary
                    v
       request-model URL policy + response.text acquisition
                    |
                    | TB3: untrusted received-text boundary
                    v
      manifest text limit -> JSON parse -> schema/limit checks
                    |
                    | recomputed = declared = host-expected SHA-256
                    v
       Immutable pack metadata + root-local prepared Map index
                    |
                    | TB4: render-context boundary
                    v
       get-method overlay -> existing data/html/tss waterfall
                    |
                    | dynamic requests remain outside the pack
                    v
         Existing compiler/handler/scope/sanitizer sinks

Fallback and error paths are part of the model: optional acquisition failure may use the legacy
waterfall; any received malformed, oversized, stale, conflicting, or unverifiable pack fails loud.
A required namespace miss also fails loud after the existing request allow policy is awaited.

| Boundary | Trust decision | Enforcement owner |
|---|---|---|
| TB1 build input | Config and adapters are trusted executable build inputs; returned bytes/text are bounded and fingerprinted | ui-manifest-compiler |
| TB2 deployment/transport | A URL is not authority; URL policy and a host-pinned expected hash are both required | request-model + host |
| TB3 received text | All text is untrusted until bounded, parsed, schema-validated, and digest-verified | ui-manifest-model |
| TB4 render context | Prepared assets are visible only to one topmost render root and policy context | ui-manifest-model |
| Legacy sink boundary | Packed values must have the exact existing model shapes; no sink ownership moves | get-method + existing models |

## Assets and Sensitivity

| Asset | Sensitivity | Integrity/availability requirement |
|---|---|---|
| HTML, TSS AST, and static JSON assets | Public source-derived content | Exact order and value identity; no executable or request-derived state |
| Manifest configuration and roots | Internal build metadata | Hash-bound; deterministic; explicit dynamic policy |
| Source and reachable mapper fingerprints | Internal provenance metadata | Byte-exact/source-order exact; changes invalidate the pack |
| Host-expected manifest hash | Release integrity input | Must come from trusted deployment metadata, not the received payload |
| Request allow policy and context key | Security policy | Must run for packed hits and required misses; must isolate base/origin/tenant |
| Prepared root index | Ephemeral internal state | Atomic, bounded, root-local, prototype-safe, and conflict-free |
| Render/model/request/tenant/DOM state | Restricted runtime state | Must never enter a manifest, shared pack cache, or diagnostic |

## Threat Actors

- A network or CDN attacker able to alter, replay, truncate, or replace a manifest response.
- An untrusted caller able to influence request context, dynamic bindings, timing, or repetition.
- A malicious artifact containing hostile keys, counts, nesting, duplicate identities, or values.
- A compromised build adapter/configuration or release pipeline. This is inside TB1 and therefore
  cannot be defeated by a digest produced by the same compromised build; provenance and CI controls
  limit, but do not eliminate, this residual supply-chain risk.
- An accidental maintainer change that alters mapper order, AST key order, cache identity, or
  optional/required semantics.

## PASTA Analysis

### Stage 1 — Business and Security Objectives

The user goal is a cold Product.default closure with one static bundle request instead of 27 static
asset requests, while preserving byte-equivalent SSR/live output and existing loud drift detection.
Security goals are integrity, policy continuity, context isolation, bounded resource use, and no new
code-execution or sensitive-data path.

### Stage 2 — Technical Scope

In scope are trusted build input, static graph discovery, canonical serialization, content-addressed
output, request-model acquisition, digest/schema validation, promise LRU behavior, root-local
installation, get overlay lookup, optional/required fallback, and dynamic-edge declarations.
Production-host deployment implementation and arbitrary runtime model data are out of scope.

### Stage 3 — Application Decomposition

The compiler uses the existing resolver and parsers to discover literal descriptor/TSS edges without
executing di methods or model bindings. It normalizes components, recursively classifies compiled
bindings, snapshots/restores mutable collaborators, and emits plain JSON plus immutable digests. The
runtime preflights descriptors and its 32-byte digest adapter before ownership or requests, uses
request-model for acquisition/identity/policy, owns canonical UTF-8 encoding and digest formatting,
builds Maps, then atomically attaches one index to the topmost render root. The overlay either returns
an exact legacy value shape or delegates to the unchanged fetch model.

### Stage 4 — Threat Analysis

| ID | STRIDE | Threat | Primary controls |
|---|---|---|---|
| TM-1 | S/T | Substitute or replay a stale/tampered pack | URL allow policy; host-pinned expected hash; computed = declared = expected SHA-256 |
| TM-2 | T/E | Packed hit bypasses request authorization | Call requestModel.url, then await requestModel.allow in legacy scalar/array order before every hit or required miss |
| TM-3 | T/E | Prototype-like keys or duplicate identities poison the index | Full own-property schema validation; Map indexes; duplicate/conflict rejection |
| TM-4 | T | Lazy PR #44 node mutation creates false cross-pack equivalence/conflict | Immutable per-asset valueHash stored separately from mutable AST values |
| TM-5 | I | Model, request, tenant, DOM, secret, or PII enters a shared bundle/cache | Static trusted sources only; plain-data validation; artifact scan tests; root-local context |
| TM-6 | D | Oversized/deep JSON, huge graph, source/component/render-context cycle, or metadata explosion exhausts CPU/memory | Text-before-parse cap; exact count/depth limits; bounded cycle detection; bounded compiler graph |
| TM-7 | D | Cache/request storm or rejection pins failed work forever | Exact requestModel.cacheKey + expected-hash tuple; 32-entry LRU; identity-guarded rejection deletion; retry tests |
| TM-8 | T/D | Racing prepare calls install partial, stale, or timing-selected state | Validate/snapshot/key/digest preflight before generation claim; only a valid later call supersedes; all-settled; descriptor order; atomic install |
| TM-9 | T | Optional mode treats received-invalid content as a harmless miss | Only acquisition failure may waterfall; received-invalid content is always loud |
| TM-10 | T | Static discovery silently omits a model-bound or implicit edge | Recursive descriptor-tree classification; exact source/node pointer/param/raw binding/implicit policy; every diagnostic matched once; unused/duplicate policy loud |
| TM-11 | R | Artifact cannot be traced to exact build inputs | Content address; raw source digests/bytes; reachable mapper hashes; config/toolchain versions |
| TM-12 | E | Manifest injects executable code or takes over existing sinks | JSON-only values; functions/regex/model/DOM rejected; no eval/import; existing sink owners unchanged |
| TM-13 | T/I | One request root or tenant observes another root's assets | Topmost-root Map index; no active context retained on singleton; policy-aware cache identity |
| TM-14 | T | CLI path/id manipulation or a concurrent writer overwrites an unintended file | Restricted id/containment; exclusive same-directory temp; flush/close; atomic no-replace hard link; exact EEXIST comparison; cleanup; no shell |
| TM-15 | T/D | Shared mutable resolver/parser state contaminates concurrent or failed builds | Initialized collaborators; snapshot/restore in finally; overlap rejection across every shared mutable collaborator; sequential CLI |

### Stage 5 — Vulnerability and Attack-Tree Analysis

    Compromise rendered output through the manifest
    OR
      Alter artifact in transit
        AND defeat host-expected digest equality
      Supply a malicious build input
        AND pass repository/release provenance controls
      Bypass URL policy
        AND reach a packed hit or required miss without allow()
      Poison the prepared index
        AND bypass schema/own-key/Map/duplicate checks
      Hide a dynamic edge
        AND evade recursive model-path detection
        AND bypass exact node-pointer/parameter/raw-binding reconciliation
      Hide an implicit naked-leaf edge
        AND bypass method-parameter metadata fingerprinting and reconciliation
      Inject executable state
        AND bypass JSON-safe plain-data validation and unchanged sink owners

    Exhaust runtime or prevent rendering
    OR
      Deliver oversized or deeply nested JSON
      Trigger unbounded pack/descriptor/cache growth
      Race prepare calls to retain partial/stale state
        OR let an invalid later call steal ownership
      Cause a failed promise to remain pinned
      Generate compiler graph cycles or excessive fan-out
      Overlap builds through one mutable resolver or parser

Each leaf is blocked by a mandatory control and an implemented regression test. Build-environment compromise
remains the only leaf whose root cause is outside this framework; the runtime still rejects artifacts
whose deployed expected hash does not match.

### Stage 6 — Risk Analysis

| Risk | Likelihood | Impact | Residual risk |
|---|---|---|---|
| Transit replacement or stale replay | Low after controls | High | Low; requires compromise of trusted expected-hash metadata too |
| Policy bypass on packed assets | Low after tests | High | Low; existing allow policy remains the decision owner |
| Malformed input resource exhaustion | Medium before controls | High | Low; finite bounds cover text, values, depth, entries, descriptors, and cache |
| Cross-root/context leakage | Low after controls | High | Low; root-local indexes and policy-aware keys are mandatory |
| Concurrency-selected or partial state | Medium before controls | High | Low; preflight before generation claim, valid-owner atomic installation, and ordered failures |
| Dynamic graph under-inclusion | Medium | Medium | Low; recursive exact diagnostics, method metadata, conservative flags, and additional declared roots |
| Cross-build mutable-state contamination | Medium before controls | High | Low; snapshot/restore plus overlap rejection for every mutable collaborator |
| Compromised trusted build/release pipeline | Low | High | Medium; framework cannot authenticate a malicious trusted builder |

The medium supply-chain residual is accepted at the framework boundary because the build configuration
is explicitly trusted and no manifest code executes. Production adopters must source the expected hash
from trusted release metadata and re-evaluate this risk if manifests are built from third-party or
user-supplied inputs.

### Stage 7 — Countermeasures and Implementation Verification

All countermeasures are implemented requirements. Each HIGH/MEDIUM threat maps to tests in the same
change:

| Control | Implemented verification |
|---|---|
| Triple digest equality and canonical byte rules | `test/models/ui-manifest-model.test.js`: declared/expected/payload/value witnesses, exact TextEncoder bytes, Unicode vectors, and invalid digest preflight |
| URL policy continuity | manifest-model policy spies cover packed hits, required misses, optional fallthrough, scalar and TSS-array order |
| Schema, own-key, Map, and immutable conflict tokens | authenticated schema rejection, prototype identities, falsy hits, duplicates/conflicts, and lazy `node.b` mutation tests |
| Bounded parsing, graph, metadata, descriptors, contexts, and LRU | runtime and compiler suites admit every configured default exactly and reject limit + 1; a subprocess witness proves a cyclic context rejects instead of hanging |
| Atomic prepare and deterministic races | invalid-call non-supersession, valid latest ownership, descriptor-order settlement, prior-index retention, retry, dedup, and LRU tests |
| Static/dynamic reconciliation | compiler suite covers literal/mixed/nested bindings, implicit leaves, exact pointers/params, dynamic policy failures, flags, mediatargets, and Product's ten diagnostics |
| Compiler state isolation | overlap rejection, success/failure restoration, restore-error unlock, and sequential CLI config-array tests |
| CLI containment and no-clobber output | path-bearing id rejection, atomic identical/conflicting concurrent writer tests, cleanup, and CLI argument tests |
| No sensitive/runtime state | compiler emits only validated JSON-safe source-derived values; Product golden contains 37 assets and ten binding diagnostics, never evaluated model values |
| Exact legacy behavior | `test/pipeline/ui-manifest.test.js`: 27 static requests become one, warm stays zero, dynamic Product remains one pack plus one data request, and live/detached bodies equal legacy |

## Red Team Validation

| Attack path | Result | Evidence / residual |
|---|---|---|
| Replace or replay a pack | DEFENDED | Independent expected, declared, computed payload, and per-value hashes must agree; tamper/stale witnesses fail before install. |
| Bypass URL policy with a packed hit or strict miss | DEFENDED | Awaited URL/allow spies cover both paths and preserve the legacy error. |
| Poison indexes with prototype or duplicate identities | DEFENDED | Full own-field validation plus `Map`; prototype-like/falsy/duplicate/conflict tests pass. |
| Exhaust runtime/compiler with oversized or deep input | DEFENDED | Text, values, depth, assets, metadata, roots, vertices, edges, source, dynamic, output, descriptor, and LRU default boundaries are tested exactly and at +1. |
| Hang preparation with a cyclic root-context parent chain | DEFENDED | A timed subprocess reproduced the infinite traversal before the fix; identity-based cycle detection now rejects it as an invalid context. |
| Win a prepare race with invalid, stale, or partial state | DEFENDED | Preflight, all-settled ordering, latest-valid generation ownership, prior-index retention, dedup, and retry tests pass. |
| Hide a dynamic binding from the pack policy | DEFENDED | Recursive classification plus missing/unused/duplicate reconciliation; Product golden locks ten exact diagnostics. |
| Escape or overwrite the output directory | DEFENDED | Restricted ids, resolved containment, exclusive temporary output, atomic no-replace hard link, exact conflict comparison, and cleanup tests pass. |
| Compromise trusted compiler config/source or release metadata | INCONCLUSIVE / ACCEPTED | This remains inside TB1. The framework fingerprints inputs and validates runtime content, but cannot authenticate a malicious trusted builder or compromised expected-hash channel. |

No framework-level exploit path was confirmed: seven paths are defended and one supply-chain path
remains the documented medium residual. Re-evaluate before accepting third-party/user-controlled
build inputs or moving expected-hash authority into the artifact response.

## STRIDE Per Element

| Category | Build compiler | Manifest transport/loader | Prepared index/get overlay |
|---|---|---|---|
| Spoofing | Trusted adapter identity/version and mapper fingerprints | Expected hash authenticates selected content; request policy authenticates destination policy | Root identity is the topmost ViewContext, never a manifest key |
| Tampering | Raw bytes, text, config, mapper/method order, flags, and values are hash-bound | Model-owned UTF-8 payload digest is recomputed before install | Immutable valueHash detects conflicts; atomic latest-valid-owner install |
| Repudiation | Deterministic inputs and content-address filename identify the build | Descriptor-order diagnostics identify the failing URL/pack | Named supersession/conflict/miss errors preserve asset identity |
| Information Disclosure | Only trusted static plain data is serialized | Errors expose asset identity, not body, secret, or context | Singleton retains pack promises only; render contexts remain root-local |
| Denial of Service | Graph/count/depth/source/output limits, cycle rejection, parser-state restoration, overlap rejection | maxText before parse, structure limits, descriptor cap, LRU | Bounded Maps, deterministic all-settled processing, no retry loop |
| Elevation of Privilege | Build output contains no code/functions/authority | URL policy and triple digest cannot be disabled by manifest content | No eval/import/sink move; existing compiler/sanitizer/scope owners remain |

## Re-evaluation Triggers

Update this model before implementation changes that add executable manifest content, accept untrusted
build sources, move URL-policy ownership, add a network endpoint, share indexes across roots, change
digest/canonicalization semantics, add persistent storage, or alter the private production-host trust
boundary. Post-implementation review must link every control to its final test and record any design
deviation.
