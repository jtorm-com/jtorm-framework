# Request-triggered stale-while-revalidate — Evaluation

**Branch:** feat/request-triggered-swr
**Base:** dev at 9ee8cc850224041498282a893eca7451dde8364b
**Started:** 2026-07-18
**Status:** DELIVERING
**Current Phase:** PR review correction
**Delivery state:** Ready PR #65 is open. Initial head `5d79d5f6ac05ab35780cb17115fe1d2cbb62299c` passed CI; its current-head Codex review raised one valid SemVer P2. The coordinated `1.1.0` correction passes all local gates; corrected-head CI and a clean Codex review remain.
**Specification:** [request-triggered-stale-while-revalidate.md](request-triggered-stale-while-revalidate.md)
**Threat model:** [stride-request-triggered-stale-while-revalidate.md](stride-request-triggered-stale-while-revalidate.md)
**Security review:** [request-triggered-stale-while-revalidate-security-review.md](request-triggered-stale-while-revalidate-security-review.md)
**Differential review:** [request-triggered-stale-while-revalidate-differential-review.md](request-triggered-stale-while-revalidate-differential-review.md)
**Adversarial review:** [request-triggered-stale-while-revalidate-adversarial-review.md](request-triggered-stale-while-revalidate-adversarial-review.md)

## Scope and outcome

This change adds opt-in, request-triggered stale-while-revalidate to the four promise-backed acquisition caches: data, HTML, TSS, and UI-manifest packs. Every staleWindow defaults to zero, so upgraded hosts retain expire-and-wait behavior unless they deliberately enable a finite positive window.

The central promise-cache owner classifies absolute age, keeps the exact old public promise during the stale interval, owns at most one private refresh per retained generation, makes hard-bound callers join replacement work, and publishes only after successful fulfillment and exact current-generation checks. Manifest reuse additionally re-derives the captured cache key after its awaited URL-policy guard. Unscoped calls remain a direct-load bypass.

Rendered-fragment SWR, UI-cache persistence, HTTP validators, timers, retry frameworks, new telemetry APIs, and cancellation are excluded. An ordinary render can still derive and persist HTML from a stale acquisition; that downstream fragment has its existing independent age and invalidation owner.

## Specification-first and red-first evidence

The public field, strict age boundaries, invalid-policy behavior, promise identities, guarded transition table, generation checks, downstream retention, rollback, SemVer, and threat controls were locked before runtime edits. Independent explorer and architect reviews produced ten design findings; all were accepted into the specification.

The first runtime witness failed on untouched dev at age equal to ttl: existing code removed the old promise and returned pending replacement work. The implementation then made that witness green before deterministic boundary, concurrency, failure, detachment, guard-race, manifest, isolation, and pipeline cases were expanded.

## Architecture and compatibility

- One existing DI singleton owns age, clock, refresh, publication, and purge policy. The four consumers add only staleWindow fields; no consumer duplicates the state machine.
- Public caches remain Map objects whose values are the exact acquisition promises. Existing exports and method signatures remain.
- Source stays dependency-free CommonJS with no runtime require/import edge and no handwritten TypeScript or declaration.
- Pending work retains existing deduplication. ttl zero remains pending-only, ttl Infinity remains non-expiring, and missing staleWindow means zero for third-party compatibility.
- Refresh publication checks the current owner Map, key, old promise, record, refresh promise, and opaque token. Purge, eviction, reset, Map replacement, and newer insertion all detach authority.
- UI-manifest runtime wire version remains 1.0.0 even though its package receives a minor release.
- UI-cache code, package version, persisted wire, save timing, settledAt pairing, and public nested HTML cache are unchanged.

**Architecture/refactor verdict:** PASS. No unresolved ownership, lifecycle, compatibility, dead-code, or package-boundary finding remains in local review.

## Security, privacy, and infrastructure

The linked security review and STRIDE record cover the existing request/cache boundary, async guard mutation, stale retention, detached refresh work, downstream fragments, and rollback.

A positive window extends process-local eligibility for previously authorized bytes. It does not grant authority, change outbound URL rules, add logging, or add persistence. The default is zero; exact tenant/origin/base discrimination remains mandatory. Hosts must not enable positive windows for authentication or authorization decisions, secrets, payments, or regulated erasure-sensitive data without a new threat review.

