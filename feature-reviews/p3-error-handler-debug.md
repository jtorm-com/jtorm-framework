# Feature Development: P3 Error-Handler Debug Dump

**Status:** READY_PR — leave unmerged
**Claimed:** 2026-07-16T18:13:35Z
**Agent:** Codex
**Current Mode:** Delivery — commit and ready PR next
**Branch:** `feature/p3-error-handler-debug`
**Base:** `dev` at `c422140`
**PR:** #53 into `dev` (ready, unmerged)

---

## Resumption Context

**Last Completed Mode:** Delivery — implementation head green and clean
**Current Mode:** Delivery
**Next Action:** Commit this completion record and revalidate its record-only head before handoff; maintainer owns merge.
**Files Created:**
- `feature-reviews/p3-error-handler-debug.md` — research, specification, threat model, and checkpoints.
- `feature-reviews/p3-error-handler-debug-eval.md` — completion-evidence scaffold.
**Files Modified:** Error-handler runtime/README/package, pipeline harness/wiring and suppression-only tests, architecture backlog, and evaluation record.
**Tests Written:** Five error-handler contract tests plus one repeated-render isolation test; the baseline passed 8/12 with four expected red failures, the inspector-failure self-review test then failed 4/5 as expected, and the final focused suite passes 84/84.
**Issues Found (not yet fixed):** None. One low robustness finding was fixed red-first: a debug inspector failure could replace the required primary error.
**Design Decisions Made:**
- Only `debug === true` enables the dump; false, missing, and truthy non-boolean values stay quiet.
- The normal branch reaches `throw new Error(message)` without enumerating or reading `view`, logging, serializing, or dereferencing the injected `util` collaborator.
- The enabled branch retains the existing field iteration, skip conditions, `html()` special cases, `util.inspect` arguments, blank lines, and header format.
- The full-pipeline harness restores `debug = false` before every render to enforce singleton isolation.

**Context for Next Session:**
The clean feature branch was created directly from current `dev`. Research and the security-scoped plan gate are complete. The authorized implementation is intentionally one runtime flag/guard plus test-harness reset, red-first tests, obsolete pipeline suppression removal, a package patch bump, and records. The parser rewrite is explicitly excluded.

---

## Progress Log

### Research Mode
- [x] Read repository `AGENTS.md`.
- [x] Read the selected P3 item in `feature-reviews/framework-architecture-review-2026-07-14.md`.
- [x] Mapped runtime behavior, DI, package metadata, test harness resets, pipeline suppressions, prior feature/evaluation records, and review ledger conventions.

### Plan Quality Gate
- [x] Scope classified (`SECURITY`; no DB, frontend, routing, infrastructure, or payments).
- [x] Security/privacy plan and all six STRIDE categories reviewed.
- [x] Required spec sections completed with concrete answers.
- [x] All 10 dimensions pass at plan level.
- [x] Spec self-review passed; the task authorization explicitly directs immediate implementation without another approval pause.

### Implement Mode
- [x] Red tests written and observed failing for the missing safe default/reset behavior (8 pass, 4 expected fail).
- [x] Runtime debug flag implemented.
- [x] Singleton resets and obsolete pipeline suppressions updated.
- [x] Version and package/feature/backlog records updated; final PR/ledger details remain after review.

### Test Mode
- [x] Focused tests passing (84/84).
- [x] Exact `npm test` passing (546/546).
- [x] `npm run typecheck` passing.
- [x] Package dry-run passing (3 intended files, 1,471-byte tarball).
- [x] Source guards passing (10/10 plus pure-JS/import/parser checks).
- [x] `git diff --check` passing.

### Review Mode
- [x] Differential security review.
- [x] Privacy review.
- [x] Insecure-defaults review.
- [x] Refactor review.
- [x] Tech-debt ratchet.
- [x] Production-readiness review.
- [x] 100/100 feature evaluation and fresh verification.

### Delivery Mode
- [x] Commit and push task-specific changes.
- [x] Ready PR #53 opened into `dev`.
- [x] CI green on implementation head `644728f`.
- [x] Codex found no major issue on implementation head `644728f`; completion-record head will be re-requested before handoff.
- [x] PR left open and unmerged.

