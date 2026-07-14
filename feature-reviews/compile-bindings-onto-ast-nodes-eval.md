# Compile Bindings onto AST Nodes — Evaluation

**Branch:** `feature/compile-bindings-ast`
**Base:** `origin/dev` at `e4ab711e7a502c33e39122016a2d0d1c7dbb9337`
**Started:** `2026-07-14T21:48:37Z`
**Status:** COMPLETED
**Completed:** `2026-07-14T22:05:14Z`
**Mode:** Post-delivery evaluation

## Resumption Context

**Last Completed Phase:** Phase 7 — commit, push, and ready PR delivery
**Next Action:** Await review on PR #44; publishing and merging remain outside this task.
**Issues Found (not yet fixed):** None.
**Accepted Findings Fixed:** One JSDoc contract correction: append/default descriptor arrays can contain `null` for empty append segments.
**Review Comments:** Not a PR yet.
**Source Ratchet:** N/A — changed tests execute TSS through the runtime and do not parse source code or implement a static analyzer.

## Changed Feature and Module Map

| Surface | Ownership |
|---|---|
| `@jtorm/data-parser` | Binding grammar, syntax compilation, descriptor evaluation, and node-local cache envelope |
| `@jtorm/data-method` | Output-path and `||` fallback descriptors |
| `@jtorm/if-method` | `||`/`&&` conditional descriptors; raw regex provenance remains unchanged |
| `@jtorm/attrs-method` | Fresh normalized attrs state plus cached comma-list descriptors |
| `@jtorm/text-method` | Sequential evaluation of cached descriptors against the mutating current model |
| `@jtorm/types` | Optional model-free `TssNode.b` JSDoc contract |
| Test harness and suites | Live/detached document modes, cached identity, characterization, compile counts, invalidation, errors |
| Feature review docs | Development/evaluation evidence and canonical backlog status after final verification |

No endpoint, route, database, queue, worker, external service, dependency, CSS, component, or user-facing action changed.

## Entry-Point and Data-Flow Traces

### Inline or Caller-Reused AST

Flow: trusted TSS string/caller AST → `tss-parser` or preserved node identity → `handler` → default `dataParser.handle` → grammar/raw snapshot check → cold compile or warm descriptor reuse → evaluation with current `v.m` → existing method validation/sink.

- Null result: existing unresolved-path `null` and auto-bind `undefined` behavior is preserved and characterized.
- Void result: `handle` communicates through `v.d`; callers do not infer success from a return value.
- Async awaited: compilation/evaluation is synchronous; existing async method and child handlers remain awaited.
- Check/record pairing: N/A; no rate limit or counter.
- Token paths: N/A; no authentication.
- Count/modify atomicity: cache segments are built locally without `await` and assigned only after successful compilation.
- Cache invalidation: effective grammar plus ordered shallow raw-`p` snapshot; model changes do not invalidate.
- Environment bypass: N/A; no environment branch.
- Deleted-state fallback: N/A; missing/falsy model semantics are explicitly characterized.

### Fetched TSS Cache

Flow: `get`/`ui` URL → `tss-model.get` bounded LRU promise → response text → one parsed AST identity → handler visits shared nodes → data-parser installs syntax-only node caches → later renders reuse both AST and descriptors.

- Request/parse failures continue to reject; no partial binding cache exists before a node is visited.
- Cache hits return the exact same tree and node identities, locked by `test/models/tss-model.test.js`.
- No model, DOM, request, function, or executable regex enters the shared AST; cross-model renders inspect serialized nodes.
- Eviction, request-base keys, and request-origin protection remain owned by `tss-model`/request-model and are unchanged.

### Cloned, Synthesized, or Replayed Nodes

Flow: cached/bound node → UI/layer/iteration clone or replay → optional raw-`p` rewrite → handler → cache comparison → reuse if raw declarations match, whole-envelope replacement if they differ → current-model evaluation.

- A clone with unchanged raw declarations safely reuses plain descriptors.
- A UI compiler clone that rewrites `p` invalidates before evaluation.
- Raw arrays are copied in the snapshot; element mutation and property-order changes invalidate.
- Descriptors are plain JSON-safe data and do not retain closure or singleton references.

### `data` Method

