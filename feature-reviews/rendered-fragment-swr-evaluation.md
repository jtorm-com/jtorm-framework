# Request-Triggered Rendered-Fragment SWR — Feasibility Evaluation

**Branch:** `feat/rendered-fragment-swr`
**Base:** `origin/dev` at `8b821b2cdefc5c124c753fc79c9493ca6f340aa7`
**Date:** 2026-07-19
**Status:** COMPLETE — HISTORICAL FEASIBILITY EVALUATION (SUPERSEDED)
**Specification:** [rendered-fragment-swr.md](rendered-fragment-swr.md)
**Threat model:** [stride-rendered-fragment-swr.md](stride-rendered-fragment-swr.md)
**Security review:** [rendered-fragment-swr-security-review.md](rendered-fragment-swr-security-review.md)

> This evaluation correctly rejected framework-owned replay. Its preferred host-owned boundary was
> subsequently specified, approved, implemented, and verified without changing that rejection.
> Statements below about absent runtime APIs are historical evidence; the current outcome is in
> [rendered-fragment-swr-implementation.md](rendered-fragment-swr-implementation.md).

## Decision

**Do not implement generic framework-owned rendered-fragment SWR under the current public contracts.**

The requested optimization cannot be shown safe because rendering is an observable host lifecycle, not a pure cache loader. A detached document isolates DOM construction but does not authorize or isolate arbitrary method data/validation/handle callbacks, event hooks, plugin completion, root-local models, injected singletons, transports, or external effects. Suppressing those callbacks would create a second incomplete rendering contract; replaying them would duplicate effects solely for cache maintenance.

The stop is also required by cache mechanics. The current blocking lease is not bound to the exact retained settlement it would replace, and current internal publication does not atomically include root persistence-dirty state. These are solvable only inside a larger cache transaction, but solving them would still not create lifecycle authority.

No runtime source, test behavior, package metadata, public API, wire format, canonical backlog state, commit, push, or PR is changed by this evaluation.

## Evidence and Feasibility Findings

| Finding | Source evidence | Evaluation |
|---|---|---|
| A stale hit suppresses traversal | `ui-cache-plugin.js:25-28` assigns `v.r`; `handler-wrapper.js:80,86-88` skips `handler.handle()` when it is present | The ordinary wrapper cannot simultaneously return stale and act as a refresh renderer without a new exact execution capability. |
| Lifecycle callbacks are arbitrary | `handler.js:85-109` invokes injected `data`, `validate`, `handle`, and before/after events; `event-model.js:61-82` invokes all registered hooks and a deferred commit | No purity, idempotence, background, or effect-suppression contract exists. |
| A shipped method mutates root state | `layer-method.js:30-33` calls `layerModel.set(v)`; `layer-model.js:106-140` appends registrations and marks the root-local model updated | Detached DOM is not effect isolation; replay can duplicate valid built-in state changes. |
| View/context cloning is insufficient | `handler-wrapper.js:47-80` executes before-iteration on the parent and links the detached context through `c.p`; `view-model.js:78-95` copies `c` by reference | A framework-created second pass can retain or mutate foreground/root context. |
| No host lifecycle authority seam exists | `ui-cache-plugin.js:25-47` exposes lookup/stage/complete/abort/save only | Cache/plugin code cannot infer that a second lifecycle is authorized or construct a separate host session. |
| Old work can overwrite a newer publication | `ui-cache-model.js:469-495` binds key/root/store; `complete()` at `629-649` does not compare the retained pair/generation | Independently reproduced: `acquire -> put("NEWER") -> stage/complete("OLD") -> get() === "OLD"`. Current blocking behavior is unchanged; the lease is simply unsuitable for SWR reuse. |
| Publication and dirty state are separate | Internal `publish()` is `ui-cache-model.js:202-258`; callers run root `touch()` afterward at `578` and `643` | Public `put()` cannot satisfy the requested all-or-nothing bytes/timestamp/recency/dirty contract. |
| Background persistence has no automatic phase | `ui-cache-plugin.js:45-46` starts `save()` only in ordinary after-view; `ui-cache-model.js:755-769` owns revision-safe snapshot/save | A host-created isolated session must run and observe its own complete after-view/save contract; external durability remains adapter-owned. |
| Wire v1 carries age but not attempt identity | Wire records pair exact HTML with `settledAt`; `promise-cache-model.restore()` at `170-190` rejects `age >= ttl` | V1 is sufficient for stale age classification, but not for cross-restart “one attempt ever.” A restored entry must explicitly be a new process-local generation or a separately reviewed wire is required. |

