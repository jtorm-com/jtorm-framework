# Explicit Returned View Effects — Evaluation

**Branch:** `feature/explicit-view-effects`
**Base:** `dev` at `4bfab8f`
**Started:** `2026-07-16T06:58:27Z`
**Completed:** `2026-07-16T08:39:25Z`
**Status:** COMPLETED
**Mode:** Pre-PR feature evaluation

## Scope and Ownership

This evaluation covers the selected P2 task only: replacing mutable `v.io`
control flow with returned method effects and making dispatch lifecycle policy a
single invariant. It does not include the P3 DRY work, parser replacement, or
error-handler changes.

| Surface | Ownership after the change |
|---|---|
| `@jtorm/handler` | Registry/alias resolution, prepared/default data, validation, events, effect normalization, bounded repeat |
| `@jtorm/view-model` | Render view/context creation and copying; no method control state |
| `@jtorm/types` | Canonical `MethodEffect`, normalized `ViewEffect`, retained `ViewIO`, and `ViewModel` JSDoc |
| 23 method packages | DOM/domain behavior plus partial returned effect intents |
| `@jtorm/ui-compiler-model` | Descriptor compilation; conditional methods execute through injected dispatch |
| Test composition host | Injects the one handler owner into attrs/each/move/compiler |

There is no endpoint, database, queue, worker, external request, secret, auth,
payment, persistence, CSS, or user-interaction surface in the diff.

## Entry-Point and Data-Flow Traces

### Normal and aliased TSS nodes

Parsed `{s,m,p,c}` node → `handler.handle()` lexical scope →
`handler.dispatch()` own registry key or alias → custom/default data → validate
→ before event → conditional method → after event → strict normalized effect →
bounded repeat or child recursion. Unknown truthy names reject before recursion;
selector-only nodes pass through.

### Synthesized attrs/each/move nodes

Owning method builds a complete leaf node and copies the current view → passes
the prepared JavaScript value to injected `handler.dispatch()` → selected
method's custom data normalization (when present), validation, gates, aliases,
events, and errors run exactly as for a parsed node → caller consumes only the
complete normalized effect. No registered handle is called directly.

### UI compiler conditional methods

Trusted mapper descriptor `di.m` → compiler clones the view and builds one
complete node per existing first-match behavior → dispatch with prepared data →
normalized `children` result includes/excludes the artifact or root component.
Both artifact and canonical root `di` shapes use this path.

### UI explicit repeat

UI data hook normalizes parsed or prepared values → UI method resolves and
compiles a replacement node → returns `repeat:true` → dispatch re-resolves the
new `v.t`, repeats the full data/validate/event/method lifecycle, then returns
the replacement method's final non-repeat effect. A 100th repeat request rejects.

### Policy-only mediatarget bootstrap

Mediatarget initialization asks `mediaqueryMethod.process(q)` for a pure match;
it does not pretend to execute a render verb and therefore emits no method
events. The actual mediatarget verb still runs through handler dispatch.

### Junction review

| Junction | Result |
|---|---|
| Null/void result | Missing, null, primitive, inherited, or malformed control data uses safe handler defaults; no stale state exists. |
| Async boundary | Custom data, validate, events, method handles, repeat iterations, and child recursion are awaited. |
| Check/use pairing | Method resolution is repeated after a node rewrite; validation precedes each handle execution. |
| Token/identity path | N/A; no authentication or authorization token exists. |
| Count/modify atomicity | Repeat count is dispatch-local, increments after each complete lifecycle, and throws at 100. |
| Cache/invalidation | No cache is added or changed; existing parsed-node and UI caches remain with their owners. |
| Environment bypass | None; no environment branch or deployment-only override exists. |
| Missing/deleted state | Unknown methods reject; gate misses close; non-gate misses preserve pass-through; selector-only nodes recurse. |
| Error cleanup | Errors propagate through the existing lexical `finally`, restoring `v.c.s`, `v.c.a`, and the original context reference. |

## Review Results

### Architecture

PASS. Deep lifecycle ownership remains in `@jtorm/handler`; traversal/scope stays
in `handle()`, and effect normalization/dispatch stays in one small internal
seam. UI resolution and compilation remain separate injected models. Runtime
source remains pure CommonJS with zero imports, and every package/export remains
present. The compatibility `ui-method.methods` forwarding surface remains by
design even though execution no longer uses it directly.

Eight-question triage: the only trust boundary is the host-injected method's
returned structure; inputs are parsed/synthesized nodes and prepared method
data; no secrets, new third-party runtime dependency, endpoint, retained data,
or log exists. Blast radius is every render plus 27 coordinated packages;
faults reject the current render after scope cleanup, repeat is bounded, and
rollback pins the prior package set.

### Refactor and consistency

PASS. Every former writer maps mechanically to its prior child/repeat/data
intent, all 23 packages use the shared editor annotation, and no mixed `v.io`
reader/writer remains. attrs, each, move, and compiler use dispatch; mediatarget
uses only the pure media helper. Obsolete attrs/each/move direct collaborator
wiring was removed, while required published compatibility state was retained.
No P3 cleanup, parser work, speculative abstraction, placeholder, suppression,
skipped test, debug output, or runtime dependency was added.

