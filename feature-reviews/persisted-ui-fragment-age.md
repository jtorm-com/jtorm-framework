# Feature Development: Persisted UI Fragment Age

**Date:** 2026-07-18
**Author:** Codex `/root`
**Status:** Implementation complete; ready PR #63 in review
**Claimed:** 2026-07-18T17:10:22Z
**Current Mode:** Delivery - CI and current-head Codex review

---

## Resumption Context

**Last Completed Mode:** Review
**Current Mode:** Delivery - CI and current-head Codex review
**Next Action:** Obtain green CI, request `@codex review`, and resolve every valid current-head finding without merging PR #63.

**Files Created:**
- specification, security, differential, adversarial, and evaluation records;
- exact wire-v1, migration, and rollback fixtures; and
- focused persistence model tests.

**Files Modified:** Promise-cache/UI-cache runtime owners, UI plugin dependency metadata, host test
DI/reset, focused model/plugin/pipeline guards, package/root READMEs, package metadata, `AGENTS.md`,
and the architecture backlog.
**Tests Written:** Red restart defect, dual-clock TTL boundaries, hostile envelopes, byte/timestamp
pairing, async saves, lifecycle/purge cleanup, isolation, and persistence/restart pipeline coverage.

**Issue proved red-first:** a fragment settled at `t0` and reloaded just before `t0 + ttl` received
another full TTL from the previous `init()` implementation. The committed regression failed before
runtime changes and now passes with only the true remaining lifetime.

**Design decisions:**
- Persist a public wire-version `1` envelope containing a deterministic LRU-ordered array of structurally paired fragment bytes and absolute settlement timestamps.
- Keep process-local expiry mechanics in `promise-cache-model`; add a minimal `restore(owner, age, sampledTime)` seam that returns an opaque local insertion record without exposing its representation or serializing a process clock identity.
- Use Unix-epoch milliseconds from one injected restart-stable UI-persistence clock; reject unsafe, future, and observed-regressing time.
- Validate and stage an entire bounded envelope before swapping live cache/order/metadata state.
- Build and freeze a disconnected, version-consistent save snapshot before the adapter's single `set()` call.
- Quarantine all legacy/unversioned input. Migration is a host-owned cold clear by default, or construction of the exact new envelope only when original settlement times are trustworthy.
- Treat the incompatible adapter wire change as `@jtorm/ui-cache-model` 2.0.0; patch `@jtorm/promise-cache-model` for the restoration seam and patch `@jtorm/ui-cache-plugin` to move its direct UI-model dependency range to `^2.0.0`.

**Branch context:** PR #61 merged at `1e7f1667cf333d9b6bc326fd21034c1486f68ac8`. Local `dev` was fast-forwarded to `3c614cd5cf65854d5e85922445a7fca1221db659`, and this work is on `feat/persisted-ui-fragment-age`.

---

## Research Summary

- **Architecture backlog:** P4 in `feature-reviews/framework-architecture-review-2026-07-14.md` is the highest-ranked actionable item. P3/PR #61 deliberately left persisted fragment age process-local while closing architecture weakness #12 through bounded TTL and purge APIs.
- **Policy owners:** `promise-cache-model` owns in-process TTL, clock-identity, non-sliding freshness, restored local insertion records, and settled-promise metadata. `render-context-model` and `request-model` own strict cache-root and discriminator policy. `ui-cache-model` owns rendered-fragment storage, LRU, absolute persistence age, and the adapter boundary. `ui-cache-plugin` owns staged publication after successful handler/event completion and after-view save timing.
- **Current defect:** `ui-cache-model.init()` resets live state, checks own `saveModel.uiCacheScoped === true`, reads the old nested cache, obtains `promiseCacheModel.time(this)` once, and calls `put()` for every fragment. That timestamp is reload time, not original settlement time.
- **Publication lifecycle:** direct `set()` publishes immediately; plugin renders acquire a lease, stage bytes, and call `complete()` only after successful handler/event completion. `abort()`, handler/event rejection, pending purge, and cache replacement prevent publication.
- **Persistence lifecycle:** `save(v)` currently passes the mutable exported `cache` object to one awaited adapter `set()`. Root-local `updated`/`revision` state prevents a same-root mutation during the await from being cleared, but the live object does not provide an immutable byte/timestamp pair snapshot.
- **Host boundary:** no production persistence adapter is bundled. Hosts inject `saveModel`; tests use deterministic sync/async doubles. The full-pipeline harness owns DI/reset and reusable-cache simulation.
- **Compatibility constraints:** the nested in-memory `cache`, `order` Map, singleton exports, write-once behavior, LRU/hit semantics, render leases, context identities, and plugin timing are published behavior. Only the save-adapter payload is intentionally incompatible.
- **Relevant completed records read:** P3 policy-owner specification/evaluation/security records; PR #59 fail-closed discriminator specification/evaluation/security records; PR #61 TTL/purge specification/evaluation/security/adversarial/STRIDE records; current package READMEs and metadata; focused model/plugin/discriminator/TTL/purge/wiring/isolation/pipeline tests.
- **Open product questions:** none. The user's requirements settle schema compatibility, migration policy, clock semantics, publication timing, deployment order, rollback, and follow-up boundaries.

---

## Problem Statement

A host that persists rendered UI fragments expects the configured absolute TTL to bound reuse from the fragment's original successful publication. Today, restarting the process just before expiry reloads an attested fragment with a new in-process timestamp and grants a second full TTL. Users can therefore receive content older than the configured policy, and changing TTL at deployment does not evaluate the fragment's real age. The persistence boundary needs a versioned, bounded, fail-closed contract that carries trustworthy original settlement time without changing live fragment identities or moving freshness policy out of `promise-cache-model`.

## Goals

