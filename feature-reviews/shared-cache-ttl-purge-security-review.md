# Shared-cache TTL and purge APIs — Security and privacy review

**Date:** 2026-07-18
**Status:** COMPLETE
**Scope:** Process-local TTL and purge half of architecture weakness #12
**Base:** `dev` at `2b1105b0796784852dc92217fa647ed433f99ffb`
**Specification:** [`shared-cache-ttl-purge.md`](shared-cache-ttl-purge.md)
**Threat model:** [`stride-shared-cache-ttl-purge.md`](stride-shared-cache-ttl-purge.md)

## Security decision

The implementation is fail-fresh and scope-preserving. The exact tenant/origin/base discriminator established by PR #59 remains the sole authority for shared participation; TTL and purge never infer scope, serialize context, or introduce a fallback key. Stale manifest packs reacquire through the unchanged request URL/SSRF, timeout, digest, schema, and acquisition-classification path. Exact purge with an unscoped or malformed identity returns `0` before cache, metadata, dirty, flight, or clock state is touched. Full purge exists only as an explicitly named administrative operation.

No network route, authentication decision, credential, secret, log, database, queue, worker, payment flow, third-party service, or new runtime dependency is introduced.

## Changed attack surface and trust boundaries

### Host-callable entry points

- `promiseCacheModel.purge(owner, key)` and `purgeAll(owner)`;
- data/HTML `purge(url, context)` and `purgeAll()`;
- TSS `purge(urlOrUrls, context)` and `purgeAll()`;
- manifest `purge(descriptor, context)` and `purgeAll()`;
- UI `purge(view, language, cid, variant)` and `purgeAll(view)`;
- per-owner `ttl` and injected `promiseCacheModel.clock` configuration.

These are in-process host APIs, not remotely authorized endpoints. Code with direct singleton access already has authority to mutate the exported caches. The new facades narrow that operation to validated exact keys or an unmistakable full action and return deterministic counts.

### Existing boundaries retained

1. Render context is bounded by render-context-model.
2. Request-model decides whether an explicit discriminator/cache key exists.
3. Promise-cache-model decides only retention of that exact key.
4. Manifest-model retains URL policy and authenticated pack validation.
5. UI-cache-model retains exact fragment coordinate, dirty root, and persistence adapter ownership.
6. Persisted UI state is loaded only with an own `uiCacheScoped === true` attestation.

## Differential review methodology

The working diff was reviewed line by line against base `2b1105b`. History/blame was traced through the promise-cache extraction and LRU hardening (`3183a49`, `faa7a5e`), the rendered-cache LRU/persistence changes, manifest-pack cache, handler-wrapper projection work, and event/plugin ordering. Direct callers, DI/reset roots, package metadata, public singleton fields/methods, get/UI pipelines, and focused failure tests were reviewed one hop outward.

The optional supplemental methodology/example files named by the differential-review and insecure-defaults skills were unavailable in the installed resource checkout. The required history, trust-boundary, attacker-path, unsafe-default, and failure-path analysis was completed directly; no gate was skipped.

## Security invariants and evidence

| Invariant | Control | Evidence |
|-----------|---------|----------|
| Unscoped exact input cannot mutate globally | `undefined` is an exact no-op; global work is named `purgeAll` | malformed/cyclic/unscoped tests for every facade |
| One scope cannot purge/read another | exact key builders and PR #59 discriminator remain unchanged | tenant/origin/base isolation tests |
| Pending purge cannot resurrect old work | cache-map/key/insertion token or UI lease identity | late fulfillment/rejection and newer-generation tests |
| Invalid time cannot extend retention | policy validates TTL/time; owner-wide regression fails fresh | fake-clock invalid/regression/cross-key tests |
| A stale manifest cannot skip controls | freshness checked before hit callback/recency; miss uses unchanged loader | URL/digest/schema/classification tests |
| Event failure cannot publish a fragment | stage plus deferred commit after all hooks; abort detaches | handler/event/completion failure pipeline tests |
| Timestamp state cannot retain replacement stores | WeakMap by current Map/cache identity; bounded per exact participation | map/cache replacement/reset tests |
| Purge cannot silently corrupt persistence | live deletion dirties only a valid root; persistence remains explicit `save(v)` | exact/full purge and async save/retry tests |
| Persisted shape cannot leak timestamps | one process timestamp per attested init batch, side metadata only | deep persisted-shape and clock-count tests |

## OWASP/CWE-oriented review

| Class | Disposition |
|-------|-------------|
| Broken access control / CWE-639 | No endpoint or user authorization is added. Exact scope cannot widen; host must authorize any future remote purge surface |
| Improper input validation / CWE-20 | TTL, clock, manifest descriptor, fragment coordinates, and context resolution fail fresh/no-op on malformed input |
| Insecure default / CWE-1188 | finite five-minute retention is default; non-expiration requires explicit `Infinity`; undefined exact purge is not a wildcard |
| Race condition / CWE-362 | insertion tokens, current-map resolution, store identities, iteration leases, deferred commit, and dirty revisions protect interleavings |
| Resource consumption / CWE-400 | pending work deduplicates; metadata/flights are weak/bounded; no timers; explicit full purge alone scans; normal cold path retains limits/timeouts |
| SSRF / CWE-918 | request URL/allow policy is unchanged and re-executed after manifest expiry/purge; no new outbound sink exists |
| Sensitive information exposure | no new logs/serialization; unscoped paths cannot probe shared metadata/clock; retention is reduced |
| Supply-chain/dependency | no third-party runtime dependency or new package; package ranges coordinate existing DI owners only |

