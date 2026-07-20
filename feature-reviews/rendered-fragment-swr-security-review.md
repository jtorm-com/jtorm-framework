# Request-Triggered Rendered-Fragment SWR — Security Review

**Date:** 2026-07-19
**Status:** MERGED — PR #74; IMPLEMENTATION APPROVED WITH HOST-OWNED RESIDUALS
**Specification:** [rendered-fragment-swr-implementation.md](rendered-fragment-swr-implementation.md)
**Threat model:** [stride-rendered-fragment-swr.md](stride-rendered-fragment-swr.md)
**Evaluation:** [rendered-fragment-swr-evaluation.md](rendered-fragment-swr-evaluation.md)

## Security Verdict

**PASS for the additive library implementation; positive enablement remains conditional on the
documented host authority, lifetime, revocation, privacy, and observability contract.**

Generic framework-owned replay remains rejected. The implementation adds only the preferred
host-injected boundary: default-zero policy, exact stable authority/session attestations, frozen
metadata-free capabilities, one attempt per process generation, strict hard boundaries, and an
atomic cache/dirty publication transaction. Without the same valid host on model and plugin, the
exact blocking path remains in force.

The original pre-code findings below are preserved as design evidence. Each library-owned blocker
is resolved and verified in the final disposition; platform lifetime and bounded stale visibility
remain explicit opt-in host residuals.

## Pre-code Blocking Findings and Required Controls

| ID | Severity | Finding | Evidence | Required disposition |
|---|---|---|---|---|
| RF-SWR-S1 | High | Framework replay can duplicate observable lifecycle effects | Arbitrary injected method/event/plugin callbacks execute in `handler.js:85-109` and `event-model.js:61-82`; built-in `layerModel.set()` mutates root state at `layer-model.js:106-140` | Do not replay. Only an explicitly authorized isolated host session may run the complete lifecycle. |
| RF-SWR-S2 | High | Reusing the blocking lease lets old work overwrite a newer generation | Independently reproduced `acquire -> put(NEWER) -> complete(OLD) -> OLD`; `complete()` lacks exact retained pair equality | Introduce a distinct cache-owned retained-generation transaction and red-first newer-publication test. |
| RF-SWR-S3 | High | Current cache publication is not atomic with persistence-dirty state | `publish()` completes before root `touch()` at `ui-cache-model.js:578,643` | A new synchronous transaction must capture, update, and roll back both cache metadata and exact root dirty/revision state. |
| RF-SWR-S4 | Critical if implemented incorrectly | A captured scope key or mismatched isolated view could publish cross-tenant HTML | Current lookup/completion checks exist, but no async host-session authority/epoch contract exists | Reauthorize at lookup, host-session creation, every hard join, and completion; require current host-owned epoch attestation and exact coordinates. |
| RF-SWR-S5 | High | Wire v1 cannot enforce one attempt across restarts | V1 stores exact bytes and `settledAt`, but no generation or attempted marker | Explicitly accept a new process-local loaded generation per restart, or separately version/authenticate/migrate durable attempt identity. |
| RF-SWR-S6 | High residual for a future opt-in | A positive window extends visibility after downstream permission/data changes | Current discriminator proves caller scope, not freshness/revocation of every value embedded in HTML | Default zero; explicit host acceptance and domain-coordinated root/UI/persistence/source purge. |
| RF-SWR-S7 | High, host-dependent | Detached refresh work or save can hang, freeze after response, reject invisibly, or consume resources | No current host refresh lifetime, cancellation, concurrency, outcome, or observed save seam exists | Host owns finite limits, cancellation, outcome records, best-effort claims, and awaited save when durability matters. |

These were design findings, not reports of an exploitable default path; their required controls now have red-first implementation evidence.

## STRIDE Review

| Category | Result |
|---|---|
| Spoofing | PASS in library — captured keys are not authority; stable host epoch plus current and exact-root ownership attestations gate activation, execution, join, and publication. |
| Tampering | PASS — exact-generation invalidation and the combined cache/insertion-record/dirty rollback transaction cover the reproduced races. |
| Repudiation | PASS at the seam — render starts synchronously with one observed native Promise and refresh after-view awaits save; truthful durable records remain host-owned. |
| Information disclosure | PASS for exact scope/hard-bound controls; positive retention after downstream revocation remains an explicit host residual. |
| Denial of service | PASS for bounded one-attempt-per-generation framework state and settled hard followers; host concurrency/cancellation/platform lifetime remain required. |
| Elevation of privilege | PASS — cache code cannot construct a root or call the handler; only an injected host with a valid exact session can run the full lifecycle. |

The linked deep dive completes all seven PASTA stages, three attack trees, cross-component chains, risk ranking, countermeasure ownership, conditional tests, and explicit residual acceptance. Its post-implementation addendum maps every High/Critical control to implementation and tests.

## Authorization, Privacy, and Revocation

Rendered HTML may range from public to tenant/user-restricted. Every lookup and consumption point derives current own-property tenant/origin/effective-base scope and exact language/component/variant identity; the host separately attests current authority. A lease, key, captured view, or host-supplied string is never authority. Before the activated
target's first iteration binds, exact coordinates and valid current scope are mandatory; drift,
deletion, malformed/cyclic scope, authority rotation, or session revocation rejects the lifecycle
before handler effects. Different-coordinate nested lookups are admitted only after that target bind.