## Locked-Decision Disposition

| # | Required decision | Disposition |
|---:|---|---|
| 1 | Default zero and disabled parity | Specified fail-closed; no runtime behavior added. |
| 2 | Exact fresh/stale/hard and non-sliding age | Strict inequalities and original `settledAt` are specified for a future design. |
| 3 | Current scope/discriminator at lookup and refresh | Required at lookup, host-session creation, hard join, and completion; no captured key is authority. |
| 4 | One refresh per exact retained generation | Required for a live generation; restart identity is explicitly unresolved because v1 carries no attempt marker. |
| 5 | Full lifecycle and atomic bytes/time/recency/dirty publication | Current contracts fail both the host-authority and combined-dirty-transaction parts; implementation blocked. |
| 6 | Determine observable-effect safety | Unsafe framework replay demonstrated through arbitrary callbacks and built-in layer state. |
| 7 | Failed refresh retains only to original hard deadline | Prospective behavior specified with no timestamp slide, retry, stale-if-error, or unhandled rejection. |
| 8 | Hard callers use ordinary blocking contract | Prospective state machine never serves stale at/equal/beyond hard. |
| 9 | Exact persisted bytes and true Unix publication time | Existing two-owner pairing retained; no synthetic time allowed. |
| 10 | Decide wire-v1 sufficiency | Sufficient for age; insufficient for durable attempt identity. No wire change is authorized without the missing product decision and major-release plan. |
| 11 | All invalidators prevent resurrection | Exact cache/store/pair/token plus host epoch and init/newer-publication cases are specified and mapped to red-first tests. |
| 12 | Authorization/revocation implications | Positive windows explicitly extend visibility; generic downstream revocation is not claimed. |
| 13 | CommonJS/DI/singletons/public shapes/two clocks | Preserved because no runtime code changes; prospective ownership remains DI-only. |
| 14 | No timers/retries/jobs/validators/acquisition changes/imports | Preserved and listed as no-gos. |
| 15 | SemVer from final API | Documentation-only result has no bump; additive future surfaces require minor releases, while an incompatible wire requires major analysis. |

## Independent Reviews

### Code explorer

**APPROVE STOP.** The explorer traced lookup through wrapper/lifecycle/publication/save, identified the built-in layer-state witness, showed that stale `v.r` prevents a normal wrapper refresh, and first reproduced the old-lease/newer-publication overwrite. It found the existing scope checks, pair validation, internal rollback, clocks, purge, and wire-v1 bytes/timestamp record reusable, but no generic background-session authority.

### Code architect

**APPROVE STOP, with four required corrections incorporated.** The architect independently reproduced the overwrite and required the specification to:

1. define an opaque refresh-execution capability that changes only exact cache classification while every normal hook still runs;
2. stop calling current publication atomic with root dirty state and require a combined rollback transaction;
3. assign root/lifecycle epoch issuance and currentness to the host collaborator; and
4. distinguish wire-v1 age sufficiency from missing cross-restart attempt identity.

The corrected specification keeps all four as executable prerequisites, not documentation-only mitigations claimed to exist.

### Threat-model deep dive

The linked PASTA/STRIDE review classifies framework replay, newer-generation overwrite, partial dirty publication, cross-scope completion, restart attempt churn, timestamp extension, revocation, save failure, and frozen host work. It accepts no runtime residual risk because the unsafe feature does not ship.

## Preferred Future Boundary

A separately approved follow-up may start only after a host supplies a real isolated render-session collaborator. The host must own input snapshotting, complete lifecycle authorization, opaque root/lifecycle authority epochs, session isolation, effect acceptance, time/resource bounds, and save observation. An opaque execution capability must let the normal UI-cache hook bind that isolated iteration to the refresh transaction without returning stale or suppressing any hook.