Acquisition purge affects future acquisition participation only. Sensitive rollback must also dispose prepared roots/indexes, purge derived UI fragments, and clear/save external persistence through its existing owner. Refresh is request-triggered and best-effort; serverless hosts receive no durability guarantee. Repeated purge/churn may leave detached loader promises until transport settlement, so positive windows require host-owned finite transport lifetime and source/concurrency controls.

**Security/privacy/infrastructure verdict:** PASS locally, with the documented opt-in retention, downstream invalidation, detached-work, observability, and serverless residuals accepted.

## Production readiness

| Category | Result | Evidence |
|---|---|---|
| Data scale | PASS | O(1) access/classification; O(max) retained metadata; one descriptor per retained generation |
| Resilience | PASS | one refresh, hard joins, failure cleanup, retry on later access, exact detachment |
| Security surface | PASS | default zero, exact scoped key, URL guard plus post-await key check, unchanged validation |
| User experience | PASS | stale callers avoid turnover latency; hard callers wait; no UI contract change |
| Observability | PASS with limitation | unchanged loader/transport seams expose attempts/errors; stale-serving caller does not receive background rejection |
| Production-only failures | PASS | invalid window disables stale service while invalid TTL/clock fails fresh; serverless and detached-work limits documented |
| Cloudflare/Neon gates | N/A/PASS | no Worker, queue, database, migration, secret, route, or external component change |

Rollback is set all four windows to zero, purge acquisition keys, coordinate roots/UI/persistence for sensitive content, roll consumers back, then roll back the central package.

## Package SemVer

Five published packages receive minor releases for their backward-compatible public functionality:

| Package | Version |
|---|---:|
| @jtorm/promise-cache-model | 1.1.0 |
| @jtorm/data-model | 1.1.0 |
| @jtorm/html-model | 1.1.0 |
| @jtorm/tss-model | 1.1.0 |
| @jtorm/ui-manifest-model | 1.1.0 |

Each acquisition consumer requires @jtorm/promise-cache-model ^1.1.0. Package dry-runs contain exactly README.md, package.json, and canonical source. No dependency was added.

## Verification ledger

| Gate | Result |
|---|---|
| Initial red witness | PASS — failed for old-versus-replacement promise identity before runtime edits |
| Focused deterministic tests | PASS — 90/90 |
| Exact npm test | PASS — 759/759 |
| npm run typecheck | PASS |
| Changed JavaScript syntax | PASS |
| Source/policy ownership guards | PASS |
| Package JSON and diff checks | PASS |
| Five package dry-runs | PASS — exact three-file contents |
| npm production and full audits | PASS — zero vulnerabilities |
| Semgrep | PASS — 83 JavaScript rules over five changed runtime files, zero findings |
| Source-ratchet review | PASS — no analyzer edit required; policy ratchet 5/5 |
| Staged tech-debt ratchet | PASS — zero new debt patterns on the exact staged candidate |
| Opposite-model adversarial review | PASS — authorized skeptic, architect, and minimalist round; six accepted remediations implemented |
| Ready PR and initial-head CI | PASS — ready PR #65 targets `dev`; CI passed on `5d79d5f6ac05ab35780cb17115fe1d2cbb62299c` |
| Initial current-head Codex review | VALID FINDING — additive public cache functionality requires coordinated minor releases, not patches; exact package assertions failed red before correction |
| Corrected candidate | PASS locally — all five packages and four direct floors use `1.1.0`; focused 7/7, exact full 759/759, typecheck, audits, and exact package dry-runs pass |
| Corrected-head CI and clean Codex review | PENDING — correction is ready to commit and push |

## Current verdict

**LOCAL EVALUATION COMPLETE; PR CORRECTION PENDING DELIVERY.** The authorized skeptic, architect, and minimalist outputs contain no high-severity finding. Six accepted remediations plus the cold-review guarded hard-state correction are implemented. PR #65 is ready and its initial head passed CI; the one valid current-head Codex finding is corrected red-first with coordinated `1.1.0` releases. Corrected-head CI, a clean Codex review, and zero unresolved threads remain.

## Pre-PR feature-eval checkpoints (historical snapshot)

This section records the local evaluation state before PR #65 opened; the delivery state and verification ledger above supersede its pending-delivery wording.

