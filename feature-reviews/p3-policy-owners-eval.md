# P3 Explicit Policy Owners — Evaluation

**Branch:** `feature/p3-policy-owners`
**Base:** `dev` at `1b28afb`
**Started:** `2026-07-16T10:21:34Z`
**Completed:** `2026-07-16T11:37:52Z`
**Status:** COMPLETED
**Mode:** Pre-PR feature evaluation
**Delivery:** Local completion gates pass; ready PR, CI, and current-head Codex review remain

## Scope and Ownership

This evaluation covers only the selected P3 refactor: one injected owner each for bounded
render-context/state resolution, promise-cache/LRU mechanics, and shared CSS/JS asset lifecycle.
It does not include parser, sanitizer, tenant-policy, cache-TTL, effect-lifecycle, UI compiler, or
manifest graph-discovery changes.

| Surface | Ownership after the change |
|---|---|
| `@jtorm/render-context-model` | Bounded/cycle-safe root lookup and generic namespaced root-state attachment |
| `@jtorm/promise-cache-model` | Promise hit recency, in-flight dedupe, identity-safe rejection eviction, and bounded LRU |
| `@jtorm/asset-plugin-model` | CSS/JS root state, queue adoption, URL/policy/DOM lifecycle, dedupe, drain, and cleanup |
| Existing nine direct consumers | Published fields and compatibility facades plus domain-specific key/load/parser/state behavior |
| Test composition host | Injects all three owners and restores the complete singleton graph between renders |

There is no endpoint, route, database, queue, worker, auth, payment, secret, or new external
service in the diff. Existing request and DOM trust boundaries are centralized without changing
their policy.

## Entry-Point and Data-Flow Traces

### Render context and state

Consumer `context()`/`root()` facade → injected render-context owner → view/context normalization →
at most 128 parent edges with cycle detection → terminal root or `null`. State consumers resolve
through their own public context facade, create the root namespace through a consumer factory or
plain object, alias it onto the current child, and retain singleton fallback for invalid contexts.

### Fetch and manifest promise caches

Consumer public key/cache-key → injected promise-cache owner → live consumer `c`/`max` → hit
recency and optional awaited manifest policy guard, or consumer loader → promise inserted before
reuse → identity-safe rejection deletion → LRU eviction. Data/HTML/TSS retain response/parsing
ownership; manifest retains acquisition tagging, digest/schema bounds, generation, supersession,
and atomic root-index installation.

### CSS/JS assets

CSS/JS method queues a full descriptor into render-root state → plugin `afterView()` delegates to
asset owner → legacy singleton queue adoption → source-order drain → alias expansion → document
base fallback when request base is absent → request normalization and awaited allow policy → DOM
element creation/attributes/head append → original-key dedupe. `finally` clears render-local cache
and collection after success, blocked policy, or insertion failure.

### Junction review

| Junction | Result |
|---|---|
| Null/missing context | Consumers retain prior `null` or singleton fallback; manifest rejects invalid context. |
| Async boundary | Cache hit guard, loaders, asset allow policy, DOM set callback, and source-order drains are awaited. |
| Check/use pairing | Asset URL normalization/policy immediately precedes DOM creation; manifest cache hits re-run policy. |
| Count/modify atomicity | Root traversal is local and bounded; cache rejection deletes only the same promise identity. |
| Cache/invalidation | Caller-owned stores and maxima remain live reset surfaces; newest entry survives degenerate maxima. |
| Missing DI | Fails loudly at the published facade instead of silently bypassing an owner. |
| Error cleanup | Cache failures remain retryable; asset state clears in `finally`; manifest supersession remains atomic. |
| Retained data | Only existing render-root namespaces and bounded singleton caches are used; owners retain no consumer data. |

## Review Results

### Architecture

PASS. Each owner is stateless and cohesive; request, manifest, parser, layer, UI-cache, and element
variant behavior remains in its domain package. Consumer public facades resolve through injected
owners, and runtime source still has zero imports. The only trust boundaries are pre-existing
host-created contexts, caller-owned caches/loaders, request URL policy, and DOM insertion.

Eight-question triage: inputs are render contexts, cache keys/loaders, and queued descriptors;
outputs are existing roots/states/promises/elements; no identity, secret, third-party service,
endpoint, database, queue, retained owner data, or log exists. The blast radius is every affected
render/fetch/asset path plus twelve coordinated packages. Failures stay within the current lookup,
promise, render, or plugin drain; rollout and rollback require a coordinated host package set.

