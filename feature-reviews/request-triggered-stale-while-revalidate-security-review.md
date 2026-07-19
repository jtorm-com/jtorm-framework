# Request-triggered stale-while-revalidate — Security and privacy review

**Date:** 2026-07-19
**Base:** dev at 9ee8cc850224041498282a893eca7451dde8364b
**Scope:** Promise-cache SWR owner and the data, HTML, TSS, and UI-manifest acquisition consumers
**Threat model:** [stride-request-triggered-stale-while-revalidate.md](stride-request-triggered-stale-while-revalidate.md)
**Verdict:** PASS

## Security-sensitive delta

The change permits an already settled, exactly scoped acquisition value to remain eligible for a configured interval after ttl while one unchanged loader refreshes it. This changes retention/freshness policy, not caller authority. No route, credential, authorization decision, database, external service, log, persistence wire, or new request destination is added.

Trust-relevant flows are:

1. A host derives an exact tenant/origin/base cache key through the unchanged request model.
2. The promise cache classifies the exact generation by successful-settlement age.
3. A stale hit may return the old promise and start one refresh.
4. A manifest hit must pass its awaited URL-policy guard and then re-derive the captured key before current cache state is used.
5. A successful refresh may publish only while every exact ownership identity remains current.
6. A render may copy stale acquisition content into a separately aged UI fragment and optional existing persistence envelope.

## Control review

| Risk | Control and evidence |
|---|---|
| Cross-tenant or cross-origin stale disclosure | Exact existing cacheKey admission is unchanged; undefined/malformed/inherited/cyclic scope bypasses all shared state and calls only load |
| Manifest policy changes while a guard awaits or policy reads change synchronously | Per-caller hit guard plus immediate exact post-await key re-derivation; initial hard/no-refresh commits to validated cold load without reclassification; mismatch throws before stale service, refresh, hard join, or insertion |
| Stale data past the configured hard boundary | Overflow-free strict subtraction; age equal to ttl enters stale only for a positive window; age-minus-ttl equal to window is hard |
| Invalid or hostile configuration extends retention | Missing, invalid, or throwing window access behaves as zero while preserving TTL freshness; every admitted window is finite/nonnegative; subtraction avoids overflow; bad clocks and regression fail hard |
| Detached refresh resurrects old state | Publication compares current Map, key, old public promise, record identity, refresh promise, and opaque token |
| Refresh failure poisons state or creates an unhandled rejection | Immediate rejection observer clears only exact refresh ownership, keeps the original timestamp, and permits a later request-triggered retry |
| Refresh stampede | One private refresh descriptor per exact retained generation; stale callers share old work and hard callers join replacement work |
| Memory or work amplification | Retained Map and metadata remain O(max); detached work is explicitly not max-bounded and requires host transport/concurrency controls |
| Validation bypass on replacement | Data/HTML/TSS use unchanged loaders/parsers; manifest refresh retains URL allow, request, digest, schema, and bounds validation |
| UI persistence silently changes | UI-cache source, package, wire version, byte/timestamp pairing, plugin timing, and save adapter remain unchanged and regression-tested |

## STRIDE disposition

- **Spoofing:** No new identity source. Exact request-model scope remains the sole admission authority.
- **Tampering:** Exact generation tokens and manifest validation prevent late or invalid replacement publication.
- **Repudiation:** No user mutation or authorization action is added. Transport/loader instrumentation remains the acquisition-attempt record but receives no foreground/background marker; this feature intentionally adds no cache telemetry schema.
- **Information disclosure:** A positive window extends eligibility for previously authorized bytes. Default zero, exact scope, sensitive-use warnings, and coordinated downstream purge bound the risk.
- **Denial of service:** Work is access-triggered and constant-time with one owned refresh, but repeated detachment or immediate retry after failure can pressure sources; finite transport lifetime and source controls are host preconditions.
- **Elevation of privilege:** A stale value carries no authority. Guard rejection prevents that caller from consuming shared state and does not authorize a refresh.

No payment or new trust boundary is introduced, so the feature-dev deep PASTA trigger is not met. Full STRIDE and an attack tree are present because personal or tenant-sensitive retained content is plausible.

## Privacy and data protection

No new data type is collected, serialized, logged, shared, or transferred. Private metadata contains only process-local promise/generation identities and clock samples, weakly owned by the live Map.

The material privacy change is optional retention. A host setting a positive staleWindow accepts that a source-side update or erasure may not affect a previously authorized process-local value until the acquisition hard boundary. A normal render can also derive HTML with a later independent UI-cache settledAt and persist it through the unchanged adapter.

Therefore acquisition purge is not an erasure-completion proof. For sensitive content the operator must set the window to zero, purge exact acquisition state, dispose affected roots/prepared indexes, purge affected UI fragments, and clear/save the external persistence envelope. Backup, external-store, audit-certificate, and data-subject workflows remain host responsibilities; this library makes no claim that they are complete.

Content moderation, free-text ingest, consent capture, third-party sharing, AI processing, DSA, AI Act, CCPA sale, audit-table mutation, cryptography, residency, health, and financial-record controls are N/A because no corresponding surface changes.

## Defaults and operator friction

The safe compatibility path requires no action: every participating owner declares staleWindow zero, and absent third-party fields also resolve to zero. Positive retention is explicit and independently configurable. Invalid values never degrade into an enabled window or disable ordinary TTL freshness. ttl zero and zero window provide runtime kill switches; Infinity remains an explicit non-expiring ttl choice rather than an inferred fallback.

The documentation forbids treating acquisition purge as downstream revocation and gives the sensitive rollback sequence at the configuration point. No broad purge is inferred from malformed exact input.

## Static and dependency evidence

- Semgrep security-audit and JavaScript rules: 83 rules, five changed runtime files, zero findings.
- npm audit, production-only and full tree: zero vulnerabilities.
- No third-party dependency, secret, environment access, dynamic code execution, regex sink, logging call, HTTP header behavior, or runtime import was added.
- Exact policy-ownership tests prevent staleWindow from spreading to rendered-fragment cache or consumer-local state machines.

## Residual risk acceptance

The host that enables a positive window accepts four explicit residuals:

1. Previously authorized content can be served during that finite interval after source change.
2. Derived fragments may outlive the acquisition deadline under their separate owner.
3. Detached refresh work may retain captured inputs until the unchanged loader settles.
4. Background completion and direct cache-level error telemetry are not portable guarantees, especially after serverless response return; the unchanged transport seam cannot label background versus foreground acquisition.

These are bounded, documented, default-off policy tradeoffs. Positive windows should not be used for authentication/authorization decisions, secrets, payments, or regulated erasure-sensitive caches without a new threat review and host-specific lifecycle controls.

**Verdict:** PASS. No valid security, privacy, insecure-default, or safety-friction finding remains in the local candidate.
