# Explicit Returned View Effects — Differential Security Review

**Branch:** `feature/explicit-view-effects`
**Baseline:** `dev` at `4bfab8f`
**Date:** 2026-07-16
**Risk:** HIGH (render availability and fail-closed child gates)
**Verdict:** PASS — no unresolved security finding

## Scope and Coverage

The review covers the complete working-tree diff: the central handler/view/type
contract, all 23 runtime method packages, synthesized attrs/each/move/UI-compiler
execution, mediatarget's policy-helper call, host-test wiring, package metadata,
tests, and documentation. The quantitative publication blast radius is 27
packages: handler, view model, types, UI compiler, and 23 methods.

The repository is a medium-sized codebase and the diff is broad, so review was
focused deeply on the control-flow owner and one-hop callers, with a mechanical
source/package pass over every migrated method. Git history and blame were read
for the removed security-sensitive handler code. Semgrep ran 84 JavaScript and
multilanguage rules over 74 scoped files with zero findings. The production-only
dependency audit reports zero vulnerabilities.

## Historical Security Baseline

The removed handler block included behavior added by these security-relevant
commits:

- `45d4504` — fail closed on validate misses for gate verbs.
- `68e7b6` — restore lexical render scope in `finally` after failures.
- `76c89d` — reject unknown TSS methods and inherited registry properties.

The new path preserves those controls at
`src/handlers/handler/src/handler.js:55`, `:72`, `:92`, `:104`, and `:147`.
It replaces only the mutable transport for validation/child/repeat results.

## Trust Boundary and Data Flow

```text
parsed TSS / synthesized node + host-injected method registry
                         |
                         v
                 handler.dispatch(v, data?)
             own key/alias -> data -> validate -> events
                         -> method -> strict effect normalization
                              |                 |
                        bounded repeat      child recursion
```

The host-injected method is already trusted to mutate the DOM, but its returned
control object is treated as untrusted structure: each own field is read once,
only boolean `children` and `repeat` values are honored, missing/malformed fields use gate-aware safe
defaults, and explicit repeat is capped at 100 lifecycle executions. There is no
new remote-input, identity, authorization, secret, network, database, queue,
storage, crypto, or logging boundary.

## Attack Scenarios and Controls

| Scenario | Before | Control and evidence |
|---|---|---|
| Method forgets to replace/return control state | Inherited `v.io.r=1` repeated forever | No view-side state; missing return normalizes to `repeat:false` (`handler.js:17-23`; red/green handler regression). |
| Method returns `repeat:true` forever | Unbounded loop | Dispatch throws at 100 executions (`handler.js:105-109`; exact-count test). |
| Gate returns inherited or string controls | Truthy coercion could open children or force 100 executions | Only own booleans are accepted; malformed gate defaults to `children:false` (review-found red/green regression). |
| Stateful effect getter changes type between reads | A passed type check could still return a truthy string and open a gate | Each own field is snapshotted once before type normalization (final-review red/green regression). |
| Synthesized call skips a future validation/gate | attrs/each/move/compiler called verb handles directly | All construct complete nodes and use injected dispatch; custom prepared-data hooks, validation, aliases, events, and unknown errors are covered. |
| Registry prototype property is selected | Could invoke an unintended inherited member | Existing own-property checks remain in direct and alias resolution (`handler.js:55-69`). |
| Method/child throws after mutating scope | Shared singleton context could poison the next render | Existing lexical `try/finally` remains around dispatch and child recursion (`handler.js:147-159`); cross-render tests pass. |
| Method returns a getter/proxy that throws | Current render rejects | Error propagates through the same lexical cleanup. Trusted extensions can already execute arbitrary method code; execution sandboxing is outside this task. |

## Findings

### Fixed during review — malformed/inherited effect controls (Medium)

The first normalizer truthy-coerced control fields and read inherited values.
A buggy gate returning `children: "false"`, or an object inheriting
`children:true`, could therefore render guarded children; string
`repeat:"false"` caused 100 executions before failure. A focused regression
failed first with `Method malformed repeat limit exceeded`. The normalizer now
accepts only own boolean controls and the regression passes.

### Fixed during final review — unstable effect accessor (Medium)

The strict normalizer initially read a valid control getter once for the type
check and again for the returned value. A stateful accessor could return
`false` first and a truthy string second, violating the complete boolean effect
contract and opening gate children. A focused regression failed first with
actual `children: "open"`; dispatch now snapshots each own field once before
normalizing, and the regression passes.

### Open findings

None.

## Dependency and Sink Review

No third-party runtime code or runtime import was added. `npm audit --omit=dev`
is clean. The full root development audit still reports the pre-existing pinned
lodash 4.17.21 advisory; the baseline lockfile contains the same version, this
diff does not alter it, fresh published-package installs may resolve a newer
compatible 4.x release, and the repository does not call the affected
`template`, `unset`, or `omit` APIs. This is not introduced by the feature.

No new data-to-HTML, script, URL, filesystem, process, or network sink exists.
The only added `outerHTML` flow is the pre-existing move/copy payload now passed
as prepared data through dispatch instead of directly to the chosen method.

## Limitations and Confidence

- Opposite-model adversarial review is unavailable because the maintainer
  explicitly marked Claude unavailable. The required adversarial-review skill
  therefore could not run under its own hard cross-model rule; local skeptic,
  architect, and minimalist passes were performed instead.
- The differential-review skill's linked `methodology.md`, `adversarial.md`,
  `reporting.md`, and `patterns.md` files are absent from the installed
  ai-config checkout. Its primary risk/history/blast-radius/report workflow was
  applied directly and this limitation is not presented as coverage.
- External production host composition is not in this repository. The package
  READMEs document the new compiler-handler injection, while the full local
  composition harness and publication dry-runs are the available integration
  evidence.

Confidence is high for the repository-owned control flow and moderate-high for
external host adoption because the coordinated package minima prevent a mixed
method/handler contract but cannot inspect third-party host wiring.
