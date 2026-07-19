# Feature Development: HTTP Validator Acquisition Caches

**Status:** IMPLEMENTED — ready PR #69; GitHub gates are authoritative
**Claimed:** 2026-07-19T09:06:42Z
**Agent:** Codex `/root`
**Current Mode:** Documentation and delivery
**Worktree:** `/tmp/jtorm-http-validators`
**Branch:** `feat/http-validator-acquisition`
**Base:** `origin/dev` at `83c5ef62ae4cf29e0eceb3eb54263c6c16fac556`

---

## Resumption Context

**Last Completed Mode:** Review and local verification (100/100)
**Current Mode:** Documentation and delivery
**Next Action:** iterate PR #69 current-head CI and Codex review to green/clean.
**Implementation:** request-model conditional parsing, promise-cache exact-generation transactions,
four safe acquisition bridges, deterministic engine support, package releases, and focused
model/pipeline/policy tests are complete.
**Verification:** focused validator/regression suite 229/229, exact `npm test` 897/897,
`npm run typecheck`, syntax/diff checks, six package dry-runs, zero-vulnerability audits,
83-rule Semgrep, source-ratchet convergence, and full-feature tech-debt ratchet all pass.
**Review findings fixed:** ten design findings and six implementation findings, including request
and manifest TOCTOU observations plus exact base-validator detachment. Every implementation finding
received a failing test before its fix.
**Remaining gates:** ready PR, green current-head CI, clean current-head Codex review, and zero
unresolved threads. The PR must not be merged.

---

## Research Summary

- **Modules involved:** `@jtorm/request-model`, `@jtorm/promise-cache-model`, data/HTML/TSS acquisition owners, `@jtorm/ui-manifest-model`, the engine DI/reset harness, and their focused model/pipeline/policy tests. Rendered-fragment cache/persistence is a regression boundary only.
- **Current request flow:** each acquisition owner derives `requestModel.cacheKey(url, context)` before delegating to `promiseCacheModel.get(owner, key, collaborators)`. Its loader then uses `requestModel.get(...).json()` or `.text()`, which resolves URL/timeout, awaits `allow(resolvedUrl, context)`, invokes the injected transport, rejects every non-`ok` response, and returns parsed bytes. The response status and headers are not currently exposed after parsing.
- **Current cache representation:** each safe acquisition owner exports a live bounded `Map<scopedKey, Promise>`. Promise-cache side metadata is a `WeakMap` keyed by the exact current Map, then exact key/promise/token generation. Settled records own pending state, successful absolute timestamp, optional scope, and at most one SWR refresh descriptor; public values remain unchanged.
- **Current publication:** cold fulfillment stamps only when the current owner Map/key/promise/token still match. SWR fulfillment replaces the public Map promise and record only after loader fulfillment and exact old-generation/refresh-token checks. Rejection, purge, purge-all, eviction, reset, Map replacement, and newer insertion detach publication authority.
- **Current freshness:** successful settlement starts strict absolute TTL; ordinary hits never slide it. A positive opt-in `staleWindow` returns the old generation while one unchanged loader refreshes; hard callers join replacement work. A successful refresh begins a new TTL at fulfillment.
- **Current scope/policy:** undefined/malformed authority bypasses shared state entirely. Explicit tenant/origin/base values form the request-model key. Data/HTML/TSS cache admission is key-at-call and each actual acquisition still passes `requestModel.fetch()` URL policy. Manifest packs additionally run an awaited per-hit URL guard and immediate exact captured-key rederivation before current-generation reuse/refresh.
- **Current validation:** data uses response JSON parsing, HTML returns response text, TSS parses text before fulfillment, and UI-manifest text must pass text limits, JSON parse, expected/declared/computed digest, schema, structure, value hashes, and bounds before pack fulfillment. Optional manifests fall through only for acquisition-classified failures; received invalid content fails loud.
- **Current invalidation boundary:** exact/full purge removes only future acquisition-cache participation. Root-local manifest indexes, already returned values, and rendered/persisted fragments have independent owners and lifetimes. Rendered-fragment SWR and persistence are explicitly outside this feature.
- **Public compatibility:** request `get(url, context).json()/text()`, cache `Map<key, Promise>`, successful value identities/shapes, singleton exports, method signatures, URL policy, parsers, and runtime manifest wire version are published constraints. Runtime source is dependency-free CommonJS with DI and no `require()` below `src/**/src`.
- **Package baseline:** request-model `1.1.5`; promise-cache, data, HTML, TSS, and UI-manifest models `1.1.0`. The four acquisition owners require promise-cache `^1.1.0` and request-model `^1.1.5`.
- **Test patterns:** deterministic deferred promises/clocks cover exact TTL/SWR boundaries, concurrent identity, URL-policy/key drift, validation failure, rejection, purge/reset/eviction/Map replacement/newer-generation races, bypass/isolation, root-local manifest state, and downstream fragment independence. The engine replaces cold Maps, calls `reset()`, preserves metadata only for explicit warm reuse, and resets TTL/window configuration.
- **Baseline:** 169/169 explicitly relevant request, promise-cache, SWR, data/HTML/TSS, bypass, manifest, and pipeline tests pass at base `83c5ef62ae4cf29e0eceb3eb54263c6c16fac556`.
- **Constraints discovered:** HTTP validators are the next independent P4 item; persistence, rendered-fragment SWR, timers, retries, new stale fallback, transport cancellation, cache-header policy, runtime imports, and public value wrappers are excluded. Validator metadata must not become a parallel unpaired store or survive generation detachment.
- **Open questions for Plan Mode:** exact opt-in field/default; additive request transport API; bounded metadata grammar; ETag/Last-Modified request precedence; 304 promise/value publication and timestamp; 304 response-metadata replacement/fallback; compatibility with custom request adapters that implement only existing methods; and coordinated package SemVer.

---

## Feature Specification

### Metadata

| Field | Value |
|---|---|
| Feature | HTTP validator integration for safe acquisition caches |
| Priority | P4 architecture backlog |
| Scope tags | SECURITY, INFRA |
| Threat model | `feature-reviews/stride-http-validator-acquisition.md` |
| Reference class | Shared-cache TTL/purge and request-triggered acquisition SWR |
| Relative size | Large: one shared cache protocol, one request protocol, four consumers, cross-cutting race/security tests |
| Approval | The maintainer's explicit end-to-end objective pre-authorizes implementation after this gate passes |

