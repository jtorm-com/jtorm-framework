# Rendered-Fragment SWR — Implementation and Delivery Evaluation

**Status:** MERGED — PR #74 landed in `dev` as `ca4cef2`
**Date:** 2026-07-19
**Branch:** deleted after merge
**Target:** `dev`
**Agent:** Codex `/root`
**Current mode:** Complete

## Outcome

The preferred future design is implemented as an additive, default-off rendered-fragment
stale-while-revalidate path. The cache never replays a lifecycle itself. A stable injected host
authorizes the work, snapshots canonical inputs synchronously, creates one isolated root, and runs
the unchanged before-view, handler/iteration/plugin, completion, and after-view lifecycle.

The cache owns only strict phase classification, exact process-generation coordination,
metadata-free capabilities, hard-follower adoption, invalidation, and atomic live publication.
Missing or malformed policy/host wiring preserves the exact existing blocking path. No runtime
import, timer, worker, retry loop, validator, acquisition-cache behavior, route, database, or wire
field was added.

## Locked Runtime Contract

1. `staleWindow` defaults to `0`. Only a finite positive window plus the same valid stable
   `refreshModel` on UI-cache model and plugin before `init()` enables rendered stale service.
2. Finite phases are strict and non-sliding: fresh for `age < ttl`; stale for
   `age >= ttl && age - ttl < staleWindow`; hard otherwise. `ttl = 0` remains pending-only and
   `Infinity` remains explicitly non-expiring.
3. The first authorized stale caller receives exact retained HTML and may reserve one attempt for
   that process generation. Concurrent stale callers receive the same bytes without waiting.
   Failed or malformed starts consume the attempt and never change age, bytes, recency, or dirty
   state. Temporary fresh reclassification preserves that marker for the unchanged insertion.
4. The host implements `authorize/current/render/session/owns`. Current and ownership decisions
   must be literal `true`; authority and session identities are opaque. The cache capability is
   frozen with zero own keys and carries no coordinates, scope, authority, or generation data.
5. Activation, the target execution lookup, hard-join consumption, and publication all re-check
   current host identity, authority, exact session ownership, scope, coordinates, and generation
   as applicable. Deleted, malformed, cyclic, changed, or unauthorized scope fails the active
   isolated execution before handler effects.
6. Hard callers never receive stale HTML. An authorized independent root adopts active work, then
   re-derives caller scope/authority and restarts ordinary classification after settlement.
   Same-root recursion bypasses its own refresh.
7. Publication atomically replaces HTML, Unix `settledAt`, process stamp, exact pair, LRU position,
   and isolated-root dirty revision. Any synchronous failure restores all prior representations.
8. Exact/full purge, eviction, cache/order replacement, promise-record reset, re-init, newer
   publication, host replacement, authority/session revocation, or scope drift detaches late work.
9. Wire v1 remains unchanged. A valid restored stale record keeps its original Unix timestamp and
   becomes a new process-local generation with one available attempt; attempt state is not
   serialized.
10. Ordinary after-view retains its published non-awaited `save()` timing. Isolated refresh
    after-view awaits `save()` and closes in `finally`; adapter rejection is host-visible,
    leaves live publication intact, and preserves retryable dirty state. If an earlier after-view
    hook aborts first, observed host rejection still closes the completed execution without
    claiming a save or rolling back publication. External ordering and
    durable atomicity remain adapter-owned.
11. The host owns platform lifetime extension, cancellation, concurrency limits, lifecycle-effect
    authorization, and privacy-safe outcome telemetry. The framework starts no background work
    without a request and makes no durability claim.

## Ownership and Public Surface

| Owner | Implemented responsibility |
|---|---|
| `@jtorm/promise-cache-model@1.3.0` | `restorePhase` / `entryPhase`, scoped insertion-record lookup, and opaque zero-key checkpoint/restore/release tokens. |
| `@jtorm/ui-cache-model@2.1.0` | Rendered phase policy, host pinning, capability/session/generation state, hard adoption, invalidation, live publication/rollback, wire-v1 stale restore. |
| `@jtorm/ui-cache-plugin@1.1.0` | Stable-host lifecycle seam, classified lookup/start, exact existing fallback, normal iteration staging/completion/abort, awaited isolated save. |
| Host `refreshModel` | Canonical snapshot, isolated root/session, full lifecycle, effect authority, lifetime/cancellation/concurrency, outcome observation. |
| Save adapter | Atomic handling and ordering of each immutable external envelope; storage durability. |

The live cache remains `{language:{cid:{scopedVariant:html}}}`; order values remain
`{l,id,c}`; CommonJS singleton exports and all existing methods remain available. Package
dependencies declare coordinated minimum versions but runtime source remains dependency-injected
and contains no `require()`.

## Data-Flow Traces

### 1. Foreground stale request

Flow: UI-cache plugin `beforeIteration` → stable-host validation → UI-cache `lookup` →
promise-cache `entryPhase` → exact retained generation → `reserve` / `start` → stale HTML
returned to the foreground wrapper.

