# Feature Development: Compile bindings onto AST nodes

**Status:** COMPLETED
**Claimed:** 2026-07-14T20:09:02Z
**Completed:** 2026-07-14T22:05:14Z
**Agent:** Codex `/root`
**Current Mode:** Complete

---

## Resumption Context

**Last Completed Mode:** Delivery
**Current Mode:** Complete
**Next Action:** Await review on PR #44; do not merge or publish as part of this task.
**Files Created:**
- `feature-reviews/compile-bindings-onto-ast-nodes.md` - Feature checkpoint and implementation record.

**Files Modified:** Data parser, data/if/attrs/text methods, shared types, six package manifests, parser README, and test harness/characterization files listed under Affected Components.
**Tests Written:** Nine compiled-binding regressions plus cached-AST identity and sequential-text characterizations.
**Issues Found (not yet fixed):**
- None. The fresh type-contract pass corrected nullable members inside append/default descriptor arrays before final verification.
**Design Decisions Made:**
- Keep fetched-AST ownership in `@jtorm/tss-model` and binding ownership in `@jtorm/data-parser`.
- Preserve raw `TssNode.p`; add an optional syntax-only cache keyed by effective grammar and an ordered shallow snapshot of `p`.
- Compile method-specific splits in their owning methods through the shared compiler/evaluator.
- Build each lazy cache segment synchronously and assign it only after successful compilation.
- Keep `text` evaluation sequential against its mutating model and keep `attrs` parsed state fresh per render.

**Context for Next Session:**
The clean `dev` branch was fast-forward checked against `origin/dev`; it was already current. Fresh finish verification passed 59/59 focused tests, 427/427 full tests, typecheck, diff/invariant checks, production dependency audit, both debt ratchets, and all six package dry runs. The canonical architecture backlog is complete, and ready PR #44 targets `dev` from `feature/compile-bindings-ast`.

---

## Research Summary

- **Modules involved:** `@jtorm/tss-parser` produces mutable `{s,m,p,c}` nodes; `@jtorm/tss-model` owns the bounded LRU of promises resolving fetched ASTs; `@jtorm/view-model` parses inline strings or preserves supplied AST identity; `@jtorm/handler` traverses every parsed, fetched, replayed, or synthesized node; `@jtorm/data-parser` owns binding syntax/evaluation. `data-method`, `if-method`, `attrs-method`, and `text-method` add method-specific binding work.
- **Existing patterns:** The handler invokes a method-owned `data(v)` hook when present, otherwise `dataParser.handle(v, params)`. `ui-method.data` delegates back to that default binder. `get-method` prepends cached fetched node identities; `ui-compiler-model`, `swap-method`, `each-method`, and layer replay can synthesize, clone, or replay nodes, all of which still pass through the handler. `v.c.c` selects a detached SSR document when truthy and the live SPA/PWA document when falsy.
- **Type interfaces:** `@jtorm/types` defines `TssNode` with raw declarations in `p` and the canonical `ViewModel` fields. Raw `v.t.p` is also consulted for `if(r:)` trusted-literal provenance and must remain unchanged.
- **Constraints discovered:** `tss-model` is the cache owner but has no method registry or binding responsibility. Binding descriptors must contain syntax only (never request/model data), remain JSON/clone safe for cached/replayed nodes, preserve configurable data-parser semantics, and compile safely under concurrent renders. Inline ASTs are not globally cached unless the caller reuses them; fetched AST node identities are cached and shared. Pure DI CommonJS, pure JavaScript/JSDoc, stable exports/package boundaries, exact parser/falsy/error behavior, both document modes, terse style, and singleton isolation remain locked.
- **Resolved design:** `@jtorm/data-parser` owns a `{grammar, raw snapshot, defaults, owner extensions}` envelope on the node. Raw-declaration mismatch replaces the whole envelope; owner grammar invalidates its extension. Changed method packages patch-bump and require the new data-parser patch, while UI compiler remains unchanged.

---

## Feature Specification

**Date:** 2026-07-14
**Author:** Codex
**Status:** Approved by the task authorization

### Problem Statement

