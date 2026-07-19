# HTTP Validator Acquisition — Production Readiness

**Date:** 2026-07-19
**Status:** PASS

## Readiness Matrix

| Category | Result | Evidence |
|---|---|---|
| Reliability and failure handling | PASS | 200/304/error/parser/rejection paths are explicit; detached 304 fails closed; existing SWR failure semantics are unchanged |
| Concurrency and lifecycle | PASS | single-flight hard/SWR work; exact generation checks; purge/reset/eviction/Map/newer-generation races covered |
| Performance and scale | PASS | O(1) generation lookup, one bounded validator, one conditional header, no body/parser on 304, no timers or polling |
| Resource bounds | PASS | metadata is capped at 1024 UTF-8 bytes; existing owner LRU bounds remain 512 and manifest-pack bound remains 32 |
| Operability and observability | PASS | request/byte/header metrics are visible through the injected transport harness; failures retain existing promise/error channels; no sensitive metadata is logged |
| Deployment and rollback | PASS | exact-false defaults permit package-first rollout; enable per owner after all `1.2.0` collaborators are present; disable then purge for immediate rollback |
| Dependencies and supply chain | PASS | zero runtime imports/dependencies; production and full npm audits report zero vulnerabilities; six package dry-runs succeed |

## Load and Degradation Behavior

Fresh hits execute no new work and do not slide TTL. At expiry, concurrent hard callers share one
pending revalidation. During the configured SWR interval, callers receive the retained value while
one refresh runs; hard callers join that work. Fast failures can be retried only by later user
requests under the existing cache contract. There is no timer, retry loop, stale-if-error addition,
background scheduler, persistence, or cancellation change.

The injected request timeout/AbortSignal behavior is preserved and covered by focused tests.
Transport concurrency limits, circuit breaking, redirect policy, and DNS policy remain host
responsibilities because this dependency-free library does not own a network client or service.

## Package Evidence

| Package | Version | Tarball bytes | Unpacked bytes | Files |
|---|---:|---:|---:|---:|
| `@jtorm/request-model` | 1.2.0 | 5,242 | 17,517 | 3 |
| `@jtorm/promise-cache-model` | 1.2.0 | 7,742 | 31,796 | 3 |
| `@jtorm/data-model` | 1.2.0 | 2,950 | 6,602 | 3 |
| `@jtorm/html-model` | 1.2.0 | 2,881 | 6,470 | 3 |
| `@jtorm/tss-model` | 1.2.0 | 3,247 | 7,633 | 3 |
| `@jtorm/ui-manifest-model` | 1.2.0 | 8,086 | 32,872 | 3 |

No package adds a runtime file beyond its existing README/package/source triplet.

## Rollout

1. Publish request-model and promise-cache-model `1.2.0`.
2. Publish the four acquisition owners with `^1.2.0` floors.
3. Upgrade all collaborators before setting any owner's `validators` field to exact `true`.
4. Enable one owner at a time and observe request count, response bytes, 304 rate, rejection rate,
   and parser/integrity failures through the host transport.
5. Roll back by setting `validators = false`; purge affected acquisition keys if an immediate cold
   boundary is required. Do not downgrade packages until the option is disabled and state cleared.

Rendered-fragment cache and persistence require no migration or rollback action because they are
unchanged and receive no validator metadata.
