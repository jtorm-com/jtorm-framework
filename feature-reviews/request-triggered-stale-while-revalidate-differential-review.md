# Request-triggered stale-while-revalidate — Differential security review

**Date:** 2026-07-19
**Range:** 9ee8cc850224041498282a893eca7451dde8364b to working tree
**Focus:** Security-relevant behavior introduced by the acquisition SWR diff
**Verdict:** PASS

## Method and limitation

The review traced the complete runtime diff, changed tests and policy ratchets, one-hop callers, DI composition, package metadata, failure cleanup, and relevant history. The optional methodology, adversarial, reporting, and pattern-library files referenced by the installed differential-review skill were absent from its checkout. Their absence was not treated as a pass shortcut: trust boundaries, attacker-controlled inputs, history/blame, removed controls, concurrency, and line-by-line sinks were evaluated directly.

Relevant history included:

- 3183a49 — original promise-cache extraction and public promise identity.
- faa7a5e — fail-closed scoped cache participation.
- e791896 — absolute successful-settlement TTL and generation-safe purge.
- 4d6a2cd — persisted rendered-fragment age boundary.
- Current locked AGENTS.md rules for request scope, UI-manifest validation, UI-cache ownership, DI-only source, and SemVer.

## Changed entry points

| Entry point | Security delta |
|---|---|
| promiseCacheModel.get | Adds finite stale classification, one refresh, hard joining, and guarded post-await reclassification |
| promiseCacheModel.refresh/publish | Adds private refresh ownership and exact atomic publication |
| Four acquisition singleton fields | Adds default-zero staleWindow policy |
| uiManifestModel cache collaborator | Adds exact captured-key check after awaited hit authorization |
| Test host reset/options | Exposes deterministic configuration only to the existing harness |
| Package/docs/policy ratchets | Coordinates patch floors and prevents policy spread |

No endpoint, database, persistence adapter, UI event lifecycle, HTTP validator, or new external request path changed.

## Attacker-path analysis

### Scope confusion

An attacker-controlled or malformed render context still reaches requestModel.cacheKey before the promise cache. Undefined scope returns directly from get and performs no Map, metadata, clock, guard, recency, deduplication, or refresh operation. Tenant, origin, and base identities retain exact separation.

Manifest policy is asynchronous, so the diff adds a second same-continuation check rather than trusting the pre-await key. Tests mutate tenant, origin, context base, singleton base, cache generation, and publication state while the guard waits; stale service and publication under the captured key fail closed.

### Stale extension

Freshness derives only from the original successful-settlement timestamp. Hits, refresh start, failure, recency, and unrelated saves do not slide age. Subtraction-based classification avoids arithmetic overflow; invalid windows disable stale service without discarding TTL freshness, and clock identity/regression still fails hard. Hard-bound callers never receive the old generation.

### State resurrection and corruption

Purge, purge-all, eviction, reset, Map replacement, newer insertion, same-promise reuse, and refresh rejection were traced through exact record/token checks. A detached completion may resolve a promise already returned to a caller but cannot reinsert, delete, timestamp, or overwrite current cache state.

### Availability and resource use

The state machine is constant-time and retained metadata remains bounded by max. One refresh exists per retained generation. Repeated generation churn can leave multiple detached loaders in flight, and refresh failure permits the next request to retry without backoff. This is documented as a host transport/concurrency precondition, not mislabeled as max-bounded work.

### Downstream privacy

The diff does not modify UI-cache, but stale acquisition content can flow into a newly published fragment. Documentation and tests correctly separate future acquisition purge from prepared-root, UI-fragment, and persistence invalidation. No new serialization or logging sink was introduced.

## Removed-control check

No pre-existing security control was removed or bypassed:

- request-model exact cache discrimination remains before shared state;
- manifest URL allow runs for each guarded caller;
- request timeout/transport and parser paths are unchanged;
- manifest digest, schema, bounds, required/optional, and root supersession remain;
- UI-cache wire and persistence provenance remain;
- rejection and late-generation cleanup are stricter, not weaker.

## Verification

- Deterministic tests cover strict boundaries, invalid configuration, clock failures, sync/async rejection, unhandled-rejection prevention, LRU, max, every invalidator, guard races, untracked generations, manifest validation, scoped/unscoped pipeline behavior, and downstream fragments.
- Exact root suite passes 754/754 and typecheck passes.
- Semgrep ran 83 JavaScript/security rules across all five changed runtime files with zero finding.
- Production-only and full npm audits report zero vulnerability.
- Source/policy guards prove DI-only runtime, pure JS, exact package floors, central ownership, four acquisition exports, and no rendered-fragment staleWindow.

## Findings

No exploitable regression, removed control, cross-scope read, hard-boundary bypass, late-generation publication, validation bypass, or new secret/logging/injection sink was found.

Residual availability and retention tradeoffs are explicit in the feature specification, STRIDE record, package documentation, and security review. They do not become default behavior.

**Differential verdict:** PASS. The local working-tree diff introduces no unresolved valid security finding.