### Security, defaults, and privacy

PASS. Missing controls cannot repeat; only own boolean controls are honored;
gates default closed; explicit repeat is bounded; own registry checks and loud
unknown errors remain; synthesized paths cannot skip validation/events. The
differential report is
`feature-reviews/explicit-returned-view-effects-security-review.md`.

Privacy/GDPR/retention/erasure/consent/audit-log checks are N/A: the same model
values move transiently into child recursion, with no new collection, storage,
logging, export, identity, or third-party transfer.

### Source-ratchet review

PASS after three tooling findings: quoted `"io"` object properties were added
to the rejected family, an unrelated object method named `require` was added as
a safe negative, and first-head Codex review found the source walker included
package-local `node_modules`. The dependency-tree case failed first; the walker
now skips that directory before classification. The TypeScript-AST helper still
distinguishes code from comments/strings and locks registry-handle ownership
plus real synthesized dispatch calls. The required convergence report/sentinel
are present under ignored `tmp/`; the ratchet passes 6/6.

### Accepted findings fixed

1. **Medium — malformed/inherited effect controls:** truthy coercion could open
   a buggy gate or turn `repeat:"false"` into 100 executions. A focused test
   failed first, then strict own-boolean normalization made it green.
2. **Medium — unstable effect accessor:** the first strict normalizer read a
   getter for its type and value separately, allowing a boolean check followed
   by a truthy non-boolean result. A focused test failed first, then single-read
   field snapshots made it green.
3. **Low — source guard quoted-key bypass:** a quoted `io` object key escaped the
   first AST rule. A red fixture was added before the grouped fix.
4. **Low — source guard false positive:** a harmless object method named
   `require` was blocked. A safe-negative fixture failed first, then property
   definitions were excluded without permitting loader aliases/access.
5. **P2 — package-local dependency traversal:** first-head Codex review found
   that a package-local `node_modules` would be scanned as project source. A
   temporary dependency-tree regression failed first, then directory traversal
   excluded `node_modules` while retaining nested own source.

No unresolved finding remains.

## Production Readiness

| Category | Status | Evidence |
|---|---|---|
| Data Scale | PASS | Normal dispatch is constant work except existing linear alias lookup; no I/O/cache; repeat is capped at 100. |
| Resilience | PASS | All lifecycle promises are awaited; errors reject loudly; lexical scope restores in `finally`; no retry/queue/provider path. |
| Security Surface | PASS | Strict fail-closed defaults, bounded repeat, own registry/effect fields, zero new sinks/imports; Semgrep clean. |
| User Experience | PASS | No visual/interaction contract changes; full live/detached rendering goldens pass. |
| Observability | PASS | Existing before/after event stream now includes synthesized executions; limit/unknown errors name the method. |
| Production-Only Failure Modes | PASS | SSR/SPA, detached/live DOM, UI/get scope, singleton reuse, throws, aliases, and package declarations are exercised. |
| Deploy and Rollback | PASS | 27 patch releases dry-run clean; dependency DAG/minima documented; no schema/infra/config migration; rollback pins prior versions. |

This is intentionally a lockstep release. Do not publish or upgrade
`@jtorm/view-model` alone: older published caret ranges can admit newer patches,
while an old handler expects `v.io`. A future release must publish in the order
below and update the host's complete lockfile/package set as one operation. This
condition follows the maintainer's explicit all-at-once/no-compat-shim task;
nothing is published by this PR.

Release DAG:

1. `@jtorm/types@1.1.1`
2. `@jtorm/view-model@1.0.4`
3. `@jtorm/handler@1.0.6`
4. leaf methods plus `@jtorm/ui-compiler-model@1.0.1`
5. `@jtorm/attrs-method@1.0.3` after attr, and
   `@jtorm/mediatarget-method@1.0.3` after mediaquery
6. `@jtorm/ui-method@1.0.4` after compiler and mediatarget

## Package Scorecard

All rows are fixed/ready and were reverified against current source; none was
published.