- A miss or disabled policy uses the exact existing `get()` path.
- Reservation requires current scope, exact cache/order/pair/insertion record, pinned host, and
  literal host authorization.
- `start()` rechecks the decision immediately before invoking `render()`; false,
  truthy-nonboolean, throwing, malformed-Promise, rejection, and incomplete lifecycle paths are
  observed and fail without publication.
- Concurrent stale callers receive no capability and launch no duplicate work.

### 2. Isolated refresh lifecycle and publication

Flow: host `render` → canonical input snapshot → isolated root/session → UI-cache `activate` →
before-view → wrapper `beforeIteration` → active execution lookup → handler/method lifecycle →
after-iteration stage → completion hook → UI-cache transaction → after-view awaited save → close.

- The execution lookup recognizes the activated target before ordinary scope-miss fallback.
  Coordinate drift, scope deletion, malformed/cyclic discriminators, valid scope drift,
  authority rotation, or session revocation throw `Rendered fragment refresh execution denied`
  and abort the iteration before handler effects.
- Before target binding every active-root lookup must match the captured key; after binding,
  different-coordinate nested lookups retain ordinary behavior.
- The ordinary UI-cache hook returns a miss only for the valid exact execution, so no lifecycle
  hook is suppressed.
- Publication reauthorizes and rechecks the exact generation; a cache/metadata/dirty failure rolls
  every cache-owned representation back.
- Adapter failure occurs after live commit, rejects the host lifecycle, keeps dirty state
  retryable, and never falsely claims durable rollback. An earlier after-view abort also closes the
  completed execution without claiming that the cache save hook ran.

### 3. Hard follower

Flow: hard lookup → exact active refresh → caller authority identity check → await observed
refresh → post-wait scope/authority/host/generation checks → recursive ordinary `lookup`.

- No stale bytes are exposed at the hard boundary.
- Post-wait checks cover caller scope, authority, exact/full purge, newer publication,
  cache/order identity replacement, host replacement, and re-init.
- A revoked follower receives no bytes; a detached or superseded result is reclassified instead
  of consumed.

### 4. Persistence restore

Flow: `init()` → attested adapter envelope → whole-envelope validation → restart-stable clock →
promise-cache `restorePhase` → staged cache/order/pair/process records → atomic identity swap.

- Original `settledAt` determines current fresh/stale/hard classification.
- Stale restore is admitted only with a valid host pinned to the candidate order and still
  configured at swap.
- Hard, future, regressing, malformed, mixed, duplicate, or unversioned input fails cold.
- No timestamp, authority, session, capability, attempt marker, or process clock identity is
  synthesized or serialized.

### 5. Invalidation and failure

Flow: purge/eviction/reset/init/identity or authority change → refresh detachment → private promise
settlement → no publication; hard consumers reauthorize and reclassify.

- Generation invalidation and newer insertion win over late completion.
- A failure consumes only that retained generation's refresh attempt; there is no timer, retry, or
  stale-if-error extension.
- Active host work may continue until host cancellation/settlement, but it loses publication
  authority immediately.

## Nine-Junction Audit

| Question | Disposition |
|---|---|
| Returns null? | Ordinary unscoped/disabled lookups miss. An activated target whose scope disappears throws and fails the refresh before effects; it cannot silently fall through. |
| Returns void? | Mutations expose booleans/counts or are tied to opaque generation tokens. There is no database update whose loss could be masked. |
| Async awaited? | Lookup, hard adoption, lifecycle completion, and isolated save are awaited. Ordinary save remains intentionally non-awaited for compatibility; refresh promises receive a same-turn rejection observer. |
| Check paired with record? | Authority checks are paired with the exact cache/order/pair/insertion record, capability, session, host identity, and process generation. |
| All token paths through one gate? | Activation, execution, hard adoption, completion, and close use the same private refresh record and current host/session checks. |
| Count + modify atomic? | Live HTML/metadata/dirty publication is one synchronous rollback transaction. No database exists; external save ordering/durability is explicitly the adapter boundary. |
| Cache invalidated on state change? | Exact/full purge, eviction, reset, init, identity replacement, supersession, scope drift, and authority/session rotation detach work immediately. |
| Dev bypass environment-gated? | No environment, debug, partner-token, or production bypass surface exists. |
| Fallback masks deleted state? | Malformed/missing host wiring alone uses existing behavior. Deleted or invalid authority state inside an activated target is fail-stop, never a normal miss. |

## Findings Closed During Review

1. **Malformed identity-matched plugin host:** added literal readiness checks and proved malformed
   wiring calls the exact existing `get()` path.
2. **Hard follower time-of-check/time-of-use:** added post-await caller reauthorization and recursive
   ordinary reclassification across scope, authority, purge, supersession, identity, host, and init
   changes.
3. **Completion scope drift:** re-derived scope before and after host callbacks instead of relying on
   a captured key.