No SQL, command, template-code, regex, path, header, deserialization, crypto, token, or secret sink is introduced.

## Failure and concurrency analysis

- A successful promise is timestamped only if its original map/key/token/promise still owns participation. Rejection deletes only the same generation.
- Purge removes participation but does not abort or change a returned promise. A later settlement resolves existing callers and cannot reinsert.
- Pending entries do not read the clock and remain deduplicated even after elapsed TTL.
- Expired entries are deleted before guarded-hit callbacks and LRU mutation. A cold failure has no stale fallback.
- UI leases are bounded by the current LRU map and an opaque current cache-store identity. Purge, eviction, cache/order replacement, abort, and late completion detach safely.
- Same-root reentrant UI lookup, including an unidentifiable/null root, bypasses its own lease rather than deadlocking. Independent roots share one result.
- Same-key followers intentionally share the leader's success or failure. A rejection clears the lease and the next caller retries normally.
- Completion accepts at most one deferred commit and executes it only after all completion hooks succeed. Abort attempts all cleanup hooks without masking the original failure.
- Save failure retains root-local dirty state. A concurrent change increments the revision and cannot be cleared by an older save completion.

## Privacy review

Cache content can contain tenant-confidential data or PII, so isolation and retention are privacy boundaries. This change reduces default live retention from process lifetime/LRU-only to five minutes and supplies exact administrative invalidation. It adds only process-local numeric timestamps and opaque tokens; neither is logged, returned, or persisted. Weak metadata follows existing exact keys and cannot retain a discarded host cache map by itself.

For an erasure workflow, the host must invalidate every applicable live cache through the exact facades and invalidate its source/external stores separately. Rendered-fragment external invalidation is:

```js
await uiCacheModel.init();
const removed = uiCacheModel.purge(scopedRootView, language, cid, variant);
if (removed) await uiCacheModel.save(scopedRootView);
```

The view must resolve to a valid explicit scope so dirty state and save authority are root-local, and the adapter must retain its own `uiCacheScoped === true` attestation. `purgeAll(scopedRootView)` is deliberately global live-fragment invalidation, not a tenant wildcard. Hosts exposing either operation remotely must provide authentication, authorization, rate limiting, audit, and tenant-aware policy outside this framework.

The unchanged persisted fragment schema has no creation/settlement timestamp. Valid attested entries start a new in-process TTL at `init()`. Absolute age across restart requires a separately versioned schema and migration; this change makes no contrary retention claim.

## Unsafe-default and friction audit

- Safe default: finite TTL on all five cache families.
- Safe omission: unscoped requests bypass; unscoped exact purge returns zero.
- Explicit danger: `Infinity` and full purge are named host choices.
- Safe failure: bad clock/config makes caching unavailable but does not serve old content or fail the application solely for cache policy.
- Bounded administration: exact purge is O(1), TSS array exact purge derives every key before mutation, and full purge is O(n) only when called explicitly.
- Safe persistence: deletion is live immediately; external deletion requires the existing explicit save path, valid root, and attestation.

## Adversarial findings and disposition

The opposite-model skeptic/architect/minimalist review found no high issue. Accepted medium findings—completion commit ordering, language propagation, plugin save timing, obsolete-store lease publication, abort cleanup, and wall-clock correction documentation—were either fixed red-first or explicitly accepted as a required fail-fresh tradeoff. A null-root self-await edge was likewise fixed. Rejected suggestions contradicted locked APIs, established persisted coordinates, or the bounded scope. Full adjudication is in the linked adversarial record.

## Residual risks

1. A host can deliberately reuse one valid discriminator across tenants; the framework cannot establish tenant truth.
2. A host can expose full purge without authorization and cause cold-work denial of service; no endpoint is added here.
3. Finite expiration adds normal upstream/render work. Very short TTL/zero and repeated purge amplify this by explicit host choice.
4. A backward wall-clock correction disables settled reuse for that owner until time reaches its prior high-water mark or the clock function changes. A monotonic injected clock avoids this availability window.
5. Same-key followers share one leader failure; no stale fallback is provided.
6. Persisted fragments receive a new TTL after restart until a future schema records absolute age.
7. The framework does not own host audit logging or external-store erasure.

These risks are documented, bounded, configurable, and do not reopen cross-scope sharing or stale validation bypass.

## Threat-model gate

`STRIDE_SUFFICIENT`. All six STRIDE categories, assets/actors, DFD, attack tree, controls, tests, and residual risks are recorded. Deep PASTA becomes applicable only if purge is exposed over a lower-trust interface or persistence gains timestamp/schema semantics.

## Current verdict

**PASS; COMPLETE.** No unresolved security or privacy finding remains. Focused 291/291, exact 679/679, typecheck, nine package dry-runs, 10 source-policy guards, 22 syntax checks, 83-rule Semgrep with zero findings, production/full audits, JSONL validation, and the staged tech-debt ratchet are green. Final head `f01d4dcb36662f5416f77e7a5196bff4eb5f3c5c` also passed CI and a clean current-head Codex review with zero unresolved threads before the maintainer merged PR #61 into `dev` as `1e7f1667cf333d9b6bc326fd21034c1486f68ac8`.
