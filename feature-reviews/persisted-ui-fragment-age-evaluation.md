# Persisted UI Fragment Age — Evaluation

**Branch:** `feat/persisted-ui-fragment-age`
**Base:** `dev` at `3c614cd5cf65854d5e85922445a7fca1221db659`
**Started:** 2026-07-18
**Status:** Implementation and local gates complete; remote delivery in progress
**Specification:** [`persisted-ui-fragment-age.md`](persisted-ui-fragment-age.md)
**Security review:** [`persisted-ui-fragment-age-security-review.md`](persisted-ui-fragment-age-security-review.md)
**Differential review:** [`persisted-ui-fragment-age-differential-review.md`](persisted-ui-fragment-age-differential-review.md)
**Adversarial review:** [`persisted-ui-fragment-age-adversarial-review.md`](persisted-ui-fragment-age-adversarial-review.md)

## Scope and outcome

Rendered UI fragments now persist in exact wire version 1 with their original successful
settlement time. On restart, `@jtorm/ui-cache-model` validates and stages the entire bounded
envelope, calculates original elapsed age from one restart-stable Unix-ms clock sample, and asks
`@jtorm/promise-cache-model` to restore only the correct process-local remaining lifetime under the
currently configured finite/zero/Infinity TTL. Reload, save, and hits never freshen age.

The exported live `cache` remains `{language:{cid:{scopedVariant:html}}}`. Order records, fragment
bytes, singleton identity, write-once behavior, render leases, event ordering, dirty revisions,
plugin after-view timing, tenant/origin/base isolation, and normal warm-hit behavior remain
compatible. The public adapter payload is intentionally incompatible, so UI-cache is `2.0.0`.

This change is limited to rendered-fragment persistence. Data, HTML, TSS, manifest-pack metadata,
stale-while-revalidate, background refresh, and HTTP validators remain outside it.

## Defect and red-first evidence

The initial focused regression persisted a scoped fragment at `t0`, restarted at `t0 + ttl - 1`,
and observed the prior implementation serving it for another full TTL. The old `init()` assigned
reload time to every persisted fragment. That red witness was committed before runtime changes.

Review then found and proved three additional implementation defects red-first: a throwing adapter
`get` accessor escaping the cold-load boundary, test-engine adapter leakage between renders, and a
rejected replacement publication losing the previous promise-cache stamp. All three now pass, as
do the adversarial duplicate and mixed-age proofs.

## Ownership and data flow

| Concern | Owner after this change |
|---|---|
| Current TTL validation, strict `< ttl`, process clock/identity, non-sliding freshness, opaque restoration | `@jtorm/promise-cache-model` |
| Adapter wire v1, original Unix-ms settlement, descriptor validation, live byte/timestamp pairs, LRU persistence | `@jtorm/ui-cache-model` |
| Exact tenant/origin/base discriminator and URL/SSRF policy | unchanged `@jtorm/request-model` |
| Render root and root-local dirty/revision state | unchanged `@jtorm/render-context-model` |
| Deferred publication after handler/event success and existing after-view save timing | unchanged `@jtorm/ui-cache-plugin` plus completion/abort lifecycle |
| Clock/adapter/model injection and singleton reset | host DI and test engine |

The load path is attestation -> adapter get -> exact whole-envelope validation -> one process sample
-> one absolute sample -> current-TTL age restoration -> staged content/order/two metadata owners ->
atomic generation swap. The save path is valid scoped dirty root -> bounded authenticated live
snapshot -> recursive freeze -> one adapter call -> revision-safe dirty clear.

## Architecture review

1. **Problem fit:** persisting original successful settlement directly fixes the restart extension
   without adding stale semantics or changing other caches.
2. **Policy ownership:** absolute persisted time belongs at the UI persistence boundary; opaque
   process freshness and TTL remain wholly in promise-cache-model. No runtime import is added.
3. **Compatibility:** live cache/order shapes and every existing public field/method remain. Only
   the adapter wire changes and receives the required major version.
4. **Failure atomicity:** init publishes one complete generation or an empty clean generation. Save
   hands the adapter one complete frozen byte/timestamp envelope. Live hits authenticate the exact
   content/order/store/time pair.
5. **Concurrency:** a lifecycle revision rejects delayed init after new work; leases and completion
   ordering remain; root revisions preserve async-save retry state; external write ordering stays
   adapter-owned.
6. **Security:** own attestation plus own recognized version is mandatory. Unscoped work returns
   before adapter/clock/shared state. Hostile persistence and invalid time fail cold.
