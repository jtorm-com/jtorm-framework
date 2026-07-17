# Fail-Closed Shared Cache Discriminator — Evaluation

**Branch:** `agent/fail-closed-shared-cache-discriminator`
**Base:** `dev` at `b96b850de9c9f953329b551ee78551dfb9f608a9` (merged PR #58)
**Started:** `2026-07-17T17:26:06Z`
**Status:** IN_PROGRESS
**Mode:** Post-implementation evaluation
**Delivery:** Ready PR into `dev` pending

## Scope and Ownership

This evaluation covers only the fail-open tenant/request-discriminator half of architecture
weakness #12. TTL, clocks, purge, stale-while-revalidate, and persistent schema redesign remain the
next independent follow-up.

| Surface | Ownership after the change |
|---|---|
| `@jtorm/render-context-model` | Existing bounded normal root resolution plus bounded own-link cache-root resolution |
| `@jtorm/request-model` | Primitive discriminator validity, exact fetch policy, UI first-match discriminator, and undefined unscoped key |
| `@jtorm/promise-cache-model` | True undefined-key bypass before every Map/LRU operation |
| data/HTML/TSS and UI manifest | Propagate the request-owner decision; retain loaders, parsing, validation, and domain behavior |
| UI cache | Consume injected owners before fragment state/recency/dirty/persistence; quarantine ambiguous persisted input |
| Test host | Inject/reset the owners and expose a narrow five-cache reuse seam for cross-render proof |

Runtime source remains pure CommonJS with zero imports. No endpoint, database, queue, worker,
credential, external service, third-party runtime dependency, or new package is introduced.

## Entry Points and Data Flow

Fetch consumers call the injected `cacheKey(url, context)`. A valid policy retains the exact
tagged policy + NUL + resolved URL bytes and enters the existing promise/LRU owner. `undefined`
calls the ordinary loader directly, without a shared read, insertion, in-flight identity, rejection
eviction, hit callback, recency update, or LRU eviction.

UI first resolves an own-link cache root, then asks request-model for the existing root-tenant,
request-tenant, request-origin, effective-request-base precedence. Unscoped reads miss and writes or
saves return before render state. Persisted reload is disabled unless an own adapter field
`uiCacheScoped === true` attests that the host completed full-store cleanup/migration.

Manifest pack loads use the same cross-render bypass. The render-root-local prepared promise/index,
generation supersession, and atomic install remain active because they cannot cross roots.

## Red-First and Accepted Findings

The baseline focused run was 57/77: twenty failures reproduced sequential stale results,
in-flight sharing, seeded-state recency/eviction, ambiguous persisted fragment service, and get/UI
pipeline leakage. Scoped warm controls remained green.

Independent implementation review added valid red witnesses and drove these corrections:

1. inherited effective bases could cross the unchanged SSRF/allow boundary through a warm hit;
2. inherited object-valued `c`/`p` links could select prototype cache authority;
3. the first request-local parent walk violated the render-context policy-owner ratchet and was
   replaced by `renderContextModel.cacheContext()`;
4. inherited `uiCacheScoped` could authorize ambiguous legacy content;
5. root-only fetch origin/base and no-request effective-base overrides could collapse separately
   keyed fetches into one UI fragment scope;
6. an inherited raw base replaced by a deliberate `option()` override was unnecessarily bypassed.

Each finding has an executable regression. No accepted in-scope finding is currently unresolved.

## Compatibility and Reliability

| Flow | Unscoped behavior | Scoped compatibility |
|---|---|---|
| data/HTML/TSS | fresh ordinary work per call; no shared mutation | exact key, promise/AST identity, dedupe, LRU, rejection retry |
| manifest pack | fresh cross-root acquisition; failures cannot mutate pack LRU | guarded hit, digest/schema/classification, promise identity, root atomicity |
| UI fragment | miss/no-op before state, order, dirty, or save adapter | first-write, event/save timing, nested shape, locale/context/output, LRU |
| malformed/cyclic/prototype context | bounded non-throwing cache bypass | normal render-context behavior remains unchanged |
| request URL path | ordinary URL/allow/timeout/transport still executes | exact existing resolution and SSRF policy |

Unscoped traffic intentionally repeats normal transport, parse, validation, and render work,
including concurrent duplication. Scoped operations retain average O(1) cache access and current
warm behavior. Policy examines fixed fields plus the existing maximum 128-link traversal; its cycle
set is call-local and no new per-render state is retained.

## Migration, Privacy, and Security

Legacy raw and new scoped fragment bytes can be identical because prior inputs admitted NUL.
Selective classification is therefore unsafe. Upgrade starts with an empty live fragment cache and
does not read persistence until the host clears/replaces the full store and defines an own
`uiCacheScoped = true` attestation. Rollback requires another full clear or a known scoped-only
snapshot before running old code.

The change collects, logs, exports, or transfers no new data. It reduces disclosure, retention, and
linkability for unscoped content. A host can still deliberately reuse one explicit discriminator or
falsely attest a dirty store; those are documented host trust-boundary risks. TTL/purge retention is
not claimed closed.

## Package Scorecard

| Package | Version | Reason |
|---|---:|---|
| `@jtorm/render-context-model` | 1.0.1 | strict own-link cache resolver; normal resolver unchanged |
| `@jtorm/request-model` | 1.1.5 | fail-closed policy/discriminator and exact key decision |
| `@jtorm/promise-cache-model` | 1.0.1 | undefined-key true bypass |
| `@jtorm/data-model` | 1.0.6 | consume request/promise owner minima |
| `@jtorm/html-model` | 1.0.6 | consume request/promise owner minima |
| `@jtorm/tss-model` | 1.0.7 | consume request/promise owner minima; parser unchanged |
| `@jtorm/ui-manifest-model` | 1.0.2 | cross-render pack bypass and owner minima |
| `@jtorm/ui-cache-model` | 1.0.6 | request DI, strict root minimum, fragment/persistence bypass |

Publication order is render-context, then request and promise-cache, then the remaining five
consumers. Other compatible consumer ranges remain unchanged.

## Verification

| Gate | Result |
|---|---|
| Baseline red | 57/77 pass; 20 intended failures before runtime edits |
| Review red/green | inherited-base, inherited-link, attestation, fetch/UI divergence, and facade witnesses fixed |
| Focused model/cache/get/UI/pipeline/source suites | 219/219 PASS |
| Exact `npm test` | 631/631 PASS |
| `npm run typecheck` | PASS |
| Source ownership ratchet | 10/10 source/ownership guards; task-specific no-edit report/sentinel PASS |
| Semgrep / syntax / runtime imports | 83 rules / 8 runtime files / 0 findings; all changed JS parses; zero runtime `require()` |
| Package publication dry-runs | 8/8 PASS; exactly 3 intended files each |
| Dependency audits | production and full development audits: 0 vulnerabilities |
| JSONL / `git diff --check` | 289/289 records valid; diff hygiene PASS |
| Tech-debt ratchet | PASS on exact staged candidate |
| Ready PR / CI / current-head Codex review | PENDING; PR must remain unmerged |

## Routed Review Disposition

Architecture, differential security, refactor compatibility, insecure defaults, safety friction,
privacy, bounded threat modeling, production readiness, source ratchet, tech-debt ratchet, and
Semgrep are applicable. API, frontend, infrastructure, database, queue, payment, AI/LLM, growth,
moderation, and audit-log-specific gates are not applicable because the diff adds none of those
surfaces.

Independent architecture, security/privacy, and readiness reviews report no remaining reproducible
finding after 214, 123, and current exact/focused verification respectively. The staged tech-debt
gate and remote delivery gates remain required before completion.

## Review Limitations

External host persistence and deployment composition cannot be executed in this repository. The
available evidence is package metadata and dry-runs, host harness DI/reset tests, executable
migration fixtures, full local gates, CI, and current-head Codex review. A host's discriminator
truth and cleanup attestation remain outside framework enforcement.
