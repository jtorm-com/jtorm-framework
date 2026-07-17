# Feature Development: Handler-wrapper AST projection

**Status:** COMPLETE
**Claimed:** 2026-07-17T12:50:00Z
**Agent:** Codex `/root`
**Current Mode:** Complete — PR #57 merged into `dev` as `0017bd9`

---

## Resumption Context

**Last Completed Mode:** Delivery
**Current Mode:** Complete
**Next Action:** None — architecture weakness #7 is closed in the canonical backlog.
**Files Created:** Feature specification/evaluation/security records and `test/pipeline/cached-tss-reuse.test.js`
**Files Modified:** `@jtorm/handler-wrapper` source/README/package, handler-wrapper and each/insert/wrap tests, architecture backlog, and review ledger
**Tests Written:** 10 red regression/characterization tests across five focused files (plus one new cached-reuse file)
**Issues Found (not yet fixed):** None. Architecture weakness #7 is fixed on `dev`.
**Design Decisions Made:** Project only direct wrapper children per invocation; share nested structure; forward the intentional source-owned `b` cache; construct after `before.iteration`; retain no projection state.

**Completion Context:**
PR #57 final head `61f5a95` passed GitHub Actions and a clean current-head Codex review with zero review threads. The maintainer merged it into `dev` as `0017bd9` on 2026-07-17. Red proof was 10 pass/10 fail; the final focused set was 100/100 and exact `npm test` was 592/592.

---

## Research Summary

- **Modules involved:** `@jtorm/tss-parser` synchronously produces the established mutable node identities and eagerly inherits the nearest selector into selectorless descendants; `@jtorm/tss-model` caches the in-flight promise resolving one parsed tree and returns the same tree/node identities on hits; `@jtorm/view-model` preserves a supplied tree identity; `@jtorm/handler` serially traverses it and restores `v.c.s`/`v.c.a` in `finally`; `@jtorm/handler-wrapper` is the only runtime owner that rewrites a structural node field. `each`, child-bearing `insert`/aliases, and child-bearing `wrap` are its three direct callers.
- **Existing wrapper flow:** The direct-child array reference is captured at function entry. The parent selector is placed in `v.c.s`, `before.iteration` runs, every node then present in that captured array has its selector overwritten with `body`, and `viewModel.create` receives those same child identities in a detached context `{s:null,a:null,b:'body',c:1,p:parentContext,locale}`. Thus an event that replaces `t.c` does not redirect the current iteration, while in-place edits to the captured array/nodes are observed. The wrapper copies `cid`/`cs`, reuses or establishes `v.r`, runs the child handler once when needed, refreshes `cid`/`cs`, runs `after.iteration`, and returns the detached body HTML.
- **Selector/traversal behavior:** The direct-child overwrite deliberately redirects both parser-inherited selectorless nodes and explicit direct rules to the detached body. Deeper children retain parser-inherited selectors and existing method-chain behavior. `v.c.b` is the separate unscoped body default; nested get/UI replaces `v.c.a` with resolved detached-fragment elements, while outer get/UI ancestor references are not inherited into the fresh document. Loud zero-match and the current child-bearing wrap behavior are therefore compatibility constraints, not cleanup opportunities.
- **Shared-state defect:** `t.c[k].s = 'body'` runs after the before event and before view creation. Success, view-creation failure, handler failure, and after-event failure leave the shared input node changed. A later traversal that does not enter the wrapper path can therefore select `body` instead of the parser-inherited/explicit selector. Before-event failure happens before the assignment and does not mutate the tree.
- **Binding-cache exception:** `{s,m,p,c}` is stable shared structure, but `node.b` is intentionally lazy mutable state. `@jtorm/data-parser` atomically replaces `t.b` when grammar/raw-`p` changes and mutates its compiled segments thereafter. Any render projection must forward reads and writes to the source node so cold compilation, warm reuse, and invalidation remain shared across wrapper invocations.
- **Concurrency and lifetime:** JavaScript awaits in events, view creation, traversal, and after events allow two renders of one AST identity to interleave. A projection cannot live on the singleton or source tree. Fetched AST lifetime remains bounded by `tss-model`'s existing LRU; caller-supplied AST lifetime remains caller-owned. No parser, cache-policy, TTL, transport, grammar, data, method-lifecycle, or document-scope ownership change is needed.
- **Current coverage:** Unit coverage locks detached locale/body context only. Pipeline coverage is strong for `each`, get/UI ancestor scope, explicit `body`, nested same-tag scope, zero-match, and raw-HTML insert/wrap, but does not prove structural immutability, same-identity reuse, interleaving, all wrapper failure phases, or binding-cache forwarding through a projected child.
- **Open questions:** None. The task fixes one ownership violation at the wrapper/render-projection boundary without a product-level choice.

---

## Feature Specification

**Date:** 2026-07-17
**Author:** Codex
**Status:** Approved after specification self-review, plan-quality gate, and two independent read-only design challenges

### Problem Statement