Flow: raw output key/value declarations → owner cache keyed by `data.or` → output path split plus compiled fallback terms → each term evaluated against current model → first truthy fallback selected → existing nested `set` → `v.io`.

- Empty/missing values and truthy fallback ordering match the old path.
- Raw declaration or owner-token change invalidates before use.
- No DB/action/side effect exists; failures reject the current render.

### `if` Method

Flow: default-bound method data → when `d` remains `null`, owner cache keyed by `if.or` + `if.and` → preserved OR-before-AND split → current-model evaluation → existing type/value/element/regex checks → matching child or `else`.

- Regex pattern validation/execution remains solely in the injected regex-policy model.
- Trusted-regex provenance still compares `v.t.p.v` to the raw quoted literal.
- No compiled cache contains a native `RegExp`; errors and branch ordering remain loud/current-render local.

### `attrs` Method

Flow: default binding → fresh `cloneDeep` + quote normalization in `validate` → existing validation → owner cache keyed by separator/quote grammar and normalized values → current-model evaluation per value → existing `attr` method.

- Before-method plugin mutation of the per-render parsed node is rechecked; mismatches compile ephemerally and do not poison the shared segment.
- Missing values, remove mode, and raw fallback preserve existing truthiness behavior.

### `text` Method

Flow: default cache warm-up → cached descriptors → ordered loop evaluates each descriptor against current `v.m` → language lookup → write to `v.m` → next declaration sees prior writes → `v.io`.

- Sequential mutation is explicitly characterized; a pre-evaluated `v.d` snapshot is not reused.
- Repeated renders reuse syntax but always evaluate the supplied model.

## Scoped Review Results

### Architecture

- PASS after one type-contract fix. `tss-model` still owns fetched AST identity; `data-parser` owns binding grammar/cache; special grammar remains with each method.
- Pure injected CommonJS holds: zero `require()` calls in runtime `src/**/*.js`; no handwritten TypeScript/declarations; no new package or dependency.
- Public `parse()`/`handle()`, raw `p`, methods, aliases, and package boundaries remain available. Changed method packages require `@jtorm/data-parser ^1.0.3` to prevent helper-version skew.
- Eight-question security/architecture triage: no new trust boundary, external input source, secret, dependency, endpoint, data collection, logging, or persistence; blast radius is bound TSS rendering and rollback is the isolated code/package-patch revert.

### Refactor and Cross-Package Consistency

- PASS. Every new helper has a concrete caller; no unused import, unreachable branch, wrapper layer, placeholder, suppression, skipped test, debug log, compatibility shim, or speculative package exists.
- The compatibility `parse()` wrapper is required by the locked published surface and delegates to the single compiler/evaluator.
- Cache invalidation and method-owner extensions remove repeated parsing without folding method grammar into the generic parser.

### Privacy and Security

- APPROVED. The AST stores trusted syntax/literals only; current models are passed only to evaluation and tests prove first/second/error models are not serialized into the reused tree.
- No PII collection, consent, retention, erasure, audit-log, identity, authority, network, regex-execution, HTML-sink, or secret-handling behavior changes. Privacy/GDPR/DSA/AI/mobile/ticket controls are N/A to this internal model-free runtime cache.
- STRIDE is complete in the development record; applicable Tampering, Information Disclosure, and DoS claims have regression evidence.

### Test and Performance Review

- Red-first evidence: old runtime produced 31 cold + 27 warm `parse()` calls and no compiler.
- Implemented count gate: zero runtime parses, 29 cold compiles, and zero warm compiles across all generic and method-specific forms.
- Tests cover changed models, live SPA/PWA plus detached SSR, fetched identity, clone/raw invalidation, owner grammar, arrays/order, auto params/leaf status, repeated evaluation errors, failed compile atomicity, and sequential text writes.
- No browser UI exists in the diff, so E2E screenshots, WCAG, Playwright, and API-contract checks are N/A. The repository's full `node:test` pipeline is the correct integration boundary.

### Production Readiness