7. **Resources:** live hits are O(1); init/save are O(n) for `n <= max`; metadata and leases share the
   same bound; there are no timers, jobs, retries, or per-render retained fields.
8. **Operations:** migration, privacy, deployment order, mixed-reader isolation, and downgrade
   clearing/restoration are documented and fixture-backed.

**Architecture verdict:** PASS. Architecture weakness #12 remains closed; this completes only its
separately tracked P4 persistence enhancement.

## Refactor and compatibility review

- Pure CommonJS, DI-only runtime and singleton exports are unchanged; no `src/**/*.js` import was
  introduced and no handwritten TypeScript/declaration exists.
- `cache`, `order`, `get`, `set`, `put`, `stage`, `complete`, `abort`, `save`, `purge`, and
  `purgeAll` remain available. Normal arguments and return/output bytes are preserved.
- Promise-cache gains one additive owner method, `restore()`. UI-cache never inspects its result.
- The existing scoped discriminator, request/manifest/parser/handler paths, LRU order, write-once
  rule, sequential/concurrent dedupe, language/`cid`/`cs`/`v.r`, and event/save timing are covered
  by focused and full tests.
- Helpers are local to the one changed persistence owner; no generic persistence framework,
  compatibility shim, duplicate clock policy, dependency, or dead branch was added.
- Root and package READMEs, exact fixtures, package ranges, and locked `AGENTS.md` ownership match
  the runtime contract.

**Refactor verdict:** PASS.

## Insecure-defaults and safety-friction review

| Decision | Result |
|---|---|
| Default retention | finite five-minute TTL |
| Legacy/unknown store | quarantined; never assigned current time |
| Load authorization | own data-property attestation plus own recognized version |
| Invalid time/config | fresh miss; no inferred or fallback timestamp |
| Non-expiration | explicit `Infinity`, while original timestamp remains persisted |
| Migration | cold clear/new namespace is easiest; trusted external timestamp migration is explicit |
| Downgrade | persistence must be disabled and v1 cleared/compatible state restored before 1.x |
| Remote administration | no route added; host authorization/audit/rate limiting remain required |

No unsafe convenience switch, permissive fallback, sentinel identity, hardcoded secret, warning
suppression, or new dependency exists.

**Insecure-defaults and safety-friction verdict:** PASS.

## Privacy and compliance review

`settledAt` is one new persisted Unix-ms activity datum per already persisted fragment. For a
user-specific fragment it may be personal activity metadata. It is used only for expiry, is not a
user identifier, and is not logged, aggregated, returned, copied to analytics, or stored separately.
It follows the fragment's exact tenant/origin/base boundary and must receive the same access
control, encryption-at-rest choice, retention, incident response, replica, backup, erasure, and
residency treatment.

Expiry/purge removes live content and timestamp together; a later successful save omits both.
External backup/replica erasure remains host-owned. No consent, advertising, profiling, moderation,
DSA, AI, payment, health, child, employment, or regulated-record flow changes.

**Privacy/GDPR-erasure/audit-integrity/compliance verdict:** PASS. Data minimization is satisfied;
the timestamp is necessary to enforce the promised retention bound.

## Infrastructure review

No service, route, database, table, migration runner, queue, worker, cron, timer, secret, network
policy, storage SDK, or cloud resource is added. The existing injected adapter is the only external
boundary. Failed `get()` yields a cold cache; a configured failed `set()` remains dirty and is
observable to an awaited direct call. The plugin's fire-and-forget timing is deliberately unchanged.

The adapter owns external atomic durability, write ordering/CAS, cancellation/timeouts, backups,
metrics, and alerts. The framework guarantees a complete frozen call payload, bounded O(n) work,
and ordinary cold rendering when persistence is unusable. Deployment requires quiesced/isolated
writers and coordinated model/plugin versions; rollback requires store isolation or clearing.

**Infrastructure verdict:** PASS; no infrastructure-specific implementation is required.

## Threat-model applicability

The persistence format and absolute clock cross an untrusted storage/deployment boundary, so the
full STRIDE and PASTA analysis was applicable and was rerun against implementation. The final DFD,
assets, actors, attack trees, failure-atomicity invariants, control-to-test matrix, privacy/resource
analysis, deployment gate, and residual host-clock/adapter risks are in the security record.

**Threat-model verdict:** `DEEP_DIVE_COMPLETE` / PASS. Re-run it independently for any future stale
fallback, background refresh, HTTP validator, generic remote adapter, or new administrative route.

## Source-ratchet, static analysis, and tech-debt review