jTorm application authors and hosts repeatedly render the same fetched or caller-cached TSS AST with changing model data. Although `@jtorm/tss-model` reuses the parsed node identities, every node visit currently re-runs binding regexes/path splitting, and four methods repeat additional parsing. Warm SSR and long-lived SPA/PWA renders therefore keep paying syntax work whose result depends only on trusted TSS, not on the model.

### Scope

#### In Scope

- Split binding syntax compilation from model evaluation in `@jtorm/data-parser` while preserving the existing `parse()` and `handle()` exports and results.
- Attach JSON-safe, model-free compiled descriptors to an optional cache field on each reused `TssNode`.
- Compile default declarations, declaration arrays, empty-property auto-bindings, `data` `||` fallbacks, `if` `||`/`&&` terms, `attrs` comma lists, and `text` bindings once per AST/configuration.
- Preserve raw `TssNode.p` values for regex literal provenance, public AST compatibility, error behavior, and every existing TSS semantic.
- Cover caller-reused and `tss-model`-cached node identity, changed models, failures, and detached SSR plus live SPA/PWA document modes.
- Patch-bump every changed published package, document the cache contract, and close only this canonical backlog item after all gates pass.

#### Out of Scope (Non-Goals)

- Replacing or changing the TSS parser, its arithmetic, AST ordering, selectors, aliases, or trailing-semicolon behavior.
- Changing falsy binding semantics, prototype-chain lookup, `@c`, regex grammar, raw-sink policy, or loud zero-match behavior; those are separate decisions even where the architecture review notes them.
- Precompiling component closures, adding a manifest/build step, changing fetch concurrency, or normalizing `v.io`.
- Adding runtime imports, dependencies, handwritten TypeScript/declarations, compatibility shims, or new package boundaries.

### Requirements

#### Functional Requirements

1. A binding string compiles into a plain tagged descriptor that contains syntax only; evaluation receives the current model on every render.
2. A TSS node stores a binding envelope for the active data-parser grammar and ordered raw-declaration snapshot; each lazily compiled segment is assigned only after that segment succeeds.
3. Reusing the same node evaluates its descriptors without calling the compatibility `parse()` path or repeating compile/split work.
4. A changed data-parser grammar or raw declaration invalidates the node cache before evaluation; changing only the model never invalidates it.
5. Method-owned binding forms retain their grammar ownership and use the shared descriptor compiler/evaluator rather than duplicating path parsing.
6. Existing `parse()`, `handle()`, `attrs.parsed()`, method aliases, raw `p`, and published singleton surfaces remain available.

#### Non-Functional Requirements

- **Performance:** On a measured repeated-render fixture covering every binding form, runtime `parse()` calls are zero, the first render performs a positive bounded compile count, and the second render adds exactly zero compiles.
- **Security:** No model value, DOM reference, request context, function, or executable regex is stored on the shared AST; trusted-regex provenance continues to compare against raw TSS.
- **Reliability:** Cache-segment creation is synchronous and atomic; a compilation/evaluation error propagates on every render and never leaves a partial valid segment.
- **Compatibility:** Both `v.c.c=1` detached documents and `v.c.c=0` live documents produce the same outputs as today; descriptors remain clone/JSON safe for UI/layer replay.
- **Accessibility:** N/A; no UI structure, content, styling, focus, or interaction behavior changes.

### Affected Components

| Component | Change Type | Risk |
|---|---|---|
| `src/parsers/data-parser` | Compile/evaluate split, AST cache, README, patch bump | High |
| `src/methods/data-method` | Cached fallback descriptors, patch bump | Medium |
| `src/methods/if-method` | Cached logical descriptors with raw regex provenance, patch bump | High |
| `src/methods/attrs-method` | Cached comma-list descriptors, patch bump | Medium |
| `src/methods/text-method` | Reuse default bound data, patch bump | Medium |
| `src/types` | Optional compiled-binding cache on `TssNode`, patch bump | Low |
| `test/parsers`, `test/models`, `test/pipeline`, `test/helpers` | Characterization, count, cache identity, error, and mode coverage | Low |
| `feature-reviews/*` | Progress/evaluation and canonical backlog status | Low |

### Dependencies

- **Depends on:** Existing injected `tssParser` configuration in `@jtorm/data-parser`; existing `TssNode` identity reuse.
- **Blocks:** Nothing required for this PR; it provides the reusable binding layer expected by the later precompile/manifest item.
- **External:** None. Runtime remains dependency-free and host DI remains unchanged.