### 1. Problem and Desired Outcome

jTorm hosts that periodically reacquire unchanged data, HTML, TSS, or UI-manifest packs currently download and parse the complete successful body after TTL expiry or during request-triggered SWR. That consumes bytes and parsing work even when the authorized origin can prove the selected representation is unchanged. The desired outcome is an opt-in conditional acquisition path that can publish a successful 304 as a fresh cache generation while reusing only the exact currently authorized content, without changing any non-validator behavior or introducing a second metadata lifetime.

Business outcome: reduce repeat acquisition bytes and parsing work for stable public/static resources. User/host outcome: preserve exact request policy, value/promise contracts, freshness boundaries, and explicit invalidation behavior. Security takes precedence over byte savings: any missing pair, scope drift, detached generation, or malformed validator becomes an unconditional acquisition or error, never synthesized content.

### 1A. Functional Requirements

1. Pair validator metadata atomically with the exact successful acquisition result, scoped key, owner Map, public promise, and current generation record.
2. Accept a 304 only when one recognized conditional header was emitted and the loader transaction still owns matching current authorized content; never synthesize a body or accept an unpaired validator.
3. Run every validator-aware request through request-model URL resolution, timeout, awaited `allow()`, and immediate exact tenant/origin/base cache-key rederivation before transport.
4. On a modified success, stage response validator metadata only after the existing JSON/text/TSS/manifest parse and validation path succeeds; exact-generation fulfillment publishes content and metadata together.
5. Define 304 publication as a successful new generation whose promise adopts the exact prior value and whose TTL begins at exact publication; ordinary hits and refresh start/failure remain non-sliding.
6. Ensure refresh, exact/full purge, eviction, reset, owner Map replacement, rejection, and newer-generation races detach both the validator and its reuse/publication authority.
7. Treat ETag and Last-Modified as opaque response strings with fixed bounds and transport-safe control rejection; do not parse tag strength, dates, or server semantics.
8. Preserve the original loader/request/cache path when validators are absent, false, unscoped, or unsupported by an injected older collaborator.
9. Add no persistence, rendered-fragment SWR, timers, retries, backoff, new stale fallback, redirects/DNS policy, cache-control policy, cancellation semantics, runtime dependency, or runtime import.
10. Publish additive public functionality as minor versions and retain every existing export.

### 2. Scope and Priority

#### In scope

- `@jtorm/request-model`: one additive conditional JSON/text parser facade with bounded response-validator selection.
- `@jtorm/promise-cache-model`: loader-local validator transactions and exact-generation metadata/base-pair ownership.
- `@jtorm/data-model`, `@jtorm/html-model`, `@jtorm/tss-model`, and `@jtorm/ui-manifest-model`: opt-in `validators` configuration and complete 200/304/error integration.
- Cold, hard-expiry, and existing request-triggered SWR acquisitions.
- Deterministic request, cache, owner, manifest, and engine tests plus docs, versions, backlog, security, and evaluation records.

#### Out of scope

- Rendered-fragment cache SWR, validator state, or persistence changes.
- Persistence or serialization of validators, parsed values, cache generations, or process-clock identity.
- Conditional requests for unscoped/bypass acquisitions.
- `Cache-Control`, `Expires`, `Vary`, `Age`, range requests, weak/strong ETag interpretation, Last-Modified date parsing, redirects, DNS resolution, authentication, cookies, or credentials.
- Timers, proactive refresh, retries, retry limits/backoff, stale-if-error, stale fallback beyond existing SWR, cancellation/abort changes, or refresh attribution markers.
- New runtime packages/imports, handwritten TypeScript/declarations, changed exports, or changed manifest wire version.
- Prime/fill of data/HTML/TSS caches from UI-manifest contents.

### 3. Public Configuration and Compatibility

Each participating acquisition singleton adds:

```js
validators: false // exact true opts into validator-aware scoped acquisitions
```

Only `validators === true` enables the feature. Missing, false, truthy non-boolean, unscoped, or collaborator-incompatible configurations follow the existing `requestModel.get(...).json()/text()` loader path with no validator transaction or metadata.

`requestModel.conditional(url, context, options)` is additive and returns the same parser-facade style as `get()`:

```js
const result = await requestModel.conditional(url, context, {
  key: capturedRawRequestCacheKey,
  validator: transaction.validator
}).text();

// modified success, after text parsing
{ status: 200, value: '...', validator: opaqueOrUndefined }

// valid bodyless revalidation
{ status: 304, validator: opaque }
```

`.json()` has the same envelope and parses before returning a modified result. Callers must treat `validator` as opaque and may only pass it to the promise-cache transaction. `conditional()` rejects blocked URLs, invalid or drifted scoped keys, non-success status other than a paired 304, unsolicited 304, and parser failures. It compares the captured key against the already-resolved request URL, never by resolving the original input a second time. The existing `fetch()` and `get()` signatures, outcomes, response parsing, transport options, and default call counts are unchanged.

The `conditional()` contract guarantees that its own 304 envelope follows an actually emitted recognized header and the complete request-model policy/key sequence. Like every existing DI seam, an injected replacement is trusted to honor the method it exposes; owners do not add a second transport receipt or duplicate request policy. Structurally incompatible or absent collaborators use the exact legacy path instead.

`promiseCacheModel.get(owner, key, options)` accepts an additive exact opt-in:

```js
{
  validators: true,
  load: transaction => acquisition(transaction)
}
```

The loader-local transaction has exactly three operations:

- `validator()` returns the opaque validator only while its exact current base pair remains authorized for this Map/key/generation; otherwise `undefined`.
- `accept(metadata)` stages the modified response's opaque metadata for publication with this loader's successful result. It never mutates a Map or current record.
- `reuse(metadata)` verifies the exact current base pair, stages the revalidated metadata, and returns the exact prior public promise. It throws `Cache validator detached` when no matching paired base exists.

When `options.validators !== true`, promise-cache calls `load()` with zero arguments and executes the unchanged state machine. An `undefined` key always bypasses transactions and calls `load()` with zero arguments. Public cache Maps remain `Map<scopedKey, Promise>`, values retain their shapes/identities, singleton exports remain unchanged, and the transaction is not exported or persisted.

