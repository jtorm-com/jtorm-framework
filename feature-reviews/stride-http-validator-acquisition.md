# STRIDE Threat Model: HTTP Validator Acquisition Caches

**Date:** 2026-07-19
**Status:** COMPLETE — PR #69 merged after green CI and clean current-head Codex review
**Feature:** `feature-reviews/http-validator-acquisition.md`
**Scope:** opt-in HTTP validators for the scoped data, HTML, TSS, and UI-manifest acquisition caches

## 1. Scope and Security Objective

The feature may retain one bounded HTTP validator from an authorized successful acquisition and replay it on a later acquisition for the same request-model cache authority. The security objective is to reduce response bytes without allowing response metadata to select content, cross a tenant/origin/base boundary, outlive its exact cache generation, bypass parsing or manifest integrity checks, or revive content after invalidation.

Rendered-fragment caching and persistence are downstream regression boundaries only. They receive no validator state, conditional request behavior, or new freshness policy.

### Enforcer triage

**Decision:** `STRIDE_SUFFICIENT`
**Reason:** the flow crosses one existing host-to-HTTP-origin trust boundary, handles public/acquisition content rather than credentials, PII, money, or regulated records, and has one bounded request/response cycle. The new response-metadata replay path merits a full per-element STRIDE model and attack tree, but not the multi-boundary, high-value PASTA pipeline.
**Re-evaluation trigger:** add persistence, redirects/DNS policy, credentials, private user data, cross-origin authority, retries, or validator sharing outside the exact acquisition generation.

## 2. System Decomposition and Data Flow

### Data-flow diagram

```text
Host/render context
  | URL + tenant/origin/base authority
  v
Acquisition owner (data / HTML / TSS / UI manifest)
  | exact scoped key + validators === true
  v
Promise-cache generation record
  | owns: exact Map, key, public promise, token, timestamp,
  |       optional current validator, optional current base pair
  | loader-local transaction: validator() / accept() / reuse()
  v
Request model
  | resolve URL -> await allow() -> rederive exact raw cache key
  | -> read current paired validator immediately before transport
  v
Injected HTTP transport ---------------------------- External origin
  | optional If-None-Match OR If-Modified-Since       | 200 body + metadata
  |                                                   | or 304 + metadata
  v                                                   |
Request parser facade <-------------------------------+
  | 200: json()/text() succeeds
  | 304: no body is synthesized
  v
Owner parser/validator
  | data JSON / HTML text / TSS parser / complete manifest validation
  v
Promise-cache exact-generation settlement/publication
```

### Trust boundaries

1. **Render authority boundary:** tenant, origin, base, URL, and request policy are host/render inputs. Only the request model may resolve and authorize them.
2. **Transport boundary:** status and headers are untrusted response metadata. Validator strings are never interpreted as application authority or content.
3. **Parser/integrity boundary:** a 200 body is not cacheable content until its existing parser or complete UI-manifest validation succeeds.
4. **Cache-generation boundary:** only the exact current Map/key/promise/token record may pair content with a validator or publish a new generation.
5. **Downstream boundary:** returned values, prepared roots, rendered fragments, and persisted fragment envelopes have independent lifetimes and receive no validator metadata.

## 3. Asset Inventory

| Asset | Sensitivity | Required property |
|---|---|---|
| Authorized acquisition result | Integrity / isolation | Derived from the exact successful response body and never selected by an unpaired 304 |
| Request authority | High integrity | Tenant, origin, base, and resolved URL cannot drift across a conditional request |
| Validator pair | High integrity | Opaque metadata remains attached to one exact content promise, scoped key, Map, and generation |
| Manifest pack | High integrity | Expected = declared = computed digest and all schema/value checks remain mandatory for every 200 |
| Public promise identity | Compatibility | Pending, fresh, stale, refresh, and hard callers retain the documented identities/outcomes |
| Freshness timestamp | Availability / integrity | Only successful 200/304 publication starts a new TTL; ordinary hits never slide it |
| Invalidation state | High integrity | Purge, eviction, reset, rejection, Map replacement, and newer work permanently detach old metadata |