---

## Research Summary

### Current flow

`document-model.set()` and a few methods call the injected `jTormErrorHandler.handle(message, v)` on loud failures. The handler currently iterates every enumerable populated field on `v`, skips `_` and `m`, prints `html()` for `html`/`h`/`r`, prints other values through injected `util.inspect(value, false, 10, true)`, then throws `new Error(message)`. Thus a zero-match drift error can copy resolved data and full document HTML into process logs before rejecting.

### Existing patterns

- The package exports one mutable CommonJS singleton and has no runtime imports.
- `util` is host-injected; the repository's full-pipeline harness injects Node's `util` once.
- `test/helpers/engine.js::reset()` restores mutable singleton state before each `render()` but does not yet know about `debug`.
- Five pipeline files temporarily replace `console.log` only to hide the current pre-throw dump: `attr`, `insert`, `escaping`, `sanitize`, and `zero-match`.
- There is no direct error-handler unit suite, so the dump format, disabled-path non-observation, and mutable-state reset are not pinned.

### Constraints discovered

- `new Error(message)` and the loud zero-match drift detector are locked behavior.
- Runtime `src/` must remain pure JavaScript/CommonJS, dependency-free, and free of `require()` calls; `util` remains DI.
- Existing exports cannot be removed. Adding a mutable field is compatible; changing the dump's enabled format is not required.
- Singleton tests and render harnesses must restore mutable fields they touch.
- `@jtorm/error-handler` is the only published runtime package changed and therefore receives the required patch bump from `1.0.1` to `1.0.2`.
- The parser rewrite is the following independent P3 item and must not be touched.

### Open questions resolved by the request

There are no unresolved product questions. The user selected opt-in behavior, a false default, unchanged throws, closest-possible debug compatibility, explicit reset discipline, exact verification gates, and ready-PR delivery.

---

# Feature Spec: Opt-in Error-Handler Diagnostic Dump

**Date:** 2026-07-16
**Author:** Codex
**Status:** Approved by task authorization after self-review

## Problem Statement

jTorm hosts currently receive an unconditional diagnostic dump whenever the centralized error handler rejects a render. A drifted selector can therefore enumerate resolved view data, invoke getter-backed fields, serialize the document, require the injected inspector, and write potential PII to SSR logs even when an operator only needs the error. Normal production failure handling must remain loud while becoming observationally quiet and dependency-free unless a host deliberately opts into diagnostics.

## Scope

### In Scope

- Add a public mutable `debug` boolean field to `jTormErrorHandler`, initialized to `false`.
- Enable diagnostics only when `debug === true`.
- Preserve the existing enabled dump's iteration, skips, special HTML serialization, inspect arguments, log calls, and ordering.
- Preserve the exact `throw new Error(message)` contract in normal and debug operation.
- Reset `debug` to `false` in the full-pipeline harness before every render.
- Add red-first unit, isolation, and pipeline regression coverage.
- Remove pipeline `console.log` suppression whose only purpose was hiding the unconditional dump.
- Patch-bump and document `@jtorm/error-handler`; update feature/evaluation, security review, ledger, and architecture backlog records.

### Out of Scope (Non-Goals)

- Parser/tokenizer work, parser diagnostics, or any TSS grammar change.
- Changing selector resolution, transform semantics, error messages, zero-match timing, or the loud drift policy.
- Redacting, truncating, restructuring, or replacing the opt-in debug dump.
- Adding a logger abstraction, runtime import, config package, environment read, constructor, or compatibility shim.
- Changing the separate `@jtorm/debug-plugin`.
- Publishing packages, merging the PR, or changing downstream host composition.

## Requirements

### Functional Requirements

1. `jTormErrorHandler.debug` is present and `false` on module load.
2. `handle(message, view)` throws a newly constructed `Error` whose message is exactly `message`.
3. Unless `debug` is the literal boolean `true`, `handle()` performs no `console.log`, enumeration, property read, getter call, HTML serialization, or `util` access involving `view`.
4. When `debug === true`, populated fields are dumped in the same format and with the same `_`/`m`/falsy skip behavior as the current implementation.
5. Every pipeline render resets the shared handler's mutable debug flag to `false` before framework execution.
6. Zero-match transforms continue to reject with their existing `not found` errors.