### Refactor and consistency

PASS. A mechanical baseline comparison found no removed field or method in any existing singleton.
The nine consumer sources remove 370 lines while adding 81 facade/domain lines; the three owner
sources add 204 lines, a net runtime reduction of 85 lines. All owner methods have callers, every
source-touched package has the required version/dependency minimum, and no parser, sanitizer,
tenant/TTL, effect, or unrelated cleanup entered the diff.

### Security, defaults, and privacy

PASS. Context traversal is cycle-safe and capped at 128; cache rejection is identity-safe;
manifest hits re-run request policy; asset policy completes before element creation; and asset
state clears in `finally`. Defaults remain bounded and missing owner DI fails loudly. The full
differential report is `feature-reviews/p3-policy-owners-security-review.md`.

Privacy/GDPR/retention/erasure/consent/audit-log checks are N/A: no collection, identity, PII,
logging, persistence, export, consent, deletion workflow, or third-party transfer is added. Policy
owners retain no consumer data.

### Source-ratchet review

PASS after two valid tooling findings and one false positive. The initial text regex was replaced
with TypeScript AST; nested operation objects named `load` were excluded from method-shape counts;
and a red local-helper relocation fixture led to whole-file forbidden-primitive inspection. Direct,
computed, destructured, Reflect, sink, state-write, comment/string, and relocation families are
covered. The ignored convergence report/sentinel are present and the no-edit pass is 4/4.

### Accepted findings fixed

1. **Low — incomplete asset host reset:** newly wired method/request/resolver/plugin collaborators
   could remain poisoned by an earlier test. A 6/7 red became 7/7 after full graph restoration.
2. **Low — source-ratchet helper relocation:** duplicated cache mechanics could move behind a local
   helper while a facade retained an owner token. A 3/4 red became 4/4 with whole-file inspection.
3. **Low — impossible release order:** docs placed asset owner before its required request-model
   patch. The DAG now orders foundational owners, request, asset owner, then remaining consumers.

No unresolved finding remains.

## Reliability Matrix

| Flow | State transition | Failure/retry behavior | Evidence |
|---|---|---|---|
| Render root | input → bounded local Set → root/null | No shared mutation before state attach; invalid/cyclic/deep input uses existing fallback/rejection | Exact 128/129, malformed, cycle sentinels, root/child isolation |
| Promise miss | key → loader promise → caller Map → LRU | Sync throw leaves Map unchanged; rejection deletes only same identity; next call retries | Direct owner, three fetch-model, manifest race/LRU tests |
| Promise hit | Map hit → recency bump → optional guard → cached promise | Guard rejection does not destroy valid cached content; next context rechecks | Manifest policy-hit tests |
| Asset drain | adopt queue → resolve/allow → append/cache → finally clear | Denial occurs before DOM creation; insertion failure rejects; next render starts clean | CSS/JS denial, append failure, isolation, legacy adoption |
| Manifest install | descriptor set → pack promises → index → generation check | Failed/superseded work cannot replace prior atomic index | Existing invalid/later/supersession/conflict tests |

There is no durable write, queue acknowledgement, worker lease, cancellation token, or automated
recovery path. Deliberate source-order TSS/asset processing is unchanged; overlapping cache calls
dedupe by promise identity.

## Production Readiness

| Category | Status | Evidence |
|---|---|---|
| Data Scale | PASS | Parent work/Set capped at 128; cache maxima remain 32/512; average cache operations O(1); no DB/UI list. |
| Resilience | PASS | Errors propagate; rejected cache work retries; stale identity cannot evict fresh work; asset cleanup is unconditional. |
| Security Surface | PASS | Existing URL policy order and manifest guarded hits preserved; Semgrep clean; no third-party runtime code/import. |
| User Experience | PASS | Rendered DOM/attributes/order and all pipeline goldens remain unchanged; no visual or interaction contract change. |
| Observability | N/A | No service, metric, log, alert, or background operation is added; existing loud errors remain. |
| Production-Only Modes | PASS | SSR/live DOM, detached child contexts, interleaving, limits, retries, failures, and singleton reuse are exercised. |
| Deploy and Rollback | PASS | Twelve dry-runs pass; corrected release DAG and atomic host update/rollback pinning are documented; no migration. |

Release order:

