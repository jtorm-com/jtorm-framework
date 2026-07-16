# P3 Error-Handler Debug Dump — Differential Security Review

**Branch:** `feature/p3-error-handler-debug`
**Base:** `dev` at `c422140`
**Reviewed:** 2026-07-16
**Status:** APPROVED — no unresolved finding
**Risk:** Medium review depth (new mutable public security policy and sensitive log sink); small runtime diff

## Scope and Strategy

This review covers the working-tree diff for the P3 error-handler privacy item, with deep analysis of the runtime owner, its six call sites, the full-pipeline reset, package metadata/documentation, and behavior tests. The repository has more than 200 files, so the differential-review strategy is surgical around the changed security boundary and one-hop dependents rather than a full-codebase audit.

The change adds no authentication, authorization, database, queue, network, external service, cryptography, route, parser, HTML sink, dependency, or durable state. The security question is whether view data can reach process logs or expensive/side-effectful observation without an explicit host decision.

## Baseline and History

- The dump loop, `_`/`m`/falsy skips, `html`/`h`/`r` serialization, and `util.inspect(value, false, 10, true)` format date to commit `9585018` (2022-05-03).
- The terminal `throw new Error(message)` dates to `7ccd553` (2022-05-27).
- JSDoc typing/comments were added by `338af6e`/`344d933` in June 2026; they did not alter runtime behavior.
- The architecture review identified the unconditional view/HTML dump as potential PII disclosure and runtime dead weight. No security guard is removed by this diff; the new guard narrows the existing sink.

## Data Flow and Trust Boundary

```text
document-model / insert-method / ui-method (6 calls)
    → injected errorHandler.handle(message, view)
        → debug === true ? historical view dump to console : no view observation
        → finally throw new Error(message)
```

The host is the only actor authorized to mutate the exported `debug` policy. The package does not read an environment variable or coerce a configuration string. The transition to literal `true` is an explicit opt-in boundary; the process console/log collector remains host-owned.

## Blast Radius

| Dimension | Result |
|---|---|
| Runtime call sites | 6: one in `document-model`, two in `insert-method`, three in `ui-method` |
| Published direct dependents | `@jtorm/document-model`, `@jtorm/insert-method`, `@jtorm/ui-method` declare the injected package |
| Default-path change | Removes enumeration, property access, serialization, inspection, and logging; preserves the thrown Error/message |
| Debug-path change | Successful dump content/order remains byte-for-call compatible; dump failures can no longer replace the primary error |
| Persistence/network | None |
| Failure boundary | Current synchronous render/error call; existing caller cleanup and rejection continue |
| Rollback | Pin/revert `@jtorm/error-handler` from `1.0.2` to `1.0.1`; no schema/data state |

## Adversarial Scenarios

### 1. Attacker-controlled getter on the view

**Witness:** an enumerable `secret` getter increments a counter and returns an email-shaped value.

**Attempt:** trigger `handle()` while debug is at its module default and while `util` is absent.

**Result:** blocked. `debug === true` is evaluated before `for…in`; proxy enumeration and the getter remain untouched, no log call occurs, and `Error(message)` is thrown. Covered by `test/handlers/error-handler.test.js`.

### 2. Configuration string accidentally enables disclosure

**Witness:** set `debug` to `"true"`, `1`, or an object and make view enumeration throw.

**Result:** blocked. Strict boolean comparison keeps all non-boolean values on the quiet path. This avoids the common environment-string mistake where `"false"` is truthy. Covered by the strict-opt-in unit test.

### 3. Enabled singleton leaks across renders

**Witness:** poison the shared handler with `debug = true`, perform a render, repeat.

**Result:** blocked in the repository host. `test/helpers/engine.js::reset()` restores `false` before each render; two consecutive poisoned renders both end false. External hosts own equivalent reset/request configuration and the README states that responsibility.

### 4. Debug inspector/getter fails before the primary throw

**Witness:** enable debug and inject an inspector that throws `inspect failed`.

**Baseline after initial implementation:** reproduced; the diagnostic exception replaced `Error(message)`.

**Fix:** the dump runs inside `try` and the primary `new Error(message)` is thrown from `finally`. Successful format is unchanged; partial/failing diagnostics cannot alter the loud framework error. Red-first regression now passes.

### 5. Quieting diagnostics also quiets drift detection

**Witness:** zero-match `attr`, `insert`, `move`, `swap`, and `remove`, plus sanitizer-before-target edge cases.

**Result:** blocked. All cases still reject with their existing `not found`/raw-text messages. Suppression wrappers were removed and the final focused 84-test run passes.

### 6. Deliberate debug enablement logs PII

**Result:** accepted residual risk, not a bypass. Literal `debug = true` intentionally preserves the historical raw diagnostic output, which can include PII and complete document HTML. The package README warns hosts to use protected temporary diagnostics and reset the singleton. Redaction/reformatting would violate the selected compatibility scope.

## Findings

| ID | Severity | Status | Evidence | Resolution |
|---|---:|---|---|---|
| ERR-ROBUST-01 | Low | Fixed | Enabled `util.inspect` failure replaced the required primary error | Added red regression and unconditional `finally` throw |

No CWE-532/OWASP information-disclosure finding remains on the default path. No unconfirmed hypothesis is reported as a vulnerability.

## Control Mapping

| Control | Result | Evidence |
|---|---|---|
| CWE-532 / OWASP logging minimization | PASS | Default false and zero view/log observation |
| GDPR Art. 25 privacy by default | PASS | Necessary-only default processing; diagnostics require explicit host action |
| CWE-1188 insecure default | PASS | Literal-false default; non-boolean truthy values fail closed |
| CWE-400 resource consumption | PASS | Default path no longer walks or deeply inspects arbitrary view graphs |
| Error integrity / loud drift contract | PASS | `new Error(message)` from `finally`; full zero-match regression |
| Runtime dependency policy | PASS | No import or package dependency added; `util` stays DI and debug-only |

## Test Coverage

- Default field value.
- No enumeration, getter read, logging, or `util` requirement when disabled.
- Strict literal-boolean opt-in.
- Exact headers, blank lines, skips, HTML serialization, inspector arguments, and thrown message when enabled.
- Inspector-failure preservation of the primary error.
- Two-render singleton reset.
- Existing zero-match and sanitizer-order pipeline behavior.

## Limitations

- The differential-review skill references `methodology.md`, `adversarial.md`, `reporting.md`, and `patterns.md`, but those companion files are absent from the installed ai-config checkout. The primary history, changed-file, blast-radius, test, source-to-sink, adversarial-scenario, and report requirements were applied directly; absent references are not claimed as loaded.
- External production host bootstraps are outside this repository. The package API/README and local production-shaped harness are the available reset evidence.
- Deliberately enabled debug output is not redacted by design; hosts must protect the resulting logs.

## Verdict

APPROVED. The default path is fail-closed, constant-time with respect to view size, and has no PII observation or log sink. Explicit debug retains the historical diagnostics, render isolation is tested, and the primary loud error remains invariant even if diagnostics fail.
