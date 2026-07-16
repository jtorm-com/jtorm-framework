# Feature Development: Explicit Returned View Effects

**Status:** COMPLETED
**Claimed:** 2026-07-16T06:58:27Z
**Agent:** Codex (GPT-5)
**Current Mode:** Complete - Merged as PR #49

---

## Resumption Context

**Last Completed Mode:** Delivery (PR #49 merged into `dev`)
**Current Mode:** Complete
**Next Action:** None; PR #49 merged with green CI and clean current-head Codex review.
**Files Created:**
- `feature-reviews/explicit-returned-view-effects.md` - Feature-dev state and implementation spec.

**Files Modified:** Handler/view/type contracts, all 23 methods, UI compiler and host wiring, package manifests, focused/source tests, canonical docs, and the selected architecture review/backlog.
**Tests Written:** Finite no-return regression in `test/handlers/handler.test.js`.
**Open Issues:** None. Local review findings and the first-head Codex source-walker finding were fixed red-first.
**Design Decisions Made:** Returned method intents normalize to a complete handler-owned effect; gate defaults close; repeat defaults false and is capped at 100; prepared synthesized data still passes through custom method data hooks; actual verbs execute only through handler dispatch; `ViewModel.io` is removed while `ViewIO` remains an exported effect-shape name.

**Context for Next Session:**
PR #49 merged head `caa5408` into `dev` as `0600c4a` after green CI and clean current-head Codex review. The selected P2 task and all delivery gates are complete; the remaining architecture backlog contains only independent P3 items.

---

## Progress Log

### Research Mode
- [x] Read project `AGENTS.md` completely
- [x] Read `feature-dev` skill completely
- [x] Verified clean `dev` at `4bfab8f`
- [x] Created `feature/explicit-view-effects` from `dev`
- [x] Mapped codebase and relevant docs
- [x] Recorded research summary

### Plan Mode
- [x] Entered plan mode
- [x] Wrote feature spec
- [x] Defined implementation and test sequence

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant local personas/checklists consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined and approved by the maintainer's explicit execution prompt

### Design Mode
- [x] Loaded required available local design personas (`database-architect.md` absent; DB scope N/A)
- [x] Spawned code-explorer and code-architect checks
- [x] Created threat model in the approved feature spec
- [x] Defined effect and dispatch contracts
- [x] Validated the design inventory and constraints against locked architecture (spawned sidecars did not finalize; Codex performed the required local architecture/security review)

### Implement Mode
- [x] Checkpoint 1: Failing regression and contract scaffold (red proven)
- [x] Checkpoint 2: Core handler/dispatch logic
- [x] Checkpoint 3: Runtime writer and compiler migration
- [x] Checkpoint 4: Types, package versions, docs, and integration

### Test Mode
- [x] Regression proven red then green
- [x] Focused tests passing
- [x] Typecheck passing
- [x] Full test suite passing
- [x] Publication dry-runs passing
- [x] Source/import guards and diff checks passing

### Review Mode
- [x] `review-architecture`: PASS
- [x] `review-privacy`: PASS
- [x] `review-refactor`: PASS
- [x] Security review: PASS
- [x] `tech-debt-ratchet`: PASS
- [x] `production-readiness`: PASS
- [x] 100/100 code quality
- [x] Fresh verification loop passed

### Documentation and Delivery Mode
- [x] Canonical docs updated
- [x] Architecture feature review updated
- [x] Architecture backlog updated
- [x] Completion evaluation written
- [x] Conventional commit created
- [x] Feature branch pushed
- [x] Ready PR #49 opened into `dev`
- [x] `@codex review` requested
- [x] Current-head Codex review polled clean at `caa5408`
- [x] PR #49 merged by the maintainer into `dev` as `0600c4a`

## Research Summary

- **Modules involved:** `@jtorm/handler`, `@jtorm/view-model`, `@jtorm/types`, all 23 `src/methods/*-method` packages, `@jtorm/ui-compiler-model`, and the full-pipeline DI harness. `handler-wrapper`, event-model, data-parser, document-model, UI resolver/manifest packages, and plugins are behavior dependencies but currently have no `v.io` writes.
- **Current dispatch flow:** for each TSS node, `handler.handle()` resolves an own registry key or scans registered aliases, rejects a truthy unknown method, runs custom `data(v)` or default `dataParser.handle(v, params)`, stores validation in `v.io.v`, fires `before.method`, conditionally calls `handle(v)`, fires `after.method`, repeats while `v.io.r`, then recursively handles children with `v.io.d || v.m`.
- **Current state ownership:** `view-model.data.io` and every root created by `viewModel.create()` start as `{d:null,c:1,r:1,v:0}`. `viewModel.copy()` includes `io` in its by-reference copy list. The handler clears only `v.io.d` after each rule and restores lexical `v.c.s`/`v.c.a` plus the original context reference in `finally`.
- **Runtime writers:** all 23 method packages write or mutate `v.io`. Transform methods generally leave children on; config/data/media gates choose child handling; text/get/config/data/time provide child data; `ui` alone requests repeat after replacing `v.t`; each/if/layer/move/remove/wrap suppress automatic child recursion after doing their own work.
- **Bypass sites:** attrs calls attr directly; each and move index the method registry and call `handle` directly; mediatarget calls mediaquery `handle` directly during breakpoint processing; UI compiler `add()` clones a view, calls `methods[i].handle`, and reads `sV.io.c`. These paths do not currently share normal data parsing, validation, gate fallback, alias/unknown handling, or method events.
- **Existing behavior locks:** `test/pipeline/gate-fail-closed.test.js` covers gate misses and non-gate pass-through; `test/pipeline/unknown-verb.test.js` covers unknown methods and aliases; `test/handlers/handler.test.js` covers lexical restoration after throws; UI lifecycle/compiler tests characterize repeat and conditional `di`; pipeline goldens cover child recursion, zero-match drift, UI/get scoping, and composition.
- **Type contract:** `@jtorm/types` exports `ViewIO`, `ViewModel.io`, and `Method` callbacks returning void. `test/types.test.js` locks the view-model field set; `test/types-dts.test.js` locks generated declaration exports and data-only methods. Source remains comments-only JSDoc and generated declarations remain gitignored.
- **Package/publication boundary:** 27 published packages contain a writer or own the contract (`handler`, `view-model`, `types`, `ui-compiler-model`, and 23 methods). Every source-touched package requires its own patch bump and dry-run. Runtime code contains no imports; all new collaboration must remain host-injected and metadata-only in package manifests.
- **Documentation shape:** this repository has no `docs/` or `FEATURES.md`. Relevant canonical surfaces are `AGENTS.md`, root/package READMEs, the selected architecture review/backlog, this feature record, and a completion evaluation artifact following prior feature conventions.
- **Constraints discovered:** preserve the existing method lifecycle order, fail-closed gates, pass-through non-gate misses, before/after events, explicit UI repeat, child data recursion, alias/unknown behavior, lexical restoration, loud zero-match drift, singleton resets, every package/export, pure JS/CommonJS, and zero runtime `require()` calls. P3 cleanup, parser replacement, and error-handler work remain out of scope.
- **Open questions:** None; the maintainer selected and fully constrained the task.

## Feature Spec

# Feature Spec: Explicit Returned View Effects

**Date:** 2026-07-16
**Author:** Codex (GPT-5)
**Status:** Approved

### Problem Statement

A jTorm method author can currently omit the undocumented requirement to replace `v.io` wholesale. Because every root view starts with `v.io.r = 1`, the handler then repeats the method forever, consuming the render worker. The same mutable side channel carries child recursion and child data through 23 ad-hoc writers, while five internal method calls bypass normal data, validation, gate, alias, unknown-method, and event behavior. The observable cost is an avoidable render DoS risk and a method lifecycle that is not an engine invariant.

### Scope

#### In Scope

- Replace runtime `v.io` mutation with a method-returned effect contract containing `children`, `repeat`, and `data`.
- Make the handler own gate-aware defaults, effect normalization, explicit-repeat bounds, alias/unknown resolution, data preparation, validation, events, and repeat execution through one `dispatch()` path.
- Route actual synthesized verb execution in attrs, each, move, and UI compiler `di` through handler dispatch; reduce mediatarget-to-mediaquery coupling to the existing pure match helper rather than invoking a verb directly.
- Remove `io` initialization/copying from the view model and migrate all 23 runtime method writers in one coordinated change.
- Update canonical JSDoc types/editor annotations, tests, host wiring, package metadata/versions, public documentation, the selected architecture review/backlog, and completion evidence.

#### Out of Scope (Non-Goals)

- P3 context/state/fetch-model/plugin DRY cleanup.
- TSS parser replacement or parser arithmetic changes.
- Error-handler debug/output work.
- UI resolution/compiler responsibility changes, manifest discovery/loading changes, schema-UI graph changes, or new runtime imports.
- General recursion-cycle detection outside method repeat, or changes to zero-match drift behavior.

### Requirements

#### Functional Requirements

1. A method that returns nothing executes once and receives a safe normalized effect; it cannot inherit stale repeat state.
2. `handler.dispatch(v, preparedData?)` is the only path that executes a registered verb, whether addressed by registry key, alias, or a synthesized node.
3. Dispatch preserves lifecycle order: data preparation → validation → `before.method` → conditional handle → `after.method`.
4. Validate misses remain fail-closed for `gate` methods and pass-through for non-gates. A gate whose implementation returns no effect also defaults closed.
5. Dispatch returns a complete `{children, repeat, data}` object. Missing/malformed method returns normalize to handler-owned defaults; `repeat` defaults false.
6. Explicit repeat re-resolves the possibly replaced `v.t`, runs the full lifecycle again, and fails loud at the handler's bounded repeat limit instead of looping forever.
7. Child recursion uses the returned `children` flag and uses returned `data` whenever it is explicitly present, including falsy values; otherwise it uses `v.m`.
8. Unknown methods throw before child recursion; aliases use the same dispatch; lexical scope restoration remains in the handler's existing `finally`.
9. Every runtime method returns an effect intent and no runtime source reads or writes `v.io`.
10. Existing method/package exports remain present, including compatibility-facing UI compiler/UI method facade properties and the published `ViewIO` type name.

#### Non-Functional Requirements

- **Performance:** one normal dispatch remains O(number of registered methods) only for alias lookup, matching current behavior; no new fetches, imports, or per-element allocations. Repeat is capped at 100 lifecycle executions per dispatch.
- **Security:** accidental repeat is impossible; explicit repeat is bounded; gate defaults fail closed; internal methods cannot bypass future validation/security/event checks.
- **Type safety:** pure-JS JSDoc remains the source; generated declarations expose `ViewEffect`, retain `ViewIO` as the returned-effect shape, remove `ViewModel.io`, and type effect-returning handles without handwritten declarations.
- **Compatibility:** runtime packages ship as one coordinated patch set with dependency minima raised to the new effect-contract releases; no mixed implicit/explicit runtime is supported.
- **Accessibility:** N/A; no rendered semantics or interaction design changes.

### Affected Components

| Component | Change Type | Risk |
|-----------|-------------|------|
| `src/handlers/handler` | New dispatch/effect normalization and repeat bound | High |
| `src/models/view-model` | Remove mutable `io` state/copy behavior | Medium |
| `src/types` | Canonical `ViewEffect`/`Method`/`ViewModel` JSDoc contract | High |
| `src/methods/*-method` (23 packages) | Return effects; remove all `v.io` access | High, mechanical but broad |
| `src/models/ui-compiler-model` | Route conditional `di` through injected dispatch | High |
| `test/helpers/engine.js` | Wire dispatch owner into synthesized callers | Medium |
| Handler/method/compiler/type/pipeline tests | Red regression and lifecycle/behavior locks | High |
| `AGENTS.md`, root/package READMEs, feature reviews | New locked architecture and release evidence | Low |
| 27 touched package manifests | Patch releases and coordinated dependency minima | Medium |

### Dependencies

- [x] Depends on the existing injected method registry, data parser, event model, view model, and UI resolver/compiler split.
- [x] Blocks future method additions from relying on `v.io` or bypassing lifecycle policy.
- [x] External dependencies: none; runtime remains dependency-free code.

### API Contract

There is no HTTP API change. The published JavaScript/JSDoc method contract becomes:

```js
/**
 * @typedef {Object} ViewEffect
 * @property {boolean} children
 * @property {boolean} repeat
 * @property {*} data
 */

// Method intent: fields may be omitted; handler dispatch normalizes all three.
handle(v) => ViewEffect | Promise<ViewEffect>
data(v, preparedData?) => void | ViewEffect | Promise<void | ViewEffect>

// Internal execution seam used by normal and synthesized calls.
handler.dispatch(v, preparedData?) => Promise<ViewEffect>
```

`ViewIO` remains an exported type name for the returned effect shape so no published type export disappears. `ViewModel` no longer has an `io` property. Runtime methods must return effects; the handler still safely normalizes an untyped/buggy method that returns `undefined`.

### Security Assessment

#### Threat Model Link

This section is the version-controlled threat model: `feature-reviews/explicit-returned-view-effects.md#security-assessment`.

#### Data Flow and Trust Boundary

```text
host-trusted TSS + model + injected registry
                  |
                  v
       handler.dispatch(v, prepared?)
       | resolve key/alias or throw
       | prepare data -> validate -> before event
       | execute method -> after event
       v
      normalize {children, repeat, data}
       |                 |
       | repeat=true     | repeat=false
       | bounded <=100   v
       +----------> child recursion / caller result

Extension boundary: a host-injected method may return missing or malformed effect data.
The method is trusted to transform the DOM, but dispatch does not trust it to terminate
or to supply complete control-flow fields.
```

Assets are render availability, DOM/output integrity, confidentiality of gated children, complete method-event visibility, and lexical scope isolation. Relevant actors are a buggy or hostile host method extension and an author-controlled TSS/model that selects registered verbs; there is no new remote actor, credential, PII, network, database, or authorization boundary.

#### STRIDE Analysis

- **S — Spoofing:** N/A. No identity/authentication decision is introduced; registry ownership remains host-controlled.
- **T — Tampering:** A method can return malformed effects or mutate `v.t`. Dispatch normalizes fields, re-resolves every repeat, rejects unknown methods, and routes synthesized calls through validation/events. A trusted method can still mutate DOM by design; residual risk unchanged.
- **R — Repudiation:** Internal synthesized method executions currently omit before/after events. Central dispatch makes them observable to the same event stream. No durable audit system exists or is introduced.
- **I — Information Disclosure:** Gate validation misses and missing gate effects default `children:false`; existing zero-match and raw-sink policy remains unchanged. No new data output or sink is added.
- **D — Denial of Service:** Missing effects default `repeat:false`; explicit repeat is capped at 100 and fails loud. Recursive TSS trees remain finite parser/host input and are unchanged; deliberately cyclic programmatic AST input is residual host-trust risk outside this task.
- **E — Elevation of Privilege:** N/A for user privilege. Lifecycle bypass is removed so future validation/gate checks cannot be skipped by internal engine dispatch.

#### Attack Tree: Render Worker Exhaustion

```text
Exhaust render worker
  OR-- method forgets to clear inherited repeat    -> removed: no inherited state
  OR-- method returns repeat:true forever          -> bounded: dispatch throws at 100
  OR-- synthesized path skips validating method    -> removed: same dispatch lifecycle
  OR-- unrelated cyclic host-built AST             -> unchanged residual host-trust risk
```

Residual risk is low and accepted by the maintainer's explicit task approval: trusted methods can perform arbitrary expensive work inside one invocation, which this control-flow contract cannot timebox without a broader execution-sandbox design.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| One of 23 methods maps old `c/r/d` semantics incorrectly | Medium | High | Mechanical migration table, focused method tests, full 427+ golden suite, source ratchet |
| Synthesized prepared data is overwritten or skips custom data normalization | Medium | High | Dispatch distinguishes prepared data, still invokes custom `data(v, prepared)`, and tests normal/alias/compiler paths |
| Gate defaults regress to fail-open | Low | High | Gate-aware default plus existing and new fail-closed tests |
| UI repeat or rewritten `v.t` stops compiling | Medium | High | Dedicated UI lifecycle repeat tests and full UI pipeline goldens |
| Mixed package versions recreate the old contract | Medium | High | Patch every touched package and raise inter-package/type dependency minima |
| Central dispatch becomes overly complex | Medium | Medium | Keep resolution/lifecycle/effect normalization in one small handler seam; no P3 cleanup |

### Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|----------|-------------------------|--------------|
| Returned effects with handler normalization | Reset mutable `v.io` before each call; shared effect builder called by methods | Returning removes the side channel; normalization protects untyped extensions and centralizes defaults |
| Gate-aware default children | Always default children true; always false | Preserves non-gate pass-through while making missing gate effects fail closed |
| Complete normalized dispatch output from partial method intents | Require every method to spell all three keys; accept ad-hoc objects unchanged | Methods state only changed intent; every caller receives one stable full shape |
| One `handler.dispatch()` loop | Re-enter `handler.handle()` with synthetic one-node trees; duplicate lifecycle in callers | Avoids view recreation/child recursion and gives normal, alias, prepared, and repeat execution one owner |
| Prepared-data argument plus custom `data(v, prepared)` | Encode JS values back into TSS literals; skip all data hooks | Preserves object/falsy values without lossy quoting while still running method-specific normalization |
| Pure media-query helper from mediatarget | Dispatch a synthetic mediaquery during startup | Breakpoint discovery is a policy query, not verb execution; using `process(q)` removes the false dispatch without firing render events at bootstrap |
| Remove `ViewModel.io`; retain `ViewIO` name as effect shape | Keep a read-only `v.io`; delete `ViewIO` export | No mixed runtime contract, while obeying the locked no-export-deletion rule |
| Bound explicit repeats at 100 | No cap; one repeat only | Preserves intentional UI rewriting and future bounded workflows while preventing deliberate/buggy infinite repeat |

### Blast Radius

| Dimension | Answer |
|-----------|--------|
| Direct dependencies | Injected method registry, data parser, event model, view model, UI compiler, all method packages; no DB/API/queue/cache changes |
| Direct dependents | Every SSR/SPA render, host DI bootstrap, method plugins observing events, custom published methods implementing `Method` |
| Cascade on outage | A dispatch defect can fail all rendering; CI goldens and coordinated package publication block release |
| Cascade on slow | Extra lifecycle work occurs only for explicit repeat/internal calls; repeat cap prevents unbounded accumulation |
| Cascade on bad data | Malformed effects normalize locally; invalid method names throw; returned child data is scoped to that rule's recursion |
| Compromised-session impact | N/A: no sessions/auth; a hostile trusted method already has DOM mutation authority, but repeat blast radius is capped |
| Fault isolation boundary | One dispatch/rule plus lexical `finally`; errors reject the current render and scope is restored before propagation |

### Rollback Plan

| Item | Answer |
|------|--------|
| Code rollback | Revert the feature commit/PR; no migration or generated source must be undone |
| Schema rollback | N/A; no schema/database |
| Data rollback | N/A; no persistent data mutation |
| Auto-rollback trigger | Any focused/full CI failure, package dry-run failure, source guard, or current-head Codex finding blocks publication/merge; this repo has no automatic production deploy |
| Manual rollback runbook | Consumers pin the previous package versions; maintainer reverts the commit and republishes only a new correcting patch because npm versions are immutable |
| Last rollback drill | First coordinated effect-contract release; dry-run package contents and full old-behavior goldens are the pre-release rollback verification |

### Open Questions

None.

### Success Criteria

- [x] Red test proves a no-return method would repeat under old code, then passes with exactly one call.
- [x] `rg` finds zero runtime `v.io` reads/writes and zero runtime `require()` calls in `src/`.
- [x] Normal, alias, prepared/synthesized, gate, event, repeat, unknown, child-data, lexical-scope, and zero-match behavior is covered and green.
- [x] Focused handler/method/compiler suites, `npm run typecheck`, exact `npm test`, publication dry-runs for all touched packages, source guards, and `git diff --check` pass.
- [x] Required architecture/refactor/security/tech-debt/production reviews reach 10/10 in all ten mandated dimensions and a fresh verification pass finds no issue.
- [x] Documentation/backlog/evaluation are current; conventional commits were pushed; ready PR #49 targeted `dev`; current-head Codex review was clean; the maintainer subsequently merged it.

### Approval

- [x] Requirements clear
- [x] Scope agreed
- [x] Risks acceptable

**Approved by:** Maintainer (explicit selected-task and execution prompts)
**Date:** 2026-07-16

### Implementation and Verification Sequence

1. Add only the finite sentinel regression to `test/handlers/handler.test.js`; run it against old source and capture the expected red failure.
2. Implement canonical effect types, remove view-model `io`, and introduce handler dispatch/default/repeat behavior; make the regression green.
3. Migrate all 23 method effect writers and editor annotations without changing DOM/business behavior.
4. Route attrs/each/move/compiler synthesized verbs through dispatch, convert mediatarget to the pure query helper, and update host DI/facades while retaining existing surfaces.
5. Update focused tests and add source ratchets for no `v.io`/direct bypass, then run focused suites and full pipeline.
6. Apply patch versions and dependency minima, update docs/reviews/backlog, run package dry-runs and all required review/finish gates, fix until clean.
7. Commit, push, open a ready PR into `dev`, request `@codex review`, and poll current-head review/CI without merging.

### Red Evidence

- Command: `node --test test/handlers/handler.test.js`
- Result against untouched runtime source: **FAIL** (3 pass, 1 fail).
- Proof: the deliberately non-returning `forget` method was invoked a second time and threw the finite sentinel `Error: would repeat forever` from `handler.js`'s legacy `do/while (v.io.r)` path.
- Runtime source changes before red: none.
- Review regression: `node --test --test-name-pattern='malformed and inherited' test/handlers/handler.test.js` failed because inherited `children:true` and string `repeat:'false'` were accepted, reaching `Method malformed repeat limit exceeded`; strict own-boolean normalization made it green.
- Final-review regression: `node --test --test-name-pattern='effect control getters' test/handlers/handler.test.js` failed with normalized `children: 'open'` because a stateful getter was read once for its type and again for its value; snapshotting each own field once made it green.
- First-head Codex regression: `node --test --test-name-pattern='source walk skips' test/source-contract.test.js` failed because `files()` returned `node_modules/dependency/index.js`; the walker now excludes dependency trees and the source ratchet passes 6/6.

## Plan Quality Gate

**Scope tags:** SECURITY (render availability/DoS and fail-closed gate invariants). No DB, FRONTEND, ROUTING, INFRA, or PAYMENTS tags.
**Gate status:** PASSED
**Personas consulted:** code-review-enforcer, security-architect, threat-modeling-enforcer (read and applied locally).
**Canonical checklists loaded:** engineering/domain-architecture, code-quality-review, type-safety, complexity-maintainability, error-taxonomy, runtime-safety; security/authentication, authorization, zero-trust-architecture, injection, secrets-handling, crypto, ssrf-and-external-requests, security-headers, rate-limiting-and-abuse, api-asset-management, audit-trail-integrity, dependency-security, mobile-app-security, queue-message-security, ai-llm-security, security-anomaly-detection, supabase-row-level-security, secrets-rotation, threat-modeling.
**Issues found and fixed in plan:** 4 — gate-aware missing-effect default; explicit repeat cap; normalized complete dispatch result; coordinated dependency minima for the all-at-once contract migration.
**STRIDE status:** Complete (6/6 categories analyzed; focused attack tree included; no new trust boundary or high-value flow requiring PASTA deep dive).
**SQL pre-review:** N/A.
**Pre-review score:** 10/10 in all mandated dimensions.

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

## Agent Design Constraints

### architect

- [x] Read persona and mandatory domain/complexity/self-review checklists.
- Keep `@jtorm/handler` as the deep lifecycle owner; methods expose only effect intents and DOM/domain behavior.
- Preserve pure DI and zero source imports; do not move UI resolution/compiler responsibilities into the handler or UI verb.
- Add only one execution seam (`dispatch`) and keep effect normalization internal so public surface growth is minimal.
- Treat the broad 23-package edit as one contract migration, not an opportunity for unrelated Shotgun-Surgery cleanup.

### planner

- [x] Read persona and planning/domain/test checklists.
- Critical path is red regression → canonical type/handler/view-model contract → all method writers → synthesized dispatch/wiring → full verification/docs/publication.
- Every phase has observable pass/fail evidence; riskier unknowns (data-only method, prepared data, UI repeat, compiler gates) are tested before mechanical completion claims.
- Relative size: L compared with prior unknown-verb (S) and binding-cache (M) work because 27 published packages require coordinated release evidence; scope is fixed by the maintainer and quality does not flex.

### backend-architect

- [x] Read persona and mandatory architecture/type/error/DoD/runtime/security checklists.
- Await every data/validate/event/handle callback; propagate rejection unchanged; retain lexical `finally` cleanup.
- Explicitly cap repeat to prevent event-loop resource exhaustion; do not add timers, external calls, database state, or retry machinery.
- Prepared synthesized data is a dispatch input, not hidden mutable global state, and custom data hooks still execute.

### elysia-expert

- [x] Read persona; route/macro/schema criteria are N/A.
- Preserve lifecycle ordering and single-boundary validation semantics within the framework's own method pipeline; no Elysia/Bun/runtime adoption is introduced.

### bun-expert

- [x] Read persona; Bun runtime/package-manager recommendations are N/A because AGENTS locks Node `node:test` and npm publication commands.
- Use the exact repository test/typecheck commands and add no dependencies or Bun-specific source APIs.

### typescript-pro

- [x] Read persona and canonical type/DoD checklists.
- Keep pure JS; define `MethodEffect`, normalized `ViewEffect`, retained `ViewIO`, updated `ViewModel`, and effect-returning `Method` only in `src/types/src/types.js`.
- Add editor `import('@jtorm/types')` annotations to each runtime method; verify generated declarations and no handwritten artifacts.
- Runtime normalization remains necessary even though the published method handle type requires an effect, because untyped JavaScript extensions can return malformed/undefined values.

### security-architect

- [x] Read persona and all mandatory security checklists.
- Missing/malformed effects cannot inherit repeat; gate methods default closed; explicit repeat is bounded; synthesized paths cannot bypass validation/events.
- No auth, PII, secret, crypto, external request, mobile, queue, database, header, or new sink controls apply; all are explicitly N/A in the threat model.

### threat-modeling-enforcer

- [x] Read persona and threat-model checklist.
- The approved spec contains assets/actors, an internal data-flow/trust-boundary diagram, all six STRIDE categories, a repeat-DoS attack tree, test-linked controls, and explicit residual host-extension risk acceptance before implementation.

### platform-engineer

- [x] Read persona and all mandatory infrastructure/security checklists.
- No infrastructure/deploy target changes; package publication is gated by exact tests, dry-runs, source guards, current-head review, and consumer rollback by pinning prior immutable npm versions.
- The repeat cap is the relevant operational/cost bound; service metrics/SLO/runbooks/Cloudflare/DB/email checks are N/A to this library-only source contract.

### database-architect

- [ ] Persona file unavailable in the ai-config resource index/checkout (`agents/infrastructure/database-architect.md`).
- Fallback: backend-architect plus database/schema/performance/RLS checklist criteria loaded; every database item is N/A because the feature has no SQL, schema, query, persistence, connection, or migration change.

### Concrete Design

- `MethodEffect`: optional `children`, `repeat`, `data` fields returned by method `handle` or a data-only method's `data` hook.
- `ViewEffect`: complete normalized `children:boolean`, `repeat:boolean`, `data:*` returned by `handler.dispatch`; `ViewIO` remains an alias/export of this new shape.
- Internal normalizer snapshots each own field once, accepts only boolean `children`/`repeat` values, defaults them to `!method.gate`/`false`, and defaults non-own `data` to `undefined`; selector-only rules default children on.
- `dispatch(v, preparedData?)` consumes prepared data only on its first iteration. It resolves key/alias, throws unknown, runs custom `data(v, preparedData)` (or the default parser when data was not prepared), validates, fires before, runs handle when valid, fires after, normalizes, then re-resolves on explicit repeat. The 100th request to repeat throws loud.
- `handle()` remains owner of rule iteration, child recursion, and lexical scope capture/restoration; it receives only the normalized effect from dispatch and chooses effect data by presence (`undefined` falls back to `v.m`).
- Data-only `data-method.data()` returns a `MethodEffect`; `ui-method.data()` accepts optional prepared data for normalization but its `handle()` returns the effect.
- attrs, each, move, and UI compiler construct a complete synthetic TSS node and call injected `handler.dispatch` with prepared method data. Existing compatibility DI/facade properties remain present even when dispatch supersedes direct use.
- mediatarget calls `mediaqueryMethod.process(q)` as a pure policy helper and returns its own effect; no verb lifecycle is being executed at bootstrap.
- `view-model.data`, `create()`, and `copyAttrs` contain no `io`. All 23 methods return effect intents and source ratchets reject any `v.io` occurrence or direct verb `.handle` bypass.

## Reviews and Scores

Completed at 100/100 with no unresolved finding. See
`feature-reviews/explicit-returned-view-effects-eval.md` for entry-point traces,
the seven production-readiness categories, 27-package scorecard, exact
verification evidence, review limitations, and delivery conditions; see
`feature-reviews/explicit-returned-view-effects-security-review.md` for the
differential security review.

First-head Codex review at `2859ccd` produced one valid P2 source-walker
finding. It was reproduced red-first, fixed, and fully reverified. Current-head
Codex reviews at `caa5408` were clean, CI passed, and the maintainer merged PR
#49 into `dev` as `0600c4a`.
