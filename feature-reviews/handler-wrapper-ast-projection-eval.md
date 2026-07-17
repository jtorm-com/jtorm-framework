# Handler-Wrapper AST Projection — Evaluation

**Branch:** `agent/eliminate-handler-wrapper-ast-mutation`
**Base:** `dev` at `4dd7e3a53b01fca24ab30e9c121783035e4681c5`; merged as `0017bd9`
**Started:** 2026-07-17
**Completed:** 2026-07-17
**Status:** MERGED PR #57 — final head `61f5a95` passed CI and clean current-head Codex review
**PR:** [#57](https://github.com/jtorm-com/jtorm-framework/pull/57) — merged into `dev` as `0017bd9`

## Resumption Context

**Last Completed Phase:** Delivery
**Next Action:** None — the canonical architecture backlog records weakness #7 complete.
**Issues Found (not yet fixed):** None.
**Accepted Findings Fixed:** Specification review fixed entry-time child capture,
`node.b` live forwarding, projection non-retention wording, concurrent allocation
characterization, and enumerable key placement before implementation.
**Source Ratchet:** N/A — changed tests execute TSS through the runtime and do not
parse source or implement/modify a static analyzer, regex/source guard, SQL scanner,
validation ratchet, or review script.

## Changed Feature and Module Map

| Surface | Ownership |
|---|---|
| `@jtorm/handler-wrapper` | Invocation-local direct-child render projection, detached-fragment lifecycle, package docs/version |
| `@jtorm/data-parser` contract | Unchanged owner of the intentional source-node compiled-binding cache `b`; exercised through the projection |
| `@jtorm/tss-model` contract | Unchanged owner of cached parsed-tree identity; exercised by sequential success/failure reuse |
| `each`, `insert`, `wrap` | Unchanged direct callers; pipeline characterizations prove output/traversal and source stability |
| Test harness/pipelines | Same-AST interleaving, lifecycle/failure, get/UI ancestry, zero-match, and exact fresh-tree comparisons |
| Feature records | Specification, differential security, evaluation, architecture backlog, and review ledger |

No parser, handler, view-model, document scope, binding grammar, cache policy/TTL,
transport, manifest, endpoint, database, queue, worker, dependency, UI asset, or public
export changes.

## Entry Point and Data Flow

Flow: parsed/caller `t` → capture `t.c` at wrapper entry → parent selector and
`before.iteration` → project the captured direct array to fresh nodes
`{s:'body',m,p,c,b<->source.b}` → detached `viewModel.create` → child handler when
`v.r` is absent → refresh `cid`/`cs` → `after.iteration` → detached body HTML.

- Null/void: existing model and method semantics are unchanged; projection copies
  syntax references without interpreting model data.
- Async/await: before event, view creation, handler, after event, and body extraction
  retain their exact order. Entry-captured replacement versus in-place edit timing is
  characterized.
- Cache: source `{s,m,p,c}` is never assigned. Only `b` writes cross back through a
  live per-source accessor, preserving cold compilation, warm identity, live
  replacement, and declaration/grammar invalidation.
- Failure: every existing rejection propagates. The wrapper stores no projection on
  the source, singleton, parent context, or another invocation; handler lexical cleanup
  remains the outer owner.
- Resource use: a non-recursive loop is `O(d)` time and transient space for `d` direct
  children, with `O(q*d)` peak allocation for `q` active calls. Parser-produced trees
  have a hard 4,096-node ceiling; caller-provided arrays remain caller-sized.

## Red-First Evidence

The runtime source was confirmed unchanged immediately before this command:

`node --test test/handlers/handler-wrapper.test.js test/pipeline/cached-tss-reuse.test.js test/pipeline/each.test.js test/pipeline/insert.test.js test/pipeline/wrap-unwrap.test.js`

Baseline result: **10 passed / 10 failed**, exit 1.

- `viewModel.create` received the shared child array and node identities rather than
  an invocation-local projection.
- Success, create, handler, and after-event paths left direct selectors at `body`;
  two overlapping calls shared both arrays and nodes.
- The input had no forwarding accessor because rendering operated on the source node.
- Same cached identity after success and sanitizer failure rendered
  `<div class="a"></div>iter`; a fresh tree rendered
  `<div class="a">iter</div>`.
- Each, child-bearing insert, and the current child-bearing wrap failure mutated their
  parsed direct selectors from `.a`, `div`, and `span` to `body`.

The failure signatures directly proved architecture weakness #7 before runtime code
changed.

## Implementation and Compatibility

- One private `project(t)` helper allocates a new array and one constant-width direct
  node per existing enumerable child key.
- Each direct node receives `s:'body'`; current `m`, `p`, and `c` references are
  preserved. Descendants are not walked, cloned, or rewritten.
- An own enumerable getter/setter forwards projected `b` to the corresponding source
  node. Tests also prove the source property remains an ordinary writable,
  enumerable, configurable data property.
- The projection is built after the before event from the array captured before it,
  preserving existing event replacement/in-place mutation behavior.
- The published singleton, `handle(h,t,m,v)` signature, DI seams, returned HTML,
  events, `cid`/`cs`, `v.r`, locale, parent context, ancestor/body defaults, errors,
  traversal, and parser output remain unchanged.
- Only `@jtorm/handler-wrapper` is patch-bumped from `1.0.5` to `1.0.6`. Each, insert,
  and wrap already depend on `^1.0.5`, so no coordinated metadata churn or migration
  is required.

## Scoped Review Results

| Gate | Result | Evidence |
|---|---|---|
| `review-router` | PASS | Routed tests/docs/refactor plus the explicitly required architecture, differential security, ratchet, and readiness gates; unrelated domain reviews are N/A. |
| `review-architecture` | PASS | Projection remains at the wrapper/render boundary; all eight trust/dependency/data/log/blast questions answered; pre-code STRIDE and rollback linked; no locked rule violated. |
| `differential-review` | PASS | Historical mutation and binding-cache commits, three callers, three consumer ranges, sinks, failure and concurrency attacks reviewed; no unresolved finding. |
| `review-refactor` | PASS | Public contract/output/error behavior and all existing tests remain; no dead code, abstraction layer, dependency churn, suppression, or unrelated cleanup. |
| `review-privacy` | PASS / N/A | No personal-data collection, retention, logging, sharing, erasure, consent, audit, or residency change; projection is transient syntax only. |
| Source ratchet applicability | N/A | No source-reading analyzer/guard/ratchet changed; existing source/policy guards still pass 10/10. |
| Semgrep | PASS | 83 JavaScript/security rules over all six changed JavaScript targets, zero findings. |
| Dependency security | PASS | No dependency/lockfile change; production and full npm audits both report zero vulnerabilities. |
| Independent feature-dev review | PASS | Read-only reviewer found no reproducible issue, independently passed 91 focused tests/typecheck/syntax/diff, and scored every quality dimension 10/10. |
| Tech-debt ratchet | PASS | Exact staged candidate reports no new debt pattern; final rerun followed the evidence/ledger update. |

The differential security report is
`feature-reviews/handler-wrapper-ast-projection-security-review.md`. Generic
Bun/Elysia/HTTP/API/database/authentication/payment/AI criteria are N/A; project
`AGENTS.md` Node/CommonJS/DI/render contracts were authoritative.

## Production Readiness

| Category | Result | Evidence |
|---|---|---|
| Data Scale | PASS | No query/upload/payload change. Direct-only non-recursive `O(d)` projection, parser 4,096-node ceiling, no descendant clone or global retention. |
| Resilience | PASS | No I/O, retry, timeout, lock, queue, external call, or fallback. Before/create/handler/after failures propagate and leave source structure reusable. |
| Security Surface | PASS | Cross-render structural tampering removed; no input/authority/sink/secret/dependency added; audits and Semgrep clean. |
| User Experience | PASS | Exact each/insert/wrap output and current loud wrap/zero-match behavior remain; no loading, interaction, layout, or accessibility surface changed. |
| Observability | PASS | Existing events and thrown errors retain order/content; no service, endpoint, log, or new metric exists. Focused structural/reuse tests are the regression signal. |
| Production-Only Failure Modes | PASS | Warm-cache same identity, sequential success/failure, explicit interleaving, tenant-relevant isolation, singleton resets, locale/context, and live binding-cache invalidation are exercised. |
| Deploy and Rollback | PASS | One compatible package patch; no schema/config/infra/data migration. Rollback is the isolated commit or package pin to `1.0.5`; process restart discards pre-fix in-memory trees. |

No browser QA, HTTP security test, database plan/load test, migration drill, Worker
deployment, accessibility audit, or telemetry rollout is applicable to this internal
runtime ownership fix. Resource conclusions are based on the bounded algorithm and
hard parser ceiling rather than invented production percentiles.

## Fresh Local Verification

| Gate | Result |
|---|---|
| Focused handler-wrapper/cache/binding/each/insert/wrap/get/UI suites | **100/100 pass** |
| Exact `npm test` | **592/592 pass** |
| `npm run typecheck` | PASS |
| Handler-wrapper package dry-run | PASS — `1.0.6`, 3 files, 2,637-byte tarball / 5,643 bytes unpacked |
| Source/policy contract tests | **10/10 pass** |
| Syntax checks on all changed JavaScript | PASS |
| Runtime `require()` invariant in changed package | zero matches |
| Changed handwritten `.ts` / `.d.ts` | zero files |
| Semgrep | 83 rules / 6 targets / 0 findings |
| Production/full npm audits | 0 vulnerabilities / 0 vulnerabilities |
| `git diff --check` | PASS |

This was the final no-edit source/test verification pass after the selectorless and
ordinary-source-`b` descriptor assertions were added.

## Review Limitations

- `agents/engineering/architect-review.md`, `agents/testing/test-engineer.md`, and the
  generic feature-dev documentation paths do not exist in the installed ai-config
  checkout/resource index. Available architecture, test, results, security,
  performance, and independent reviewer personas were applied; missing names are not
  silently claimed.
- The differential-review skill's four linked supporting markdown files are absent.
  Its primary workflow was completed manually and the limitation is recorded in the
  security report.
- External host composition and production telemetry are outside this repository;
  the full local engine is the available integration boundary.

## Current Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Direct projection stays with handler-wrapper; parser/cache/handler/view/document/caller policy ownership is unchanged. |
| Consistency | 10/10 | Pure CommonJS singleton DI, terse helper, enumerable key placement, lifecycle order, and patch conventions match the repository. |
| Type Safety | 10/10 | Canonical JSDoc contracts remain; no handwritten TypeScript/declaration/cast or public shape change; typecheck green. |
| Validation | 10/10 | Parser inheritance, method validation, scope, zero-match, and binding grammar remain authoritative; invalidation is exercised. |
| Error Handling | 10/10 | All four requested failure seams reject without structural leakage; outer lexical cleanup and exact loud errors remain. |
| Security/Privacy | 10/10 | Shared selector tampering removed; transient syntax-only state, no PII/sink/dependency/authority, clean scans and audits. |
| Performance | 10/10 | Non-recursive direct `O(d)` work, `O(q*d)` active peak, hard parser ceiling, no deep clone/serialization/retention. |
| Maintainability | 10/10 | One private owner-local helper and documented `b` exception; no new package/facade/shim/dependency or scope expansion. |
| Testability | 10/10 | Red structural defect, sequential fresh equivalence, explicit interleaving, all failures/callers/scopes/cache paths, exact full suite. |
| Readability | 10/10 | Source versus projection ownership, observer identity, cache forwarding, complexity, compatibility, and rollback are explicit. |
| **Total** | **100/100** | Local review and fresh verification contain no unresolved valid finding. |

## Delivery

- Implementation commit: `820fe75` (`fix: preserve cached AST selectors in wrappers`).
- Ready PR into `dev`: [#57](https://github.com/jtorm-com/jtorm-framework/pull/57), left unmerged at agent handoff.
- GitHub Actions passed on final head `61f5a95`.
- Codex reported no major issues on reviewed commit `61f5a95`; zero review threads remained.
- The maintainer merged PR #57 into `dev` as `0017bd9` at 2026-07-17T16:31:29Z.
