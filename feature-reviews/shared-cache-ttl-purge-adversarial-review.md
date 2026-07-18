# Shared-cache TTL and purge APIs — Adversarial review

**Date:** 2026-07-18
**Scope:** Working-tree implementation and specification for the TTL/purge half of weakness #12
**Method:** Opposite-model review with Claude Code sessions using skeptic, architect, and minimalist lenses
**Verdict:** PASS

## Intent

Stress-test the central TTL/clock owner, promise and rendered-fragment concurrency, event lifecycle atomicity, compatibility surfaces, and retained-state bounds before the formal review and verification gates. The review sought concrete counterexamples rather than stylistic agreement.

## Deduplicated findings

| Severity | Finding | Lead disposition | Evidence |
|----------|---------|------------------|----------|
| Medium | UI publication could occur in an early `completeIteration` hook before a later hook failed | Accepted and fixed: event-model now collects at most one commit closure and invokes it only after every completion hook succeeds | Red-first multi-hook failure tests in event and pipeline suites |
| Medium | Detached UI child views did not preserve an explicitly selected language | Accepted and fixed: handler-wrapper copies `v.l` before and after child traversal | Red-first wrapper and scoped language pipeline tests |
| Medium | Returning the UI-cache `save(v)` promise from `afterView` changed the published fire-and-forget event timing | Accepted and fixed: plugin invokes without returning/awaiting; explicit administrative callers can still await model `save(v)` | Direct plugin timing test plus async save/retry model tests |
| Medium | Replacing exported `cache` while retaining `order` could let an obsolete render lease publish into the replacement store | Accepted and fixed: each lease binds both the current order map and an opaque weak cache-store identity | Replaced-store late-publication and orphan-flight tests |
| Medium | Event abort cleanup could stop after one throwing hook | Accepted and fixed: every abort hook is attempted, cleanup errors are suppressed, and wrapper preserves the original failure | Red-first multi-hook abort tests |
| Medium | Backward wall-clock correction creates an owner-wide cold-reuse window | Accepted as the required fail-closed retention policy; documentation now recommends an injected monotonic clock where wall time can regress | Cross-key regression tests and threat-model residual risk |
| Low | A nested same-key render with an unidentifiable/null root could await its own lease | Accepted and fixed: exact root identity, including `null`, is treated as reentrant and bypasses the lease | Null-root self-deadlock test |
| Low | Single-flight followers share the leader's failure | Accepted and documented: this is the bounded deduplication contract; the failed lease clears and the next call retries | Follower rejection/retry tests and resource tradeoff record |
| Coverage | Host replacement of the exported cache needed a direct store-scope regression | Accepted and added | UI cache replacement test |

No high-severity issue was found. All accepted implementation findings were reproduced red-first before their fixes.

## Findings rejected or kept out of scope

- Preserving `undefined` rather than canonical `null` language was rejected: the existing detached-child insertion path persisted the default coordinate as `null`; canonicalization preserves that live/persisted key while explicit languages now propagate unchanged.
- Combining UI's nested-store identity with promise-cache timestamp ownership was rejected: UI alone owns the exported nested fragment shape, while the injected promise owner alone owns timestamp policy. Both weak identities are required without wrapping public values.
- Making `purgeAll(v)` tenant-local was rejected because the locked API is an explicit global administrative action; the scoped view is required to establish valid dirty/persistence authority.
- Changing deterministic deletion counts to report only nested fragment bytes was rejected: the specified count is unique cache participation removed, including an attached flight.
- Altering manifest prepared-root state was rejected as explicitly out of scope; the public README and specification state that pack purge affects subsequent roots only.
- Revision-overflow, exported `set`, and small helper deduplication suggestions were rejected as compatibility/style changes without a demonstrated defect.

## What went well

- The weak map/key/insertion-token design survived same-promise reuse, purge, rejection, replacement-map, and late-settlement challenges without changing cached value identities.
- Exact unscoped purge remains a true no-op before clock or metadata access, preserving PR #59's privacy boundary.
- Stale manifest access re-enters the existing URL, SSRF, timeout, digest, validation, and acquisition-classification path.
- UI lifecycle staging made failure atomicity testable without changing event bucket order or persisted fragment schema.

## Lead judgment

The accepted findings were compatibility or concurrency defects with concrete failing witnesses, so they were fixed immediately. The rejected findings either contradicted a locked public contract, were already documented behavior, or expanded into the separately scoped persistence/SWR work. The remaining availability tradeoffs—finite-TTL cold work, owner-wide fail-closed clock regression, and shared leader failure—are explicit, bounded, configurable, and covered by tests.

## Next action

**PROCEED.** No unresolved high or medium implementation finding remains. Continue through architecture, differential, security/privacy, ratchet, production-readiness, and full verification gates.