### 4. Validator Metadata Contract

- At most one validator is retained per successful generation.
- Selection order is one safe `ETag`, otherwise one safe `Last-Modified`; a valid fallback may be used when the preferred response field is missing, malformed, or oversized.
- An ETag must have one ASCII entity-tag envelope, `W/` optional and one quoted opaque payload. Wildcard `*`, combined/list fields, unquoted tags, controls, non-ASCII wire ambiguity, and trailing material are rejected. The payload is never interpreted or compared for weak/strong semantics.
- A Last-Modified value remains opaque: it is not parsed as a date. It must be a non-empty transport-safe string with no C0 control except HTAB and no DEL.
- Either retained value is bounded to at most 1024 wire bytes. Validation may apply a cheap 1024-code-unit pre-bound before bounded native byte encoding; it never allocates in proportion to an unbounded header.
- Stored metadata identifies only the selected kind (`etag` or `last-modified`) and its opaque value. Conditional emission maps it to exactly one `If-None-Match` or `If-Modified-Since` option header.
- Missing, inaccessible, throwing, malformed, or oversized response metadata is treated as absent, not as a failure of an otherwise valid 200.
- A 200 with absent metadata publishes the new content generation without a validator; it never carries the predecessor's validator forward.
- A 304 always retains the exact validator actually sent. Response validator fields on a bodyless response are ignored, so a rotated or inconsistent response tag can never become paired with predecessor bytes; a later request may receive 200 if the sent validator has become obsolete.
- Validator contents never appear in runtime errors, persistence, cache keys, logs, manifest indexes, or rendered fragments.

### 5. Exact Cache Record and Transaction Model

The existing WeakMap record remains the single policy owner. A settled validator generation is conceptually:

```text
current owner.c Map identity
  + exact scoped key
  + exact public promise/value identity
  + settled generation record/timestamp/scope
  + optional opaque validator
```

No parallel validator Map is permitted. A loader transaction closes over the exact owner Map, scoped key, transaction token, and optional base record/promise/validator. It may recognize only:

1. the exact current pending replacement record that owns that base pair and transaction; or
2. the exact current settled record whose one refresh descriptor owns that transaction.

The base content promise is already successfully settled. Raw response bodies are not duplicated: the atomic content identity is the exact public promise/value produced from that response body after the owner's parser/validator. A validator may never migrate to a different promise/value generation except through the same transaction's successful 304 reuse or validated 200 replacement.

For a hard replacement with a current validator, the transaction initially recognizes only the exact old Map/key/promise/settled-record pair while `load(transaction)` synchronously returns its native promise. `validator()` may read that exact pre-install pair; `reuse()` still requires it to be exact. Promise-cache must recheck that old Map/key/promise/record pair at installation. Only an exact pair transfers into the new pending record and permits public Map/LRU mutation. If synchronous purge/reset/eviction/Map replacement/manual mutation detached the pair, the transaction becomes permanently detached and the loader promise remains caller-only: promise-cache performs no Map, record, LRU, metadata, cleanup, or later publication mutation. Official `conditional()` always yields at awaited `allow()`, so header emission occurs after this decision; a detached transaction returns no validator and the caller-only request is unconditional. A synchronous loader throw removes the old hard-expired generation only if it remains exact and rethrows; it leaves no orphan transaction or cache participation. This preserves existing hard Map promise, rejection cleanup, and LRU timing for current work while making invalidation win permanently.

### 6. Conditional Request Timing and Authority

For an opted-in scoped acquisition:

1. The acquisition owner captures its ordinary cache key. UI manifests also retain the raw request-model key used inside the URL+expected-hash composite key.
2. Promise-cache creates a transaction and calls the loader. Cold work has no base validator; hard/SWR work may have one.
3. `conditional()` resolves the URL and timeout exactly as `fetch()` does.
4. It awaits `allow(resolvedUrl, context)` and rejects when blocked.
5. It immediately requires a non-empty captured raw request key and rederives `requestModel.cacheKey(resolvedUrl, context)` equal to it. Using the already-resolved absolute URL binds the allowed URL to the key snapshot and closes base/origin ABA where resolving the original input again could return to the captured key while transport still targets an intervening URL. Tenant, origin, base, URL, or authority drift rejects before transport.
6. With no intervening await, it invokes `transaction.validator()`. A detached base returns no metadata; therefore the request becomes unconditional rather than replaying detached state.
7. With no intervening await, it invokes the injected transport with the ordinary signal and, when present, one conditional header.
8. A 304 without an actually emitted recognized header rejects. A 304 with a header still has no content until owner `reuse()` exact-checks the pair after the response.

An initially hard record normally bypasses the existing `hit/check` guard because ordinary hard replacement cannot reuse old content. Validator-aware hard reuse is different: when and only when the exact hard record has a paired validator, promise-cache must await the manifest `hit()` guard, run the exact composite `[rawRequestKey, expectedHash]` `check()`, and reclassify the current generation before invoking the loader. If `hit()` or `check()` rejects, promise-cache removes the originally observed hard Map/key/promise/record only when that exact pair is still current; it never removes a purge result, replacement Map, pending/newer generation, or another guarded caller's successfully installed work. The conditional path then adds the resolved-URL raw request-key check immediately before transport. No header is emitted and no base is reused if either guard drifts.

### 7. Modified Success (200-class) Semantics

Any `ok` non-304 response is modified content. The request facade parses JSON/text first. Then:

- data calls `accept()` after `.json()` succeeds;
- HTML calls `accept()` after `.text()` succeeds;
- TSS calls `accept()` only after the TSS parser succeeds;
- UI manifests call `accept()` only after max-text, JSON, expected/declared/computed digest, schema, structure, value-hash, and bound validation succeeds.

The loader returns the ordinary successful value. Cold settlement or SWR publication performs its existing exact Map/key/promise/token checks, samples freshness time, and writes one new record containing the promise/value and staged validator together. Rejection removes/detaches pending state or leaves the existing SWR base unchanged; staged metadata in the transaction has no publication authority.

### 8. Not Modified (304) Publication and Freshness

A 304 result contains no body/value. The owner calls `transaction.reuse(result.validator)`. Reuse succeeds only if the exact base record/promise/validator remains current under the same Map/key/transaction. It returns that exact already-settled public promise; the new loader promise adopts its value, preserving object/array/string identity without synthesizing content.