### Phase 1 — Discovery

- Base and diff range: dev at 9ee8cc850224041498282a893eca7451dde8364b to the staged working tree.
- Specification: request-triggered-stale-while-revalidate.md; threat model: stride-request-triggered-stale-while-revalidate.md.
- Runtime modules: promise-cache-model plus data-model, html-model, tss-model, and ui-manifest-model.
- Direct host/test surfaces: engine reset/options, model/race/manifest/pipeline tests, policy ownership, parser release ledger, and manifest compiler version proof.
- Publication/docs: five package manifests/READMEs, root README/AGENTS, architecture backlog, and review ledger.
- Frontend, routes, SQL, database, auth, payment, queue, AI, mobile, and new persistence surfaces: none.
- PR review comments: not a PR yet.
- Issues found: none.

### Phase 1.5 — Data-flow traces

#### Data and HTML acquisition

Flow: model.get(view, context) → requestModel.cacheKey → promiseCacheModel.get → phase/guardless generation decision → unchanged requestModel.get → json/text result → exact settlement or refresh publication → caller.

Undefined scope is an intentional direct-load bypass before shared state. Transport or parse failure rejects; no nullish fallback masks it. Cold/hard callers receive acquisition work, stale callers receive the exact old public promise, and refresh rejection is immediately observed without changing its hard deadline.

#### TSS acquisition

Flow: tssModel.get(url or ordered URLs, view, context) → per-part exact key → promise cache → unchanged request text → parser → per-part publication → ordered concatenated AST.

Every array part retains an independent exact key/generation. Sequential ordering is unchanged. Parse/acquisition failure rejects rather than returning a partial or prior hard-stale AST.

#### UI-manifest pack acquisition and lookup

Flow: prepare descriptors/root context → descriptor cache key → promise cache hit → awaited requestModel.url/allow guard → exact captured-key rederivation → current-generation classification → request text → digest/schema/bounds validation → pack publication → root-local atomic index → get-method lookup.

A guard or key mismatch rejects before stale service, refresh, hard join, or new captured-key publication. Optional mode falls back only for acquisition failure; received malformed/tampered content still fails loud. Root-local prepared state remains a separate owner.

#### Derived rendered fragment

Flow: authorized acquisition result → normal handler/render lifecycle → UI-cache commit at its own successful-publication time → optional existing save adapter.

Acquisition purge changes future acquisition participation only. It neither revokes the current render nor mutates the independently aged UI fragment/persistence envelope; sensitive rollback coordinates those owners explicitly.

#### Nine-junction audit

| Junction question | Result |
|---|---|
| Null return silently falls through? | No. Undefined key is the explicit uncached path; acquisition/validation failures reject, and optional manifest fallback is narrowly classified. |
| Void result hides lost state? | No important transition returns void to its owner; publication and removal are guarded by exact synchronous identities. |
| Async work used without await? | Guards and caller-visible acquisition are awaited/adopted. Refresh is intentionally detached and attaches a rejection observer immediately. |
| Check paired with record? | Scope derives the cache record; manifest authorization is immediately followed by exact captured-key rederivation before one current-state classification. |
| All token paths use the same gate? | Every shared acquisition uses the same exact key/generation path; malformed/unscoped authority cannot enter shared state. |
| Count and modify atomic? | No database count exists. Map classification/removal/insertion and refresh ownership checks are synchronous within one continuation. |
| Cache invalidated on state change? | Purge/reset/eviction/newer insertion detach exact publication. Already returned/root/UI/persisted derivatives are separate documented owners. |
| Development bypass env-gated? | N/A; no development token, endpoint, environment bypass, or production branch exists. |
| Fallback masks deleted state? | No implicit fallback exists. Positive stale service is explicit, finite, default-off retention with a documented sensitive rollback. |

No data-flow issue remained after the pre-code guard/generation findings were incorporated.

### Phase 2 — Architecture agent reviews

All mandatory persona files and their declared engineering/security checklists were read and applied. Generic Bun/Elysia/Supabase/TypeScript rules are N/A where they conflict with or do not exist in this repository; project AGENTS.md is the governing architecture contract.

