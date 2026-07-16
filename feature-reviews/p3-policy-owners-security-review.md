# P3 Explicit Policy Owners — Differential Security Review

**Branch:** `feature/p3-policy-owners`
**Baseline:** `dev` at `1b28afb`
**Date:** 2026-07-16
**Risk:** HIGH (render availability, shared caches, and browser asset URL sinks)
**Verdict:** PASS — no unresolved security finding

## Scope and Coverage

The review covers the complete working-tree runtime diff: three new injected policy owners, nine
direct consumer packages, CSS/JS URL and DOM behavior, manifest cache acquisition, host wiring,
package metadata, tests, and documentation. The publication blast radius is twelve packages: three
new `1.0.0` owners and nine patch releases.

Every changed runtime file and its one-hop caller was traced. Removed security-sensitive code was
compared with `dev`, its blame/history was inspected, and all prior public singleton methods and
fields were mechanically compared. Semgrep ran 83 JavaScript/multilanguage rules over the twelve
changed runtime files with zero findings. The production dependency audit reports zero
vulnerabilities.

## Historical Security Baseline

The centralized code preserves controls introduced by these security-relevant commits:

- `880bc3f` — guard data-driven CSS/JS URLs before DOM insertion.
- `91d90b4` — guard document-based asset URL resolution.
- `9a0a521` and `b811728` — separate fetch-cache identity by request policy/base.
- `aeabdcd` — recheck request policy on manifest pack cache hits.
- `ac30143` and `5cc8cbc` — isolate asset queues by render while retaining legacy adoption.
- `d05a5fd` — bound and validate runtime UI closure manifests.

The new owners move those controls without weakening their order: alias/base resolution and request
policy still precede DOM creation; consumer key functions still precede shared promise mechanics;
manifest guarded hits still await `allowed()` before exposing a cached pack.

## Trust Boundaries and Data Flows

```text
view/context -> consumer facade -> bounded render-context owner -> root/null/state

request identity -> consumer key -> promise-cache owner -> hit guard or loader
                                             -> bounded LRU / identity cleanup

queued CSS/JS descriptor -> asset owner -> alias/base URL -> awaited request allow
                                                     -> create element -> append head
```

No new remote input, identity, authorization, secret, database, filesystem, process, crypto,
logging, or third-party runtime boundary is introduced. The existing host-injected request policy
remains the authority for network and asset destinations.

## Attack Scenarios and Controls

| Scenario | Risk | Control and evidence |
|---|---|---|
| Cyclic render parent chain exhausts a worker | Availability | `Set` cycle detection and a default 128-edge maximum return `null`; child-process sentinels prove request/manifest paths terminate. |
| Excessively deep attacker-influenced context consumes unbounded work | Availability | Root lookup is O(depth) but stops at 128 edges by default; exact-bound and limit-plus-one tests pass. |
| Late rejected promise deletes a newer cache entry | Integrity/availability | Rejection removes the key only when the cached identity is the same promise; stale-rejection regression passes. |
| Concurrent identical requests bypass dedupe or grow work | Availability | In-flight promises are inserted and reused through the caller-owned Map; focused data/HTML/TSS/manifest tests pass. |
| Manifest pack hit bypasses a changed request policy | SSRF/policy bypass | Optional owner `hit` hook awaits manifest `allowed()` on every hit before returning the cached promise. |
| UI alias or document base resolves an external CSS/JS URL | Script/style injection | Normalization and awaited request `allow()` complete before `createElement()` or `appendChild()`; both plugin regressions assert zero element creation on denial. |
| Policy or insertion failure poisons the next render | Cross-request state leak | `afterView()` clears render-local cache/collection in `finally`; blocked-policy and append-failure tests pass for CSS and JS. |
| Missing owner injection silently falls back to unsafe local logic | Policy bypass | Compatibility facades dereference the injected owner and fail loudly; no duplicate implementation remains in consumers. |
| Test singleton mutation hides a broken security collaborator | False assurance | Review found incomplete CSS/JS host reset; a failing wiring test was added first and reset now restores the complete injected graph. |

## Findings

### Fixed during review — incomplete asset collaborator reset (Low)

The full-pipeline harness newly wired CSS/JS plugins but initially restored only their shared owner
and mutable queues. A prior test could replace the method, request-policy, resolver, or plugin
collaborator and influence a later boil. The focused reset test failed first; `reset()` now restores
the complete asset injection graph and the test passes. This affected test isolation, not published
runtime behavior, but closing it protects the security evidence.

### Open findings

None.

## Defaults, Dependencies, and Sinks

Defaults remain bounded (`render-context-model.max = 128`; consumer cache maxima remain 32 or 512),
missing DI fails loudly, URL denial rejects before DOM work, cache failures remain retryable, and
asset cleanup is unconditional. Hosts retain intentional mutable maxima and request-policy seams;
the change does not add an environment override or permissive fallback.

No third-party runtime code or runtime import was added. New package dependencies describe injected
`@jtorm/*` wiring only. `npm audit --omit=dev` is clean. The only changed sinks are the existing URL
normalization and DOM insertion operations moved byte-for-behavior into `asset-plugin-model`; no new
HTML, script, filesystem, process, or network sink exists.

## Limitations and Confidence

- Opposite-model adversarial review is unavailable because the maintainer explicitly marked Claude
  unavailable. The `adversarial-review` skill therefore cannot run under its hard cross-model rule;
  local skeptic, architect, and minimalist passes are used instead.
- The differential-review skill's linked companion methodology/report files are absent from the
  installed ai-config checkout. Its primary history, trust-boundary, attack-scenario, blast-radius,
  and report workflow was applied directly.
- External production host composition is outside this repository. Exact dependency minima,
  package docs, the local full-pipeline host, and publication dry-runs are the available integration
  evidence.

Confidence is high for repository-owned behavior and moderate-high for external adoption because
the release is coordinated but third-party host DI cannot be inspected here.