The existing policy-ownership ratchet was updated only for coordinated versions/ranges and the
PM-owned `restore()` seam. The source-ratchet review inspected the analyzer and helper, ran its four
tests, and converged with the required no-edit sentinel; behavior remains protected primarily by
deterministic tests rather than brittle source regexes.

Semgrep 1.146.0 ran the JavaScript, security-audit, and OWASP registries over both changed runtime
files: 88 rules, zero findings, no suppressions. Runtime-import and pure-JS guards pass. Full and
production-only npm audits report zero vulnerabilities. The final exact staged tech-debt ratchet
passes with zero findings.

## Production readiness

| Category | Assessment |
|---|---|
| Architecture/dependencies | two existing DI owners; no new runtime dependency/service; exact coordinated versions documented |
| Reliability/resilience | whole-load atomicity, cold failure, exact pairing, lifecycle generation checks, dirty retry, no stale fallback |
| Capacity/performance | O(1) hits; O(n <= max) init/save; bounded pairs/flights; one extra number per fragment; no timers/jobs |
| Deployability/migration | exact v1 golden, cold-clear/trusted migration, coordinated deployment, mixed-reader prohibition |
| Operability | direct awaited save exposes failures; adapter metrics/atomicity/order are host-owned; fragment cache remains disposable |
| Security/privacy | fail-closed scope/provenance/version, no log/secret/network change, paired erasure and documented activity metadata |
| User experience | byte-stable warm hits only for actual remaining life; expiry pays unchanged fresh-render latency and deduplication |

Residual risks are a consistently wrong host clock, a restart regression that remains above every
stored settlement and is therefore undetectable, external adapter tearing/reordering, and host
backups retaining purged state. All are explicitly assigned to the host; detectable violations fail
cold. No framework-addressable High or Medium risk remains.

**Production-readiness verdict:** PASS locally; ready PR, CI, and current-head Codex gates remain.

## Package SemVer

| Package | Release | Reason |
|---|---:|---|
| `@jtorm/promise-cache-model` | `1.0.3` | additive bug-fix restoration seam owned with current TTL policy |
| `@jtorm/ui-cache-model` | `2.0.0` | incompatible public save-adapter wire |
| `@jtorm/ui-cache-plugin` | `1.0.3` | coordinated direct UI-model dependency range `^2.0.0` |

No other runtime package changed or received a bump.

## Quality score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | two explicit policy owners, no import/framework drift |
| Consistency | 10/10 | singleton/DI/LRU/lifecycle conventions preserved |
| Type safety | 10/10 | exact runtime descriptor/type guards; scoped JSDoc typecheck unchanged |
| Validation | 10/10 | complete exact bounded envelope before swap |
| Error handling | 10/10 | load cold, save retry, no fallback time |
| Security/privacy | 10/10 | fail-closed provenance/scope/pairing and minimized timestamp |
| Performance | 10/10 | O(1) hits; bounded O(n) boundaries; no background state |
| Maintainability | 10/10 | flat wire and local helpers; exact docs/fixtures |
| Testability | 10/10 | dual deterministic clocks, hostile envelopes, races, pipeline restart |
| Readability | 10/10 | public schema names and documented invariants match implementation |
| **Total** | **100/100** | **No unresolved review finding** |

## Verification ledger

| Gate | Result |
|---|---|
| Red-first defect | PASS — restart just before expiry reproduced the old full-TTL extension before runtime changes |
| Review findings | PASS — adapter accessor, harness isolation, and replacement rollback reproduced red then fixed |
| Focused promise/UI/plugin/discriminator/TTL/purge/wiring/isolation/pipeline | PASS — 143/143 |
| Exact `npm test` | PASS — 705/705 |
| `npm run typecheck` | PASS |
| Package dry-runs | PASS — promise-cache `1.0.3`, UI-cache `2.0.0`, plugin `1.0.3` |
| Syntax/JSON/JSONL/source/diff guards | PASS |
| Semgrep | PASS — 88 rules, zero findings |
| Dependency audits | PASS — full and production-only, zero vulnerabilities |
| Cross-model adversarial review | PASS — three lenses, no unresolved finding |
| Source-ratchet review | PASS — four analyzer tests and no-edit convergence sentinel |
| Staged tech-debt ratchet | PASS — zero new debt patterns on the exact feature-only index |
| Ready PR / CI / current-head Codex | Pending delivery |

## Current verdict

**PASS; REMOTE DELIVERY PENDING.** The specification, implementation, red-first proof, reviews,
local verification, documentation, package artifacts, staged debt gate, and migration/rollback
contract are complete. The remaining work is a ready PR into `dev`, green CI, and a clean Codex
review against the final head with zero unresolved threads. The PR will remain unmerged.