- **architect:** PASS — one deep DI policy owner, minimal additive public fields, exact information hiding, no Shotgun Surgery in state logic, and no new package/import.
- **backend-architect:** PASS — exact generation checks cover every event-loop gap; no DB, queue, transaction, Worker, or external-service layer exists.
- **code-reviewer:** PASS — complete staged diff is scoped, terse, dependency-free, red-first, and free of unrelated behavior.
- **code-review-enforcer:** PASS — SOLID ownership, public Map/promise contracts, package boundaries, source guards, limits, failure cleanup, and minor SemVer hold.
- **elysia-expert:** N/A — no route, Elysia instance, macro, lifecycle hook, validator, request/response contract, or middleware changed.
- **elysia-route-expert:** N/A — no route prefix, AOT scope, hook order, endpoint path, header, auth, or controller surface changed.
- **bun-expert:** N/A for runtime adoption — AGENTS.md requires Node built-in tests and dependency-free CommonJS; no Bun API or dependency was introduced.
- **typescript-pro:** PASS under the project override — source remains pure JS/JSDoc, no handwritten declaration or escape hatch was added, and the scoped repository typecheck passes.
- **security-architect:** PASS — pre-code STRIDE/attack tree, exact admission/authorization recheck, generation isolation, default-zero retention, bounded metadata, and downstream rollback are implemented/tested.
- **security-reviewer:** PASS — no new injection, secret, auth, header, mobile, queue, database, logging, or dependency surface; outbound/manifest validation controls remain.
- **threat-modeling-enforcer:** PASS — the linked threat model predates runtime edits, covers all six STRIDE categories, DFD/error/async paths, attack tree, test mappings, and explicit residuals.

Checklist disposition: dependency direction, complexity, runtime async safety, type/JSDoc contract, error propagation, tests, placeholders, injection, secrets, dependency health, SSRF preservation, threat modeling, and self-review pass. Route, HTTP auth/authz, headers/cookies, SQL/RLS, crypto, secrets rotation, mobile, queue, AI/LLM, and API inventory items are N/A with the staged file map as evidence.

No architecture issue or red flag remained. The existing manifest scope-change Error uses the framework's acquisition-error convention; the generic app DomainError rule is inapplicable to this dependency-free library.

### Phase 3 — Security and fix everything

- review-architecture: PASS after the complete DI/state/caller trace.
- review-privacy: PASS; default-zero retention, derivative lifetime, erasure limits, and coordinated rollback are explicit.
- review-infrastructure: PASS; one owned refresh, detached-work limits, existing-seam observability, serverless best effort, and deploy/rollback ownership are explicit.
- review-refactor: PASS after removing one unused parameter and reverting one accidental UI-cache README edit.
- differential-review, insecure-defaults, safety-friction, source-ratchet, Semgrep, dependency audits, and production-readiness: PASS with no unresolved finding.
- postgres/supabase, high-risk auth/queue/payment/ticketing, frontend, AI, growth, and endpoint security testing: N/A from the staged file/data-flow map.
- Threat-model deep dive: N/A after re-evaluation; the change can retain tenant-sensitive bytes but adds no identity/payment flow or new trust boundary. Full STRIDE, an attack tree, privacy review, and downstream-persistence modeling provide the proportionate gate.
- STRIDE implementation: scope/key verification, manifest validation, exact generation tokens, default-zero retention, bounded metadata, rejection observation, and documented host resource controls all exist in runtime/tests; no mitigation is documentation-only.

No exploitable or policy finding remained.

### Phase 4 — Code quality scoring

Additional scoring personas:

- **privacy-officer / gdpr-erasure-auditor:** PASS — positive retention and downstream erasure limits are default-off, explicit, and operationally owned.
- **red-team-specialist:** PASS — concrete cross-scope, clock, boundary, rejection, validation, purge, replacement, and resurrection attack hypotheses are exercised; no bypass witness succeeds.
- **authentication-architect:** N/A — no authentication/session path changed, and documentation explicitly prohibits positive windows for authorization state without a new review.
- **performance-benchmarker / performance-engineer:** PASS — deterministic concurrency tests prove one refresh; access is O(1), metadata O(max), and detached work is not misrepresented as bounded.
- **api-tester:** PASS for package contracts, N/A for endpoints — fields are additive/default-zero, public promise/value shapes and runtime manifest version are pinned, and five publish artifacts are exact.