## 4. Threat Actors

- A malicious or compromised HTTP origin returning crafted status/header/body combinations.
- A tenant or render input attempting to collide with another authority's cache key.
- A buggy or adversarial injected transport returning malformed Response-like objects.
- A concurrent caller racing purge, reset, eviction, Map replacement, policy drift, or a newer generation.
- A host misconfiguration enabling validators where request/cache collaborators do not support the additive protocol.

## 5. STRIDE Analysis

### S — Spoofing

| Threat | Control | Residual risk |
|---|---|---|
| A validator from tenant/origin/base A is replayed for B | The acquisition owner captures the request-model raw scoped key; `conditional()` awaits `allow()` and rederives the exact key from the already-resolved absolute transport URL immediately before transport. This closes original-input/base ABA. The cache transaction returns metadata only while the exact Map/key/generation/base pair is current. | Existing host policy determines authority quality; malformed or absent authority bypasses sharing and validators. |
| A custom adapter fabricates a 304 without a conditional request | `conditional()` accepts 304 only when it actually emitted one recognized validator header; the owner then requires `reuse()` to find exact current paired content. | A fully compromised host can replace all DI collaborators and is outside the library trust model. |

### T — Tampering

| Threat | Control | Residual risk |
|---|---|---|
| Response headers inject a second condition, wildcard, or unbounded value | At most 1024 wire bytes are retained. ETag requires one ASCII entity-tag envelope with one quoted opaque payload, rejecting wildcard/list/unquoted/trailing material; strength/payload semantics are never interpreted. Last-Modified remains opaque and date-unparsed but must be transport-safe. At most one conditional header is emitted: safe ETag first, otherwise safe Last-Modified. | The origin controls its own representation metadata, but cannot convert a response ETag into `If-None-Match: *` or a broader list. |
| A 200 validator is paired before content validation | Response metadata remains loader-local until JSON/text parsing and any TSS/manifest validation complete. Rejection publishes neither new content nor metadata. | HTML has no additional schema validation by existing contract. |
| A 304 swaps, synthesizes, or retags content | A 304 has no value field. `reuse()` can only return the exact resolved base promise paired with the exact validator sent by the current transaction; otherwise it throws. Response validator replacements are ignored. | Returned mutable objects remain mutable under the pre-existing cache contract; this feature adds no cloning. |
| Manifest validator bypasses digest validation | A 200 still passes max-text, JSON, expected/declared/computed SHA-256, schema, structure, per-value hash, and bound checks before `accept()`. A 304 can reuse only the exact prior pack under the same URL+expected-hash composite key. | A trusted descriptor may deliberately reference old valid content; deployment policy owns descriptor freshness. |

### R — Repudiation

| Threat | Control | Residual risk |
|---|---|---|
| Conditional work is indistinguishable from ordinary acquisition | The existing transport seam receives observable request options/status; tests assert emitted headers, requests, and bytes. No validator value is logged by runtime code. | The framework intentionally adds no logging/telemetry owner; hosts may instrument the injected transport. |
| A race silently revives detached metadata or cache participation | Exact-generation tests cover purge, reset, eviction, Map replacement, synchronous policy detachment, rejection, and newer-generation races. Pending installation rechecks the old pair; failure permanently makes work caller-only with no cache mutation. Publication requires current Map/key/promise/record/token identity. | Already returned promises remain observable after purge by existing contract. |
| A failed manifest hard guard retains expired validator authority or deletes a winner | Guard/check rejection removes only the originally observed hard Map/key/promise/record when still exact; concurrent purge, Map replacement, pending work, and newer publication are untouched. | An already returned expired promise remains observable to its holder under the existing contract. |

### I — Information Disclosure