### API Contract

No HTTP/API endpoint changes.

- `TssNode` gains an optional `b` binding-cache field containing effective grammar, an ordered shallow `p` snapshot, compiled defaults, and method-owner extensions; existing `{s,m,p,c}` fields and raw values are unchanged.
- `jTormDataParser.parse(model, value, omitUnresolved)` and `handle(view, params)` preserve signatures and results.
- Additive data-parser helpers compile a raw value into a plain descriptor, evaluate a descriptor against a supplied model, and obtain the current node cache. They are runtime methods on the existing singleton, not new imports or packages.
- Method helper/state surfaces remain callable; no export is removed or renamed.

### Security Assessment

**Threat model link:** This section; no new trust boundary, endpoint, authority, persistence store, or external input source is introduced.

- **S — Spoofing:** N/A. Rendering has no identity/authentication decision in this change.
- **T — Tampering:** A model is passed only to evaluation and cannot be retained in or used to rewrite the descriptor cache. Raw trusted TSS remains the cache source.
- **R — Repudiation:** N/A. No user action, audit event, or mutation record is introduced.
- **I — Information Disclosure:** Shared descriptors store tokens/literals only. Tests inspect reused ASTs across different/throwing models to prove model values and DOM/request state are absent.
- **D — Denial of Service:** Compilation stays synchronous and bounded by trusted declaration length, occurs once per node/configuration, and introduces no dynamic regex execution or retry loop. Existing errors continue to reject promptly.
- **E — Elevation of Privilege:** No `eval`, `Function`, dynamic import, runtime dependency, authority check, or sink policy changes. `if(r:)` still proves its pattern came from the raw quoted TSS literal.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Subtle semantic drift in concat, numeric lookup/fallback, falsy values, prototype walk, `@c`, or unresolved auto-bindings | Medium | High | Characterize public `parse()` and pipeline behavior before implementation; make `parse()` use the same compiler/evaluator and run every golden. |
| A descriptor captures the first model or survives a grammar/raw-`p` change incorrectly | Low | High | Store syntax-only plain data; evaluate with the passed model; compare effective grammar plus ordered scalar/array declarations and test model and AST mutation. |
| Method-specific forms or regex provenance bypass the cache or change behavior | Medium | High | Cache their term/list descriptors in the owning method and leave raw `v.t.p` untouched; count and error tests cover each form. |
| Concurrent first renders see a partial shared cache | Low | High | Build complete local cache objects synchronously and assign them to the node only after success; no `await` in compilation. |
| Additive AST/cache fields break clones, snapshots, or host consumers | Low | Medium | Use enumerable JSON-safe plain data, keep all original fields, test clone/cache identity, and retain parser snapshots before runtime compilation. |

### Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Compile lazily at the binding seam | Compile in `tss-parser`; compile in `tss-model`; eager handler tree walk | `data-parser` already owns binding grammar, while parser/cache packages do not know method extensions. Lazy node compilation also covers inline, fetched, synthesized, cloned, and replayed nodes without new host DI or compiling unreachable selector-only branches. |
| Store plain descriptors plus a raw snapshot on `TssNode.b` | External `WeakMap`; global string cache; replace `p` values | Node storage fulfills cached-AST reuse and survives clones/replay. The snapshot invalidates clone-and-rewrite and caller mutation without reparsing. A `WeakMap` loses clone/persistence reuse, a global cache crosses grammar configs, and replacing `p` breaks public shape and regex provenance. |
| Preserve a compatibility `parse()` wrapper | Remove/rename `parse`; keep internal runtime calls to it | Published exports cannot be removed. The wrapper keeps direct consumers stable, while framework runtime paths use cached descriptors and can be counted independently. |
| Keep special syntax in its method owner | Teach the generic parser `||`, `&&`, and comma semantics globally | Global interpretation would change other verbs. Owners compile their own splits once but delegate each term to the single binding compiler/evaluator. |
| Invalidate on binding grammar changes | Assume options never change; store closures over current regexes; cache every historical config | Public data-parser options are documented. A small active-grammar key preserves correctness without executable/host-bound closures or unbounded per-node variants. |

### Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Injected TSS quote configuration, data-parser grammar options, raw `TssNode.p`, current model, and existing lodash predicates in `v._`. |
| Direct dependents | Handler default binding, `ui` data hook, `data`/`if`/`attrs`/`text`, fetched TSS via `get`, UI compiler clones, iterations, layers, and both production host composition roots through existing DI. |
| Cascade on outage | A compiler/evaluator defect can fail or misrender any bound TSS rule; selector-only/no-binding rules remain unaffected. |
| Cascade on slow | Extra first-visit CPU affects cold renders; repeated warm renders are the target and must show zero additional compilation. No queue/backlog is introduced. |
| Cascade on bad data | Bad/current model values flow through the same evaluator to the same verb validation/sinks; they are never cached for later renders. |
| Compromised-session impact | N/A: no session, tenant authority, record read/write, or external cache key changes. Shared ASTs contain trusted syntax only. |
| Fault isolation boundary | Synchronous compile/evaluate errors reject the current render and stay inside the handler's existing scope-restoring `finally`; a failed compile is not installed as a valid cache. |

### Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Before publication, revert the feature commit/PR. After publication, consumers pin the prior patch versions while the commits are reverted. |
| Schema rollback | N/A; no database/schema. |
| Data rollback | No model, cache persistence, or migration state to roll back; in-memory AST caches disappear with process restart. |
| Auto-rollback trigger | CI blocks delivery on any focused/full test, count invariant, typecheck, or review failure. A future host deployment should roll back on new render-error or golden mismatch signals. |
| Manual rollback runbook | `git revert <feature-commit>`, republish only through the normal release process if needed, and pin the prior package patch versions in hosts. Publishing is explicitly outside this task. |
| Last rollback drill | Not deployed or published; local revertability is verified by the isolated conventional commit. |

### Open Questions

None. The affected package list may shrink only if implementation proves a method can reuse compiled default data without a runtime edit; it must not expand across package boundaries without re-running this gate.

### Success Criteria

- [x] Pre-implementation characterization locks every supported standard and method-specific binding form, including current falsy/error quirks.
- [x] The red regression records current repeated-render parsing and expects zero runtime `parse()` calls, positive first-render compilation, and zero second-render compilation.
- [x] The same AST renders different current models correctly in detached SSR and live SPA/PWA modes.
- [x] Cached fetched AST identity is explicit, raw `p` remains byte-for-byte/deep-equal unchanged, and cached descriptors contain no model/request/DOM values.
- [x] Repeated erroneous evaluation still rejects, without a partial or poisoned binding cache.
- [x] Focused tests, `npm test`, `npm run typecheck`, `git diff --check`, scoped review gates, and the pre-commit finish-task gates pass.
- [x] Required package patch versions and documentation are updated; the canonical backlog changed from `NEXT` to done only after verification.

### Approval

- [x] Requirements clear.
- [x] Scope agreed by the explicit task request.
- [x] Risks acceptable with failing-test-first and full-golden verification.

**Approved by:** User task authorization
**Date:** 2026-07-14

## Plan Quality Gate

**Scope tags:** None of DB, SECURITY, FRONTEND, ROUTING, INFRA, PAYMENTS.
**Gate status:** PASSED
**Conditional agents:** None required by the scope table.
**Required reviewer loaded:** `code-review-enforcer.md` plus all eight referenced checklists.
**STRIDE status:** Complete; six categories assessed above, with no new trust boundary.
**Issues found and fixed in plan:** 4 — kept compiler ownership out of parser/cache packages, preserved raw regex provenance, added grammar invalidation, and required atomic/model-free descriptors.

### Checklist Application