1. Preserve elapsed rendered-fragment age across process restarts.
2. Make the persisted wire format explicit, versioned, bounded, deterministic, and failure-atomic.
3. Keep fail-closed discriminator/provenance behavior and the existing in-memory/public singleton contracts intact.
4. Preserve plugin publication, lease, lifecycle, LRU, purge, dirty-state, and save ordering semantics.
5. Provide executable migration, rollback, deployment, privacy, and resource-limit guidance for direct adapter consumers.

## Scope

### In Scope

- Persisted rendered fragments owned by `@jtorm/ui-cache-model`.
- An incompatible versioned save-adapter envelope containing original successful settlement time.
- Absolute-age restoration into the existing process-local promise-cache TTL policy.
- Full-envelope validation, bounded staging, atomic live-state publication, immutable save snapshots, and paired metadata cleanup.
- Host DI/reset support for the persistence clock and timestamp metadata.
- Focused model/plugin/discriminator/TTL/purge/wiring/isolation tests and a full-pipeline persistence/restart proof.
- Exact wire golden plus legacy migration/rollback fixtures.
- Major/patch package metadata, READMEs, root guidance, architecture/backlog/security/evaluation/ledger records, and an `AGENTS.md` locked-owner update.

### Out of Scope / Independent Follow-ups

- Stale-while-revalidate, stale fallback, background refresh, timers, or jobs.
- HTTP `ETag`, `If-None-Match`, `Last-Modified`, `If-Modified-Since`, cache-header, or validator integration.
- Data, HTML, TSS, manifest-pack persistence or their process-local metadata.
- Generic persistence/versioning infrastructure or serialization of render contexts.
- Request URL/SSRF policy, manifest discovery/runtime behavior, parser output, handler traversal, bindings, or UI compilation/resolution ownership.
- Random/sentinel cache identities, sliding expiry, per-init fallback ages, or inferred legacy timestamps.

## Functional Requirements

### F1. Versioned persisted schema

`saveModel.set()` receives exactly one envelope with wire version `1`:

```json
{
  "version": 1,
  "fragments": [
    {
      "language": "en",
      "cid": "card",
      "variant": "https://tenant.example\u0000default",
      "html": "<article>cached</article>",
      "settledAt": 1000
    }
  ]
}
```

- `fragments` is ordered from least-recently-used to most-recently-used using the live `order` Map.
- Each record structurally pairs one exact fragment identity, its exact HTML bytes, and its original successful settlement time. There is no parallel timestamp map on the wire.
- `version` and every record field must be own data properties. Accessors, symbols, extra keys, sparse arrays, duplicate identities, or nonstandard polluted prototypes invalidate the whole envelope.
- The only accepted envelope version is numeric safe integer `1`. Version recognition is a runtime constant, not mutable host DI.
- The exact JSON fixture is the public compatibility golden. Object key and array iteration order are deterministic.

### F2. Provenance and whole-envelope validation