- **Cold/unpaired:** no header is sent, so 304 rejects before reuse.
- **Hard replacement:** the Map already contains the new pending revalidation promise. Successful reuse settles that promise and stamps its new record at fulfillment.
- **SWR refresh:** stale callers continue receiving the old promise while refresh runs. Successful reuse atomically replaces the Map entry with the exact refresh promise and stamps the new record at publication.
- **Hard caller during SWR:** joins the exact refresh promise as today.
- **Ordinary fresh/pending hit:** returns the existing promise, changes only LRU order where already documented, and never changes the timestamp.
- **Refresh start/failure/detachment:** never stamps or slides freshness.

Thus a successful 304 is an explicit network revalidation event and begins a new ordinary TTL at exact successful publication. `ttl = Infinity` performs no revalidation. `ttl = 0` retains pending deduplication only and therefore retains no settled validator. Runtime TTL/window changes continue reclassifying only the original successful timestamp.

For UI manifests, a blocked/drifted conditional request, unsolicited 304, or `Cache validator detached` after a paired 304 is an acquisition failure and is wrapped with `acquisition = 1`: required descriptors reject and optional descriptors may fall through exactly as for other acquisition failures. A received 200 that fails text, JSON, digest, schema, structure, value-hash, or bounds remains a loud integrity/validation failure for both modes.

### 9. Invalidation, Races, and Failure Atomicity

- Exact/full purge removes the Map entry and record; late 200 metadata cannot publish and late 304 reuse rejects.
- LRU eviction forgets the exact record; its transaction cannot emit or reuse the validator afterward.
- `reset()` deletes metadata/clock authority even if a host incorrectly preserves the Map; validator access/reuse then fails closed.
- Replacing `owner.c` makes old WeakMap state unreachable from the current owner and fails transaction currentness.
- A rejecting cold/hard generation removes only itself; an SWR rejection deletes only its exact refresh descriptor and leaves the old content+validator pair with its original hard deadline.
- A paired manifest hard guard/check rejection removes only its exact originally observed expired generation. Concurrent purge, Map replacement, or successful guarded replacement wins and is never removed by the late rejection.
- A newer generation, manual Map mutation, or unrecognized promise record prevents old publication/reuse. A transaction detached before pending installation is caller-only and cannot reinsert content, touch LRU, run cache cleanup, or write a validator into any record.
- A 200 may still resolve to an already-returned caller after purge, matching existing promise behavior, but cannot reenter the cache. A 304 after detachment rejects because it has no body to return safely.
- `max`, LRU order, pending deduplication, and one-refresh-per-generation bounds remain unchanged.

### 10. Isolation and Unchanged Paths

- Scoped keys retain request-model tenant/origin/base/resolved-URL discrimination; UI manifests additionally retain expected hash.
- Invalid/missing authority (`undefined` key) never reads or writes validator metadata and uses the exact existing uncached request path.
- Owners offer validator loading only when `validators === true` and reading `requestModel.conditional` yields a function. Their loader treats a missing/malformed transaction (including an older promise-cache calling `load()` with zero arguments), missing transaction methods, or an absent/inaccessible conditional capability as the byte-for-byte existing `requestModel.get(...).json()/text()` path. That fallback receives no `headers` option, does not call conditional APIs, and publishes no carried predecessor validator. New request + old promise cache, old request + new promise cache, and both-old-compatible adapter combinations are explicit tests.
- Fresh cache hits do not rerun request policy, matching the existing data/HTML/TSS contract. Every actual conditional acquisition does rerun policy and exact scope immediately before transport.
- Existing parsers, manifest wire format/version, optional-vs-required acquisition classification, root-local indexes, and downstream values remain unchanged.

### 11. Rendered-Fragment Exclusion

`@jtorm/ui-cache-model`, save adapters/envelopes, fragment timestamps, persisted bytes, restore/stamp behavior, and fragment cache maps receive no new field or behavior. Acquisition purge still cannot revoke a value, prepared root, rendered fragment, or persisted fragment already retained downstream. A sensitive rollback continues to set `staleWindow = 0`, set `validators = false`, purge the four acquisition owners, dispose affected roots, and separately purge/save fragment persistence when required.

### 12. Affected Components and Ownership

| Component | Planned change | Ownership boundary |
|---|---|---|
| `src/models/request-model/src/request-model.js` | additive conditional parser facade, bounded opaque validator selection, scope check, one request header | URL/timeout/policy/transport and response metadata only; never cache content |
| `src/models/promise-cache-model/src/promise-cache-model.js` | transaction/base-pair record state and exact 200/304 publication | Map/key/promise/generation/freshness/invalidation only; no HTTP parsing |
| data/HTML/TSS models | exact-false config and bridge from conditional result to transaction after parser success | URL/type-specific loader and parser timing |
| UI-manifest model | same bridge after complete pack validation; raw+composite key preservation | manifest integrity, bounds, acquisition classification, root-local install |
| `test/helpers/engine.js` | reset/config/transport fixture support only as tests require | DI ownership and deterministic metrics; no runtime behavior |
| focused model/pipeline tests | red-first contract and race coverage | observable behavior, not private record shape |
| package manifests/READMEs/backlog/reviews | minor versions, dependency floors, operational/security contract | public release and architecture record |

### 13. Dependencies and SemVer

The final public API is additive, so every touched published runtime package receives a minor release:

| Package | From | To | Reason |
|---|---:|---:|---|
| `@jtorm/request-model` | 1.1.5 | 1.2.0 | additive public `conditional()` facade |
| `@jtorm/promise-cache-model` | 1.1.0 | 1.2.0 | additive opt-in loader transaction contract |
| `@jtorm/data-model` | 1.1.0 | 1.2.0 | additive public `validators` configuration/behavior |
| `@jtorm/html-model` | 1.1.0 | 1.2.0 | additive public `validators` configuration/behavior |
| `@jtorm/tss-model` | 1.1.0 | 1.2.0 | additive public `validators` configuration/behavior |
| `@jtorm/ui-manifest-model` | 1.1.0 | 1.2.0 | additive public `validators` configuration/behavior; wire `version` remains `1.0.0` |