- `engineering/domain-architecture` (23/23): 4 PASS (package SRP, dependency inversion, minimal additive surface, no runtime imports); 19 N/A (no DDD routes/actions/DB/AI/schema/env/middleware). Evidence: affected-components, API, and trade-off sections above.
- `engineering/code-quality-review` (19/19): 6 PASS (no placeholders/dependencies/console/TODO/speculation; shared compiler removes duplicated path parsing); 13 N/A (no IDs, logs, CSS, imports, HTML interpolation, or package additions). Evidence: scope, requirements, and test criteria above.
- `engineering/type-safety` (19/19): 4 PASS (strict JS, explicit JSDoc AST cache, tagged valid descriptor states, no handwritten TS/escape hatch); 15 N/A (no SQL/external payloads/TS casts/resources/domain types). Evidence: API and non-functional requirements above.
- `engineering/complexity-maintainability` (20/20): 8 PASS (small helpers, bounded branching/nesting, no suppressions, one compiler owner, no pass-through layer, cohesive method extensions); 12 N/A (no TS lint config, polymorphic domain, data clumps, or unrelated module work). Evidence: decisions and affected-components table above.
- `engineering/error-taxonomy` (19/19): 4 PASS (synchronous rejection propagation, atomic failed-cache behavior, promise rejection preserved, no swallow); 15 N/A (no HTTP/domain error taxonomy, response, i18n, cancellation, or side effects). Evidence: reliability requirement and fault boundary above.
- `engineering/runtime-safety` (21/21): 3 PASS (no I/O, shared cache assignment has no await gap, stateful parser regex behavior remains reset/owned); 18 N/A (no time, money, Unicode limits, jobs, or payload parsing). Evidence: requirements and concurrency risk above.
- `security/injection` (14/14): 3 PASS (no code execution, dynamic regex policy/provenance unchanged, raw output sinks unchanged); 11 N/A (no SQL, shell, paths, endpoint validation, deserialization, or new HTML sink). Evidence: STRIDE and non-goals above.
- `security/secrets-handling` (12/12): 2 PASS (no model/PII/secret retained in shared descriptors; no logs/errors added); 10 N/A (no secrets, env, responses, crypto, URLs, or persistence). Evidence: security requirements and model-change tests above.

### Plan-Level Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Compiler stays with data-parser; cache/fetch, parser, handler, and method grammar boundaries remain intact. |
| Consistency | 10/10 | Additive singleton methods, one-letter AST cache, pure JS, patch releases, and existing test layout match the repo. |
| Type Safety | 10/10 | Canonical `TssNode` JSDoc gains the optional cache; descriptors are tagged plain data with no handwritten declarations. |
| Validation | 10/10 | Raw trusted TSS remains the only compiled source; all current method validation and literal provenance remain downstream. |
| Error Handling | 10/10 | Compilation is atomic; compile/evaluate exceptions propagate through the existing handler cleanup path and are regression-tested. |
| Security/Privacy | 10/10 | Descriptors contain syntax only, no request/model/DOM data; no sink, regex, authority, or logging policy changes. |
| Performance | 10/10 | Count gate requires zero runtime parse calls and zero added compiles on the second render of every supported form. |
| Maintainability | 10/10 | One compiler/evaluator removes duplicated low-level parsing while method-specific grammar remains cohesive with its owner. |
| Testability | 10/10 | Red count test plus characterization, cache identity, model-change, error, SSR/live, focused, and full-golden tests are specified. |
| Readability | 10/10 | Small tagged descriptor helpers and documented cache shape avoid closures or hidden global maps. |
| **Total** | **100/100** | Plan quality gate passed before test/runtime edits. |

## Design Gate

**Gate status:** PASSED after two independent read-only challenges.

### Required Personas and Constraints

- `architect`, `planner`, `backend-architect`: keep one binding owner, an additive singleton surface, no pass-through package, and failing tests with executable acceptance criteria.
- `elysia-expert`, `bun-expert`: framework-specific route/runtime advice is N/A; applicable guidance is bounded synchronous work, no shared async accumulator, and no dependency addition.
- `typescript-pro`: use tagged valid descriptor states and canonical JSDoc only; no handwritten TypeScript/declarations or escape hatches.
- `security-architect`, `threat-modeling-enforcer`: no new trust boundary or sink; descriptors retain syntax only, regex provenance stays raw-TSS based, and STRIDE/control tests remain explicit.
- `platform-engineer`: no service, DB, queue, deploy, email, or Worker resource changes; rollback is the isolated feature revert and the hot-path CPU improvement is count-gated.
- `database-architect`: unavailable in the installed/resource-index catalogs; database scope is N/A and the full DB/platform checklist set was still reviewed as N/A.

### Independent Challenges Resolved