jTorm hosts may reuse one parsed TSS tree across sequential, interleaved, warm-cache, and tenant-isolated renders. When `each`, a child-bearing `insert`, or a child-bearing `wrap` boils its children, `@jtorm/handler-wrapper` currently assigns `body` directly to every direct child node's selector. That write persists on the shared cached tree after both successful and most failed renders, so a later traversal can observe a selector that the parser never produced and render against the wrong element. Hosts need wrapper rendering to preserve the exact current detached-fragment output and lifecycle without changing the shared AST's structural fields.

### Scope

#### In Scope

- Replace handler-wrapper's direct-child selector writes with a bounded per-invocation render projection.
- Preserve exact selector/traversal, detached-fragment, body-default, method-chain, get/UI ancestor-scope, event, cache-id, locale, parent-context, result-reuse, error, and lexical-restoration behavior.
- Forward the intentional lazy `node.b` cache through projected direct nodes so cold compilation, warm reuse, owner-segment updates, and grammar/raw-declaration invalidation still land on the source node.
- Prove shared-tree structural stability, sequential fresh-tree equivalence, explicitly interleaved isolation, success/failure leakage prevention, and failure-phase atomicity red-first.
- Patch-release and document only `@jtorm/handler-wrapper`; update the architecture/evaluation/security/ledger records after verification.

#### Out of Scope (Non-Goals)

- Parser grammar, output, eager selector inheritance, compatibility projection, diagnostics, limits, or browser build.
- Handler dispatch/traversal/effect/lifecycle policy, document-model selector/ancestor scoping, zero-match behavior, or view-model copying.
- Tenant cache keys, TTL/purge/LRU policy, transport, manifests, binding grammar/evaluation, data parsing, method behavior, wrapper cleanup, or scope-following across root replacement.
- Freezing production ASTs, deep-cloning/serializing trees, adding a source analyzer/ratchet, changing published exports, adding a package/shim/dependency, or authoring TypeScript/declarations.

### Requirements

#### Functional Requirements

1. `handle(h,t,m,v)` must never assign to `s`, `m`, `p`, or `c` on `t.c` or any descendant.
2. The source direct-child array reference must be captured at function entry, preserving the existing event boundary. After `before.iteration`, one invocation-local array must be created from the nodes then present in that captured array; its entries are new direct-node identities with `s:'body'`, the source node's `m`, `p`, and `c`, and binding-cache access forwarded to that source node. Replacing `t.c` during the event must not redirect the current call; in-place array/node edits must remain visible.
3. Nested descendants must not be cloned or rewritten. Parser inheritance and handler recursion must see the same nested identities and ordering as before.
4. Every wrapper invocation, including interleaved calls sharing one `t`, must receive a distinct projection array and distinct projected direct nodes. No projection may be stored on the singleton, context, source tree, or another render.
5. Existing `node.b` reads and writes through a projected node must address the corresponding source node through an own enumerable forwarding accessor. A first wrapper render must install a normal own data property on the source; a second must reuse that live identity; direct source replacement must be visible through an already-live projection; each projected node must route to its own source; and a raw-`p`/grammar mismatch must atomically replace the source cache exactly as today. Descriptor inspection/deletion on the transient accessor is not a supported cache API.
6. `before.iteration` must still precede projection/view creation; `after.iteration` must still follow child handling and the second `cid`/`cs` refresh. `v.r`, `cid`, `cs`, locale, `c.p`, `c.b`, `c.a`, and `c.s` semantics must remain unchanged.
7. Existing success output and existing loud failures for `each`, child-bearing insert aliases, and child-bearing wrap must be byte-for-byte/message-compatible for selectorless, explicit, nested, and chained rules.

#### Non-Functional Requirements

- **Compatibility:** No public signature, singleton key, export, DI seam, AST source shape, method alias, error contract, or package dependency range changes. Existing `^1.0.5` wrapper consumers admit the `1.0.6` patch.
- **Failure atomicity:** Before-event, view-creation, child-handler, and after-event rejection must leave all source structural fields unchanged and publish no projection state from handler-wrapper. Existing partial DOM writes, parent `v.r`, context mutation before the outer handler's lexical `finally`, and syntax-only `b` warming remain intentionally non-transactional and unchanged.
- **Performance:** For `d` direct wrapper children, projection time and allocation are `O(d)`; each projected node has constant structural width. Nested descendants are not visited or allocated, so depth and total descendant count do not multiply projection work. Peak transient projection allocation is `O(q*d)` for `q` concurrently active wrapper calls of that width, with no retained global component.
- **Resource limits:** Parser-produced `d` is already bounded by the parser's 4,096-node ceiling. Caller-supplied arrays remain caller-sized and receive no new behavior-changing limit; there is no recursion, retry, global accumulator, deep clone, or serialization.
- **Security/Privacy:** The projection contains trusted AST references only, stores no model/request/DOM/tenant/PII value, crosses no new trust boundary, and adds no sink or dependency. Binding caches remain model-free syntax.
- **Accessibility:** N/A; rendered structure/content and interaction behavior are unchanged.