- `init()` must inspect `saveModel.uiCacheScoped` with an own-property descriptor and proceed only when it is an own data property whose value is exactly `true`. An inherited or accessor-supplied value is not evaluated and cannot authorize `get()`.
- The adapter payload must independently carry an own data-property recognized `version`.
- Before live publication, validate the complete envelope and all records into bounded temporary state.
- `init()` may await a synchronous or asynchronous adapter `get()`, but it captures an internal lifecycle-revision token for the new empty cache/order generation first. Any valid scoped lease/publication/purge mutation, identity replacement, or newer init invalidates that token; the delayed candidate is discarded and cannot overwrite or resurrect newer state. The module-local token only detects async lifecycle change: it is never a cache key, discriminator, sentinel identity, serialized value, or per-render retained field.
- An asynchronous `get()` result is a native Promise from the current or another JavaScript realm. Adopt it through the intrinsic native Promise brand, not `instanceof`, without reading an arbitrary thenable or malformed envelope `then` accessor. Rejected Promises and unsupported thenables fail cold.
- Valid envelope objects may use `Object.prototype` or `null`; entries follow the same rule. `fragments` must be a dense ordinary Array with no extra/symbol/accessor properties.
- Every record has exactly the five named fields. `language`, `cid`, `variant`, and `html` are strings; language/cid contain no NUL; the stored scoped variant contains exactly one non-leading NUL; `settledAt` is a nonnegative safe integer. Existing accepted primitive language/cid inputs are serialized as their current nested object property keys via `String(value)` (notably the plugin's default `null` language becomes wire string `"null"`), matching today's restart canonicalization.
- The array length must not exceed the currently effective fragment `max` (positive safe integer, otherwise the existing effective bound of one). An oversized envelope is quarantined before per-record traversal.
- Any malformed, cyclic, accessor-bearing, prototype-polluted, unknown-version, duplicate, mixed-validity, adapter-failed, or future-timestamp envelope leaves the new live cache/order/settlement metadata empty and clean. No adapter `set()` cleanup is attempted from `init()`.
- `init()` remains a host-startup operation and does not mutate or retain render-root-local `{updated, revision}` objects. Hosts must finish `init()` before creating render roots and must not reuse a pre-init root afterward; deployment already quiesces old roots before switching the store. This preserves the existing root state and reset contract without adding prohibited per-render generation metadata.
- Structurally valid but already stale records are policy misses and are omitted together; they do not make an otherwise valid envelope malformed.

### F3. Restart-stable clock contract

- `ui-cache-model.persistenceClock` is the additive DI surface, defaults to a wrapper around `Date.now()`, and returns Unix-epoch milliseconds in UTC as a nonnegative safe integer. `settlements` is an additive WeakMap from the current `order` Map to bounded pair records; `persistenceObserved` is an additive WeakMap from that Map to the generation's numeric high-water. `init()` and cold host/engine reset replace both WeakMaps; warm cache reuse preserves them.
- All processes sharing a store must configure clocks on the same epoch and keep them nondecreasing across process restarts. Process-monotonic clocks whose epoch resets at boot are invalid for this boundary.
- Clock-function identity is never serialized and never used to interpret persisted time.
- The model detects regression among observations made in one live cache generation. The numeric high-water is independent of persistence-clock function identity, so replacing the function cannot reset the floor. On reload, any settlement later than the current persistence-clock reading is a future/regression failure for the whole envelope.
- Init commits `persistenceObserved = now` only with an atomically accepted candidate generation, including a fully valid all-stale/`ttl = 0` batch. Malformed, future, failed, or discarded candidates leave no high-water on the live empty generation. Direct/set/complete publication advances it only after content, order, PM freshness, and settlement metadata all commit.
- Invalid, missing, throwing, negative, fractional, non-finite, unsafe, future, or observed-regressing readings fail fresh without publishing or throwing solely because persistence cannot be used.
- No save-time, init-time, hit-time, render-start, random, or fallback timestamp is substituted.
- A restart regression that remains at or above every retained `settledAt` is mathematically undetectable without persisting a non-settlement high-water, which this bounded schema intentionally does not do. Correct age across restarts therefore requires the documented nondecreasing Unix-ms host clock; the runtime rejects every detectable future or live-generation regression.

### F4. Successful publication time

- A direct `set()` obtains one opaque process-clock sample first, then the absolute timestamp at the successful `put()` publication. Sampling process time first is conservative: time spent before the later absolute sample can only shorten, never extend, restored life.
- The published low-level `put(language, cid, scopedVariant, html[, processAt])` signature remains compatible. A valid direct `put()` obtains its own absolute settlement timestamp at successful publication while honoring the supplied/derived process-local timestamp exactly as today; invalid/unscoped coordinates return before either clock or metadata is touched.
- A plugin render obtains it only in `complete()`, after staging and all handler/event lifecycle work have succeeded and immediately when the fragment is committed.
- `complete()` re-derives the current discriminator and requires it to reproduce the tenant prefix already embedded in the staged scoped variant before any clock/state/publication work. Removing or mutating scope after stage therefore resolves the leader's ordinary output without shared publication. `abort()` still detaches/rejects the exact acquired lease even when its context later becomes invalid, because cleanup is not cache participation.
- `abort()`, handler/event failure, invalid scope, `ttl = 0`, failed process-clock policy, failed persistence clock, pending purge, late completion, or replaced cache/order does not publish content or timestamp metadata.
- An O(1) hit validates that its absolute pair still binds the exact order-record object, cache-store identity, and current HTML value before consulting process freshness. A mismatch forgets both metadata owners, prunes the unauthenticated bytes, and marks dirty exactly like expiry. A valid hit only moves the existing `order` record to MRU; neither absolute timestamp nor process-local expiry moves.
- `save()` serializes the stored settlement time and never samples the clock.

### F5. TTL restoration under current policy

At `init()`, obtain one opaque current process-time sample first, then let `now` be one later persistence-clock reading for the entire batch and `age = now - settledAt`:

- Finite `ttl > 0`: records with `age < ttl` may load. The PM-owned `restore()` seam constructs an opaque process-local insertion point equivalent to `currentProcessClock - age`, using the current process clock identity only in memory; UI-cache never constructs or reads that representation. Records remain usable for exactly `ttl - age` under PM's existing strict `< ttl` boundary.
- `age >= ttl`: the fragment is neither published into live cache/order nor served.
- `ttl = 0`: no settled persisted record is retained.
- `ttl = Infinity`: all structurally valid, nonfuture records load as explicitly non-expiring, while their original absolute timestamps remain persisted so a later restart under finite policy can evaluate them. Changing an already-live Infinity stamp to finite remains the existing process-local fail-fresh behavior.
- Invalid TTL continues to fail fresh through `promise-cache-model` policy.
- A TTL change between save and restart evaluates the original settlement under the new value; saved TTL is never part of the wire.
- `promise-cache-model.restore(owner, age, sampledTime)` validates a nonnegative safe elapsed age against the current finite/zero/Infinity policy and returns an opaque process-local insertion record or `undefined`. `ui-cache-model` obtains one opaque `time(owner)` sample for a deterministic init batch, passes it back for every age, and never reads or constructs the sample/record's fields.
- `promise-cache-model` remains the sole owner of process-local `fresh()`/`live()` decisions, strict `< ttl`, non-sliding hits, clock-identity checks, restored timestamp representation, and finite/zero/Infinity policy.

### F6. Live metadata pairing and cleanup

- Absolute settlement records are retained in exported reset surface `settlements`, a WeakMap keyed by the current `order` Map, with at most one record per live ordered fragment. Persistence-clock high-water lives in `persistenceObserved`, independently of clock-function identity.
- One shared effective-limit rule applies to live publication/LRU eviction, render-flight bounding, init validation, settlement metadata, and save validation: a positive safe-integer `max`, otherwise one. This closes the current `NaN`/`Infinity` live-growth hole while preserving `max = 0` behavior in which the just-added entry survives and older entries are evicted.
- Each record binds the exact order-record object, current cache-store identity, exact HTML value, and absolute timestamp. It cannot authenticate an orphan key, a replaced order record, a replaced cache object, or different host-replaced bytes.
- New fragments are made observable only after content, order, promise-cache metadata, and settlement metadata form a complete pair. Failed publication removes the incomplete candidate and fails fresh. Nested writes use own data properties (not assignment to `__proto__`), and reads used by hit/load/save accept only own data descriptors; exact `__proto__`, `constructor`, and `prototype` coordinate strings remain valid identities without mutating/traversing prototypes.
- Expiry, replacement, LRU eviction, exact purge, full purge, and init reset remove process freshness and absolute settlement metadata with the corresponding content/order identity.
- Exact purge and full purge retain current dirty-tracking semantics; pending-only purge does not invent settled metadata or dirty persisted bytes.
- No new per-render retained state is added. Existing lease and iteration objects remain unchanged.

### F7. Immutable failure-atomic save

- `save(v)` first validates a scoped root exactly as today. An unscoped/malformed root returns before cache/order/metadata or adapter access.
- If dirty and an adapter exists, synchronously traverse authenticated live state: bounded `order` plus a same-sized settlement Map. Require `order.size <= effective max`, settlement size equality, and for every order record one own data-property cache value plus its exact bound settlement record. Serialize exactly those ordered records. Do not enumerate or persist arbitrary untracked host-inserted nested cache keys; an attempted hit on such bytes fails pair validation and prunes them.
- A mismatch, accessor, polluted live structure, invalid timestamp, orphan record, oversized state, or unsupported HTML value causes a non-throwing save miss and leaves dirty state set for operator repair/retry. No adapter call occurs.
- Freeze every record, the fragments array, and the envelope before the adapter call. Call `saveModel.set(payload)` exactly once and await it.
- Mutation during the await cannot change the supplied payload. A mutation in any root still marks that root dirty; a same-root revision change prevents clearing its prior dirty bit. Independent concurrent `save()` calls retain their current immediate adapter-call timing and each receives a complete immutable snapshot.
- A configured adapter's synchronous throw or rejected `set()` propagates as today and does not clear dirty state. When no adapter is configured, `save()` remains the current no-op durability boundary: it does not throw and clears an unchanged root-local dirty bit after the attempted save lifecycle.
- External ordering, cancellation, and atomic durability across concurrent `set()` calls remain adapter-owned. A durable adapter must serialize/compare-and-swap its own writes or otherwise preserve invocation order; the framework deliberately adds no unbounded waiter queue, timer, or generic persistence transaction layer.
- With a configured adapter, only an unchanged root revision after one successful `set()` clears that root's dirty flag. Without an adapter, the existing unchanged-revision no-op cleanup remains compatible.
- The framework guarantees a complete paired payload at the call boundary, not external transactional durability inside a host adapter.

### F8. Compatibility

- Preserve exported in-memory `cache` as `{language:{cid:{scopedVariant:html}}}` and preserve fragment bytes.
- Preserve singleton/module export identities; existing public fields/methods remain present with compatible normal calls. The persistence clock and weak timestamp metadata are additive internal/DI surfaces.
- Preserve live `cache` and `order` identities across hits, publication, save, and exact purge; preserve existing init/full-purge replacement semantics.
- Preserve deterministic LRU, max eviction, exact scoped keys, write-once semantics, sequential/concurrent dedupe, leases, event ordering, `cid`/`cs`, `v.r`, language, parent/root context, dirty/revision timing, and plugin after-view fire-and-forget save behavior.
- Preserve isolation across explicit tenant, origin, and base discriminators and the fail-closed behavior for missing/malformed scope.
- Do not change request-model URL/SSRF policy, manifest behavior, parsers, transport caching, UI resolver/compiler boundaries, handler traversal, binding identities, or any published export.

## Non-Functional Requirements

- **Time:** normal cache hit remains O(1); publication/purge remain O(1) per exact identity; init/save may be O(n) over `n <= effective max`.
- **Space:** one bounded absolute settlement record per live fragment; no timers, refresh jobs, unbounded parser traversal, generic migration registry, or extra per-render lease fields.
- **Atomicity:** no live partial load and no adapter payload with unpaired HTML/timestamp fields.
- **Availability:** corrupt/unavailable persistence yields a cold cache, not render failure. Ordinary fresh rendering continues.
- **Security/privacy:** invalid provenance and malformed scope do not read, write, refresh, migrate, clean, persist, timestamp, or mutate shared state. Persisted activity time receives the same confidentiality, access, erasure, and retention controls as its fragment.
- **Runtime:** pure CommonJS and dependency-free `src/`; no imports, timers, handwritten TypeScript/declarations, or third-party packages.

## Affected Components

| Component | Planned change | Risk |
|---|---|---|
| `src/models/promise-cache-model/src/promise-cache-model.js` | Minimal opaque remaining-age restoration seam owned with TTL/clock policy | Medium |
| `src/models/promise-cache-model/package.json` / README / focused tests | Patch to `1.0.3`, contract and direct boundary proofs | Low |
| `src/models/ui-cache-model/src/ui-cache-model.js` | Wire validation/snapshot, absolute clock/metadata, remaining-TTL load, paired cleanup | High |
| `src/models/ui-cache-model/package.json` | Incompatible wire major to `2.0.0` | Medium |
| `src/models/ui-cache-model/README.md` | Wire, clock, migration, cleanup, deployment, privacy, rollback | Medium |
| `src/plugins/ui-cache-plugin/package.json` | Patch plus direct range `@jtorm/ui-cache-model: ^2.0.0` | Low |
| `src/plugins/ui-cache-plugin/README.md` | Publication/save timing and deployment compatibility | Low |
| `test/helpers/engine.js` | Reset/inject absolute persistence clock and weak metadata | Medium |
| `test/policy-ownership.test.js` | Ratchet PM/UI/plugin versions, dependency floors, and PM-owned restore seam | Low |
| `test/pipeline/ui-cache.test.js` | Preserve the default-null language compatibility proof under exact wire v1 | Medium |
| Focused model/plugin/pipeline tests | Red defect, schema/adversarial/concurrency/lifecycle proofs | Medium |
| `test/fixtures/ui-cache-persistence-v1.json` | Exact wire golden | Low |
| `test/fixtures/ui-cache-persistence-migration.json` | Legacy quarantine and trusted-timestamp migration golden | Low |
| `test/fixtures/ui-cache-persistence-rollback.json` | Older-reader isolation and rollback-order golden | Low |
| `README.md`, `AGENTS.md` | Host and locked architecture contract | Medium |
| Architecture feature/evaluation/security/ledger records | Completion evidence and next-follow-up status | Low |

## Dependencies and Delivery Order

- **Depends on:** merged PR #59 fail-closed discriminator boundary and merged PR #61 TTL/purge policy. Both are present on current `dev`.
- **Direct runtime dependencies:** injected `promise-cache-model`, `render-context-model`, `request-model`, and host `saveModel`; no new dependency. UI-cache raises its existing promise-cache floor to `^1.0.3`.
- **Direct consumer requiring a range change:** `@jtorm/ui-cache-plugin`.
- **Blocks:** no current work. Stale-while-revalidate/HTTP validators remain a separate P4 follow-up.
- **Critical path:** red model regression -> core schema/age implementation -> adversarial/lifecycle tests -> pipeline restart proof -> docs/package gates -> reviews/CI/Codex.

Host deployment order:

1. Quiesce old writers or disable fragment persistence/plugin save participation.
2. Provision a new store namespace or cold-clear the old store. Alternatively, externally construct wire v1 only from trustworthy original settlement timestamps.
3. Deploy the host reset/clock DI and `@jtorm/ui-cache-model` 2.x together; deploy `@jtorm/ui-cache-plugin` with its 2.x model range in the same resolution set.
4. Define an own data-property `saveModel.uiCacheScoped = true`, verify the adapter returns wire v1, then run `init()`.
5. Re-enable writes. Old and new readers must not share one store during a rolling interval.

## Public API / Compatibility Contract

There are no HTTP endpoints or request/response changes. The save-adapter payload is the changed public API:

```js
await saveModel.set(Object.freeze({
    version: 1,
    fragments: Object.freeze([
        Object.freeze({language, cid, variant, html, settledAt})
    ])
}));
```

Adapter method names and call counts remain `get()` once at init and `set(payload)` once per successful dirty save. `get()` may return synchronously or by native Promise, including a cross-realm Promise, because `init()` is already async; arbitrary thenables are rejected without accessor evaluation. `cache`, `order`, `get`, `set`, `put`, `complete`, `abort`, `save`, `purge`, `purgeAll`, and state/reset identities remain available.

## Migration, Cleanup, and Rollback

### Upgrade migration

- Unversioned nested stores are quarantined even when the adapter is scoped-only and owns `uiCacheScoped === true`; the runtime never assigns them `Date.now()`.
- Default migration is cold-clear/replace, followed by new-version writes.
- An external migration may create exact wire-v1 entries only when the host can prove each fragment's original successful settlement Unix timestamp. File mtime, migration time, restart time, read time, or a guessed fallback is not trustworthy.
- Invalid/quarantined stores are not rewritten by `init()`. Structurally valid stale records disappear from live state and are cleaned from external storage on a later successful dirty save or explicit host clear.
- Exact/full purge removes live content and timestamp records; operators persist a purge by awaiting `save(scopedRootView)` as before.

### Rollback

| Item | Contract |
|---|---|
| Code rollback | Disable persistence first; do not start an older reader against wire v1. |
| Schema rollback | Clear the v1 store or restore a known compatible legacy snapshot in an isolated namespace before pinning 1.x. |
| Data rollback | Fragment data is disposable cache state; cold-clear is the safe default. Restore only a format known to the target reader. |
| Auto-rollback trigger | Host-owned: adapter/init error or fragment-render regression should disable persistence and cold-render; framework adds no monitoring system. |
| Manual runbook | Package/root README migration and rollback section added in this change. |
| Drill expectation | Stage a v1 write/read, disable persistence, clear/restore compatible storage, then start the old reader; never assume old code safely ignores the new envelope. |

`ttl = Infinity` is only an expiry-policy rollback within 2.x. It is not a wire-format rollback. Older readers may interpret the envelope as language/cid content, so clearing/restoring/disabling persistence is mandatory before downgrade.

## Privacy Contract

`settledAt` reveals when a rendered fragment was successfully published and is therefore persisted activity metadata. It must share the fragment's tenant isolation, store access controls, encryption-at-rest choice, retention, backup, erasure, and incident-response boundary. The framework does not log, aggregate, copy, or persist the timestamp separately. Purge removes the timestamp with the fragment from the next saved envelope. Hosts should minimize store retention and ensure backups/replicas follow the same deletion policy; timestamps must not be repurposed as analytics.

## Security Assessment

**Threat-model record:** `feature-reviews/persisted-ui-fragment-age-security-review.md` (created and approved before runtime implementation).

### Data flow and trust boundaries

```text
successful scoped render
  -> ui-cache live content + absolute settlement metadata
  -> immutable wire-v1 snapshot
  -> [host saveModel trust boundary / external persistence]
  -> adapter get after restart
  -> provenance + whole-envelope + clock + TTL validation
  -> atomically published live cache/order/process freshness
  -> scoped warm hit
```

Assets are fragment HTML (tenant-scoped rendered content), scoped identity, original activity time, LRU order, dirty/revision state, and availability of cold rendering. Threat actors are a compromised/misconfigured adapter, cross-tenant caller lacking a discriminator, prototype-polluted host state, corrupted external store, and an operator performing an unsafe rolling upgrade/rollback.

### STRIDE pre-analysis

| Category | Threat | Severity | Required control / test |
|---|---|---:|---|
| Spoofing | Inherited attestation/version or malformed scope pretends to be an authorized store/tenant | High | Own data-property attestation; exact own version; discriminator-first no-touch tests |
| Tampering | Adapter changes HTML/timestamp pairing, uses accessors/prototypes/cycles, or async save observes mixed revisions | High | Exact bounded full validation; structural pairing; frozen disconnected snapshot; mutation/rejection tests |
| Repudiation | Guessed/reload/save timestamps obscure when content actually settled | Medium | Only successful publication stamps; documented trusted-clock/migration provenance; deterministic golden |
| Information disclosure | Cross-scope persisted fragment or activity timestamp is consumed by another tenant | High | Existing exact scoped variant and strict root; no unscoped adapter/state access; isolation and privacy tests |
| Denial of service | Oversized/cyclic/accessor payload or corrupt clock exhausts init/blocks rendering | Medium | Length pre-bound by max; nonrecursive descriptor validation; cold fail; no timers/retries |
| Elevation of privilege | Legacy/unknown store bypasses schema gate and gains shared-cache authority | High | Unknown/unversioned quarantine; no automatic migration; deployment/rollback isolation |

All controls are mandatory implementation/test items. There is no accepted unresolved High/Medium threat.

## PASTA / Adversarial Summary

1. **Business objective:** enforce configured fragment freshness across restarts without breaking scoped warm reuse.
2. **Technical scope:** the UI fragment live/persistence boundary only; no fetch/manifest/HTTP validator changes.
3. **Decomposition:** publication -> live pair -> immutable adapter envelope -> untrusted reload -> validation -> local TTL restoration.
4. **Threat analysis:** provenance spoofing, pair tampering, timestamp manipulation/regression, cross-tenant disclosure, resource exhaustion, and downgrade confusion.
5. **Vulnerability analysis:** legacy raw shape has no trustworthy age; current init freshens it; live mutable save objects allow async observation; JS prototypes/accessors can disguise wire fields.
6. **Attack enumeration:** polluted prototype supplies attestation/version; mixed envelope publishes valid prefix; future timestamp creates long retention; delayed save invents later age; concurrent mutation pairs newer bytes with old time; older reader consumes v1 as nested cache.
7. **Countermeasures:** own descriptors, exact version/schema, complete bounded staging, trusted absolute settlement clock, pair-bound weak metadata, frozen snapshot, quarantine/cold-clear migration, isolated deploy/rollback, and red/green tests for every path.

Residual host risks are explicit: the framework cannot verify that a host truthfully sets its own attestation, that a supplied absolute clock is globally correct, or that an external adapter commits atomically. The design fails cold at the framework boundary and documents the deployment controls required to contain those risks.

## Trade-offs Considered

| Decision | Alternatives | Why selected |
|---|---|---|
| Flat LRU-ordered records | Nested content plus parallel timestamp tree; timestamp keyed by composite string | One record structurally pairs identity/bytes/time, prevents orphan authentication, preserves deterministic LRU, and simplifies whole-envelope validation. |
| Absolute Unix epoch at persistence boundary | Serialize promise-clock identity; process monotonic epoch; relative remaining TTL | Only a restart-stable epoch can compare across processes and apply a newly configured TTL to original age. Function identity/remaining TTL would be process/save-policy specific. |
| Add PM `restore()` seam | UI synthesizes `{clock,value-age}`; move all TTL checks into UI model | An opaque PM-owned restoration operation preserves its internal record shape, strict boundary, zero/Infinity policy, non-sliding behavior, and clock-identity ownership. |
| Whole-envelope quarantine | Load valid entries from a malformed batch | Prevents attacker-controlled valid-prefix publication and guarantees no partial cache/order/timestamp state. Stale-but-valid entries remain a separate TTL policy exclusion. |
| Cold-clear legacy default | Treat migration/init time as settlement; infer from file metadata | Legacy stores lack trustworthy publication age. Any fallback silently recreates the defect and can extend stale content. |
| Frozen snapshot before set | Pass live cache plus parallel metadata; adapter transaction API | A disconnected immutable envelope guarantees in-process pairing with one unchanged adapter call and no generic persistence framework. |
| Major model version | Patch/minor despite payload break; compatibility shim | Direct adapter consumers observe the payload. SemVer must communicate incompatibility, and older readers cannot safely auto-detect it. |
| No saved clock high-water | Add `savedAt` or reload marker | Save/reload timestamps are explicitly not settlement time, increase activity metadata, and cannot replace the documented nondecreasing clock contract. Future checks plus live observation catch detectable regressions. |

## Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | UI cache model's injected promise-cache/render-context/request models, native Map/WeakMap/Object descriptors, host save adapter and absolute clock |
| Direct dependents | UI cache plugin, host DI/reset wiring, direct adapter consumers, focused/pipeline tests |
| Cascade on outage | Persistence get/set failure yields cold rendering or dirty retry; normal render path remains available |
| Cascade on slow | `init()`/explicit save awaits the host adapter as today; plugin save remains non-awaited after-view work; no request-path timer/job is added |
| Cascade on bad data | Bad envelope is quarantined before live publication; no prefix, dirty, or cleanup mutation propagates |
| Compromised-session impact | No unscoped cache access; impact remains limited to exact explicit tenant/origin/base discriminator identities already authorized by request policy |
| Fault isolation boundary | Descriptor/version/clock/TTL gate at `init()`, immutable payload at `set()`, existing render lease/event abort boundary, cold-render fallback |

## Risk Assessment

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Older reader consumes new envelope incorrectly | Medium | High | Host operator | Major SemVer, isolated store/deploy order, mandatory clear/restore/disable before rollback |
| Host absolute clock regresses or uses boot-relative epoch | Low | High | Host operator | Explicit Unix-ms precondition, safe/future/live-regression checks, cold failure tests/docs; regressions still above all settlements are documented as undetectable without forbidden extra high-water metadata |
| Corrupt envelope partially publishes | Medium | High | UI cache model | Whole-envelope bounded staging and atomic swap; mixed/adversarial tests |
| Async save pairs old time with new bytes or clears dirty mutation | Medium | High | UI cache model | Pair-bound metadata, frozen snapshot, revision gate, concurrent mutation/rejection tests |
| Timestamp increases privacy footprint | Medium | Medium | Host operator | Same isolation/retention/erasure as fragment; no logging/analytics/parallel storage |
| Additional validation makes init/save expensive | Low | Medium | UI cache model | `n <= max`, O(n) only at init/save, normal hits unchanged O(1), no recursion/timers |
| Max reduction makes old envelope oversized | Low | Low | Host operator | Fail cold by design; clear/rewrite store under the new bound |

## Implementation Plan and Checkpoints

1. **Red defect and contract tests**
   - Add focused persistence tests that demonstrate the current full-TTL restart defect, boundary behavior, save delay/non-sliding hits, TTL changes, zero/Infinity, invalid time/version, legacy quarantine, hostile envelopes, async saves, lifecycle cleanup, LRU/identity/dedupe/isolation compatibility.
   - Add exact v1 and legacy fixtures plus pipeline restart tests.
   - Run the current code and record the expected failures before runtime edits.
2. **Core schema and absolute-age restoration**
   - Add and directly test `promise-cache-model.restore(owner, age, sampledTime)` as the only owner of current-policy/backdated local insertion records.
   - Add absolute persistence clock observation and pair-bound weak metadata.
   - Add descriptor-safe bounded wire parser/candidate builder and atomic init publication.
   - Reconstruct current-process insertion records from persisted age and current TTL.
3. **Publication, save, and cleanup atomicity**
   - Stamp at direct/plugin successful publication only.
   - Remove paired metadata in all expiry/replacement/eviction/purge/reset paths.
   - Build/freeze/validate one save envelope and preserve dirty state on mutation/configured-adapter rejection while retaining absent-adapter no-op cleanup.
4. **Host/package/docs integration**
   - Update harness reset/clock wiring, package versions/ranges, READMEs/root/AGENTS, fixtures, backlog and evaluation/security/ledger records.
5. **Autonomous review and delivery**
   - Apply every requested review/static/production gate, fix findings red-first, run the exact verification matrix, commit intentionally, push, open a ready PR into `dev`, and iterate CI/current-head Codex review to green/clean without merging.

## Test Strategy and Acceptance Matrix

### Focused model contract

- Red-first: settle at `t0`, save, restart at `t0 + ttl - 1`, observe current incorrect extra full TTL; fixed code permits only one remaining unit.
- Restart exactly at and after `t0 + ttl`: no serve and no live cache/order/process/absolute timestamp retention.
- Save at `t0 + delay`: wire retains `settledAt = t0`; repeated hits preserve the same timestamp and strict expiry.
- Direct low-level `put()` retains its existing optional process timestamp signature, publishes one matching absolute timestamp only for valid scoped coordinates, and round-trips primitive/null language/cid through the canonical wire property-key strings.
- Positive, zero, negative, fractional, nonnumeric, `NaN`, and `Infinity` max configurations all use the same bounded rule across content/order/flights/settlements/init/save; invalid/zero values retain exactly the newest one-entry compatibility behavior.
- Restart under shorter/longer TTL, `0`, and `Infinity`; persist under Infinity and then restart under finite policy to prove original-age evaluation.
- Invalid/missing/negative/fractional/non-finite/unsafe/future settlement time, throwing/invalid/regressing clock, and unknown version fail cold.
- An own attested but unversioned legacy fixture is quarantined without a clock read or adapter write.
- Malformed, cyclic, accessor-bearing, prototype-polluted, oversized, rejected-get, duplicate, and mixed-validity envelopes leave empty clean identities and no partial metadata.
- A delayed async `get()` cannot overwrite a fragment, purge/replacement, or newer init that changed the empty generation while load was pending.
- Invalid/unversioned/rejected init creates no render-root dirty state; hosts finish init before creating roots and never reuse a pre-init root.
- Save mutation and configured-adapter rejection preserve dirty retry state; an absent adapter preserves the current unchanged-revision no-op cleanup. Every adapter call receives one frozen consistent snapshot, and newer bytes never use an older fragment's timestamp.
- Concurrent saves from distinct roots retain immediate call timing and each adapter argument is a separately frozen, internally consistent byte/timestamp snapshot; external commit ordering is explicitly tested/documented as the adapter's durability contract.
- Expiry, exact/full purge, LRU eviction, handler/event failure, abort, pending purge, late completion, cache/order replacement, and save failure leave no orphan timestamp record.
- Removing or changing the discriminator after stage but before `complete()` prevents all clock/state/content/timestamp publication, while `abort()` still removes the exact lease under an invalidated context.
- Same-object host byte replacement or settlement-map replacement fails O(1) pair validation, is pruned/marked dirty, and is never served or persisted with stale metadata.
- Exact magic coordinate strings (`__proto__`, `constructor`, `prototype`) round-trip without prototype mutation, inherited lookup, rejection, or identity collapse.
- Existing write-once, output bytes, sequential/concurrent dedupe, live LRU, cache/order identity, event timing, and plugin save timing remain pinned.
- Exact explicit tenant, origin, and base scopes remain isolated; missing/malformed scope cannot touch adapter/clock/live state.

### Pipeline integration

- Persist one scoped rendered fragment, reset singleton/process metadata to simulate restart, load just before expiry, and reuse it for only the remaining lifetime.
- At expiry, source changes are freshly rendered and then become the new cached publication.
- An unscoped same-language/cid/variant render never consumes or mutates the persisted scoped fragment.

### Verification commands

- Focused promise-cache restoration/TTL, UI-cache model/plugin, discriminator, TTL/purge, wiring, isolation, and pipeline tests with exact `node --test` file paths.
- Exact `npm test`.
- `npm run typecheck`.
- `npm pack --dry-run` for every changed package.
- JavaScript syntax checks and source guards (including zero `require()` in `src/`, no handwritten TS/declarations, and persistence-schema ratchets).
- Semgrep, insecure-defaults, safety-friction, differential/security review, dependency audits, JSON/JSONL validation, and `git diff --check`.
- Ready PR CI plus clean Codex review on the current head and zero unresolved threads.

### Mandatory review/static gates

- Route the final diff with `review-router`, then apply `review-architecture`, `differential-review`, and `review-refactor` until they report no valid findings.
- Apply `insecure-defaults`, `safety-friction-audit`, `review-privacy`, and `review-infrastructure`; reconcile every finding with the fail-closed/persistence/privacy/deployment contracts.
- Re-run the applicable `threat-model-deep-dive` against the implemented boundary and update this spec/security record for any design deviation.
- Apply `tech-debt-ratchet`; apply `source-ratchet-review` to the new wire/source guards if the router confirms applicability.
- Run the `semgrep` skill/scanner and `production-readiness` gate, then repeat affected focused/full checks after every fix batch.
- Validate changed JSON and review-ledger JSONL structurally, run dependency audits for the root and changed packages, and retain exact command/output evidence in the completion evaluation/ledger.

## Success Criteria

- [x] Under the required restart-stable nondecreasing Unix-ms host clock, a persisted fragment's total reusable lifetime never exceeds the current TTL measured from original successful publication across any number of restarts; all detectable future/live regressions fail cold.
- [x] Exact/after TTL boundaries miss and leave no live content or timestamp metadata.
- [x] Save delay, init, and hits do not change `settledAt`.
- [x] All invalid/legacy/hostile envelopes fail cold atomically and within `max`.
- [x] Scoped provenance, isolation, publication lifecycle, LRU, leases, write-once, dirty/save, and public in-memory contracts remain compatible.
- [x] The exact v1 golden, migration fixture, rollback/deployment/privacy guidance, and major SemVer contract are published.
- [x] Architecture weakness #12 remains closed; only this P4 item is marked complete; stale-while-revalidate/HTTP validators remain a named independent follow-up.
- [ ] Every requested review and verification gate is clean, CI is green, and Codex approves the current PR head with no unresolved findings.

## Open Questions

None. No product-level choice remains unresolved.

## Plan Quality Gate

**Scope tags:** SECURITY, INFRA (persistence trust boundary and deployment/rollback contract; no DB, route, frontend, payment, or external-request change)
**Gate status:** PASSED - independent explorer and architect reviews clean
**Personas applied:** architect, backend-architect, planner, security-architect, threat-modeling-enforcer, platform-engineer, code-review-enforcer, tdd-guide; Elysia/Bun/TypeScript guidance was reviewed and marked N/A where it conflicts with this pure-Node/CommonJS repository.
**Threat-model depth:** Full STRIDE and PASTA because persisted timestamp/schema semantics alter a trust-boundary contract.
**Authorization:** The user explicitly directed autonomous continuation after spec self-review; no additional approval pause is required.

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | UI persistence remains in its existing owner; process TTL remains in promise-cache; no imports/new framework |
| Consistency | 10/10 | Existing singleton, DI, terse CommonJS, LRU, lifecycle, and test conventions retained |
| Type Safety | 10/10 | Pure JS boundary uses exact runtime descriptor/type guards; no handwritten TS/d.ts |
| Validation | 10/10 | Complete descriptor-safe version/envelope/clock validation before publication |
| Error Handling | 10/10 | Corrupt/unavailable persistence fails cold; save rejection retains dirty and propagates consistently |
| Security/Privacy | 10/10 | Own provenance/version gates, exact scope, hostile-envelope controls, timestamp privacy/deletion contract |
| Performance | 10/10 | O(1) hits; O(n <= max) init/save; bounded weak metadata; no timers/jobs/recursion |
| Maintainability | 10/10 | Flat paired schema and one owner avoid parallel-wire coupling/generic persistence machinery |
| Testability | 10/10 | Deterministic dual clocks, exact fixtures, red defect, adversarial/unit/pipeline/lifecycle coverage |
| Readability | 10/10 | Explicit public field names and documented invariants; implementation will match local terse style |
| **Total** | **100/100** | **Independent spec review incorporated; approved to implement** |

## Progress Log

### Research Mode
- [x] Confirmed PR #61 merged and updated local `dev`
- [x] Branched from current `dev`
- [x] Mapped relevant source, host wiring, persistence adapters, and tests
- [x] Read P4 and prerequisite policy/discriminator/TTL-purge records

### Plan Mode
- [x] Wrote complete feature specification
- [x] Completed primary self-review against required personas/checklists

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant persona/checklist guidance applied
- [x] All 10 dimensions reach plan-level 10/10
- [x] STRIDE and PASTA pre-analysis complete
- [x] Independent code-explorer/code-architect review incorporated
- [x] Approved under the user's explicit autonomous authorization

### Design Mode
- [x] Recorded architecture, clock, wire, migration, rollback, privacy, resource, and failure-atomicity constraints
- [x] Independent architecture and threat-model review complete

### Implement Mode
- [x] Checkpoint 1: red-first defect proof
- [x] Checkpoint 2: core wire-schema and absolute-age logic
- [x] Checkpoint 3: validation, failure atomicity, save concurrency, purge edges
- [x] Checkpoint 4: host integration, package metadata, and documentation

### Test Mode
- [x] Focused tests passing (144/144)
- [x] Exact full tests passing (706/706 after current-head review fix)
- [x] Typecheck and three package dry-runs passing

### Review Mode
- [x] Requested review skills complete
- [x] Security/static analysis gates complete
- [x] 100/100 code quality
- [x] Verification loop passed

### Documentation/Delivery Mode
- [x] Architecture, migration, rollback, security, evaluation, and ledger records updated
- [x] Ready PR #63 opened into `dev`
- [ ] CI green
- [ ] Clean Codex review on current head with zero unresolved threads