The four owners update dependency floors to `@jtorm/request-model ^1.2.0` and `@jtorm/promise-cache-model ^1.2.0` as applicable. No production dependency is added. Lockfile/workspace package metadata must agree, and every publish dry-run must contain only intended source/README/package files and generated artifacts already owned by existing prepack scripts.

### 14. Trade-offs Considered

| Decision | Chosen | Rejected alternative and reason |
|---|---|---|
| Metadata ownership | exact promise-cache record plus loader-local transaction | parallel validator Map can outlive bytes/generation and resurrect after invalidation |
| Public values | retain exact promise/value shapes | wrapping values as `{value, validator}` breaks every consumer and promise identity |
| Request API | additive `conditional()` parser facade | changing `get()`/`fetch()` default status or envelope breaks existing adapters and callers |
| Opt-in | exact `validators === true`, default false | default-on changes transport options/call behavior and may expose incompatible adapters |
| Validator selection | one ETag, else one Last-Modified | sending/storing both expands metadata and ambiguous replacement semantics without needed benefit |
| Validator grammar | opaque bounded value plus a single transport-safe entity-tag envelope | wildcard/list/unquoted ETags can broaden a conditional request; parsing tag strength, payload, or HTTP-date semantics adds unnecessary policy and rejects useful opaque values |
| Hard 304 base | transfer exact settled pair into current pending generation | removing old metadata before request makes every hard 304 unpaired; keeping a parallel predecessor store breaks atomicity |
| 304 freshness | new generation/timestamp at publication | no refresh wastes successful revalidation; stamping on hit/start/failure slides retention unsafely |
| Detached validator before send | silently omit header and perform authorized unconditional request | sending it violates pairing; failing the acquisition reduces availability despite a safe unconditional path |
| Detached pair after 304 | reject | stale fallback or synthesized content would exceed the existing acquisition SWR contract |
| Missing 200 validator | publish content without metadata | carrying predecessor metadata pairs it with different bytes; rejecting valid content makes validators availability-critical |
| Persistence | none | serialized validators need byte/generation/restart authority and are explicitly separate architecture |

### 15. Blast Radius

| Area | Concrete impact |
|---|---|
| Public API | six minor package versions; one request method, one promise-cache loader option/transaction, four boolean fields; no removals |
| Runtime state | one optional bounded validator and temporary base/transaction references inside already bounded WeakMap records |
| Network | opted-in expired/SWR scoped acquisitions may send one conditional header and receive 304; default traffic identical |
| Security | new untrusted-header replay path, controlled by bounds, URL/key policy, and exact generation pairing |
| Performance | unchanged hit complexity; small constant record/header work; 304 avoids body transfer and owner parsing |
| Failure behavior | validator-aware scope drift/unpaired 304 rejects; missing/invalid 200 metadata degrades to ordinary caching |
| Downstream/deploy | no wire/schema/persistence change; hosts can roll back instantly by setting `validators = false` and purging acquisition caches |

### 16. Rollback Plan

| Item | Action |
|---|---|
| Trigger | unexpected 304/content mismatch, adapter incompatibility, authorization drift finding, elevated errors, or current-head review issue |
| Immediate kill switch | set all four owners' `validators = false`; keep or set `staleWindow = 0` when callers must await replacement |
| Cache cleanup | exact/full purge affected acquisition owners and dispose prepared roots; separately handle rendered-fragment persistence only if content revocation requires it |
| Code rollback | revert the feature commits/PR; no migration, stored data, wire version, or external cleanup is required |
| Package rollback | pin prior 1.1.x package set; metadata is process-local and disappears with old/replaced Maps/processes |
| Verification | assert transport receives no conditional headers, run exact focused/full/type/package gates, and verify root/fragment policy independently |

### 17. Security Assessment

The linked full STRIDE model is `feature-reviews/stride-http-validator-acquisition.md`. Scope is tagged `SECURITY` because untrusted response metadata is replayed, and `INFRA` because the injected HTTP transport options change when opted in. Enforcer triage concluded `STRIDE_SUFFICIENT`: this is one existing boundary carrying public acquisition content, not a high-value multi-boundary credential/payment/PII flow. PASTA must be reopened if validators gain persistence, credentials, private data, cross-origin sharing, redirects, retries, or another trust boundary.

Mandatory controls are: exact scope/key policy immediately before transport, fixed opaque metadata bound, one-header emission, header-sent plus exact-pair 304 validation, parser-before-accept ordering, exact-generation publication, complete invalidation detachment, no secret/log output, no dependency/import, and test linkage for every HIGH/MEDIUM threat.

### 18. Risk Register

| Risk | Probability | Impact | Priority | Owner | Mitigation/contingency |
|---|---:|---:|---:|---|---|
| Atomic pair cannot fit public promise/cache contracts | Medium | High | High | architecture | transaction/base-pair design; stop after reviewed spec if independent review finds a contract break |
| 304 accepted after scope/generation drift | Medium | High | High | security/cache | pre-transport raw-key check, transaction currentness at header read and reuse, deferred race tests |
| Validator staged before parse/manifest success | Medium | High | High | each acquisition owner | owner-specific accept point and validation-failure tests |
| Default/custom-adapter behavior changes | Medium | High | High | request/integration | exact-false opt-in, capability fallback, argument-count/transport-options regression tests |
| Freshness slides or SWR promise identity changes | Medium | Medium | Medium | promise cache | timestamp only at successful publication and exact identity/boundary tests |
| Oversized/header-injection metadata | Low | High | Medium | request model | fixed bound/control rejection/one-header selection and witness tests |
| Package version/dependency skew | Medium | Medium | Medium | release | coordinated minor versions, lockfile checks, publish order/docs/dry-runs |
| Excess complexity in shared cache | Medium | Medium | Medium | maintainability | isolate transaction helpers, keep HTTP semantics in request model, complexity review/source ratchets |

### 19. Implementation Plan and Checkpoints

Critical path: request envelope + cache transaction contract -> red protocol/race tests -> shared cache implementation -> four owner integrations -> complete verification/docs/release -> PR/CI/current-head review.