### Proposed Design

Add one private top-level projection helper inside `handler-wrapper.js`. At function entry, retain the same direct-child array reference that the current `t2 = t.c` captures. After the before event, the helper iterates that captured array with the existing `for…in` key order and assigns each transient node back to the same enumerable key (`r[k]`, not `push`), preserving even sparse/custom enumerable placement. Each plain node has `s:'body'` and the then-current source `m`, `p`, and `c` references. A per-node own enumerable `b` getter/setter forwards live reads and assignments to that source node, retaining the one explicitly mutable AST field without copying or detaching its cache envelope. The helper returns a new array and retains no module state.

Call the helper with the entry-captured array at the exact point where the mutating loop runs today: after `before.iteration` resolves and before `viewModel.create`. All later wrapper statements remain in their current order. The detached context remains `{s:null,a:null,b:'body',c:1}`, with the same parent/locale propagation. The handler continues to own lexical scope restoration; the parser and document model remain unaware of the projection.

### Affected Components

| Component | Change Type | Risk |
|---|---|---|
| `src/handlers/handler-wrapper/src/handler-wrapper.js` | Replace shared selector mutation with direct-child projection and `b` forwarding | High |
| `src/handlers/handler-wrapper/README.md` | Document structural stability, projection complexity, and binding-cache exception | Low |
| `src/handlers/handler-wrapper/package.json` | Patch `1.0.5` → `1.0.6` | Low |
| `test/handlers/handler-wrapper.test.js` | Invocation, interleaving, lifecycle, cache-forwarding, and four failure-phase tests | Medium |
| `test/pipeline/{each,insert,wrap-unwrap}.test.js` and cached-reuse coverage | Existing-output/traversal and fresh-tree equivalence regressions | Medium |
| `feature-reviews/*`, `.claude-tasks/*` | Specification, evaluation, security, backlog, and review evidence | Low |

### Dependencies

- **Depends on:** Current parser-inherited selectors, handler traversal/lexical `finally`, document body-default/ancestor scoping, view creation, and data-parser's source-node `b` contract.
- **Blocks:** No runtime feature; closes architecture weakness #7 and makes shared cached trees safe for later concurrency/isolation work.
- **External:** None. Pure injected CommonJS and a dependency-free runtime remain unchanged.

### API Contract

No HTTP/API endpoint changes.

- `module.exports = {jTormHandlerWrapper:{handle}}` remains the published singleton/export; `handle(h,t,m,v)` keeps its signature and `Promise<string>` result.
- The projection helper is private and is not added to the published singleton.
- Source `TssNode` retains `{s,m,p,c,b?}`. `{s,m,p,c}` are stable; `b` remains optional, enumerable source-owned lazy cache state governed by `@jtorm/data-parser`.
- Direct callers (`each`, `insert`, `wrap`) and their dependency metadata require no edit because their existing compatible range already admits the wrapper patch.
- Downstream view/method event observers receive new identities for projected direct nodes and the projection array; nested node identities remain the source identities. This is the intentional ownership fix. Custom observers must not use a wrapper direct-node identity as a cross-render cache key; they may continue to inspect selector/method/declarations/children and binding values. The cold projection exposes an enumerable `b` accessor (whose undefined value is omitted by JSON) rather than the source's initially absent key, so descriptor/own-key debugging is not promised to be byte-identical.

### Compatibility Matrix

| Surface | Required result |
|---|---|
| `each` normal and `e:` paths | Current output, event order, per-item `v.r` reset, locale/parent context, and insertion dispatch unchanged |
| Child-bearing insert/aliases | Selectorless, explicit `body`, nested/chained, data override, and loud zero-match behavior unchanged |
| Child-bearing wrap | Current success/failure, selection order, sanitization timing, and DOM traversal unchanged |
| get/UI composition | Fresh detached context never inherits parent element refs; nested ancestor scoping and explicit body selection remain unchanged |
| Before-iteration AST edits | Replacing `t.c` does not redirect the current call; in-place edits to the entry-captured array/nodes are reflected in its later projection |
| Sequential/warm reuse | Same source identity stays structurally equal; later output equals a freshly parsed tree |
| Interleaved reuse | Per-call projected array/nodes are distinct; outputs/context cannot observe another call's selector overlay |
| Binding cache | Cold install, warm identity reuse, failed-render reuse, and raw-`p`/grammar invalidation remain source-owned |
| Event/DI observation | Before-iteration sees source nodes; view creation, method events, and after-iteration see invocation-local direct identities with `s:'body'`; nested identities and all field values remain compatible |

### Failure Atomicity