| Dimension | Score |
|---|---:|
| Architecture | 10/10 |
| Consistency | 10/10 |
| Type Safety | 10/10 |
| Validation | 10/10 |
| Error Handling | 10/10 |
| Security/Privacy | 10/10 |
| Performance | 10/10 |
| Maintainability | 10/10 |
| Testability | 10/10 |
| Readability | 10/10 |
| **Total** | **100/100** |

No scoring finding remained and no enhancement was deferred.

### Phase 4.5 — Tests

The installed evaluation references `test-engineer.md` and `architect-review.md`, but neither file nor an indexed substitute exists in the installed resource catalog. The closest installed testing personas and the project architect persona were applied explicitly; the missing names were not silently skipped.

- **tdd-guide:** PASS — the age-equals-ttl witness was observed red before implementation, then the behavior/race matrix was expanded without private-method assertions or internal mocks.
- **test-results-analyzer:** PASS — the focused and full runs have no failure cluster, retry, skip, todo, cancellation, or flaky quarantine; security/policy tests remain present.
- **api-tester:** PASS for package/public contracts — additive fields default to zero, identities and validation failure shapes are pinned, and no endpoint exists.
- **e2e-runner:** N/A — no browser page, route, user journey, selector, or cross-system UI behavior changed; pushing promise-cache state-machine cases into Playwright would invert the test pyramid.
- **accessibility-tester / evidence-collector:** N/A — no rendered DOM, component, style, interaction, media, mobile surface, accessibility tree, or visual claim changed. Every WCAG and screenshot-matrix item is therefore out of scope rather than asserted without evidence.

Mandatory checklist disposition:

- TDD red/green/refactor, observable-state assertions, deterministic independence, failure paths, correct model/integration layer, no stubs, and full rerun: PASS.
- Test-suite meaningful assertions, risk-proportional coverage, race/failure isolation, no retry masking, and suite health: PASS.
- E2E determinism/selectors/artifacts, WCAG Perceivable/Operable/Understandable/Robust, mobile accessibility, and visual evidence: N/A from the staged file/data-flow map.

Fresh commands on the current working candidate:

| Command | Result |
|---|---|
| `node --test` over promise-cache, shared-fetch, and UI-manifest model/SWR suites | PASS — 90/90, no skip/todo/cancellation |
| exact `npm test` with the isolated worktree dependency path | PASS — 759/759, no skip/todo/cancellation |

The first focused invocation omitted `NODE_PATH`: its 51 model/manifest tests passed and only the pipeline worker failed to start because lodash was unavailable in the dependency-less worktree. The exact same set passed after exposing the repository's existing dependencies; this was an environment setup failure, not a product test failure.

### Phase 5 — Fresh verification

A cold pass reread every changed runtime file in full, then reviewed the complete runtime, harness, test, package, and public-documentation diffs against the pinned dev base.

- **Runtime trace:** PASS — finite phase classification, retained-generation refresh, hard join, guarded post-await reclassification, exact publication, rejection cleanup, clock identity, LRU, purge, reset, replacement, and untracked-state paths remain coherent.
- **Call-site trace:** PASS — only data, HTML, TSS, and validated manifest-pack acquisition expose the default-zero window; UI-cache still uses `fresh()` and has no stale-window surface.
- **Public compatibility:** PASS — Maps still contain exact promises, methods/exports remain, manifest wire stays `1.0.0`, package changes are backward-compatible minor releases, and no runtime dependency/import was added.
- **Failure and abuse trace:** PASS — invalid window disables stale service without discarding TTL freshness, invalid TTL/clock fails hard, stale authorization precedes refresh, scope drift rejects, failed validation never publishes, detached work cannot resurrect, and downstream revocation limits are explicit.
- **Fresh architect fallback:** PASS — `architect-review.md` is unavailable, so the installed project architect contract was applied from a clean reread; no ownership, dependency-direction, lifecycle, or deploy-order finding remained.
- **Self-review/deploy check:** PASS — central package first, four consumer floors second, default-zero rollout, per-owner enablement, kill switch, coordinated sensitive purge, and rollback ordering are documented and testable.
- **Cleanup:** PASS — no changed-line TODO/FIXME/HACK/debugger/console, suppression, skipped/only test, handwritten typed source, or runtime import was introduced.

Verification evidence:

