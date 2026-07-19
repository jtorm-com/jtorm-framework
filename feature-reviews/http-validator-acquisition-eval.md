# HTTP validator acquisition — Evaluation

**Status:** LOCAL PASS — PR publication gates pending
**Claimed:** 2026-07-19T09:06:42Z
**Agent:** Codex `/root`
**Mode:** Pre-PR branch evaluation
**Current Phase:** 6 — documentation and delivery
**Base ref:** `origin/dev` at `af5c62c`
**Diff range:** `af5c62c...feat/http-validator-acquisition` plus current review records
**PR review comments:** not a PR yet
**Specification:** [http-validator-acquisition.md](http-validator-acquisition.md)
**Threat model:** [stride-http-validator-acquisition.md](stride-http-validator-acquisition.md)

## Resumption Context

**Last Completed Phase:** 5 — local review and verification
**Next Action:** commit records, open a ready PR, and iterate current-head CI/Codex review
**Issues Found (not yet fixed):** none
**Files Modified:** request-model; promise-cache-model; data/HTML/TSS/UI-manifest acquisition owners; package metadata/READMEs; engine and focused model/pipeline/policy tests; root architecture and feature records
**Source-ratchet status:** PASS — exact allowlist/negative fixtures and no-edit convergence
**Context for Next Session:** local implementation, documentation, package, test, security, and
readiness gates pass. Six additive packages are coordinated at `1.2.0`; UI-cache runtime/package
and manifest wire remain unchanged. Only ready-PR, current-head CI, and current-head Codex review
remain.

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

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | one exact generation owner; HTTP/cache/parser/manifest responsibilities remain separated |
| Consistency | 10/10 | terse CommonJS/DI singletons, exact-true opt-in, unchanged exports/default traffic |
| Type Safety | 10/10 | additive concrete JS shapes, no handwritten typed source, repository typecheck green |
| Validation | 10/10 | URL/key/header bounds plus JSON/TSS/full manifest acceptance before publication |
| Error Handling | 10/10 | 200/304/status/parser/rejection/detachment/optional-manifest paths are explicit and tested |
| Security/Privacy | 10/10 | STRIDE controls, scope isolation, injection bounds, no logs/persistence/PII, audits/Semgrep clean |
| Performance | 10/10 | O(1) lookup, bounded metadata, single-flight, body/parser avoidance on 304, no timers/retries |
| Maintainability | 10/10 | private protocol in shared owners, four thin bridges, no duplicate metadata store/import |
| Testability | 10/10 | deterministic red-first boundary, concurrency, invalidation, compatibility, and pipeline coverage |
| Readability | 10/10 | documented state transitions, public API, rollback, residuals, and exclusions |
| **Total** | **100/100** | **local feature-dev gate passed** |

## Findings Closed

Ten plan-review findings were incorporated before implementation. Six implementation-review
findings were then proved red and fixed: request-key snapshot, single validator capability read,
exact base-validator identity on both transaction phases, manifest public cache-key seam,
single raw/composite admission snapshot, and current request collaborator after the awaited hard
guard. No valid finding remains.

## Routed Review Results

| Review | Result |
|---|---|
| Architecture | PASS — see `http-validator-acquisition-architecture-review.md` |
| STRIDE/security/insecure defaults | PASS — see threat model and security review |
| Differential security | PASS — six fixed findings, no unresolved issue |
| Production readiness | PASS — bounded/single-flight/default-off rollout and rollback |
| Source ratchet | PASS — 5/5 ownership/policy tests and no-edit convergence |
| Semgrep | PASS — 83 JavaScript/security rules, six runtime targets, zero findings, full parse |
| Tech-debt ratchet | PASS — full diff from current `origin/dev`, zero patterns after terminology cleanup |
| Adversarial | LOCAL PASS — cross-model export blocked by policy; independent reviewers passed; GitHub Codex pending |

Review-router initially selected refactor and source-ratchet coverage from file patterns. Because the
diff creates an outbound conditional-request/cache-generation trust path, architecture,
differential security, threat modeling, insecure-default, and production-readiness reviews were
added manually. Frontend, API route, infrastructure deployment, database, queue, payment, AI,
growth, privacy, and authentication implementation reviews are not applicable.

## Verification Evidence

| Gate | Result |
|---|---|
| Untouched focused baseline | PASS — 169/169 at `83c5ef62` |
| Post-rebase focused validator/regression suite | PASS — 229/229 |
| Release-gate correction subset | PASS — 40/40 |
| Exact `npm test` | PASS — 897/897 |
| `npm run typecheck` | PASS |
| Syntax and diff checks | PASS — 15 changed JavaScript targets; no diff errors |
| Runtime imports/debt/scope scans | PASS — no runtime `require()`, timer, retry, persistence, eval, sync I/O, placeholder, suppression, debugger, or console sink |
| Package dry-runs | PASS — six exact `1.2.0` README/package/source triplets |
| Dependency audits | PASS — production and full graphs, zero vulnerabilities |
| Semgrep | PASS — 83 rules over six runtime files, zero findings |
| Source-ratchet | PASS — five policy/ownership tests and convergence marker |
| Tech-debt ratchet | PASS — zero new debt patterns |

The first exact-suite run exposed two release-environment issues: the TSS parser package-contract
test still expected `@jtorm/tss-model` `1.1.0`, and the isolated worktree lacked a path to the
already installed pinned Terser binary. The expectation was updated to the required `1.2.0`
minor, the worktree used the existing dependency installation, the focused parser gate passed
2/2, and the exact suite then passed 897/897.

## Remaining Publication Gates

- Commit these final review records and outcome ledger entries.
- Open a ready, non-draft PR into `dev`.
- Require green CI for the current PR head.
- Require a clean Codex review against that same head and zero unresolved threads.
- Do not merge.
