# Shared-cache TTL and purge APIs — Evaluation

**Branch:** `agent/shared-cache-ttl-purge`
**Base:** `dev` at `2b1105b0796784852dc92217fa647ed433f99ffb` (merged completion PR #60)
**Started:** `2026-07-18`
**Status:** LOCAL_VERIFIED
**Specification:** [`shared-cache-ttl-purge.md`](shared-cache-ttl-purge.md)
**Threat model:** [`stride-shared-cache-ttl-purge.md`](stride-shared-cache-ttl-purge.md)
**Adversarial review:** [`shared-cache-ttl-purge-adversarial-review.md`](shared-cache-ttl-purge-adversarial-review.md)

## Scope and outcome

This bounded change closes the process-local TTL/purge half of architecture weakness #12 for shared data, HTML, TSS, manifest-pack, and rendered-fragment caches. It does not claim persisted absolute age across restarts and does not implement stale-while-revalidate, background eviction, HTTP validator interpretation, parser changes, handler traversal changes, or persistence-schema migration.

Each participating cache defaults to an independently configurable `ttl = 300000`. Successful settlement/render starts an absolute TTL; warm hits may move LRU recency but do not move the timestamp. Pending work remains deduplicated. Age equal to TTL is stale. `0` retains only pending deduplication, `Infinity` is the explicit compatibility rollback, and invalid or regressing clock/configuration state fails fresh.

## Ownership and data flow

| Surface | Owner after this change |
|---------|-------------------------|
| TTL validation, clock reads, regression high-water, promise settlement timestamps, exact/full promise purge | `@jtorm/promise-cache-model` |
| Fetch URL/context identity | unchanged `@jtorm/request-model` policy through each data/HTML/TSS facade |
| Manifest descriptor identity, guarded hit, digest/schema/acquisition path | `@jtorm/ui-manifest-model`, using the injected promise owner only for shared-pack participation |
| Render root and dirty state | unchanged `@jtorm/render-context-model` |
| Fragment shape, LRU, render leases, exact/full fragment purge and explicit persistence | `@jtorm/ui-cache-model`, with TTL metadata delegated through DI |
| Iteration publication/abort boundary | additive event-model completion/abort hooks carried by handler-wrapper; UI plugin stages and returns one deferred commit |
| Host composition/reset | existing DI roots and test engine; no runtime imports |

Fetch flow is exact cache key -> promise owner -> pending/fresh/stale decision -> unchanged loader/parser or manifest validation. UI flow is scoped lookup -> fresh fragment or bounded lease -> normal detached render -> existing after-iteration handlers -> all completion hooks -> one deferred commit -> existing non-awaited after-view save. Any failure before commit aborts the lease and preserves the original error.

The manifest render-root-local prepared promise/index remains outside TTL/purge. Pack purge affects a subsequent root; an already prepared root retains its local index.

## Specification-first and red-first evidence

The public purge signatures, counts, expiry boundary, failure semantics, persistence behavior, SemVer plan, host migration, rollback, security/privacy boundaries, and performance limits were locked before runtime edits. The initial defect run recorded 29 expected failures while 67 characterization tests stayed green. Those failures proved indefinite sequential reuse and missing purge across every requested cache.

Implementation review then added eight red witnesses for issues not visible in the initial design tests: deferred completion atomicity, explicit language propagation, abort cleanup, null-root reentrancy, replaced-cache lease publication, completion-hook failure, null-language compatibility, and published save timing. All accepted findings were fixed before this review.

## Architecture review

1. **Problem fit:** finite process-local retention plus explicit invalidation directly resolves the bounded weakness without changing persistence or network semantics.
2. **Boundary fit:** the existing promise-cache policy owner can express clock/expiry/purge for promise caches and expose side-metadata primitives to UI through DI; no new package or runtime edge is justified.
3. **State ownership:** metadata is weakly keyed by the current cache/order identity and bounded by exact live participation. UI store and flight identities are likewise weak and reset with the singleton.
4. **Concurrency:** unique insertion tokens protect promise generations; opaque iteration leases protect rendered generations. Purge detaches participation without aborting returned work; late work cannot replace or delete a newer identity.
5. **Failure atomicity:** stale values are removed before cold work. Rejected acquisition/render/event work publishes no replacement. UI commit is deferred until all completion hooks succeed. Async save clears dirty state only for the revision it actually persisted.
6. **Security:** PR #59's exact discriminator remains the admission boundary. Unscoped calls return before map, metadata, clock, dirty, flight, or purge work. Stale manifests re-enter unchanged URL/SSRF, timeout, digest, and schema controls.
7. **Performance:** ordinary scoped hits and scalar exact purge are O(1), with at most one clock read. TSS array purge is O(input URLs); explicit full purge alone is O(cache size). No timers or sweeps are introduced.
8. **Compatibility/operations:** public singleton names, existing methods/fields, promise/AST/pack/fragment shapes, LRU order values, output bytes, event bucket order, plugin save timing, attestation, and root-local manifest behavior remain. Patch releases and coordinated minima cover only changed runtime packages.

**Architecture verdict:** PASS. The final design is cohesive with existing policy owners and no unresolved ownership, race, or lifecycle finding remains.

## Differential security review

The review compared the working tree with base `2b1105b`, traced history and blame through the original promise-cache extraction (`3183a49`), fail-closed bypass hardening (`faa7a5e`), and the older UI cache/event/wrapper evolution, then followed every changed entry point to one-hop callers and failure cleanup. The optional companion methodology files referenced by the differential-review skill were not present in the installed checkout; the required trust-boundary, history, attacker-path, and line-by-line diff analysis was performed directly.

Findings accepted from adversarial/differential review are recorded in the linked adversarial record. No unresolved issue permits cross-scope read/purge, stale-manifest validation bypass, late-generation publication, or partial UI commit.

**Differential verdict:** PASS. Final static/full-suite evidence is green.

## Refactor and compatibility review

- Every pre-existing singleton export and method remains; new methods/fields are additive.
- Promise `c` values remain the original promises. UI `cache` remains nested fragment strings and `order` remains `{l,id,c}`.
- Existing get signatures accept the same arguments and return the same types; the fifth UI-get token is internal opt-in and ordinary four-argument calls remain lookups.
- Data/HTML/TSS/manifest cold loaders, TSS array sequencing, parsers, bindings, URL policy, timeouts, digest/schema validation, manifest root supersession, LRU limits, write-once behavior, and pre-expiry output/identities remain characterized.
- The handler wrapper still drives the same before -> render -> after order. Additive completion occurs afterward; abort preserves the original failure. Explicit language is now carried into the detached view, closing a compatibility gap.
- UI plugin after-view save remains fire-and-forget. Model `save(v)` is awaitable for administrative purge persistence and preserves dirty retry state.
- No compatibility shim, duplicate policy, handwritten declaration, new package, or third-party runtime dependency exists.

**Refactor verdict:** PASS.

## Insecure-defaults and safety-friction review

| Decision | Safety result |
|----------|---------------|
| Default TTL | finite five minutes, reducing indefinite retention |
| Missing/malformed exact scope | no-op, never inferred full purge |
| Full invalidation | named `purgeAll` only; UI requires a valid scoped root for dirty/persistence authority |
| Invalid/negative/non-numeric/throwing/regressing time | cold work, never stale extension |
| Rollback | explicit `Infinity`, documented per participating cache |
| External purge exposure | no route is added; host must add authorization, audit, and rate limiting if it creates one |
| Persisted input | existing own `uiCacheScoped === true` attestation remains mandatory |

The easiest upgraded configuration is finite retention. Unsafe non-expiration is explicit, and ambiguous exact input cannot widen into global mutation.

**Insecure-defaults/safety-friction verdict:** PASS.

## Privacy and compliance review

- No new content, PII, tenant identifier, URL, fragment, timestamp, or audit data is logged, exported, transferred, or added to persistence.
- Process-local timestamp records contain only numeric time and already-live exact participation identity; weak cache/order keys cannot retain replaced host stores.
- Finite TTL and exact purge reduce retention and improve a host's ability to implement erasure/invalidation for live cache state.
- The framework does not add a user-erasure endpoint or claim to purge an external store automatically. An operator must use a valid scoped context, call exact/full UI purge, then await `save(v)` on the attested adapter.
- Persisted absolute age across restart remains a versioned-schema follow-up; current valid persisted fragments begin a new in-process TTL at `init()`.
- No moderation, DSA, AI, consent, residency, licensing, payment, health, or regulated-record workflow is changed.

**Privacy, GDPR-erasure applicability, audit-integrity, and compliance verdict:** PASS. Host authorization/audit and external-store retention remain explicit integration responsibilities.

## Threat-model applicability

The linked STRIDE record covers the changed trust boundary, all six categories, assets/actors, an administrative-purge attack tree, controls, test mapping, and residual risk. Deep PASTA is not proportionate because this change adds no endpoint, authentication decision, payment/PII flow, external service, queue, or new trust-boundary crossing. A future remotely exposed purge endpoint must receive its own authorization/audit/rate-limit threat model.

**Threat-model verdict:** `STRIDE_SUFFICIENT` / PASS.

## Source-ratchet and tech-debt applicability

The existing policy-ownership ratchet was updated to require weak centralized metadata, UI delegation to `promiseCacheModel.fresh`, exact DI, package versions, and dependency minima. Runtime behavior is primarily protected by deterministic tests rather than brittle source regexes. The source-ratchet review converged with its no-edit sentinel; no second analyzer is warranted. Final staged tech-debt review remains pending until the exact candidate is staged.

## Production readiness

| Category | Assessment |
|----------|------------|
| Architecture/dependencies | DI-only, no runtime import/new service/package; coordinated patch minima documented |
| Reliability/resilience | pending dedupe, exact-generation cleanup, no stale fallback, normal request timeout/validation, failure-atomic UI commit, retry-safe dirty revision |
| Capacity/performance | O(1) warm/exact operations, weak/bounded metadata and flights, explicit O(n) full purge, finite-TTL cold-work tradeoff documented |
| Deployability/migration | default behavior change is finite retention; per-cache configuration and `Infinity` rollback; no schema migration |
| Operability | deterministic purge counts; explicit UI purge+awaited save runbook; host observes existing request/error paths; no background jobs to supervise |
| Security/privacy | scoped identities unchanged, unscoped true bypass, no persisted timestamps/logging, remote admin exposure remains host-owned |
| User experience | rendered bytes and event ordering are unchanged pre-expiry; expired callers pay normal cold latency and same-key followers share one result/failure |

Residual operational risks are bounded cold-load spikes at expiry, an owner-wide cold window after a backward wall-clock correction, and shared leader failure for same-key followers. Hosts can tune TTL, inject a monotonic clock, retain request limits/timeouts, or set `Infinity` while rolling back.

**Production-readiness verdict:** PASS locally; remote gates remain.

## Package SemVer

Nine runtime packages change and receive patch releases: promise cache `1.0.2`, data `1.0.7`, HTML `1.0.7`, TSS `1.0.8`, manifest `1.0.3`, UI cache `1.0.7`, event `1.0.2`, handler wrapper `1.0.7`, and UI cache plugin `1.0.2`. Consumer minima move only where the new policy/lifecycle behavior is required. No already-compatible request/render-context/types range is churned.

## Verification ledger

| Gate | Result |
|------|--------|
| Red-first checkpoint | PASS — 29 expected failures with 67 characterization passes |
| Adversarial review fixes | PASS — accepted findings reproduced red then focused green |
| Focused request/data/HTML/TSS/promise/manifest/UI/discriminator/isolation/get/UI/pipeline | PASS — 291/291 |
| Exact `npm test` | PASS — 679/679 |
| `npm run typecheck` | PASS |
| Package dry-runs (nine changed packages) | PASS — exact README/package/source three-file contents |
| Runtime import/source/syntax guards | PASS — zero runtime imports, 10/10 source-policy tests, 22 changed JS files parse |
| JSONL/diff guards | PASS — 318 JSONL records parse and `git diff --check` is clean after the local review ledger append |
| Semgrep and dependency audits | PASS — 83 rules over 9 runtime files, zero findings; production/full audits zero vulnerabilities |
| Staged tech-debt ratchet | PASS — zero new debt patterns on the exact staged candidate |
| Ready PR, green CI, current-head clean Codex review | Pending; PR must remain unmerged |

## Current verdict

**PASS LOCALLY; DELIVERY IN PROGRESS.** No unresolved product-level choice or reproducible architecture/security/privacy/refactor/readiness finding remains. The no-edit focused/full/static/package/ledger/staged-ratchet gates pass. Final status becomes complete only after ready-PR CI/current-head review gates pass.
