# HTTP Validator Acquisition — Architecture Review

**Date:** 2026-07-19
**Status:** PASS
**Base:** `origin/dev` at `af5c62c`
**Candidate:** `feat/http-validator-acquisition`
**Scope:** data, HTML, TSS, and validated UI-manifest acquisition caches only

## Verdict

The design preserves the repository's ownership boundaries and public cache contracts. Validator
metadata is private to the exact promise-cache generation record; request-model remains the only
HTTP policy owner; each acquisition model retains its parser/validation acceptance point; and
UI-manifest retains expected-hash and root-local publication policy. No rendered-fragment,
persistence, timer, retry, runtime import, or new dependency surface was introduced.

## Ownership and Dependency Direction

| Owner | Added responsibility | Explicit non-responsibility |
|---|---|---|
| request-model | authorize one conditional request, bound response metadata, return a parsed 200 or bodyless 304 envelope | cache generation, parser acceptance, stale policy |
| promise-cache-model | pair one validator with an exact Map/key/promise/token generation and publish 200/304 atomically | URL/HTTP semantics, response parsing |
| data/HTML/TSS | exact-true opt-in and existing parse boundary before validator acceptance | metadata lifetime, HTTP parsing |
| UI-manifest | raw-key plus expected-hash admission, guarded reuse, complete pack validation | generic HTTP/cache policy |
| engine | deterministic test headers/status/byte metrics and singleton reset | runtime transport behavior |

All six runtime files remain dependency-free CommonJS and add no `require()`. Collaborators remain
DI-owned singletons, exports remain unchanged, and the private transaction never appears in public
Map values or successful acquisition values.

## State and Publication Review

- A cold or unpaired generation uses the original unconditional loader.
- A fresh ordinary hit returns the exact current public promise and does not touch the settlement
  timestamp or issue a request.
- A hard paired generation transfers the exact predecessor pair into one installed pending record.
  A 304 can reuse only that record's exact base; a validated 200 stages replacement metadata.
- A stale paired generation serves the predecessor while one refresh transaction runs. Hard callers
  join the recognized refresh work. Publication stamps freshness only at successful fulfillment.
- Rejection keeps a stale predecessor only under the existing SWR contract. It does not publish
  candidate metadata.
- Purge, purge-all, reset, eviction, Map replacement, manual supersession, rejection, and a newer
  generation permanently detach old metadata and publication authority.

The two-phase transaction check includes the exact base validator object identity, not merely the
Map/key/promise/token. This closes a record-detachment race without adding a parallel metadata Map.

## Public API and Release Review

`requestModel.conditional(url, context, transaction).json()/text()` and the loader transaction are
additive capabilities. Existing `get()`, fetch facades, promise identities, successful values,
exports, and default traffic remain unchanged. Exact `validators === true` is required on each of
the four acquisition owners. The six affected packages therefore correctly take coordinated minor
releases to `1.2.0`; consumer floors advance to `^1.2.0`. Manifest wire v1 is unchanged.

## Findings Closed During Review

| Finding | Resolution |
|---|---|
| request key could be read after awaited policy | snapshot the supplied key before the await and compare it with the current resolved-key derivation |
| validator capability could be observed twice | read it exactly once immediately before transport |
| promise transaction could miss detached base metadata | recheck exact base validator identity in both currentness phases and clear detached ownership |
| manifest load bypassed its published composite `cacheKey` seam | route admission through the public seam while retaining raw-key capture |
| raw and composite manifest keys used separate policy snapshots | pass one captured raw key through the two-argument public seam without changing declared arity |
| deferred hard acquisition could use a stale request collaborator | reacquire the current conditional capability after the awaited hard guard |

Every finding received a failing regression test before its fix. No architecture finding remains.