| Failure point | Required state after rejection |
|---|---|
| `before.iteration` | Direct-child array reference was captured but no projection constructed; source structure unchanged by wrapper; view/handler/after not called |
| Projection allocation/definition | Rejection propagates before any collaborator receives the result; no projection is stored on the source tree, singleton, parent view/context, or another invocation; already-created local nodes are unconditionally unreachable; source structure unchanged |
| `viewModel.create` | Source structure unchanged; handler/after not called; wrapper stores no projection reference. The injected view-model has necessarily received the argument and may deliberately retain it, which is unchanged DI authority. |
| Child handler | Source structure unchanged; after not called; existing source `b` compilation may remain cached; existing outer handler `finally` restores lexical `v.c.s/a`; wrapper stores no projection, while the injected view/handler seams may retain arguments. |
| `after.iteration` | Source structure unchanged; existing rendered DOM/`v.r`/cache effects remain as before; rejection propagates; wrapper stores no projection, while the injected event seam may retain its argument. |

### Security Assessment / Threat Model

**Threat-model location:** This pre-implementation specification.

**Data-flow diagram:** trusted parser/caller AST → handler traversal → handler-wrapper → invocation-local direct-child selector projection → detached `viewModel.create` → child handler/method events → detached HTML returned to `each`/`insert`/`wrap`. The only reverse write is syntax-only `projected.b` → source `node.b`. There is no network, persistence, identity, authorization, secret, or new trust-boundary edge.

**Assets:** Internal shared AST structure (`internal`), syntax-only binding cache (`internal`), per-render model/context/DOM (`may contain host-confidential data` but is referenced only by existing view flow and never stored in the projection).

**Actors:** Concurrent legitimate renders and host-supplied trusted TSS/caller ASTs. No new attacker-controlled entry point is introduced; an untrusted-template threat would already control existing render verbs and is outside this change.

- **S — Spoofing:** N/A with justification: no identity or principal decision exists.
- **T — Tampering:** Current cross-render selector tampering is removed by overlaying `s` on new direct-node identities. Source `{s,m,p,c}` equality is tested after success and all failure phases. Intentional `b` writes are constrained to data-parser's existing syntax-only cache.
- **R — Repudiation:** N/A with justification: no user action, audit event, or persistent mutation record is created.
- **I — Information Disclosure:** Projection state is invocation-local and model-free, preventing selector/context state from one tenant/render being retained on the shared tree. Tests interleave distinct models/contexts and inspect the source/projections.
- **D — Denial of Service:** Work is one non-recursive `O(d)` pass with parser-bounded direct nodes, no serialization/deep copy/retry. Allocation failure rejects the current render without source structural changes.
- **E — Elevation of Privilege:** N/A with justification: no authority, dynamic code, import, sink policy, or method registry change.