- **Data scale — PASS:** no database, upload, payload, or unbounded global cache was added. Snapshot comparison is linear in a node's own declarations, and descriptor lifetime remains bounded by the existing fetched-AST LRU or caller-owned AST lifetime.
- **Resilience — PASS:** compilation/evaluation is synchronous, contains no retry or external call, and installs a cache segment only after the whole segment compiles. Reused-node evaluation failures remain repeatable and loud.
- **Security — PASS:** no executable code/regex, dependency, authority, network input, or model value enters the cache. Raw sinks and regex-policy validation are unchanged.
- **User experience — PASS:** rendered output and errors are covered by live and detached pipeline tests; no interaction, layout, accessibility, or loading state changes.
- **Observability — PASS:** there is no service/endpoint requiring telemetry. The exact zero-warm-compile assertion is the regression signal, while existing render errors remain visible to hosts.
- **Production-only behavior — PASS:** fetched identity, clone/rewrite invalidation, singleton grammar changes, live/detached documents, changed models, and repeated errors are exercised.
- **Deployment and rollback — PASS:** no schema, infrastructure, config, migration, or staged rollout is required. Rollback is the isolated feature commit/package patch revert; publishing remains outside this task.

### Static Analysis and Cleanup

- `git diff --check`, the no-`require()` runtime guard, and the no-handwritten-TypeScript guard pass.
- The working-tree tech-debt ratchet passes with no new debt patterns.
- Semgrep's JavaScript auto rules reported two `prototype-pollution-loop` audit matches on `tmp = tmp[key]` reads in the model-path evaluator. They are reviewed false positives: neither statement writes through the dynamic key, and inherited/prototype lookup is an explicitly preserved and characterized parser semantic. No suppression was added.
- `npm audit --omit=dev` reports zero production vulnerabilities.
- Biome and ESLint are N/A by the repository contract; `npm run typecheck` is the configured static type gate.

### Fresh Verification

| Gate | Result |
|---|---|
| Focused binding/cache/method/pipeline suites | 59/59 pass |
| Full `npm test` | 427/427 pass |
| `npm run typecheck` | pass |
| `git diff --check` | pass |
| Runtime `require()` invariant | zero matches |
| Tracked handwritten `src/**/*.ts` / `src/**/*.d.ts` | zero files |
| Production dependency audit | zero vulnerabilities |

### Review Limitations

- Opposite-model Skeptic/Architect/Minimalist prompts were prepared, but Claude usage was exhausted and no output was produced. This is recorded as PARTIAL, not a cross-model PASS; the user explicitly directed local continuation.
- Stale evaluator references `agents/testing/test-engineer.md` and `agents/engineering/architect-review.md` do not exist in the ai-config checkout or resource index. The available test/results personas and a fresh direct AGENTS.md review were applied; the missing names are not silently claimed.

## Current Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Binding/cache responsibility remains with data-parser; AST identity, parser, handler, and method-owner boundaries remain separate. |
| Consistency | 10/10 | DI singleton style, terse control flow, patch releases, raw-node shape, aliases, and test layout match the repository. |
| Type Safety | 10/10 | Canonical JSDoc describes tagged descriptors, nullable append members, ordered snapshots, arrays, and optional node cache; typecheck is green. |
| Validation | 10/10 | Grammar/raw snapshot and owner keys invalidate stale syntax; existing method and regex-policy validation remains authoritative. |
| Error Handling | 10/10 | Compile segments install atomically; compile/evaluation failures repeat and propagate through existing handler cleanup. |
| Security/Privacy | 10/10 | Syntax-only cache, no model retention, no executable regex/code, imports, logs, persistence, authority, or external boundary. |
| Performance | 10/10 | Measured regression changes warm work from 27 parses to zero parses/zero compiles; existing AST LRU bounds node/cache lifetime. |
| Maintainability | 10/10 | One compiler/evaluator with small cache helpers; method grammar stays local; no dependency or abstraction layer added. |
| Testability | 10/10 | Red count baseline, full binding matrix, invalidation/errors/modes/identity tests, and full golden suite. |
| Readability | 10/10 | Plain tagged descriptors and documented cache contract make syntax/evaluation ownership explicit without closures. |
| **Total** | **100/100** | Fresh verification and delivery gates complete. |

## Delivery

- Implementation commit: `cd1c19e` (`perf: compile bindings onto cached AST nodes`).
- Branch: `feature/compile-bindings-ast`, pushed to the canonical origin.
- Ready PR: [#44](https://github.com/jtorm-com/jtorm-framework/pull/44), open into `dev` and confirmed non-draft.
- No package was published and the PR was not merged.
