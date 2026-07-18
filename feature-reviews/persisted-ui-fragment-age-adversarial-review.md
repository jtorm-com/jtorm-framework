# Persisted UI Fragment Age — Cross-Model Adversarial Review

**Date:** 2026-07-18
**Reviewer CLI:** Claude Code 2.1.209, three isolated `--permission-mode plan` sessions
**Lenses:** Skeptic, Architect, Minimalist
**Artifact:** Working tree against `3c614cd`, approved specification, STRIDE/PASTA record, runtime, tests, fixtures, package metadata, and READMEs

## Intent

Version the persisted rendered-UI-fragment wire so every fragment retains its original successful settlement time and a process restart preserves elapsed TTL age, while preserving the live HTML-only cache, fail-closed scope/provenance, promise-cache ownership of process-local freshness, and existing LRU/lease/purge/save behavior. Stale-while-revalidate and HTTP validators remain out of scope.

## Verdict: PASS

No high-severity finding was reported. The valid proof and documentation gaps were corrected; the remaining suggestions either contradict binding compatibility/scope requirements or describe explicitly documented host-owned residual risk.

## Findings

1. **[medium, accepted and fixed] Duplicate identities and mixed fresh/stale valid batches lacked direct proofs.**
   - Lens: Skeptic + Architect
   - Principle: whole-envelope tamper rejection, per-record current-TTL evaluation, failing-test-first proof
   - Resolution: added a duplicate-key quarantine proof that verifies no clock sample and a mixed-age proof that commits only the still-fresh subset in deterministic order.

2. **[low, accepted and fixed] Specification named a nonexistent legacy fixture.**
   - Lens: Skeptic
   - Principle: documentation must match shipped compatibility artifacts
   - Resolution: the affected-component table now names the delivered migration and rollback fixtures separately.

3. **[low, accepted and fixed] A cache hit unnecessarily advanced the delayed-init lifecycle counter.**
   - Lens: Minimalist
   - Principle: terse/minimal hot path; hits remain non-sliding
   - Resolution: removed the redundant counter change; LRU reorder and O(1) pair/freshness checks remain unchanged.

4. **[medium, rejected] Persistence quarantine and invalid live snapshots are silent in the non-awaited plugin path.**
   - Lens: Skeptic
   - Principle cited: observability
   - Lead judgment: the dependency-free model deliberately fails cold on hostile/unavailable reads and retains dirty state on invalid snapshots; direct hosts that need completion/error visibility already call and await `save()`, while adapter logging/metrics are host-owned. Adding a generic status/logging framework would violate scope and existing plugin timing.

5. **[medium, rejected] Add a byte-size limit in addition to the existing fragment-count `max`.**
   - Lens: Architect
   - Principle cited: DoS/resource bounds
   - Lead judgment: the binding task requires preserving fragment bytes and bounding parsing/metadata by the existing fragment `max`; no prior byte policy exists. The adapter has already materialized strings, staging retains at most `max` references, and inventing a new byte limit/configuration would be a separate incompatible resource-policy feature.

6. **[medium, rejected] Use minor/major bumps for the additive promise-cache seam and plugin dependency coordination.**
   - Lens: Architect
   - Principle cited: SemVer/public packages
   - Lead judgment: this repository's locked rule and prior P3 precedent use patch releases for additive bug-fix policy seams; the user explicitly required the incompatible adapter wire to receive the UI-cache major and direct consumers to coordinate ranges. UI-cache is `2.0.0`; promise-cache/plugin patches match the established coordinated bug-fix policy.

7. **[medium, rejected] Delete the rollback fixture because its exact-content assertion is not a runtime downgrade test.**
   - Lens: Skeptic + Minimalist
   - Principle cited: non-vacuous proof/YAGNI
   - Lead judgment: the user explicitly required exact migration/rollback fixtures and the runtime cannot safely execute an older reader. The fixture is a public host-runbook golden, not claimed as executable older-reader isolation; runtime version quarantine, dependency floors, and documentation carry the enforceable portions.

8. **[medium, rejected] Remove live-hit validation of `settledAt`.**
   - Lens: Minimalist
   - Principle cited: hot-path minimalism
   - Lead judgment: malformed timestamp metadata must fail fresh, and the content/timestamp pair must remain complete on every authenticated hit. Two constant-time numeric checks preserve O(1) behavior and are required by the failure-atomicity contract.

9. **[low, partially accepted after current-head Codex review] Await asynchronous adapter results.**
   - Lens: Skeptic
   - Principle cited: async adapter compatibility
   - Lead judgment: the documented contract is synchronous data or a native Promise. Current-head
     review correctly identified that `instanceof Promise` excluded native Promises from another
     realm, so a red proof now locks native-brand adoption. Arbitrary thenables remain unsupported:
     assimilating them would evaluate an untrusted own/inherited `then` accessor before descriptor
     validation, weakening the hostile-envelope boundary. A paired test proves that accessor stays
     unread.

10. **[low, rejected] Remove the authenticated-sample ordering and consolidate all WeakMap reset state behind a new abstraction.**
    - Lens: Architect
    - Principle cited: coupling/reset fragility
    - Lead judgment: `restore(owner, age, sampledTime)` intentionally verifies the sample against the promise-cache owner's observation, and the host/engine/singleton reset surfaces are explicitly locked and tested. A new generic generation/reset abstraction would expand public machinery without a second owner.

11. **[low, accepted as documented residual risk] A restart clock regression that remains above all settlements is undetectable.**
    - Lens: Skeptic
    - Principle: truthful clock guarantee
    - Resolution: no code change. The specification, README, threat model, and residual-risk table explicitly require a restart-stable nondecreasing Unix clock and state this mathematical detection limit; detectable future/live regression is fail-cold and tested.

## What Went Well

- All reviewers found the core restart-age math, conservative dual-clock sampling, promise-cache ownership, whole-candidate swap, and exact byte/timestamp authentication structurally sound.
- The skeptic specifically confirmed publish rollback, async lifecycle invalidation, pair-bound hit/save validation, and migration/version failure paths on static trace.
- The minimalist found nearly every helper mapped to a binding functional or STRIDE requirement and identified no scope leak into stale refresh, validators, timers, or generic persistence.

## Lead Judgment

Three concrete gaps were fixed and the affected focused suite passed with 91 tests. The two medium design objections that remain would violate explicit user constraints (preserve fragment bytes; no generic persistence/observability framework), and the SemVer objections conflict with the repository's locked bug-fix release convention and the requested UI-only wire major. No accepted high finding remains.

## Next Action

**PROCEED** — continue differential, static-analysis, privacy/infrastructure, production-readiness, and delivery gates.