**Attack tree — cross-render selector contamination:** Goal is reached by OR(successful wrapper mutates shared direct child, view/handler/after failure leaves partial selector write, interleaved render observes another call's overwrite). The single countermeasure is source-immutable per-call structural projection, independently verified for every branch. Binding-cache writes are excluded because they contain syntax only and are an explicit shared contract.

**Residual risk:** Low. Injected `viewModel`/handler/event collaborators necessarily receive the projection and can deliberately retain or mutate their arguments; eliminating that capability would change the DI contract. Handler-wrapper itself publishes no reference through the source tree, singleton, parent view/context, or another invocation. A custom host method can independently mutate an AST, and callers can deliberately mutate raw `p`; neither is introduced here. Re-evaluate if a future change adds another structural write, stores render values in `b`, changes AST field ownership, or exposes projection nodes through a new framework-owned channel. Explicit task authorization accepts this bounded residual risk.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Projection changes selector/traversal semantics for inherited, explicit, or nested nodes | Medium | High | Override only direct `s`, share nested `c`, run each/insert/wrap plus get/UI golden paths and zero-match characterizations. |
| Binding cache compiles on the transient node and is lost or invalidated incorrectly | Medium | High | Forward `b` get/set to the source; assert cold source install, warm identity reuse, failure reuse, and raw-`p` invalidation. |
| Interleaved calls share projection state through a singleton/array | Low | High | Allocate array/nodes/accessors inside each invocation and gate an explicit A/B interleaving on one source identity. |
| Failure leaves a structural overlay or changed context behind | Medium | High | Keep projection local, preserve before-event placement, test before/create/handler/after throws, and rely on unchanged handler lexical `finally`. |
| Shallow projection introduces reflective/custom-node incompatibility | Low | Medium | Copy only the documented TSS contract, keep helper private, preserve source identity/shape, and use full package/pipeline tests; no speculative custom-field API is added. |
| Per-item allocation regresses hot iteration performance | Low | Medium | Allocate only direct nodes, characterize `O(d)`/`O(d)` and avoid descendant walks/deep clone/JSON/Proxy/global maps. |

### Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Per-invocation direct-child projection | Temporary mutate + `finally`; deep clone; JSON round trip; parser change; document-context override | `finally` still exposes the mutation across await/interleaving and overwrites concurrent state. Deep/JSON copies are `O(total subtree)`, detach `b`, lose non-JSON values, and add failure surface. Parser/document changes violate ownership and alter all consumers. |
| Share `p` and nested `c` | Clone declarations/descendants; freeze them | No runtime code mutates them; sharing preserves node identity, handler traversal, and compiled-owner raw snapshots without descendant work. Freezing changes the published mutable AST and blocks `b`. |
| Forward `b` with a narrow accessor | Copy `b`; ignore `b`; external `WeakMap`; change data-parser | Copy/ignore loses cold installs or invalidation and can duplicate work. A new map adds lifetime/config ownership. Forwarding preserves the existing cache owner and source identity without touching data-parser. |
| Construct projection after `before.iteration` | Construct before events; lazily during handler traversal | Keeping the original boundary preserves event ordering and means a before-event rejection performs zero projection work. Handler changes are out of scope. |
| Private helper in handler-wrapper | New package/model; singleton method | Projection is one package-local render concern. A package/pass-through abstraction expands public surface and DI for no independent policy owner. |

### Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Injected `eventModel`, `viewModel`, `handler`; source `TssNode.c` and optional `b`; existing detached context/document behavior. |
| Direct dependents | `each-method`, child-bearing `insert-method` aliases, `wrap-method`, and every get/UI/component flow reaching those callers. |
| Cascade on outage | A projection defect can reject or misrender wrapper-based fragments; non-wrapper traversal and parser/cache acquisition remain available. |
| Cascade on slow | Extra constant-width allocation occurs once per direct child/per wrapper invocation; no queue, I/O, lock, or retained backlog exists. |
| Cascade on bad data | Current model data follows the unchanged handler/method path and is never stored in the projection or source cache; sink behavior is unchanged. |
| Compromised-session impact | N/A: no session, record, authorization, tenant cache key, or persistence access. The change reduces cross-render selector contamination. |
| Fault isolation boundary | Projection/event/view/handler failures reject the current render; outer `handler.handle` `finally` restores lexical scope. Source structure remains reusable. |

### Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Revert the isolated feature commit/PR. After package publication, hosts may pin `@jtorm/handler-wrapper@1.0.5` while the normal patch release is reverted. |
| Schema rollback | N/A; no database/schema/config. |
| Data rollback | N/A; no durable data or AST migration. Invocation projections die with the call; in-memory binding caches disappear on process restart. |
| Auto-rollback trigger | CI blocks delivery on any focused/full test, source guard, typecheck, syntax, Semgrep, package dry-run, or current-head review failure. Host rollout should roll back on new render errors or golden mismatches. |
| Manual rollback runbook | `git revert <feature-commit>`, rebuild/redeploy the source-composed host, and pin wrapper `1.0.5` if a published rollback is needed. No consumer metadata rollback is required. |
| Last rollback drill | Pre-deployment revertability will be proven by one isolated conventional commit and a clean diff against `dev`; no production deploy/package publish is part of this task. |

### Migration and SemVer

- Release `@jtorm/handler-wrapper` as patch `1.0.6`: behavior/output and API remain compatible; the fix removes an unintended cross-render side effect.
- Do not bump `each`, `insert`, or `wrap`: their `^1.0.5` ranges already accept `1.0.6`, and no package-resolution evidence requires churn.
- No host code, AST, manifest, cache, data, parser, or configuration migration is required. Process restart is sufficient to discard pre-fix in-memory trees after deployment. Diagnostic/custom event code that keys wrapper direct nodes by object identity must instead key stable source semantics (selector/method/declaration position); that identity was never a published cross-render contract and retaining it would preserve the defect.

### Verification Plan

- Red-first: structural snapshot after successful iteration; same-identity second traversal versus freshly parsed tree; failure then reuse; two explicitly interleaved wrapper calls; distinct/event-visible projection identities and selectors; before-event replacement versus in-place-edit timing; before/create/handler/after throws; source `b` cold install/live replacement/warm reuse/multiple-node routing/raw-`p` and grammar invalidation.
- Focused: handler-wrapper unit tests; each/insert/wrap pipeline suites; new cached-tree reuse suite; relevant get/UI ancestor-scope suites.
- Full: exact `npm test`; `npm run typecheck`; `npm pack --dry-run --json` in handler-wrapper; `node --check` on touched JS; existing source-contract/policy guards; zero runtime `require()` and zero tracked handwritten TS/declarations; Semgrep JavaScript scan; `git diff --check`.
- Review: `review-router`, `review-architecture`, `differential-review`, `review-refactor`, `tech-debt-ratchet`, source-ratchet applicability, and `production-readiness`; current-head GitHub CI and Codex review.

### Open Questions

None. The task authorization resolves scope, compatibility, package ownership, and delivery policy; no product-level decision remains.

### Success Criteria

- [x] Red tests fail on current `dev` specifically because direct child selectors mutate/share.
- [x] Source `{s,m,p,c}` remains deep-equal after success and every failure point; no projected array/node is shared between interleaved calls.
- [x] Reusing the same cached identity after success and failure matches a freshly parsed tree's output.
- [x] Existing each/insert/wrap/get/UI output, traversal, lifecycle, locale/context/cache-id/result, lexical scope, and loud errors remain exact.
- [x] Source `b` installs, reuses, and invalidates through the projection without retaining model/DOM/context data.
- [x] Projection is non-recursive `O(d)` time/space over direct children and adds no shared mutable projection state.
- [x] Only handler-wrapper receives a runtime/package patch; all requested documentation/review/verification/PR gates pass.

### Delivery Plan and Definition of Done

The independently verifiable critical path is: specification gate → red structural/reuse/failure/interleaving tests → minimal projection implementation → focused compatibility tests → package/docs/records → full verification and review → ready PR → green current-head CI and Codex review. Test and implementation batches remain separate so the red evidence is reviewable before the fix. No cross-team or external dependency is on the critical path; GitHub CI and Codex review are delivery gates after the local work.

1. Add unit and pipeline characterizations without changing runtime code; capture the expected failures against `dev`.
2. Add the private direct-child projection and no other runtime behavior; make the red set green.
3. Patch the package version and README, then run focused compatibility suites.
4. Run all requested static, package, security, review, and full-suite gates; fix findings in bounded batches and re-run affected gates.
5. Update the project-specific feature/evaluation/security/backlog/ledger records, publish one ready PR into `dev`, and iterate only that PR until CI and a current-head Codex review are clean.

**Definition of Done:** The measurable success criteria above pass; exact project commands are green; every requested review gate has zero unresolved valid findings; documentation and SemVer are correct; and the ready PR targets `dev`, has green CI and a clean review against its current head, and remains unmerged at agent handoff. Generic `feature-dev` documentation paths absent from this repository (`docs/features`, `docs/frontend`, `docs/security`, `feature-reviews/PROGRESS.md`) are replaced by the repository's requested feature/evaluation/security/backlog and `.claude-tasks` records.

**Sizing/appetite:** Medium / 5-point change, anchored to the recent binding-cache and returned-effect architecture follow-ups: runtime code is narrow, but concurrency/failure proof and delivery review have a longer tail. The appetite is one focused architecture PR and its required review loop. If correctness requires a parser, handler, document-model, cache-policy, or public-contract change, the circuit breaker is to stop implementation and reshape rather than silently expand scope or lower quality.

**Stakeholders and priorities:** Maintainer/task author owns product intent and acceptance; framework consumers own compatibility; Codex/local review gates own quality; GitHub CI owns executable acceptance. The business and user goals coincide: prevent cross-render contamination without output/API/migration churn. Technical feasibility is high at the existing wrapper seam; resource feasibility is bounded by one package and direct tests. Written specification and independent asynchronous design reviews precede implementation.

**RAID:** Assumptions are that documented `TssNode` fields are the supported runtime contract, `node.b` remains syntax-only, and current caller ranges resolve `1.0.6`; tests verify all three. The primary risks and owners are listed above, with Codex owning mitigations. The only external delivery dependency is GitHub availability; if unavailable after all local work, publication is retried without weakening local gates. No unresolved issue or known unknown currently requires a product decision.

### Approval

- [x] Requirements clear.
- [x] Scope agreed by the explicit task request.
- [x] Plan-quality and independent design reviews complete with every finding resolved.
- [x] Risks acceptable with red-first behavior, interleaving, failure, and full-pipeline proof.

**Approved by:** User task authorization plus Codex specification/design gate
**Date:** 2026-07-17

## Plan Quality Gate

**Scope tags:** SECURITY (shared cross-render/tenant integrity and isolation). No DB, FRONTEND, ROUTING, INFRA, or PAYMENTS.
**Gate status:** PASSED
**SQL pre-review:** N/A.
**Threat-model deep dive:** N/A; the change adds no trust boundary and touches no payment/high-value authority flow. The complete six-category STRIDE analysis and attack tree above are the linked threat model.
**Required reviewers loaded:** `code-review-enforcer`, `security-architect`, and `threat-modeling-enforcer`, with their referenced applicable checklists.
**Issues found and fixed in the specification:** 5 — preserved pre-event `t.c` capture; defined projection non-retention at framework-owned boundaries without overpromising hostile-collaborator behavior; selected an enumerable live `b` accessor and documented observer identity/descriptor compatibility; characterized `O(q*d)` concurrent peak allocation; preserved `for…in` enumerable key placement.
**STRIDE status:** Complete (6/6 categories, data flow, assets, actors, attack tree, residual-risk acceptance).
**Pre-review score:** 10/10 in all mandated dimensions.

### Checklist Application

- `project-management/planning-rigor` and builder DoD checklists: all applicable plan items PASS. Evidence is the measurable goal/success criteria, explicit non-goals, five-step small-batch critical path, reference-class size/appetite/circuit breaker, stakeholder mapping, RAID/risk ownership, layer-specific red-first test plan, and repository Definition of Done. Generic meeting ceremony, UX, route/DB ordering, handwritten-type placement, and HTTP error items are N/A.
- `engineering/domain-architecture`, `code-quality-review`, `type-safety`, `complexity-maintainability`, `error-taxonomy`, and `runtime-safety`: PASS for package ownership, DI/no imports, pure JSDoc JS, one private helper, rejection propagation, bounded iteration, no retry/recursion/global state, and no public/pass-through layer. Route/action/DB/schema/HTTP-specific items are N/A.
- `security/authorization`: the applicable multi-tenant isolation intent PASSes by eliminating framework-owned shared selector writes and testing one AST identity across renders (OWASP ASVS 5.0 §8.4.1; CWE-639); endpoint/identity/role/RLS controls are N/A.
- `security/injection` and `security/secrets-handling`: PASS for adding no parser, dynamic execution, raw sink, log, secret, model, DOM, request, PII, or tenant value to shared state (OWASP A03; CWE-94/CWE-79/CWE-532); remaining input/endpoint/crypto items are N/A.
- `security/rate-limiting-and-abuse`: the applicable resource control PASSes with one non-recursive `O(d)` pass, parser-bounded `d`, and `O(q*d)` active-call allocation without retention (OWASP API4:2023; CWE-400); endpoint throttling items are N/A.
- `security/dependency-security`: PASS because no package/import/action/lockfile dependency changes and the built-in language/runtime are used (OWASP A08; CWE-829). Existing dependency inventory is unchanged.
- `security/authentication`, `zero-trust-architecture`, `crypto`, `ssrf-and-external-requests`, `security-headers`, `api-asset-management`, `audit-trail-integrity`, `mobile-app-security`, `queue-message-security`, `ai-llm-security`, `security-anomaly-detection`, `supabase-row-level-security`, and `secrets-rotation`: every item is N/A with justification—this internal in-memory render projection adds no credential, access decision, network/API, persistence, log, mobile, queue, AI, database, monitoring, or secret lifecycle surface.
- `security/threat-modeling`: PASS; the specification locates the model, maps the complete flow/trust boundary, enumerates assets/actors, analyzes all STRIDE categories, states controls/tests, bounds blast radius, and records residual risk before implementation.

### Plan-Level Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Projection stays at handler-wrapper's render boundary; parser, cache, view, handler, document scoping, and callers retain ownership. |
| Consistency | 10/10 | Pure CommonJS singleton/DI, terse local helper, `for…in` ordering, current event timing, and package conventions are explicit. |
| Type Safety | 10/10 | Existing JSDoc `TssNode` contract is preserved; no public type, handwritten TS/declaration, cast, or escape hatch is added. |
| Validation | 10/10 | Trusted parsed/caller AST grammar and all method validation remain unchanged; malformed/input policy is not relocated. |
| Error Handling | 10/10 | Before/create/handler/after rejection timing, non-transactional existing effects, lexical cleanup, and projection non-retention are specified and tested. |
| Security/Privacy | 10/10 | Shared structural tampering is removed; projection/cache data stay syntax-only and invocation/source-owned with no new trust boundary or sink. |
| Performance | 10/10 | Direct-only `O(d)` time/space, `O(q*d)` peak active allocation, parser ceiling, and no deep clone/serialization/retention are acceptance criteria. |
| Maintainability | 10/10 | One private bounded helper fixes the owning seam without public surface, dependency, package, or unrelated cleanup. |
| Testability | 10/10 | Red structural/reuse/failure/interleaving tests plus cache forwarding, event timing, all callers, focused/full/static/review gates are concrete. |
| Readability | 10/10 | Source versus projection ownership, the `b` exception, compatibility caveat, and failure/resource tables make the small implementation unambiguous. |
| **Total** | **100/100** | Specification is implementation-ready; no accepted finding or product choice remains. |

## Agent Design Constraints

### Architecture and planning personas

- `architect`: preserve package SRP and dependency inversion; add no runtime import, parser/handler/document policy, facade, or public helper; keep structural source data stable.
- `planner`: follow the critical path and red-first batches above; acceptance evidence precedes implementation and quality never flexes to the delivery appetite.
- `backend-architect`: preserve awaits and event/error order, entry-captured children, context/result/cache-id flow, and outer lexical `finally`; no transaction/retry fiction.
- `elysia-expert`: route/macro/schema guidance is N/A; applicable lifecycle and validation-owner constraints are preserved without adopting Elysia.
- `bun-expert`: Bun/DB/runtime guidance is N/A because project `AGENTS.md` locks Node/npm commands; use no Bun API or dependency.
- `typescript-pro`: retain canonical JSDoc-only `TssNode` shape and generated-types ownership; no handwritten TS/declaration or public type change.
- `platform-engineer`: no service/Worker/queue/DB/observability resource; bound active allocation, isolate each invocation, and roll back the isolated patch.
- `database-architect`: persona is absent from the installed/resource-index profile and database scope is N/A; schema/migration/data rollback are explicitly N/A.

### Security personas

- `security-architect`: keep the projection model/request/DOM/tenant/PII-free, remove cross-render tampering, bound resource work, add no sink/dependency, and state residual observer authority.
- `threat-modeling-enforcer`: implementation may start only with the linked pre-code threat model, all six STRIDE categories, attack tree, controls, test mapping, blast radius, and accepted residual risk; all are present above.

### Independent read-only challenges

1. `feature-dev:code-explorer` and `feature-dev:code-architect` both found that current code captures `t.c` before the before-event. The design now captures that array at entry and projects it only afterward, preserving replacement versus in-place-edit behavior.
2. The explorer found that event/DI observers can see direct-node identity and descriptors. The compatibility matrix and migration note now make invocation-local direct identities and the enumerable `b` accessor explicit; nested identities and live values remain unchanged.
3. The architect required live, per-source `b` forwarding and concurrent resource characterization. Tests now require cold source installation, live replacement, warm identity, multiple-node routing, raw-declaration/grammar invalidation, and `O(q*d)` peak allocation.
4. The explorer tightened failure atomicity: allocation failures occur before any collaborator receives a projection; only later injected seams can retain arguments by their existing authority. Failure rows and non-retention assertions now use that exact boundary.
5. The final independent `feature-dev:code-reviewer` found no reproducible issue, independently passed 91 focused tests plus typecheck/syntax/diff hygiene, and scored all ten quality dimensions 10/10.

**Design gate:** PASSED. The direct-child projection is approved; temporary mutation/finally, deep clone/JSON, Proxy, parser changes, handler traversal changes, and context-selector overrides were rejected for concurrency, complexity, or ownership reasons.

## Pre-Implementation Red Baseline

Runtime source was verified unchanged with `git diff --quiet -- src/handlers/handler-wrapper/src/handler-wrapper.js` immediately before the run.

Command: `node --test test/handlers/handler-wrapper.test.js test/pipeline/cached-tss-reuse.test.js test/pipeline/each.test.js test/pipeline/insert.test.js test/pipeline/wrap-unwrap.test.js`

- **Result:** 10 passed, 10 failed, exit 1 against the completion-PR `dev` runtime.
- Direct projection/identity failed because `viewModel.create` received the exact shared child array/nodes.
- Entry-captured event and all successful/create/handler/after paths leaked `s:'body'` onto source nodes; the explicit two-call overlap shared both array and node identities.
- The expected `b` accessor was absent because the child was still the source data object.
- Same cached identity after both success and sanitizer failure rendered `<div class="a"></div>iter`, while the fresh tree rendered `<div class="a">iter</div>`.
- Focused `each`, child-bearing `insert`, and the existing child-bearing `wrap` failure all left their parsed direct child at `body` instead of `.a`, `div`, and `span` respectively.
- Existing detached locale, `each(e:)`, get/UI ancestor scope, explicit-body behavior, raw insert/wrap output, and loud zero-match characterizations remained green.

The feature-dev test personas were applied with repository adaptations: `tdd-guide` and `e2e-runner` were loaded; the referenced `test-engineer.md` is absent from the installed/resource-index catalog. The pipeline harness is the repository's integration/E2E-equivalent, so Playwright-specific items are N/A. The loaded TDD/test-suite checklists require this observed red, state/output assertions, concurrency, failure paths, isolation, and exact local commands; all are represented without fixed waits, retries, placeholders, or internal production mocks.

---

## Progress Log

### Research Mode
- [x] Confirmed PR #56 merged
- [x] Updated local `dev` and branched from current head
- [x] Read project `AGENTS.md`
- [x] Read architecture weakness #7 and backlog
- [x] Map implementation, ownership, callers, binding records, and tests
- [x] Record research summary

### Plan Mode
- [x] Write complete specification
- [x] Complete plan quality gate at 100/100
- [x] Self-review and revise specification

### Design Mode
- [x] Load/apply required personas and project-native checklists
- [x] Complete code-explorer and code-architect read-only challenges
- [x] Resolve entry-capture, observer/cache, failure-boundary, key-order, and concurrency-allocation findings
- [x] Validate design against project architecture and failure/performance constraints

### Implement Mode
- [x] Prove defect with 10 red focused tests on unchanged runtime
- [x] Implement bounded render projection with source-owned `b` forwarding
- [x] Preserve entry-capture/lifecycle/context and direct-key ordering
- [x] Patch-bump `@jtorm/handler-wrapper` to `1.0.6` and update its README

### Test Mode
- [x] Red set green: 20/20
- [x] Focused wrapper/cache/binding/each/insert/wrap/get/UI tests passing: 100/100
- [x] Exact full verification passing: 592/592 plus typecheck/package/source/syntax/Semgrep/audit/diff gates

### Review Mode
- [x] Requested local review gates passing with no unresolved finding
- [x] Verification loop confirms 100/100

### Documentation and Publication
- [x] Required feature/evaluation/security/backlog/ledger records updated locally
- [x] Ready PR #57 opened into `dev`
- [x] CI green at final head `61f5a95`
- [x] Current-head Codex review clean at `61f5a95`
- [x] PR left unmerged for maintainer handoff, then merged as `0017bd9`