The cache must own strict phase classification, one-attempt live-generation metadata, hard joins, exact retained-generation tokens, all invalidation checks, true process/Unix publication clocks, and a new synchronous transaction that publishes cache metadata and root dirty revision together or rolls both back. The external adapter remains an asynchronous durability boundary.

Eight unresolved host/product prerequisites are enumerated in specification Section 20. Until all eight have executable contracts and red-first tests, positive fragment SWR must fail closed to existing blocking behavior.

## Architecture, Compatibility, and SemVer

- Pure CommonJS, dependency injection, singleton exports, nested live cache, order values, current methods, clocks, acquisition SWR, validators, and adapter wire remain unchanged.
- No export/package is removed or deprecated, and no handwritten TypeScript/declaration is introduced.
- There is no current release: documentation-only evaluation does not bump packages.
- A future additive UI-cache configuration/lease and plugin collaborator require minor releases. Promise-cache requires a minor only if its public restore helper changes.
- Durable attempted-generation metadata would make wire v1 insufficient and requires a major UI-cache release with migration, mixed-reader isolation, deployment, rollback, privacy, and fixture work.

## Plan Quality Score

| Dimension | Score | Evaluation evidence |
|---|---:|---|
| Architecture | 10/10 | Unsafe cross-owner replay rejected; future host/cache ownership is explicit. |
| Consistency | 10/10 | Existing DI, singleton, cache/order, clock, wire, and lifecycle contracts are preserved. |
| Type Safety | 10/10 | No code/types added; prospective capabilities are opaque and exact rather than loose shared state. |
| Validation | 10/10 | Policy, scope, host epoch, generation, clock, wire, and completion validation are fail-closed. |
| Error Handling | 10/10 | Sync/async lifecycle, publication, dirty, save, hard-caller, and rejection outcomes are specified. |
| Security/Privacy | 10/10 | Default zero, current authority, strict hard bound, revocation caveat, and PASTA blockers are explicit. |
| Performance | 10/10 | One attempt per accepted generation, bounded metadata, no timer/retry/job, host resource ownership. |
| Maintainability | 10/10 | No duplicated state machine or runtime import; conceptual seams stay with their policy owners. |
| Testability | 10/10 | Deterministic conditional matrix covers effects, clocks, restarts, invalidators, publication, and scope. |
| Readability | 10/10 | State, ownership, risk, wire caveat, and eight prerequisites are explicit. |
| **Total** | **100/100** | **For the evaluation/stop deliverable, not an implementation.** |

## Verification Ledger

| Gate | Result |
|---|---|
| Source/owner trace | PASS — relevant models, plugin, wrapper, handler, view, method, persistence, records, and focused tests inspected |
| Independent generation-race reproduction | PASS — isolated Node process returned `{"miss":null,"newer":true,"final":"OLD"}` |
| Explorer review | PASS — APPROVE STOP |
| Architect review | PASS — APPROVE STOP; all four corrections incorporated |
| STRIDE/PASTA | PASS for pre-code decision — all six categories, seven stages, attack trees, chains, controls, residual owners, and stop condition documented |
| Runtime/package/wire diff | PASS — staged candidate contains exactly the four review documents and no source, test, package, dependency, or wire file |
| Markdown/reference/diff checks | PASS — linked files exist, code fences are balanced, intended file scope is exact, and `git diff --cached --check` is clean |
| Exact `npm test` | PASS — 912/912 |
| `npm run typecheck` | PASS |
| Package dry-runs/audits/Semgrep/PR/CI/Codex | N/A — no runtime/package/release candidate after failed feasibility gate |

## Final Verdict

**FEASIBILITY GATE FAILED; DOCUMENTATION DECISION APPROVED.** The safe outcome is the stop itself. Current code has no generic authority to replay the render lifecycle, current leases cannot protect an exact stale base from a newer publication, current publication does not include root dirty state atomically, and restart-stable attempt semantics are not present in wire v1. The preferred host seam is credible only as a separately specified capability with all eight prerequisites resolved.