| Package | Version | Status | Finding/Fix status |
|---|---:|---|---|
| `@jtorm/types` | 1.1.1 | PASS | Canonical generated contract; dry-run clean |
| `@jtorm/view-model` | 1.0.4 | PASS | Removed mutable control state; dry-run clean |
| `@jtorm/handler` | 1.0.6 | PASS | Unified strict dispatch; dry-run clean |
| `@jtorm/attr-method` | 1.0.5 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/attrs-method` | 1.0.3 | PASS | Dispatch synthesis/minima; dry-run clean |
| `@jtorm/config-method` | 1.0.4 | PASS | Gate/data effect; dry-run clean |
| `@jtorm/css-method` | 1.0.3 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/data-method` | 1.0.3 | PASS | Data-only effect/minima; dry-run clean |
| `@jtorm/each-method` | 1.0.4 | PASS | Dispatch synthesis/minima; dry-run clean |
| `@jtorm/find-method` | 1.0.2 | PASS | Scope effect/minima; dry-run clean |
| `@jtorm/get-method` | 1.1.1 | PASS | Child data effect/minima; dry-run clean |
| `@jtorm/if-method` | 1.0.5 | PASS | Explicit no-children effect/minima; dry-run clean |
| `@jtorm/insert-method` | 1.0.6 | PASS | Dynamic child effect/minima; dry-run clean |
| `@jtorm/js-method` | 1.0.4 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/layer-method` | 1.0.2 | PASS | Deferred no-children effect/minima; dry-run clean |
| `@jtorm/mediaquery-method` | 1.0.3 | PASS | Gate effect/minima; dry-run clean |
| `@jtorm/mediatarget-method` | 1.0.3 | PASS | Pure query helper plus gate effect; dry-run clean |
| `@jtorm/move-method` | 1.0.2 | PASS | Dispatch synthesis/minima; dry-run clean |
| `@jtorm/remove-method` | 1.0.2 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/swap-method` | 1.0.3 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/text-method` | 1.0.4 | PASS | Child data effect/minima; dry-run clean |
| `@jtorm/time-method` | 1.0.3 | PASS | Child data effect/minima; dry-run clean |
| `@jtorm/title-method` | 1.0.2 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/ui-method` | 1.0.4 | PASS | Prepared data/repeat effect/minima; dry-run clean |
| `@jtorm/unwrap-method` | 1.0.3 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/wrap-method` | 1.0.5 | PASS | Effect return/minima; dry-run clean |
| `@jtorm/ui-compiler-model` | 1.0.1 | PASS | Injected dispatch/minima; dry-run clean |

## Verification

| Gate | Result |
|---|---|
| Original red regression | FAIL on base: second invocation threw finite sentinel `would repeat forever` |
| Review red regression | FAIL before strict normalization: `Method malformed repeat limit exceeded` |
| Final-review red regression | FAIL before single-read snapshots: normalized `children: 'open'` |
| Focused handler/method/compiler/type/source suites | 54/54 pass |
| Exact `npm test` from AGENTS.md | 515/515 pass |
| `npm run typecheck` | PASS |
| Source-contract ratchet | 6/6 pass |
| Runtime import guard | zero source imports |
| Mutable-control guard | zero runtime `io` tokens/fields |
| Handwritten TS/declaration guard | zero tracked files |
| Semgrep | 84 rules / 74 scoped files / 0 findings |
| Tech-debt ratchet | PASS after two ambiguous test-comment words were removed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Full development audit | pre-existing lodash 4.17.21 advisory; unchanged and affected APIs unused |
| Package publication dry-runs | 27/27 PASS, including generated `@jtorm/types` declaration |
| `git diff --check` | PASS |

## Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | One lifecycle owner; traversal/scope and UI model responsibilities remain separate and injected. |
| Consistency | 10/10 | All 23 methods migrated together with terse CommonJS singleton style and coordinated minima. |
| Type Safety | 10/10 | Canonical JSDoc/generation exposes effects, retains `ViewIO`, removes `ViewModel.io`, and typecheck passes. |
| Validation | 10/10 | Normal, alias, prepared, repeated, and synthesized calls all run custom/default data then validate. |
| Error Handling | 10/10 | Unknown, repeat-limit, validation, zero-match, and callback errors remain loud through lexical cleanup. |
| Security/Privacy | 10/10 | Strict fail-closed normalization, bounded availability risk, no PII/state/sink/import expansion. |
| Performance | 10/10 | Bounded local allocations/work, unchanged alias complexity, no new I/O/cache, explicit 100-execution ceiling. |
| Maintainability | 10/10 | Side channel deleted, one dispatch seam, source ownership ratchet, no mixed contract or unrelated cleanup. |
| Testability | 10/10 | Three runtime red/green regressions plus lifecycle/gate/repeat/scope/compiler/type/golden and package evidence. |
| Readability | 10/10 | Decoder ring, method editor annotations, package docs, architecture review, and effect names expose the contract. |
| **Total** | **100/100** | No accepted in-scope finding remains. |

## Review Limitations

- The `adversarial-review` skill requires opposite-model Claude execution by a
  hard rule. Claude was explicitly unavailable, so that gate is recorded as
  unavailable rather than passed; Codex performed local skeptic, architect, and
  minimalist lenses as directed.
- The differential-review skill's four linked methodology/report references are
  absent from the installed ai-config checkout; the primary workflow and report
  requirements were applied directly.
- `batch-simulator` is not available in this Codex session. Fresh focused/full
  execution, package dry-runs, and the eventual current-head PR Codex review are
  the available independent gates.
- First-head Codex review supplied one valid source-walker finding, reproduced
  and fixed red-first. A new current-head review remains required after the
  follow-up commit.

## Documentation

Updated the root and package READMEs, canonical `AGENTS.md` lock, `@jtorm/types`
decoder ring, selected architecture review/backlog, development record,
differential security report, tests, and this completion evaluation. There is no
`docs/features/`, API, frontend-action, or separate STRIDE directory in this
repository; the version-controlled threat model lives in the feature record.