A positive stale window changes retention truthfully: previously authorized bytes may remain visible to a currently authorized caller until the strict original hard boundary even after embedded data or permissions change elsewhere. The framework has no universal downstream revocation feed. Hosts with erasure-, secret-, payment-, authentication-, authorization-, or regulated-data sensitivity must keep the window zero unless they provide and test coordinated invalidation of prepared roots, exact/full UI cache, persisted envelope, and relevant acquisition/source state.

No new wire field is persisted. The implemented attempt marker and authority/session/generation
records remain process-local and private. A future durable attempt identity would require a new
privacy, migration, mixed-reader, backup/erasure, authentication, and major-SemVer review.

## Defaults and Safety Friction

- Missing, inaccessible, invalid, throwing, or zero stale-window configuration must preserve existing blocking behavior.
- A positive window without the host collaborator, current authority epoch, or valid execution capability must fail closed to blocking behavior; serving stale without authorized replacement work is prohibited.
- Hard equality never serves stale. Refresh failure never slides age, retries the live generation, or creates stale-if-error fallback; temporary fresh reclassification preserves the consumed-attempt marker.
- No timer, poller, job, queue, validator, acquisition-cache behavior, broad purge, hidden bypass, or permissive fallback is introduced.
- `ttl = 0` remains pending-only; explicit `Infinity` remains the only non-expiring TTL.

## Security Checklist Disposition

| Checklist area | Disposition |
|---|---|
| Authorization and zero-trust architecture | PASS in library: stable host identity, opaque epoch/session/capability, literal current/ownership checks, and exact scope/generation revalidation. Positive hosts must implement the declared decisions correctly. |
| Threat modeling | PASS: full PASTA preceded code and the post-implementation addendum verifies every High/Blocker library control. |
| Rate limiting and abuse prevention | PASS in library for one bounded attempt per exact process generation; host concurrency, cancellation, and platform lifetime remain enablement requirements. |
| Audit-trail integrity and security anomaly detection | N/A for the library (no service/log sink). Positive hosts own truthful bounded outcome telemetry and must not log HTML, authority/session objects, capabilities, or tenant identifiers. |
| Authentication and behavioral auth flows | N/A; no credential, login, token, MFA, session issuance, recovery, or auth state machine changes. Positive fragment windows remain prohibited for auth decisions without a new review. |
| Injection | N/A; no SQL, shell, template-input, expression, regex, deserialization, or command sink is added. Existing rendered-content validation must remain in the full lifecycle. |
| Secrets handling and rotation | N/A; no secret, environment variable, credential store, rotation path, or log field changes. |
| Cryptography | N/A; no algorithm, key, signature, nonce, digest, or encryption protocol changes. A future authenticated wire version would require a separate crypto design. |
| SSRF and external requests | N/A; no URL, request, redirect, DNS, transport, validator, or acquisition behavior changes. The host seam must not bypass existing request policy. |
| Security headers | N/A; no HTTP response, cookie, CSP, CORS, HSTS, or cache header changes. |
| API asset management | N/A for network APIs; additive package surfaces are versioned in promise-cache `1.3.0`, UI-cache `2.1.0`, and plugin `1.1.0`. |
| Dependency security | PASS; no dependency or runtime import is added. |
| Mobile, queue/message, AI/LLM, and Supabase RLS | N/A; no corresponding platform, data flow, or control plane exists in scope. |

## Infrastructure and Operations Disposition

No worker, service, database, migration, queue, cron, timer, secret, route, or storage SDK is added. Existing live publication and arbitrary external persistence remain separate boundaries. Any positive-window host must document:

- whether post-response work can run at all and that completion is best-effort where applicable;
- finite render/transport deadlines, cancellation, per-scope concurrency, and resource ownership;
- current-epoch invalidation on root/registry/policy replacement;
- observed save failure, immutable adapter payloads, external write ordering, and no false durability claim;
- coordinated zero-window rollback, cache/root/persistence purge, and mixed-version deployment isolation; and
- alerting/SLO/cost ownership for refresh attempts without placing sensitive HTML or discriminator values in telemetry.

Cloudflare Workers limits, database migration safety, Postgres performance, email deliverability, and cloud-specific deployment controls are N/A until a real host implementation selects such a platform.

## Residual Risk Acceptance

The additive library ships with `staleWindow = 0`; no background lifecycle or stale service occurs
until a host deliberately supplies both positive policy and the exact stable collaborator.

A positive-window host explicitly accepts bounded same-scope stale visibility, lifecycle-effect
authorization, one new process-local attempt after restart, detached work until host cancellation or
settlement, platform-specific best-effort completion, and external adapter ordering/durability.
Cross-scope disclosure, hard-bound stale service, synthetic timestamps, generation resurrection,
hook suppression, and cache/dirty partial publication remain unaccepted and are guarded by tests.

## Final Verdict

**SECURITY REVIEW COMPLETE: APPROVE THE ADDITIVE LIBRARY IMPLEMENTATION.** Default and missing-host
paths fail closed. Positive enablement is approved only for hosts that satisfy the documented
authority, lifecycle, resource, revocation, privacy, telemetry, save, deployment, and rollback
contract.