1. `feature-dev:code-explorer` found that UI compilation clone-deep-copies an already-bound node and replaces `p`. A grammar-only cache would reuse stale `ui` descriptors on the synthesized node. Resolution: compare effective grammar plus an ordered shallow declaration snapshot (including copied array elements) on every cache lookup; any mismatch atomically replaces the whole envelope.
2. The explorer found that `text` evaluates declarations sequentially while mutating `v.m`. Resolution: reuse cached descriptors but evaluate them inside the existing ordered loop, never consume the handler's earlier `v.d` snapshot.
3. The explorer found that `attrs.parsed()` is fresh per validation and can be changed by before-method plugins. Resolution: keep that per-render clone; cache normalized syntax/list descriptors separately and use an ephemeral compilation if a plugin changes the parsed declarations.
4. `feature-dev:code-architect` required owner grammar keys (`data.or`, `if.or/and`, `attrs.separator`/quote regex), auto-bind parameter identity, raw-`p` mutation tests, and per-segment atomicity. All are now acceptance criteria.
5. The architect identified package-manager skew: each changed method package must require the new `@jtorm/data-parser` patch, not merely patch-bump itself.

### Final Data Flow

`trusted TSS p` → grammar/raw snapshot check → synchronous syntax descriptor compile → model-free cache on node → per-render evaluation with current `v.m` → existing `v.d`/method validation/sink. No model, request, DOM, function, or executable regex crosses into the shared AST.

### Design Checklist Outcome

- Required personas/checklists: PASS (applicable constraints above; unrelated route/DB/infrastructure controls N/A).
- Ownership/package boundaries: PASS (`tss-model` remains fetched-AST owner; `data-parser` remains binding owner).
- Clone/replay and concurrency: PASS by raw snapshot invalidation plus synchronous per-segment assignment before any `await`.
- Threat assessment: PASS; no new boundary, authority, persistence, I/O, dependency, or sink.
- Red flags: PASS; no `require()` in `src/`, TS/declarations, export removal, parser/selector/regex-policy move, shared parsed attrs state, or model-bearing cache.

### Pre-Implementation Red Baseline

Focused command: `node --test test/parsers/data-parser-compiled.test.js test/models/tss-model.test.js test/pipeline/text.test.js`

- 14/16 tests passed on the unchanged runtime; generic semantics, arrays/auto-bind, sequential `text`, raw-`p` mutation, cached AST identity, grammar behavior, and repeatable errors were characterized green.
- Required count regression failed with **31 cold + 27 warm runtime `parse()` calls**, **0 compiles**, versus the target of zero parses, positive cold compiles, and zero warm compiles.
- The repeated-error count failed only because the old runtime has no compiler (`0` cold compiles), proving the warm-error cache assertion is active.

## Progress Log

### Research Mode
- [x] Read `AGENTS.md` and required skill instructions.
- [x] Verified clean `dev` and ran `git pull --ff-only origin dev`.
- [x] Confirmed the architecture backlog still marks this item `NEXT`.
- [x] Traced binding parse/evaluation pipeline.
- [x] Identified cached AST owner and mutation boundaries.

### Plan Mode
- [x] Saved pre-plan checkpoint.
- [x] Wrote feature specification.
- [x] Completed plan quality gate.
- [x] Presented implementation-ready plan.

### Design Mode
- [x] Loaded and applied required agent personas.
- [x] Completed design and threat assessment.
- [x] Validated design against project red flags.

### Implement Mode
- [x] Characterization/count regression tests established red.
- [x] Checkpoint 1: scaffold/API shape.
- [x] Checkpoint 2: core compile/evaluate logic.
- [x] Checkpoint 3: edge/error/model-change behavior.
- [x] Checkpoint 4: SSR and SPA/PWA integration.

### Test Mode
- [x] Focused tests passing.
- [x] `npm test` passing (427/427 on first complete implementation run).
- [x] `npm run typecheck` passing.

### Review Mode
- [x] Applicable review skills passed.
- [x] Ten-dimension score is 100/100.
- [x] Fresh verification loop passed.
- [x] `finish-task` delivery/staged-payload gate passed.

### Documentation and Delivery
- [x] Relevant architecture/backlog documentation updated.
- [x] Package patch versions bumped where required.
- [x] Conventional commit created (`cd1c19e`).
- [x] Feature branch pushed.
- [x] Ready-for-review PR #44 opened into `dev`.
