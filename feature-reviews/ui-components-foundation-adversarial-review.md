# UI Components Foundation — Adversarial Review

**Date:** 2026-07-19
**Scope:** staged `feat/ui-components-foundation` candidate rebased onto `dev` at `9ee8cc850224041498282a893eca7451dde8364b`
**Method:** read-only opposite-model review through Anthropic Claude after explicit user approval
**Verdict:** Initial candidate PASS; direct-binding correction has two completed lenses and one explicitly partial lens

## Review lenses

| Lens | Verdict | Findings | Resolution |
|---|---|---:|---|
| Skeptic | PASS | 1 Low | Accepted and fixed red-first; focused follow-up PASS |
| Architect | PASS | 0 | No architecture change requested; one informational internal-base precondition retained |
| Minimalist | PASS | 1 optional | No required change; loading-label single-pass refactor deferred as non-defect |

All three reviewers read `AGENTS.md`, the feature specification, STRIDE record, workflow/evaluation,
and the full staged diff. They traced the real resolver/compiler/get/handler pipeline and ran
read-only focused or full tests rather than relying on the evaluation claims.

## Accepted finding

### Null current model entered compound-binding parsing without `d:`

The skeptic reproduced a Low-severity, pre-existing availability defect: a bare
`->if(to: 'array')` gate with a null current model called `if-method.bindings()`, where the absent
`t.p.d` value reached `undefined.indexOf` and aborted the entire render. Every canonical component
used the established bare whole-model gate, so the new invalid-model matrix exposed the shared
owner defect even though unchanged schema-ui artifacts already had the same path.

The fix was handled failing-test-first:

1. `test/pipeline/if.test.js` proved the exact `undefined.indexOf` failure in the if-method owner.
2. `if-method.handle()` now enters compound-binding parsing only when the rule has a `d:`
   expression: `v.d.d === null && v.t.p.d !== undefined`.
3. `@jtorm/if-method` advances from 1.0.5 to 1.0.6 and documents omitted-`d` current-model behavior.
4. The canonical invalid-model matrix now proves null emits no component for all seven public entry
   shapes across the six families.

The focused opposite-model follow-up returned PASS with no findings after running both affected test
files (40/40). It confirmed the call-site guard is narrower than weakening `bindings()`, while real
`d:` expressions, `||`/`&&`, type checks, null-with-`d`, and `else` behavior retain their paths.

## Non-blocking observations

The architect noted that private button and alert base artifacts rely on their public wrappers for
the whole-model gate. This is intentional: mapper descriptors expose only the guarded wrappers, and
the source closure ratchet fixes the two private support edges. No change was requested.

The minimalist suggested an optional single-pass loading-label branch to avoid resolving localized
fallback copy before a caller label overwrites it. Current output and localization ownership are
correct and test-guarded; the optimization is not required for this semantic foundation and is
deferred until it can be evaluated independently without source-fingerprint churn.

## Direct-binding correction review

User review identified that same-key data-method projections did not isolate component data: the
verb merged those fields into the current model, and the component contract already names the
canonical fields. The correction therefore removed those projections and bound documented fields
directly from source, retaining only derived badge normalization, trusted variant literals, and the
accordion alias handoff needed to avoid caller mutation.

The private correction diff received two completed opposite-model lenses. The architect reported
one Medium source-ratchet gap and the minimalist independently reported the same completeness gap:
the first ratchet rejected only same-path copies and scanned only shell binding owners, so a renamed
copy such as `label: source.action.label`, a whole-model copy, or a copy in another canonical/support
artifact could evade it. A failing fixture proved both expression gaps. The ratchet now rejects any
pure member expression rooted at source and runs across the complete parsed closure, while focused
negative fixtures preserve derived expressions and non-source alias handoffs.

The correction skeptic invocation remained API-bound and ended with an execution error, so it is
recorded as partial coverage with no inferred verdict. Its absence is not presented as a clean
review; the repository's green CI and clean current-head Codex PR review remain mandatory gates.

## Confirmed claims

- All published mapper keys and four published button/anchor recipes remain unchanged.
- Fourteen canonical variants use dependency-free TSS and semantic html-ui leaves only.
- Caller-visible copy reaches escaped text sinks; card href reaches the existing unsafe-scheme guard.
- `t: '0'` plus explicit documented field reads prevents root and unknown-field leakage; later review removed identity projections because data-method merged rather than isolated them.
- Variant intent and alert role are trusted wrapper literals, not caller authority.
- each-method visits canonical own enumerable in-range indices, preserves sparse order and scalar
  wrapping, and ignores inherited/named properties without mutating input.
- Native button/details/summary semantics, alert/status roles, loading behavior, neutral defaults,
  and ethical-use guidance match the documented ownership boundary.
- Package versions, mapper ID, deterministic TSS corpus, parser/oracle ratchets, and test goldens are
  aligned.

## Final decision

The initial three-lens review and focused null-fix follow-up are complete. Both completed correction
lenses' shared ratchet finding is fixed; their remaining observations are non-blocking. The
correction skeptic lens is explicitly incomplete, and current-head PR gates remain required before
the branch is mergeable.