### Non-Functional Requirements

- **Security/privacy:** production-safe default; no PII observation or log sink on the disabled path; non-boolean truthy configuration fails closed.
- **Performance:** disabled handling is a constant-time flag check plus error construction, with no work proportional to view size.
- **Compatibility:** no removed export, changed message, changed Error class, changed enabled dump format, new runtime dependency, or new package.
- **Testability:** tests observe public behavior with traps/spies and reset singleton mutation after use.
- **Style:** pure terse JavaScript/CommonJS matching the package; no handwritten TypeScript or declaration file.

## Affected Components

| Component | Change Type | Risk |
|---|---|---:|
| `src/handlers/error-handler/src/error-handler.js` | Add false-default field and strict opt-in guard | Medium — centralized failure path and privacy boundary |
| `src/handlers/error-handler/package.json` | Patch version `1.0.1` → `1.0.2` | Low |
| `src/handlers/error-handler/README.md` | Document default, opt-in, DI, PII warning, and reset | Low |
| `test/handlers/error-handler.test.js` | New public-contract tests | Low |
| `test/helpers/engine.js` | Reset mutable debug state per render | Medium — shared test host composition |
| `test/pipeline/{attr,insert,escaping,sanitize,zero-match}.test.js` | Remove obsolete suppression; retain loud assertions | Low |
| `test/pipeline/wiring.test.js` | Lock reset behavior | Low |
| `feature-reviews/*`, `.claude-tasks/agent-outcomes.jsonl` | Specification, evaluation, security, backlog, and gate evidence | Low |

## Dependencies

- **Runtime:** none added. Existing `util` remains host-injected and is needed only for enabled non-HTML dumps.
- **Test:** Node `node:test`, `assert`, and the existing local pipeline harness.
- **Blocks:** no code item; completion leaves the parser replacement as the next larger P3 task.
- **Critical path:** spec → red tests → runtime/reset green → docs/version → review gates → ready PR → CI → current-head Codex review.

## Public API Contract

```js
jTormErrorHandler.debug = false; // mutable; only true enables diagnostics
jTormErrorHandler.handle(message, view); // always throws new Error(message)
```

No method signature or export name changes. `view` remains accepted for debug diagnostics but is an unobserved argument when debug is disabled. A host that sets `debug = true` must continue injecting a compatible `util.inspect` collaborator for non-HTML fields.

## Security Assessment and Threat Model

### Data-flow diagram

```text
trusted framework failure message ─┐
                                   ├─> error-handler ── debug === true ─> view dump ─> process console
render view (may contain PII/HTML) ─┘               └─ otherwise ───────> no view observation
                                                        both paths ─────> new Error(message)
```

The host-controlled transition from `debug=false` to `debug=true` is the only policy boundary. No new network, identity, persistence, endpoint, queue, database, or third-party boundary is added.

### Assets and actors

| Item | Classification / capability |
|---|---|
| Resolved view data and document HTML | Confidential or restricted depending on host data; may contain PII |
| Failure message | Internal diagnostic; unchanged by this feature |
| Process console/log aggregation | Host-owned external sink relative to the package |
| Framework author | Can trigger ordinary drift failures through TSS |
| Host operator/developer | Can deliberately enable debug and provision protected diagnostic logs |
| Attacker controlling rendered data | May place secrets/PII in view fields and induce inputs that reach an existing failure path |

### STRIDE

| Category | Status | Control / evidence planned |
|---|---|---|
| Spoofing | N/A | No identity or authentication decision is added or changed. |
| Tampering | Controlled | Only the live exported singleton flag changes policy; strict `=== true` rejects accidental truthy strings/numbers, and harness reset prevents cross-render mutation carryover. |
| Repudiation | N/A | No durable audit event or security decision is introduced; debug activation is host configuration. README makes host ownership explicit. |
| Information Disclosure | Mitigated | False default branches before all view observation and logging; proxy/getter and log-spy tests prove it. Debug disclosure remains explicit host opt-in and is documented as potentially containing PII. |
| Denial of Service | Improved | Default failures no longer enumerate arbitrary views, invoke getters, serialize documents, or deeply inspect values. Opt-in mode deliberately retains historical cost. |
| Elevation of Privilege | N/A | The flag grants no framework authority and adds no callable capability beyond diagnostics already present. |