1. **Red protocol tests:** request metadata bounds/headers/status/scope; promise-cache transaction 200/304/detachment/freshness/identity. No runtime edit before observed failures.
2. **Shared protocol implementation:** conditional request facade and exact-generation cache transaction/base-pair support. Run shared focused suites.
3. **Red owner tests:** data/HTML/TSS modified/not-modified/error/validation/SWR/hard/concurrency/scope/default cases, then implement bridges.
4. **Red manifest tests:** complete validation ordering, URL/composite scope, optional classification, root concurrency/invalidation, then implement bridge.
5. **Harness/integration:** extend only deterministic response headers/options/reset support required by tests; prove downstream fragment exclusion.
6. **Verification/review:** focused and exact full tests, typecheck, syntax/diff/package/dependency/security/architecture/readiness/static/ratchet reviews, fix to 100/100.
7. **Documentation/release:** READMEs, spec/threat/evaluation, package/lock versions, canonical backlog, conventional commits.
8. **Delivery:** ready PR into `dev`; iterate current-head CI and Codex review until green/clean with zero unresolved threads; do not merge.

No calendar estimate is imposed by the maintainer. The comparable TTL/purge and SWR work establishes a large reference class; progress is gated by unresolved correctness risks, not a percentage. If atomicity fails independent review, the circuit breaker is the requested specification-only stop with a concrete alternative.

### 20. Red-First Test Matrix

| Area | Required cases |
|---|---|
| Request 200 | single safe ETag, weak ETag, wildcard/list/unquoted rejection, Last-Modified fallback, ETag preference, missing/throwing headers, invalid controls, 1024/1025 wire-byte boundary, JSON/text parse rejection, status/error/timeout compatibility |
| Request 304 | exact emitted header, exact sent-validator retention despite missing/different/invalid response metadata, unsolicited/malformed prior rejection, no parser/body call |
| Request authority | blocked URL, deferred allow with tenant/origin/base drift, resolved-URL base/origin ABA, exact raw-key mismatch, unscoped key, no header/transport before checks pass |
| Cache 200 | cold capture, replacement, metadata absent clears predecessor, rejection, synchronous throw, successful timestamp at settlement |
| Cache 304 | hard replacement adopts exact value, SWR publishes refresh promise, ordinary hits non-sliding, hard caller joins refresh, unpaired/detached rejection |
| Concurrency | pending dedupe, concurrent hard calls one transport/promise, concurrent stale calls one refresh, generation supersession |
| Invalidation | exact/full purge, eviction, reset, Map replacement, manual/unrecognized record, synchronous `allow()` pre-install detachment with caller-only completion/no reinsertion for every detacher, newer generation, late 200 and late 304 |
| Scope | tenant/origin/base isolation, same URL distinct keys/validators, drift while allow awaits, bypass never stores/sends validator |
| Data | 200 JSON parse and 304 exact object identity; HTTP/parser errors; opt-in false/absent/capability fallback |
| HTML | 200 text and 304 exact string; HTTP errors; false/default compatibility |
| TSS | per-part 200/304, parser failure does not publish metadata, array order/identity behavior, purge/refresh |
| UI manifest | 200 complete validation then accept, 304 exact validated pack, expected-hash isolation, explicit hard guard/composite recheck, exact hard-guard rejection cleanup against purge/Map-replacement/concurrent-success races, detached-304 optional acquisition classification, malformed/oversized/digest/schema/value loud failure, root supersession, guard/key drift, SWR/hard/purge/reset |
| Engine/downstream | cold reset clears validator records/config, explicit warm reuse retains only current exact pair, metrics count 304 bytes, rendered-fragment state unchanged |
| Regression | all pre-existing request/cache/TTL/SWR/bypass/manifest/pipeline tests unchanged and complete `npm test` |

### 21. Verification and Definition of Done

- Focused red tests are observed failing before the corresponding runtime implementation and pass afterward.
- Exact `npm test` (`node --test "test/**/*.test.js"`) and `npm run typecheck` pass.
- Changed runtime files pass `node --check`; diff has no whitespace/errors, imports, forbidden dependencies, handwritten TS/declarations, skips, suppressions, placeholders, or rendered-fragment behavior.
- Package dry-runs/prepack artifacts, lockfile/version/dependency floors, `npm audit`/dependency inventory, and publish order pass.
- Relevant security, architecture, production-readiness, differential/adversarial, Semgrep, source-ratchet, and tech-debt reviews have zero valid findings.
- The implementation matches every STRIDE control and required control-to-test link.
- Exact 10 feature-dev dimensions score 10/10 and a fresh verification loop confirms 100/100.
- Specification, threat model, evaluation, READMEs, package versions, and canonical backlog are current.
- Conventional commits are pushed to a ready non-draft PR into `dev`; current-head CI is green; current-head Codex review is clean with zero unresolved threads.
- The PR is not merged.

### 22. Open Questions

None. Public opt-in, additive request/cache contracts, metadata grammar/bounds, 200/304 publication, freshness, hard/SWR behavior, invalidation, mixed-collaborator fallback, SemVer, rollback, and exclusions are locked above. If implementation evidence disproves safe pending-record transfer, the circuit breaker is to stop without runtime delivery and report the refresh-descriptor alternative and its public-contract costs.

## Agent Design Constraints

### architect

- [x] Read and applied.
- Required: preserve dependency-free CommonJS, DI ownership, singleton/export shapes, public promise/value identities, and the exact request/cache/manifest policy boundaries.
- Avoid: parallel metadata owners, public wrappers, runtime imports, fragment/persistence coupling, or HTTP policy in promise-cache.

### planner

- [x] Read and applied.
- Required: explicit research/plan/red-test/implementation/verification/release checkpoints, risks, rollback, resumption state, and the specification-only circuit breaker.
- Avoid: time estimates, ambiguous completion claims, or proceeding past an unresolved atomicity blocker.

### backend-architect

- [x] Read and applied.
- Required: request-model owns HTTP semantics, promise-cache owns generation atomicity/freshness, each acquisition owner owns its parser acceptance point, and manifest keeps its integrity/guard layer.
- Avoid: cross-layer imports, duplicated state, validator-selected content, or cache publication before validation.

### elysia-expert

- [x] Read and dispositioned.
- No Elysia server, route, middleware, or schema exists in scope; route-specific patterns are not applicable. The equivalent external boundary remains request-model validation before transport.

### bun-expert

- [x] Read and dispositioned.
- No Bun runtime/API or database work exists in scope. The repository's locked Node built-in test runner, pure CommonJS runtime, and package scripts remain authoritative.

### typescript-pro

