# Unknown-Verb Drift Guard — Evaluation

**Branch:** `fix/unknown-verb-drift-guard`
**Base:** `dev` at `5fdd27c`
**Started:** `2026-07-14T19:19:27Z`
**Completed:** `2026-07-14T19:29:10Z`
**Status:** COMPLETED

## Scope

- Resolve each truthy parsed TSS method name only from an own entry in the
  injected method registry or one of its own registered aliases.
- Throw before data, events, method handling, or child rendering when no method
  resolves.
- Preserve registered aliases and selector-only child traversal.
- Patch-bump and document `@jtorm/handler`; update the canonical backlog.

## Entry-Point Trace

`v.t.m` from the parsed TSS node → injected `methods` registry membership/alias
resolution → method lifecycle when found, loud `Error` when unknown, or
selector-only child traversal when no method was specified.

## Verification

- Regression proof: the new unknown-method case failed with “Missing expected
  rejection” before the runtime edit.
- Focused tests: 4/4 passing, including exact parent-before-child error ordering,
  the inherited `constructor` prototype property, an alias, and a selector-only
  rule.
- Full suite: 416/416 passing.
- Typecheck and `git diff --check`: passing.
- Semgrep: 68 JavaScript rules over both changed JavaScript files, 0 findings.
- Tech-debt ratchet: passing.
- Production-dependency audit: 0 vulnerabilities.

## Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Dispatch remains in `@jtorm/handler`; the injected registry boundary and zero-runtime-import rule are unchanged. |
| Consistency | 10/10 | Own-property lookup, alias fallback, terse control flow, and existing raw-Error convention match the package. |
| Type Safety | 10/10 | No type surface changed; no handwritten TS/d.ts; the scoped JSDoc typecheck passes. |
| Validation | 10/10 | Every truthy method token must resolve to an own registry entry or own entry alias; prototype lookalikes are rejected. |
| Error Handling | 10/10 | Unknown methods reject before data/events/children and remain inside the existing scope-restoring `finally`. |
| Security/Privacy | 10/10 | Prototype-chain dispatch is closed; no PII, authority, network, code-execution, or new sink surface exists; Semgrep is clean. |
| Performance | 10/10 | Direct dispatch adds one constant-time own-property check; alias scanning stays linear in the already-small registry with no I/O or allocation path. |
| Maintainability | 10/10 | The change is local, dependency-free, documented, patch-bumped, and adds no helper or compatibility abstraction. |
| Testability | 10/10 | Failing-test-first full-pipeline coverage locks unknown, prototype, ordering, alias, and selector-only behavior; 416/416 pass. |
| Readability | 10/10 | The guard sits immediately after resolution, making the fail-loud invariant visible before the lifecycle begins. |
| **Total** | **100/100** | All accepted in-scope findings were resolved before completion. |

## Production Readiness

All seven categories pass. The change has no database, queue, endpoint, auth,
external request, browser UI, accessibility, observability-config, migration,
or infrastructure surface. Registry reads are deterministic and bounded; the
new throw uses the existing `try/finally` cleanup path. Rollback is a normal
code revert, and publishing was intentionally deferred.

The full development audit reports a pre-existing lodash advisory against the
root's pinned test dependency. This diff adds or updates no dependency, the
production-only audit is clean, and neither the changed code nor the repository
uses the affected `template`, `unset`, or `omit` APIs. Reassess the root pin
as a separate release-maintenance item before publishing.

## Review Convergence

Routed architecture, code-quality, test, dead-code, cross-package, performance,
and security reviews found no unresolved code issue. The test review's one
accepted finding strengthened the regression to prove the parent error occurs
before child traversal. Cross-model skeptic/architect/minimalist review could
not run because the environment rejected sending local repository content to
an external Claude service; no bypass was attempted.