1. `@jtorm/render-context-model@1.0.0` and `@jtorm/promise-cache-model@1.0.0`.
2. `@jtorm/request-model@1.1.4`.
3. `@jtorm/asset-plugin-model@1.0.0`.
4. Remaining manifest/layer/UI-cache/data/HTML/TSS/CSS/JS patches, with host DI updated as one set.

## Package Scorecard

| Package | Version | Result |
|---|---:|---|
| `@jtorm/render-context-model` | 1.0.0 | PASS — 3-file dry-run |
| `@jtorm/promise-cache-model` | 1.0.0 | PASS — 3-file dry-run |
| `@jtorm/request-model` | 1.1.4 | PASS — 3-file dry-run |
| `@jtorm/asset-plugin-model` | 1.0.0 | PASS — 3-file dry-run |
| `@jtorm/ui-manifest-model` | 1.0.1 | PASS — 3-file dry-run |
| `@jtorm/layer-model` | 1.0.2 | PASS — 3-file dry-run |
| `@jtorm/ui-cache-model` | 1.0.5 | PASS — 3-file dry-run |
| `@jtorm/data-model` | 1.0.5 | PASS — 3-file dry-run |
| `@jtorm/html-model` | 1.0.5 | PASS — 3-file dry-run |
| `@jtorm/tss-model` | 1.0.5 | PASS — 3-file dry-run |
| `@jtorm/css-plugin` | 1.0.5 | PASS — 3-file dry-run |
| `@jtorm/js-plugin` | 1.0.5 | PASS — 3-file dry-run |

## Verification

| Gate | Result |
|---|---|
| Structural red | 0/2 on baseline: owners/delegations missing and duplicate implementations present |
| Behavioral red | owner modules missing; old request cycle hit finite child-process deadline |
| Reset review red | 6/7 before complete asset graph restoration |
| Ratchet review red | 3/4 before whole-file helper-relocation detection |
| Architecture-focused suites | 90/90 pass |
| Exact `npm test` | 540/540 pass |
| `npm run typecheck` | PASS |
| Source ownership ratchet | 4/4 pass after no-edit reread |
| Runtime import/public-surface guards | PASS; zero removed existing singleton fields/methods |
| Semgrep | 83 rules / 12 changed runtime files / 0 findings |
| Tech-debt ratchet | PASS |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Full development audit | Pre-existing pinned lodash advisory; lockfile unchanged and affected APIs unused |
| Package publication dry-runs | 12/12 PASS; 3 intended files each |
| `git diff --check` | PASS |

## Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Three cohesive stateless owners; domain owners and DI boundaries remain separate. |
| Consistency | 10/10 | Nine facades preserve public surfaces and coordinated minima across twelve packages. |
| Type Safety | 10/10 | Canonical view/effect types unchanged; pure JS/JSDoc and scoped typecheck pass. |
| Validation | 10/10 | Context limits, request policy, manifest bounds, and consumer key/load validation remain owned and tested. |
| Error Handling | 10/10 | Invalid context semantics preserved; retry/identity/finally/supersession behavior is explicit and green. |
| Security/Privacy | 10/10 | Availability bounds and URL/cache controls centralize without new data retention or sinks. |
| Performance | 10/10 | Bounded O(depth), average O(1) cache, unchanged sequencing/I/O, and net runtime reduction. |
| Maintainability | 10/10 | One owner per repeated policy, whole-file source ratchet, no hidden registry or unrelated work. |
| Testability | 10/10 | Baseline reds, three review reds, focused/full/static/package evidence, and singleton reset lock. |
| Readability | 10/10 | Private declarative profiles, terse facades, package docs, release DAG, and threat/reliability records. |
| **Total** | **100/100** | No accepted in-scope finding remains. |

## Review Limitations

- The `adversarial-review` skill hard-requires opposite-model Claude. Claude was explicitly
  unavailable, so this is recorded as partial; local skeptic, architect, and minimalist lenses
  were applied without claiming cross-model evidence.
- Four companion files linked by `differential-review` are absent from the installed ai-config
  checkout. Its primary history, trust-boundary, attack-scenario, blast-radius, and report workflow
  was applied directly.
- External production host composition is outside this repository. Package minima/docs, the local
  host harness, publication dry-runs, CI, and current-head Codex review are the available gates.

## Documentation

Updated root and package READMEs, the selected architecture review/backlog, the feature record,
differential security report, completion evaluation, tests, and review ledger. No `docs/features/`,
API, database, frontend action, or separate migration/ADR surface applies to this repository/task.