### Attack tree

```text
Expose sensitive view data through this handler
OR
├── default failure dumps the view          → blocked by debug === true guard
├── stale enabled singleton reaches render  → blocked by render reset + isolation test
├── truthy string/number enables debug      → blocked by strict boolean check
└── operator explicitly enables debug       → accepted host-owned residual risk; README warning
```

The related possibility that a caller embeds sensitive content directly in `message` is unchanged and outside this dump-only item.

### Threat-model depth and residual risk

Full PASTA is not triggered: this change removes the default PII-to-log flow, adds no new trust boundary, and does not touch authentication, payments, queues, or storage. Residual risk is limited to a host deliberately setting `debug = true`, in which case the historical dump may contain PII and expensive getters; this is explicit, documented, reversible, and accepted by the task authorization.

## Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Public mutable `debug: false` field | Setter/config model/environment variable | Required API, minimal singleton surface, no import/config coupling, easy host reset. |
| Strict `debug === true` | General truthiness | Prevents common environment-string mistakes such as `"false"` from enabling a PII sink. |
| Guard the entire existing dump | Per-field redaction or lazy per-field checks | Disabled mode must not enumerate/read anything; enabled mode should remain compatible. |
| Preserve `console.log` and `util.inspect` in debug | Inject a logger/serializer | Logger redesign changes format and DI/public behavior beyond this P3 slice. |
| Harness resets false before each render | Let individual tests clean up only | The production-shaped singleton host must demonstrate cross-render isolation regardless of test order/failure. |
| Direct unit test plus pipeline regression | Pipeline-only coverage | Unit traps can prove non-observation precisely; pipeline tests preserve the locked zero-match integration contract. |

## Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Existing global `console`, optional injected `util`, and caller-provided view; no new dependency. |
| Direct dependents | `document-model`, `insert-method`, and `ui-method` through their injected handler; full-pipeline host reset. |
| Cascade on outage | N/A: no service. Handler still throws locally; disabled diagnostics remove side effects. |
| Cascade on slow | Default path is constant-time; enabled view inspection can remain slow exactly as before and is host-controlled. |
| Cascade on bad data | Disabled view values/getters cannot propagate; enabled malformed debug fields can truncate the optional dump, but `finally` preserves the intended throw. |
| Compromised-session impact | N/A: no session or record access. Explicit debug may disclose whatever data the host put in the current view to its logs. |
| Fault isolation boundary | The synchronous `handle()` call/current render; `Error(message)` rejects the render through existing handler cleanup. |

## Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Revert the feature commit/PR; no state migration. |
| Schema rollback | N/A — no database or schema. |
| Data rollback | N/A — no durable data written. Logs created only under explicit debug are host-owned and cannot be recalled by this package. |
| Auto-rollback trigger | Before publication, CI/full-suite/Codex failure blocks delivery. After publication, any changed thrown message/type or missing debug dump warrants pin/revert to `1.0.1`. |
| Manual rollback runbook | Pin `@jtorm/error-handler@1.0.1` and restore the prior host lockfile; no coordinated package release is required. |
| Last rollback drill | Static rollback review in this feature; package is not published or deployed by this task. |

## Risk Assessment

| Priority | Risk | Likelihood | Impact | Owner | Mitigation |
|---:|---|---:|---:|---|---|
| 1 | Normal path accidentally reads/enumerates the view | Medium | High | Implementer | Branch before `for…in`; proxy traps for enumeration/property access; no injected util in default unit test. |
| 2 | Enabled debug output drifts from published behavior | Medium | Medium | Implementer | Exact log-array, `html()` and `util.inspect` argument characterization. |
| 3 | Mutable `debug=true` leaks across tests/renders | Medium | High | Test harness owner | Reset false at every render and test explicit poison/reset/re-render behavior. |
| 4 | Quieting logs accidentally quiets zero-match errors | Low | High | Handler/document-model owners | Retain unchanged `throw new Error(message)` and run focused plus complete zero-match pipeline tests. |
| 5 | Scope expands into parser/error redesign | Low | Medium | Maintainer | Explicit non-goal and changed-file review; no parser file touched. |