| Gate | Result |
|---|---|
| Changed JavaScript syntax | PASS — all 15 changed JavaScript files |
| Package JSON and review-ledger JSONL | PASS — five manifests and every outcome record parse |
| Exact `npm test` | PASS — 759/759 |
| `npm run typecheck` | PASS |
| Five fresh package dry-runs | PASS — each exact README/package/source triplet |
| Semgrep | PASS — fresh 83-rule run over the final five-file runtime candidate, zero findings |
| npm production/full audits | PASS — prior zero-vulnerability runs; no external dependency graph changed afterward |
| Source-ratchet and tech-debt gates | PASS — 5/5 no-edit convergence plus zero staged debt findings |

The cold cleanup pass found one documentation-only issue: the STRIDE completion checkbox was stale and the staged file had one extra blank line at EOF. Both were corrected immediately; no source or test change resulted.

The ten dimensions were rescored from the cold pass and remain 100/100 with no unresolved local finding.

### Phase 6 — Documentation

The generic evaluator targets `docs/features/`, `docs/frontend/feature-actions.md`, `docs/security/stride-*.md`, and `feature-reviews/PROGRESS.md`; none exists in this repository. Creating a parallel documentation system would conflict with the project-native review contract, so those paths are N/A with existence checks recorded.

Project-native equivalents are complete:

- Root README documents the public window contract, sensitivity guidance, resource/serverless limits, kill switch, deployment order, and coordinated rollback.
- Five package READMEs and manifests document exact owner behavior, versions, dependency floors, and the unchanged manifest wire.
- AGENTS locks acquisition-only ownership; the architecture review splits acquisition SWR, rendered-fragment SWR, and HTTP validators.
- The feature specification and STRIDE record contain the complete data-flow, test, threat, rollout, rollback, and residual-risk contracts.
- Evaluation, security, differential, completed adversarial, and JSONL outcome ledgers record the exact current state.

One documentation audit finding was fixed: implementation/test/local-review/documentation progress and automated rollback evidence were stale in the feature spec. External review and every delivery checkbox remain open.

### Phase 7 — Completion

`batch-simulator` is neither installed nor present in the resource-index skill catalog. Per the missing-skill fallback rule, an exact scoped batch matrix was run from the feature map, data flows, test evidence, and package surfaces instead; the missing skill was not silently claimed.

Completion validation:

- **Mode:** pre-PR branch evaluation, not a full feature sweep.
- **Discovery/data flows:** pinned base, 35-file map, four acquisition flows, derivative flow, and all nine junction questions recorded.
- **Agents/reviews:** all installed mandatory and conditional persona files/checklists read; missing `test-engineer.md` and `architect-review.md` are recorded with closest installed fallbacks.
- **Scoring:** the exact ten dimension names use whole 10/10 scores for a total of 100/100.
- **Security/tests:** every applicable STRIDE control is implemented/tested; focused 90/90 and full 759/759 pass with no skip, todo, cancellation, or retry masking.
- **Self-review:** cold runtime/call-site/package/docs reread and fresh architect/deploy review pass after fixing the two documentation bookkeeping findings.
- **Documentation:** all project-native public, architecture, feature, threat, and delivery records are current; generic absent paths are N/A.
- **Full-sweep catalogs:** `FEATURES.md` is absent and cross-feature continuation is N/A in pre-PR mode.
- **Delivery:** deliberately incomplete because current-candidate completion gates, commit, ready PR, CI, current-head Codex review, and thread resolution remain open.

Fallback batch matrix:

| Surface | Result |
|---|---|
| Scope/default | PASS — exactly four acquisition owners, default zero, unscoped bypass, no UI-cache window |
| Boundaries/concurrency | PASS — strict fresh/stale/hard edges, one refresh, hard join, settlement publication |
| Failure/detachment | PASS — sync/async failure, retry, purge/reset/eviction/replacement/newer-generation isolation |
| Security/downstream | PASS — manifest post-await key check, validation, tenant isolation, derivative rollback limits |
| Packages/docs | PASS — minor versions, dependency floors, three-file packs, manifest wire, operator guidance |
| Delivery | IN PROGRESS — adversarial gate passed; current-candidate verification and repository/GitHub delivery remain |

The scoped pre-PR feature evaluation is complete at 100/100. This does not authorize or claim PR delivery.