- [x] Read and applied.
- Required: pure-JS/JSDoc-compatible additive shapes, no hand-written TypeScript/declarations, no changed decoder-ring view types, and existing typecheck scope preserved.
- Avoid: `any`-style escape annotations, generated artifact commits, or runtime type imports.

### security-architect

- [x] Read and applied.
- Required: response headers are untrusted, scope/policy is rechecked immediately before transport, values are bounded and injection-safe, 304 requires emitted-header plus exact-pair proof, and every invalidation path fails closed.
- Avoid: validator contents in errors/logs/keys, fail-open 304, wildcard/list ETags, or metadata persistence/sharing.

### threat-modeling-enforcer

- [x] Read and applied.
- Required: full STRIDE, trust-boundary DFD, attack tree, ranked risks, explicit controls, and control-to-test linkage before implementation.
- Triage: `STRIDE_SUFFICIENT`; reopen PASTA for persistence, credentials/private data, cross-authority sharing, redirects/retries, or another trust boundary.

### platform-engineer

- [x] Read and applied.
- Required: preserve injected transport/timeouts, bound memory/header work, add no timer/retry/external service, keep rollback an immediate local config change, and verify package/CI/dependency gates.
- Avoid: hidden operational state, unbounded metadata, proactive work, or a new production dependency.

### database-architect

- [x] Dispositioned.
- The persona file is absent from the installed resource catalog and no DB scope exists: no schema, query, migration, transaction, connection, or persistence change. Database criteria are not applicable.

### e2e-runner

- [x] Read and dispositioned before Test Mode.
- Browser/Playwright E2E is not the correct layer: this feature has no UI, route, database, auth, or multi-service user journey. Deterministic Node model tests plus the existing full-pipeline engine integration remain the lowest complete evidence and preserve the test pyramid.
- The E2E quality checklist is N/A except its test-independence/no-fixed-wait/pyramid principles, which apply to all added tests.

### tdd-guide

- [x] Read and applied before Test Mode.
- Required: observable public behavior, deterministic external transport seams, descriptive Arrange/Act/Assert tests, verified RED for missing behavior, minimum GREEN, then refactor.
- Repository override: use exact Node `node:test` commands from `AGENTS.md`, not the persona's generic Bun/TypeScript/domain conventions.

### test-engineer

- [x] Dispositioned before Test Mode.
- The persona is referenced by feature-dev but absent from both installed resources and the ai-config agent tree. Its test-strategy role is covered by the fully loaded `testing/test-suite-quality`, `testing/dod-tdd-discipline`, `testing/dod-e2e-test-quality`, and `engineering/dod-tests-written` checklists.

## Plan Quality Gate

**Scope tags:** SECURITY, INFRA
**Gate status:** PASSED
**Targeted personas consulted:** security-architect, threat-modeling-enforcer, platform-engineer
**Independent reviewers:** code-explorer, code-architect
**STRIDE status:** Complete (6/6 categories, attack tree, ranked risks, control-to-test links)
**Threat-model deep-dive triage:** `STRIDE_SUFFICIENT`; no PASTA trigger
**Cross-model adversarial status:** unavailable because the external-model CLI required publishing repository-derived prompts outside the authorized workspace; no data was exported and no workaround is used.
**Issues found and fixed:** 10 actionable design findings
**Final independent verdict:** code-explorer PASS; code-architect PASS

### Independent Review Disposition

| Finding | Lead decision |
|---|---|
| Hard replacement transaction was underspecified | Accepted: exact old pair is readable only during synchronous loader entry, then authority transfers into the installed pending record; synchronous throw retains existing removal semantics |
| Synchronous policy can detach the base before pending installation | Accepted: installation rechecks the exact old pair; drift permanently detaches the caller-only loader with no cache/LRU/publication mutation, and the resumed request is unconditional |
| A no-base pending install could resurrect cache participation after invalidation | Accepted: a failed old-pair transfer installs nothing and cannot later publish or clean up cache state |
| Manifest hard replacement lacked its awaited hit/composite guard | Accepted: a paired hard validator must pass both guard and exact composite recheck before loading |
| Manifest hard-guard rejection could retain expired metadata or delete newer state | Accepted: rejection removes only the exact originally observed hard pair and loses to purge, replacement, or another guarded caller's installed generation |
| Optional manifest detached 304 classification was unclear | Accepted: policy drift, unsolicited 304, and detached reuse are acquisition-classified; received invalid 200 remains loud |
| Mixed request/cache collaborator behavior was vague | Accepted: structural capability checks fall back to the exact zero-argument legacy request path with no conditional header or carried metadata |
| Re-resolving original input permits base/origin ABA | Accepted: compare the captured raw key against the already-resolved absolute transport URL after awaited `allow()` |
| Arbitrary ETag replay permits wildcard/list broadening | Accepted in transport-safe form: require one ASCII entity-tag envelope while keeping strength/payload opaque and date semantics unparsed |
| 304 response metadata could retag predecessor bytes | Accepted: ignore response replacement metadata and retain only the exact validator sent |
| Model hard work as a refresh descriptor instead | Rejected: it changes the existing hard public Map promise, synchronous-throw/rejection cleanup, and LRU timing; pending-record transfer preserves those contracts while maintaining one metadata owner |
| Add an independent header-issuance receipt and parse HTTP dates/tag strength | Rejected as duplicate trusted-DI policy and unnecessary server semantics; official `conditional()` proves its own emission, owners exact-check reuse, custom collaborators are trusted like existing DI, and the minimal entity-tag envelope exists only to prevent request broadening |

All ten actionable findings were incorporated. The two rejected alternatives would either break locked public behavior or add policy outside the requested opaque-metadata boundary.

### Checklist Disposition

| Checklist family | Disposition |
|---|---|
| Domain architecture, code quality, complexity, runtime safety | Applied: explicit ownership table, exact race state machine, bounded work, no import/dependency or fragment coupling |
| Type safety | Applied within the repository's pure-JS/JSDoc contract; no new shared view types or handwritten declarations |
| Validation and error taxonomy | Applied at the request boundary and existing owner parsers; acquisition-vs-integrity manifest errors remain distinct and validator contents never enter messages |
| Tests-written, no-placeholders, error handling, self-review, definition of done | Applied through the red-first matrix, concrete gates, no deferred production TODO, and current-head review loop |
| Injection, secrets, insecure defaults, dependencies | Applied: header-envelope/control/size validation, exact-false default, no secrets/logging, no dependency addition |
| Infrastructure limits and rollback | Applied: existing timeout/transport ownership, one bounded header, no timers/retries, immediate config kill switch and cache purge |
| DB, routing, frontend, payments | Not applicable: no schema/query/persistence, endpoint/router, UI/PWA, or money flow change |

