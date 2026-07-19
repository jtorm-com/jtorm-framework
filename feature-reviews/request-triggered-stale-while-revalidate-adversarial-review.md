# Request-triggered stale-while-revalidate — Adversarial review

**Date:** 2026-07-19
**Scope:** Feature specification, STRIDE record, and complete working-tree implementation
**Reviewer CLI:** Claude Code 2.1.209 in explicit read-only plan mode
**Verdict:** PASS — no high-severity finding; accepted medium/low remediation follows

## Intent

Stress-test whether the opt-in acquisition-cache stale window lowers turnover latency without weakening exact request scope, manifest URL policy, hard freshness boundaries, generation-safe publication, bounded state, or the separate rendered-fragment and persistence owners.

## Initial blocked execution record

The change is large under the adversarial-review threshold, so three independent lenses are mandatory. Project-local prompt files were prepared for:

- Skeptic: search for stale disclosure, guard races, resurrection, silent failure, and invalid-policy counterexamples.
- Architect: challenge ownership, public identities, DI boundaries, state transitions, rollout, and rollback.
- Minimalist: identify unnecessary machinery, duplicated policy, compatibility risk, and a smaller correct design.

Each prompt included the relevant locked AGENTS.md rules, the intended behavior, the feature and STRIDE records, and the working-tree diff. The planned command used `claude -p --permission-mode plan` with prompt content passed only through stdin, and reviewers were to run in parallel.

Execution did not begin. The privilege review rejected the commands because sending private repository source, tests, and planning material to an external model is a data-export action that the user has not explicitly authorized. No repository content was transmitted, no reviewer output file was created, and no finding was silently omitted.

## Available evidence

The following local evidence exists but does not satisfy the opposite-model requirement:

- Independent same-model explorer and architect design reviews produced ten accepted findings before implementation; all were incorporated into the state machine, guard transition table, downstream-retention model, and red-first matrix.
- Architecture, privacy, infrastructure, differential security, insecure-default, safety-friction, source-ratchet, Semgrep, tech-debt, and production-readiness reviews have no unresolved local finding.
- Deterministic race, policy, isolation, failure, publication, purge, manifest, pipeline, and persistence-boundary tests pass.

The adversarial-review contract explicitly says same-model self-review is not a substitute for cross-model critique. Those results therefore reduce local uncertainty but cannot turn this verdict into PASS.

## Findings

No cross-model finding can be reported because no reviewer ran. Missing skeptic, architect, and minimalist outputs are themselves a review-gate failure.

## Lead judgment

It would be incorrect to infer PASS from empty output or to replace the required reviewers with Codex subagents. The implementation remains locally reviewable and test-clean, but the delivery workflow must stop before commit/push/PR publication until this gate is either authorized and completed or explicitly waived by the user.

## Initial required next action — completed 2026-07-19

Obtain explicit informed approval to transmit the bounded review inputs—AGENTS.md excerpts, the feature/STRIDE documents, and the working-tree diff—to the installed Anthropic Claude CLI in read-only plan mode. Then:

1. Run all three reviewers in parallel.
2. Verify every output exists and is non-empty.
3. Deduplicate and adjudicate findings.
4. Reproduce each accepted defect red-first, fix it, and rerun affected and full gates.

## Authorized opposite-model round — 2026-07-19

- CLI: `claude -p --permission-mode plan`, three independent prompts run in parallel.
- Outputs: skeptic, architect, and minimalist findings were nonempty; each stderr was empty.
- Scope transmitted: approved AGENTS excerpts, feature/STRIDE records, staged diff, and directly relevant unchanged owners/tests.

## Synthesized verdict: PASS

No reviewer raised a high-severity issue. Three lenses converged on invalid-window availability behavior and duplicated guarded/unguarded transition logic; the skeptic also found two concrete regression-test gaps.

### Accepted findings

1. **Medium — invalid window and unused overflow rejection:** invalid/throwing windows currently discard fresh TTL entries, while the overflow guard protects arithmetic never performed. Treat invalid as zero-window and admit every finite nonnegative window.
2. **Medium — duplicated transition actions:** `get()` and `current()` repeat most phase-to-action behavior. Reduce the unguarded fast path to the current-state owner without changing guarded recency/security semantics.
3. **Medium — unhandled rejection witness:** add a test that observes process behavior without attaching a consumer to the refresh promise.
4. **Medium — publication-time clock failure:** add an in-flight refresh test proving invalid/regressing time prevents retention and permits later cold recovery.
5. **Low — policy/observability wording:** clarify that data/HTML/TSS keep their pre-existing cache-hit authorization model and transport instrumentation cannot identify background refresh specifically.
6. **Low — classifier/token clarity:** document phase codes and normalize refresh-published settled token shape where behavior remains unchanged.

### Rejected or accepted-residual findings

- Detached loaders without a framework abort/cap are an explicit accepted residual with host finite-transport/concurrency ownership; cancellation/timers remain excluded.
- Guarded fresh/pending key checks and post-await reclassification are security-correct, covered centrally, and required for exact current scope rather than an accidental contract expansion.
- `live()` remains separate from acquisition `phase()` to preserve the locked rendered-fragment policy boundary.
- High clock spikes, untracked post-guard direct loads, exact pre-guard LRU bookkeeping, the single manifest security caller, and defensive Map cleanup are either inherited/intentional or low-value refactors outside this fix.
- The initial missing-review finding is resolved by this authorized round and will be followed by current-head CI/Codex verification.

### Lead judgment

Accept the six bounded remediation items above; reject changes that would add cancellation, telemetry, rendered-fragment coupling, or weaken exact post-await authorization. The reviewers validated generation-safe publication, scope isolation, public promise identity, explicit exclusions, and coordinated package boundaries.

### Next action

**PROCEED** — implement the accepted medium/low items, rerun focused/full/static/readiness gates, then continue ready-PR delivery. No second adversarial round is required unless remediation changes the design materially.

## Remediation outcome — 2026-07-19

- Invalid or throwing windows now behave as zero while TTL-fresh entries remain reusable; every finite nonnegative window is admitted through subtraction-based classification.
- Unguarded `get()` calls delegate phase-to-action transitions to `current()`; guarded authorization, pre-touch, and post-await reclassification remain unchanged.
- A consumer-free process rejection witness proves detached refresh failure is internally observed.
- Invalid and regressing publication-clock witnesses prove followers still settle while no generation is retained and later cold recovery succeeds.
- Public/package/security records now distinguish the data/HTML/TSS key-at-call model from manifest per-hit authorization and state that transport instrumentation receives no background marker.
- Phase codes are documented inline and all successfully settled cache records use the same null token shape.

The post-remediation cold reread found one implementation flaw in the deduplication refactor: an initial guarded hard classification could be classified again by `current()` and become reusable without `hit()` if policy access changed synchronously. A red side-effecting-TTL witness reproduced the bypass; guarded hard/no-refresh now commits directly to the validated cold loader, while unguarded transitions remain centralized.

Focused cache and consumer verification passes 90/90. The remediation remains bounded to the reviewed design, and the added fix restores its exact authorization contract, so the authorized adversarial gate is **COMPLETE / PASS** without a second round.