## Testing Strategy and Implementation Order

1. Add `test/handlers/error-handler.test.js` covering false default, no logging/view observation/util requirement, strict opt-in, exact enabled dump, and teardown reset.
2. Add a pipeline harness reset test and strengthen the zero-match regression; remove suppression-only wrappers from existing pipeline tests.
3. Run the focused tests on the untouched runtime and record failures caused by missing `debug=false` and missing reset.
4. Add the minimal runtime field/guard and harness reset; rerun focused tests green.
5. Patch-bump/update package docs and completion records without touching parser/runtime neighbors.
6. Run requested focused/full/type/package/source/diff gates, then scoped security/privacy/default/refactor/debt/readiness reviews and fix any finding red-first.
7. Publish only to a ready PR into `dev`; poll and iterate until CI and Codex are clean on the same current head; do not merge.

## Success Criteria

- [x] Module-load `debug` is exactly `false`; only literal `true` opts in.
- [x] Default `handle()` throws `Error(message)` with zero logs and zero view enumeration/property/getter/serialization access, without `util` injection.
- [x] Debug mode reproduces existing headers, blanks, skips, HTML calls, and inspect arguments.
- [x] Harness reset prevents enabled state leaking into later tests/renders.
- [x] Zero-match transforms remain loud with unchanged messages.
- [x] All suppression-only pipeline `console.log` replacements are removed.
- [x] `@jtorm/error-handler` is documented and versioned `1.0.2`.
- [x] Focused tests, exact full suite, typecheck, dry-run, source guards, review gates, and diff check pass.
- [x] Ready PR targets `dev`, implementation-head CI/Codex are clean, and the PR remains open/unmerged; the record-only head is revalidated before handoff.

## Plan Quality Gate and Self-Review

**Scope tags:** `SECURITY`
**Gate status:** PASSED
**Personas/checklists applied:** repository `AGENTS.md`; architect; planner; backend architect; code-review enforcer; security architect; threat-modeling enforcer; TDD guide; security threat-modeling, sensitive-data, injection, and applicable production/default checks. Generic Bun/Elysia/DomainError rules are N/A where they conflict with this repository's locked vanilla-JS raw-Error contract.
**Issues found and fixed in the spec:** 2 — changed a truthy opt-in to strict boolean `true`, and added host/harness reset ownership rather than relying only on unit teardown.
**STRIDE status:** Complete (6/6); no new trust boundary; PASTA not triggered.
**Approval:** The user's task explicitly authorizes implementation immediately after self-review, so no additional approval checkpoint applies.

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | One field/guard in the existing owner; DI/CommonJS/import-free package and loud drift boundary preserved. |
| Consistency | 10/10 | Mutable singleton field and harness reset follow repository patterns; enabled dump remains unchanged. |
| Type Safety | 10/10 | Pure JS/JSDoc remains; strict boolean activation is explicit; no handwritten TS/d.ts. |
| Validation | 10/10 | Only literal `true` activates the sensitive side effect; all other values fail closed. |
| Error Handling | 10/10 | Existing `new Error(message)` and zero-match propagation are acceptance-tested and unchanged. |
| Security/Privacy | 10/10 | Disabled path has no data observation/sink; threat model and residual opt-in risk are explicit. |
| Performance | 10/10 | Default work becomes O(1); historical opt-in diagnostic cost is preserved. |
| Maintainability | 10/10 | No abstraction/package/import added; parser and debug-plugin remain out of scope. |
| Testability | 10/10 | Unit traps, format characterization, singleton reset, and pipeline drift coverage define red/green evidence. |
| Readability | 10/10 | A strict guard around the existing compact loop makes the policy visible at the owner. |
| **Total** | **100/100** | Implementation-ready; no accepted plan finding remains. |
