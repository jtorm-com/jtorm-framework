# HTTP validator acquisition — Evaluation

**Status:** IN_PROGRESS
**Claimed:** 2026-07-19T09:06:42Z
**Agent:** Codex `/root`
**Mode:** Pre-PR branch evaluation
**Current Phase:** 2 — architecture and security review
**Base ref:** `origin/dev`
**Diff range:** `83c5ef62ae4cf29e0eceb3eb54263c6c16fac556...feat/http-validator-acquisition` plus current working tree
**PR review comments:** not a PR yet
**Specification:** [http-validator-acquisition.md](http-validator-acquisition.md)
**Threat model:** [stride-http-validator-acquisition.md](stride-http-validator-acquisition.md)

## Resumption Context

**Last Completed Phase:** 1.5 — discovery and data-flow tracing
**Next Action:** run routed architecture/security reviews, fix every finding, then score and verify
**Issues Found (not yet fixed):** none
**Files Modified:** request-model; promise-cache-model; data/HTML/TSS/UI-manifest acquisition owners; package metadata/READMEs; engine and focused model/pipeline/policy tests; root architecture and feature records
**Source-ratchet status:** pending convergence review of the package/policy ownership test
**Context for Next Session:** implementation is failing-test-first and all focused validator/model/pipeline tests run so far are green. Six additive packages are coordinated at `1.2.0`; UI-cache runtime/package/wire remain unchanged.

## Discovery and feature map

| Surface | Ownership |
|---|---|
| `request-model` | URL, timeout, allow policy, resolved scoped-key recheck, bounded response metadata, conditional response envelope |
| `promise-cache-model` | exact Map/key/promise/generation metadata pairing, loader transaction, freshness/publication, detachment |
| data/HTML/TSS models | opt-in bridge and existing parser acceptance point |
| UI-manifest model | raw request key + expected-hash composite, guard, complete pack validation, acquisition classification |
| engine/tests | deterministic response headers/304/bytes and singleton reset; adversarial protocol/race/downstream coverage |
| docs/packages/backlog | public contract, rollout/rollback, minor SemVer, canonical P4 completion |

No route, controller, database, queue, browser component, service worker, AI, payment, auth, PII, persistence, or rendered-fragment implementation is changed.

## Data-flow traces

### Scoped data/HTML/TSS acquisition

Flow: owner `get()` → scoped `cacheKey()` → `promiseCacheModel.get()` → loader transaction → `requestModel.conditional()` → resolved URL/awaited `allow()`/exact key check → injected transport → 200 parser + `accept()` or 304 `reuse()` → exact-generation settlement/publication → caller value.

- Null/void: absent key bypasses cache and uses the legacy request path; missing validator metadata is deliberately non-fatal and clears predecessor metadata on a modified generation.
- Async: URL policy, transport, JSON/text, TSS parse, reuse, and publication-facing promises are awaited/adopted; no promise is used as a boolean guard.
- Check/record pairing: `validator()` and `reuse()` require the exact current Map/key/public promise/private record/token/base; no parallel check-only store exists.
- Invalidation: exact/full purge, reset, eviction, Map replacement, rejection, manual/newer generation detach both reuse and metadata authority.
- Token/count/dev/fallback questions: no auth token, count-modify, environment bypass, database row, or nullable record fallback exists in this flow. Collaborator fallback is capability-checked and deliberately takes the original unconditional request/zero-argument loader path.
- Issues: none found in trace.

### Request-triggered SWR and hard-bound callers

Flow: absolute-age classification → guarded stale service or hard join → one retained-generation validator transaction → conditional request → 304 exact-base adoption or fully validated 200 → exact refresh-token publication at fulfillment.

- Ordinary hits never invoke a loader or slide freshness. SWR returns the old public promise while one refresh is internally observed; hard callers adopt current recognized work.
- Refresh failure retains the old content+validator pair and original deadline. Detached late success can resolve an existing caller but cannot mutate cache/LRU/metadata.
- No timers, retries, fallback beyond the existing acquisition SWR contract, or durable completion claim exists.
- Issues: none found in trace.

### UI-manifest prepare

Flow: descriptor validation/root ownership → raw request key + `[key, expectedHash]` cache key → manifest `hit()` URL guard + `check()` after await when paired hard reuse is possible → conditional transport → 200 text/JSON/digest/schema/structure/value/bounds validation then `accept()`, or 304 exact validated-pack `reuse()` → all-settled descriptor classification → root-local atomic index.

- Required acquisition failure rejects; optional acquisition failure falls through. Received invalid 200 content remains loud for both modes.
- Expected-hash isolation prevents one URL's validator from selecting a differently trusted pack.
- Root supersession and cache-generation detachment are independently checked; neither can publish an old pack or validator.
- Issues: none found in trace.

### 200/304 request boundary

Flow: captured scoped key → URL resolution → current allow policy → resolved-URL key equality → current paired validator read → one request header → response status → parsed 200 + bounded ETag-preferred metadata, or bodyless 304 retaining the exact sent validator.

- Unsolicited 304, invalid/missing pair, scope drift, blocked URL, and detached reuse fail closed before content publication.
- Validator values are opaque response metadata bounded to 1024 UTF-8 bytes; no value is logged, keyed, persisted, or server-semantically parsed.
- Issues: none found in trace.

## Review/tooling notes

- The installed differential-review skill contains its complete top-level workflow, but its linked `methodology.md`, `adversarial.md`, `reporting.md`, and `patterns.md` files are absent. The review uses the documented high-risk phases directly and records coverage honestly.
- Project `AGENTS.md` dependency-free CommonJS/DI/Node-test rules override generic Bun/Elysia/TypeScript/database conventions. Those stack-specific checks are N/A, not silently omitted.

## Current scores

Scoring is pending completion of all review gates.