### Plan-Level Score

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | One private record owner; request/cache/owner/manifest responsibilities and hard/SWR state transitions are explicit |
| Consistency | 10/10 | Exact-true opt-in, singleton methods/fields, terse CommonJS/DI, existing parser and cache patterns are retained |
| Type Safety | 10/10 | Concrete envelopes/transaction methods are specified without public value wrappers or handwritten types |
| Validation | 10/10 | URL/key policy, header envelope/bounds, owner parse/integrity order, and 304 pair checks are complete |
| Error Handling | 10/10 | 200/304/status/parser/detachment/sync-throw/rejection and optional-manifest classifications are defined |
| Security/Privacy | 10/10 | Full STRIDE, attack tree, scope isolation, injection controls, no logging/persistence, and fail-closed reuse are linked to tests |
| Performance | 10/10 | Constant bounded metadata, unchanged hit complexity/LRU/single-flight, no timers/retries, and 304 avoids body/parser work |
| Maintainability | 10/10 | HTTP/cache/parser ownership stays separated; default path remains structurally unchanged; exclusions prevent scope creep |
| Testability | 10/10 | Deterministic red-first matrix covers policy, boundaries, concurrency, races, validation, compatibility, and downstream exclusion |
| Readability | 10/10 | Public shapes, exact sequencing, state ownership, failure semantics, trade-offs, and rollback are concrete and named |
| **Total** | **100/100** | **Implementation-ready; independent PASS** |

**Pre-review score:** 10/10 on all exact feature-dev dimensions.
**Success criteria:** the measurable Definition of Done in section 21, including focused/full/type/package/review gates, six coordinated minor releases, ready PR into `dev`, green current-head CI, clean current-head Codex review, and no merge.

### 22. Open Questions and Locked Decisions

No implementation-blocking questions remain in the draft. Decisions are locked as follows:

- Opt-in surface: exact boolean `validators`, default `false` on four acquisition owners.
- API: additive `requestModel.conditional()` and additive promise-cache loader transaction; existing APIs are not overloaded.
- Metadata: one fixed-bound opaque validator, ETag preferred then Last-Modified, one request header.
- 304: valid only with a header actually sent plus exact current transaction base; publish a new promise generation/timestamp at success.
- 200: predecessor validator never carries; new metadata stages only after complete owner validation.
- Hard transition: retain the exact pre-install old pair only until the returned native promise is synchronously installed as the current pending record's private base; preserve Map, throw/rejection cleanup, and LRU contracts.
- Manifest: paired hard reuse receives a new awaited `hit/check` gate; detached 304 is acquisition-classified, while invalid 200 content remains loud.
- Compatibility: unscoped, disabled, missing/malformed transaction, inaccessible conditional capability, or older collaborators use the exact existing zero-argument request/loader path and never carry a predecessor validator.
- URL binding: compare the captured key with the already-resolved absolute URL under current authority, closing original-input re-resolution ABA.
- 304 metadata: retain the exact sent validator and ignore response replacements.
- Release: all six additive package changes are minor `1.2.0`; manifest wire version remains `1.0.0`.
- PASTA: not required under current public single-boundary scope; re-evaluation triggers are recorded in the threat model.

### 23. Plan Quality Gate

**Scope tags:** SECURITY, INFRA
**Gate status:** PASSED — independent code-explorer/code-architect challenge incorporated
**Personas applied:** architect, planner, backend-architect, Elysia expert (stack N/A), Bun expert (stack N/A), TypeScript pro (handwritten TS N/A; JSDoc/typecheck applicable), security-architect, threat-modeling-enforcer, platform-engineer, code-review-enforcer. The referenced database-architect file is absent from the installed resource profile and database scope is N/A.
**Threat model:** full STRIDE 6/6, DFD, trust boundaries, attack tree, risk ranking, residual acceptance, and control-to-test linkage complete. Threat-model-deep-dive triage: `STRIDE_SUFFICIENT`.
**Project override:** repository `AGENTS.md` dependency-free CommonJS/DI/Node-test rules supersede generic Bun/Elysia/TypeScript/database prescriptions.

Plan-level score before independent challenge:

| Dimension | Score |
|---|---:|
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

The score becomes final only after independent review findings are incorporated and every persona/checklist disposition is recorded.

---

## Progress Log

### Research Mode
- [x] Read project `AGENTS.md`
- [x] Verified dirty main checkout and protected the unrelated UI-components worktree
- [x] Fetched `origin/dev` and created the isolated worktree/branch
- [x] Mapped relevant records, models, tests, and data flow
- [x] Recorded research summary
- [x] Ran untouched focused baseline: 169/169 passing

### Plan Mode
- [x] Saved pre-plan checkpoint
- [x] Wrote reviewed feature specification
- [x] Defined exact API and cache semantics

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant agent personas consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Threat model complete
- [x] Plan refined and implementation-ready

### Design Mode
- [x] Loaded applicable design personas
- [x] Spawned code-explorer
- [x] Spawned code-architect
- [x] Validated atomic pairing design against red flags

### Implement Mode
- [x] Checkpoint 1: Tests/scaffold
- [x] Checkpoint 2: Core logic
- [x] Checkpoint 3: Edge cases
- [x] Checkpoint 4: Integration

### Test Mode
- [x] Focused tests passing
- [x] Exact `npm test` passing
- [x] `npm run typecheck` passing
- [x] Syntax, package dry-run, and dependency checks passing

### Review Mode
- [x] Relevant architecture/security/production reviews pass
- [x] Semgrep, source-ratchet, and tech-debt reviews pass
- [x] 100/100 code quality
- [x] Verification loop passes

### Documentation Mode
- [x] Specification, threat model, and evaluation complete
- [x] Package versions and canonical backlog updated
- [x] Conventional commits created
- [x] Ready PR opened into `dev` as #69
- [ ] Current-head CI green
- [ ] Current-head Codex review clean with zero unresolved threads