4. **Post-init host replacement:** pinned the valid host to each initialized order identity; a
   replacement cannot reserve restored stale generations until re-init.
5. **Execution-time revocation:** changed active target denial from a normal miss to a loud refresh
   failure before handler effects. Red tests cover language/component/variant drift; changed,
   deleted, malformed, and cyclic scope; authority rotation; and session revocation. A companion
   assertion preserves unrelated nested lookups after the target bind.
6. **Start decision validation:** red tests cover literal false, truthy nonboolean, and throwing
   current decisions after reservation; none invokes host rendering.
7. **Source ownership ratchet:** replaced regex-only ownership checks with a syntax-aware AST walk
   and exact package/version ownership assertions.
8. **Attempt marker across fresh reclassification:** a failed or active attempt now becomes/remains
   the same generation's tombstone when policy temporarily makes its insertion fresh; restoring
   the stale policy cannot execute lifecycle work twice.
9. **Post-publication after-view abort:** host rejection now closes a completed execution even when
   an earlier after-view hook prevents the cache save hook; live bytes and retryable dirty state
   remain intact, and no save is claimed.

The code-architecture review approved the owner split. The code review's three runtime blockers
were fixed and its re-review found no remaining runtime issue. The test-analysis findings were
reproduced red-first and fixed; final replay covers the expanded denial/start matrices. The
current-head GitHub Codex findings were also reproduced red-first and fixed in items 8–9.

## Reliability and Failure Matrix

| Boundary | Failure | Observable result | State guarantee |
|---|---|---|---|
| Reserve/start | Missing authority, false/nonboolean/throwing decision, malformed/rejected host promise, temporary fresh reclassification | Stale caller keeps exact old HTML only inside its original window | Attempt consumed once and retained for the unchanged insertion; no timestamp/recency/dirty change |
| Activation/execution | Wrong root, missing session, scope loss/drift, authority/session revocation | Host lifecycle rejects; wrapper abort hook runs | No handler effect, stage, publication, after-view, or save |
| Completion | Hook failure, detached generation, scope/host drift, clock/stamp/dirty failure | Host lifecycle rejects | Exact prior cache/order/pair/process/LRU/dirty state restored |
| Hard adoption | Caller revoked or generation changes during wait | No stale or unauthorized bytes; ordinary reclassification | Purge/newer/init/identity changes win |
| After-view save | Adapter rejects or an earlier/later after-view hook fails | Host observes rejection after live commit | Execution closes; live bytes stay published; dirty revision remains retryable; no unrun save is claimed |
| Restart | Valid stale wire-v1 record under current host/clock | New process generation | Original age retained; no durable capability/attempt identity |
| Platform lifetime | Runtime freezes or host cancels detached work | Best-effort attempt may not complete | No framework durability claim; detached work cannot publish after invalidation |

State growth is bounded by the existing `max`; refresh coordination is bounded to one record per
retained key/order identity. Lookup remains O(1). Refresh publication snapshots at most `max`
order/pair records to guarantee rollback, making that exceptional path O(max). No polling,
unbounded recursion, or hidden retry path exists.

## Verification Evidence

- Red-first regression reproduced for every valid review finding before the corresponding runtime
  fix.
- Focused SWR/lifecycle/plugin/policy suite: **77/77 passing**.
- Exact post-rebase repository command `npm test`: **952/952 passing**.
- Exact repository command `npm run typecheck`: **passing**.
- Package dry runs accept coordinated versions:
  `@jtorm/promise-cache-model@1.3.0`,
  `@jtorm/ui-cache-model@2.1.0`, and
  `@jtorm/ui-cache-plugin@1.1.0`.
- Static checks: `git diff --check` clean; no runtime `require(` in the three changed source
  modules; no hand-written `.ts` or `.d.ts`; Markdown fences balanced.
- Syntax-aware source-ownership ratchet: no-edit pass; focused policy tests pass.
- Tech-debt ratchet: clean after replacing one compatibility-shim-sounding test label with the
  accurate existing-path contract; no runtime change was needed.
- Semgrep auto rules over all changed JavaScript: clean.
- Cross-model adversarial CLI review was unavailable because the environment rejected repository
  export under its data-export policy before content left the workspace. No bypass was attempted;
  in-workspace architect, code, test, threat, production-readiness, and source-ratchet reviews were
  used instead.

No browser/E2E, route, database, accessibility, visual, or external API verification applies: this
is a dependency-free server/client cache lifecycle model with no new UI or network entry point.
The real wrapper/event/plugin lifecycle integration test is the highest applicable end-to-end
boundary.

## Delivery Scorecard

| Dimension | Score |
|-----------|-------|
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

The score is final. Feature head `f379d8f` passed the focused 77/77 suite, exact 952/952 repository
suite, typecheck, package/security/source ratchets, green CI, and a clean current-head Codex review
with zero unresolved threads. The maintainer merged PR #74 into `dev` as `ca4cef2`; the delivery
agent did not merge it.