| Threat | Control | Residual risk |
|---|---|---|
| A tenant-specific validator leaks through another scope | Metadata is private WeakMap record state bounded by the exact scoped key and current owner Map; it is never exported, persisted, serialized, or copied to another key. | Hosts must not put secrets or PII in public manifest packs; existing documentation already forbids it. |
| Validator values leak in errors/docs | Errors identify status/URL or detached state, never validator contents. Runtime has no logging. Documentation treats metadata as opaque. | An injected transport can log its own headers; host logging policy remains responsible. |

### D — Denial of Service

| Threat | Control | Residual risk |
|---|---|---|
| Oversized validators consume memory or request bandwidth | Fixed per-value bound, one selected validator per generation, existing LRU/max/TTL bounds, and no persistence. Missing/invalid/oversized metadata is discarded without rejecting a valid 200 body. | Origins can still send large bodies; existing body/manifest bounds and host transport limits apply. |
| Conditional failures trigger retry storms | No timers, retries, loops, backoff, or new stale fallback are added. Existing SWR allows at most one refresh per retained generation; hard callers join it. | Repeated user requests after fast failures may retry under the existing acquisition contract. |
| Hung conditional transport pins work | Existing request timeout/AbortSignal and host concurrency controls apply unchanged. Detached work is not cancelled by this feature. | Timeout `0` remains host-controlled and unsafe for production manifests, as already documented. |

### E — Elevation of Privilege

| Threat | Control | Residual risk |
|---|---|---|
| Conditional headers bypass URL/SSRF policy | `conditional()` uses one resolved URL snapshot, timeout, awaited `allow()`, and injected transport boundary as ordinary fetch, then rederives the captured key from that resolved URL before sending a header. Manifest hard reuse additionally awaits its URL guard and exact composite-key check. | Redirect and DNS protections remain responsibilities of the injected transport/allow policy; this feature neither weakens nor broadens them. |
| Detached cache metadata becomes publication authority | Loader transactions have no direct Map mutation. `accept()` only stages opaque metadata; settle/publish owns the exact-generation check and atomic record replacement. | Trusted host code can mutate exported singleton fields by design. |

## 6. Attack Tree

```text
Goal: serve or publish content under an unpaired/cross-scope HTTP validator
OR
├─ Replay another scope's validator
│  AND
│  ├─ obtain validator from scope A
│  ├─ make scope B derive the same key or exploit base A→B→A re-resolution
│  └─ pass current URL policy
│     Controls: tagged discriminator, resolved-URL raw-key rederivation, manifest composite guard, Map/key generation pair
├─ Force 304 without matching content
│  OR
│  ├─ send unsolicited 304 on cold request
│  ├─ purge/evict/reset while conditional request is in flight
│  ├─ synchronously detach the base while awaited policy begins
│  └─ replace owner Map or publish a newer generation
│     Controls: exact transfer recheck with caller-only detachment, header-sent requirement, and transaction reuse exactness
├─ Attach validator to invalid 200 bytes
│  OR
│  ├─ fail JSON parsing
│  ├─ fail TSS parsing
│  └─ fail manifest digest/schema/value validation
│     Control: accept only after complete owner validation and successful fulfillment
├─ Inject or amplify response metadata
│  OR
│  ├─ CR/LF/control characters
│  ├─ oversized/wildcard/list ETag
│  └─ oversized Last-Modified
│     Controls: wire-byte bound, single-entity-tag envelope, control rejection, one-header selection, opaque payload handling
└─ Extend stale lifetime without revalidation
   OR
   ├─ slide timestamp on fresh hit
   ├─ stamp refresh start/failure
   └─ accept failed/detached 304
      Controls: timestamp only at exact successful publication; ordinary hits do not stamp
```

All paths require at least one control failure. The implemented red-first tests exercise each leaf
with deterministic deferred policy, transport, parser, and cache-generation races.

## 7. Risk Ranking and Residual Acceptance

| Risk | Likelihood | Impact | Rating | Mandatory mitigation | Residual acceptance |
|---|---:|---:|---:|---|---|
| Cross-scope validator replay | Low | High | High | exact request key + policy recheck + generation pairing | Accept only with all isolation/race tests green |
| 304 after purge/reset/newer work | Medium | High | High | header-sent check + exact `reuse()` check + no detached publication | Accept already-returned-promise behavior as existing contract |
| Validator attached before parser/integrity success | Medium | High | High | stage after complete owner validation; publish on fulfillment only | None beyond existing parser correctness |
| Header injection/resource amplification | Low | Medium | Medium | wire-byte bound, single entity-tag envelope, control rejection, one-header selection | Host transport remains responsible for its own header implementation |
| Revalidation extends retention incorrectly | Medium | Medium | Medium | stamp only successful 200/304 publication; strict boundary tests | Successful 304 deliberately begins a fresh TTL |
| Conditional request hangs/fails repeatedly | Medium | Medium | Medium | existing timeout/SWR single-flight; no new retry/timer | Host accepts existing timeout/concurrency policy |

The repository maintainer's explicit implementation request accepts the documented residual risks provided every mandatory control and linked test is present and current-head review is clean.

## 8. Control-to-Test Linkage

| Control | Required focused evidence |
|---|---|
| Opaque/bounded response metadata and ETag precedence | request-model tests for single/weak ETag, wildcard/list/unquoted rejection, Last-Modified fallback, missing, invalid controls, wire-byte bounds, and throwing/missing headers |
| URL policy and exact scope before header emission | deferred `allow()` tests with tenant/origin/base drift, resolved-URL base/origin ABA, manifest composite hard guard, and no transport/header on mismatch |
| Unsolicited/unpaired 304 rejection | cold request, absent validator, disabled mode, malformed metadata, and detached-transaction tests |
| 200 publication after validation | JSON parse, TSS parse, manifest text/JSON/digest/schema/value failure tests proving no validator is retained |
| Exact 304 content/promise/freshness | data/HTML/TSS/manifest tests for hard and SWR revalidation, exact sent-validator retention, value identity, new public generation promise, and non-sliding ordinary hits |
| Generation detachment | purge, purge-all, reset, eviction, Map replacement, rejection, synchronous `allow()` pre-install detachment with no reinsertion/LRU/publication for each detacher, and newer-generation race tests |
| Manifest hard-guard cleanup | guard/check rejection tests plus races where purge, Map replacement, or another guarded caller installs successful work first |
| Single-flight/concurrency | pending, concurrent hard, concurrent stale, and hard-caller-joins-refresh tests with one conditional request |
| Default compatibility | complete existing focused suite plus explicit validators absent/false/custom-adapter fallback tests |
| Downstream exclusion | engine/pipeline assertions that rendered-fragment state has no validator configuration or metadata |

## 9. PASTA Applicability

Enforcer triage selected `STRIDE_SUFFICIENT`. PASTA becomes mandatory if this metadata is persisted, shared across processes/keys/origins, applied to private or regulated content, used with credentials, or coupled to redirects/retries/new trust boundaries.

## 10. Approval Gate and Verification

Independent code-explorer and code-architect reviews confirmed that:

1. the exact promise-cache record is the sole validator owner;
2. the transaction cannot reuse or publish after detachment;
3. every 304 has both an emitted recognized conditional header and exact current paired content;
4. a 200 reaches `accept()` only after existing owner validation;
5. default non-validator paths call the original loader/request surfaces unchanged; and
6. rendered-fragment SWR and persistence remain untouched.

All six conditions are implemented and covered by focused tests. The local architecture, security,
differential, production-readiness, Semgrep, source-ratchet, and tech-debt gates pass with no
unresolved valid finding. Current-head CI and GitHub Codex review remain the final publication
controls.
