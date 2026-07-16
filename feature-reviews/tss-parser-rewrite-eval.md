# TSS Parser Rewrite — Evaluation Record

**Date:** 2026-07-16
**Branch:** `agent/p3-tss-parser-rewrite` from merged PR #54 / `dev` `6e352fa`
**Status:** LOCAL COMPLETE (100/100) — staged/PR/CI/current-head Codex delivery gates pending

## Outcome

`@jtorm/tss-parser` now uses an import-free hand-written tokenizer and recursive-descent grammar with original UTF-16 line/column/offset diagnostics and immutable source/token/depth/node/declaration ceilings. The public CommonJS singleton and JSON `{s,m,p,c}` contract remain intact. The v1 implementation exists only as a source-hashed test oracle and is absent from the package tarball.

Compatibility-sensitive one-character interleavings are handled after parsing by one bounded method-lowering layout and an implicit piece rope. This phase is gated to nested declaration/child or document-root offset-collision shapes, scans the layout once for legacy coordinates, never retokenizes/re-enters the grammar/fixed-point rescans, and does not execute the frozen engine. Non-interleaved inputs return the direct recursive-descent AST.

An in-memory instrumentation probe found 55 of the 257 checked-in files enter the conservative compatibility gate, while none currently produce a different tree from the direct path. The phase remains required by the explicit external-valid-input contract: minimized quote-free sources and the generated matrices do produce different v1 outputs. Tightening the syntactic gate further would add another unproven classifier and is not required for measured corpus performance.

## Pre-PR evaluation scope

- **Mode/base:** pre-PR branch evaluation against `origin/dev` / merged-PR-#54 commit `6e352fa29295235ff989d25fc3d4b36ac076a14b`; the evaluated range is that base plus the complete tracked/untracked task diff.
- **Feature map:** runtime parser package and README; test-only oracle/differential/error/resource guards; direct view/fetched-TSS/build-compiler propagation tests; architecture/spec/security/evaluation/agent records. No other production package changed.
- **Entry points traced:** `config()`, `handle()`, `view-model.create() → handle()`, `tss-model.get() → handle() → identity cache cleanup/retry`, and manifest `compile() → lock/snapshot → handle() → finally restore`.
- **Junction questions:** no nullable/void/async authorization/count-modify/token/env-fallback junction exists in synchronous parsing. The affected async callers await their parse path, preserve error identity, and use existing identity/lock controls; parser failure cannot be mistaken for success or leave a partial AST.
- **PR comments:** not a PR yet, so no unresolved GitHub thread exists at this checkpoint. The two local cross-model review rounds are recorded below.
- **Ratchet/docs:** source-ratchet review converged. This repository has no `FEATURES.md`, `docs/features`, frontend action catalog, security STRIDE directory, or feature-review progress index; the project-specific parser README, feature/evaluation/security records, AGENTS contract, architecture backlog, and outcome ledger are the applicable documentation owners.

## Red-first ledger

| Finding / contract | Red evidence | Green result |
|---|---|---|
| Located malformed input and exact/over resource limits | 12/12 replacement-contract tests failed against v1 before production edits | All diagnostic, config, atomic-state, and resource tests pass |
| Rejected config partially mutated `c` | Atomic-config test reproduced mixed syntax/regex/limit state | Full candidate config is validated before publication; prior identities/state survive rejection |
| Selectorless root `from = 0` collision | Minimized `{child{y:2;}}`, `{a->b{x:1;}}`, nested/sibling/custom-syntax cases failed the first replacement | Dedicated collision matrix matches the oracle exactly |
| Nested method offsets in parent interleavings | `r{c->m{}x:1;d{}y:2;}` and chain variants produced extra/empty-key declarations | Bounded compatibility layout composes descendant blanking exactly |
| Compatibility projection exceeded isolate budget at 8,192 nodes | Dense method/interleaving measurement exceeded 128 MiB | Non-interleaved bypass, 4,096-node ceiling, and logarithmic parent lookup; witness is about 83 MiB / 0.18 s |
| Compatibility parent discovery was quadratic | Review traced a nested scan over prior frames despite an O(nodes log nodes) claim | Coordinate-compressed Fenwick predecessor lookup preserves exact parents and reduces the same witness from about 0.9 s to 0.18 s |

## Compatibility evidence

| Gate | Result |
|---|---|
| Frozen v1 source | SHA-256 `1a597fe542048ba719d277341ebe840a730b2f2c1152ac92b49821ec19648c27`; mutation/append/truncate controls pass |
| Published singleton/helpers | Exact initial key order, `c`, `regexes.quotes`, helper behavior, and writable reset fields pass |
| Curated grammar/custom syntax | Pass, including comments, dual-quote whitespace, shorthand, inheritance, arrays, and one-character custom syntax |
| Declaration/child matrix | 260 cases; oracle fixture hash `860ab1f0cc22c2a1b4a864900227c28d1e520338cbc876e4b568b04233d6209d` |
| Existing generated matrix | 768 cases; oracle fixture hash `91b878566d30f856592c6219742cd9d8faf51548d80cd2fd09159ee59acff3ba` |
| Adversarial generated matrix | 4,096 nested/interleaved cases; oracle fixture hash `3d274ffe1c4bf7db6b46ab9e428ed34536f9c5fccbe2bd57d16db676aca07875` |
| Reproducible extended generator | `TSS_PARSER_DIFFERENTIAL_CASES=200000 node --test --test-name-pattern='seeded nested/interleaved' test/parsers/tss-parser-differential.test.js`; 200,000 pass in 32.5 s (initial independent approximation diverged on 8,218) |
| Checked-in TSS | Direct oracle equality for all 257 `src/**/*.tss` files; existing snapshot JSON unchanged |
| Intentional v2 corrections | Quoted structural/header delimiters and literal multi-character syntax have direct expected-output tests rather than false v1 equality |

## Resource and performance evidence

Measured on Node v25.5.0 in this workspace. RSS values are `/usr/bin/time -f %M` process peaks and include runtime baseline.

| Shape | Result |
|---|---|
| 128 KiB source boundary | about 0.15 s / 76.1 MiB; one UTF-16 code unit over fails before scanning |
| 32,768-token boundary | about 0.15 s / 74.3 MiB; exact/over test passes |
| 4,096-node boundary | about 0.12 s / 66.8 MiB; exact/over test passes |
| 16,384 declarations | about 0.13 s / 68.4 MiB; exact/over test passes |
| Near-node-ceiling method/interleaving | about 0.18 s / 83.4 MiB; 5 s test timeout |
| Production source | 40,509 raw bytes / 9,046 gzip-9 bytes; 10 KiB ratchet |

Fifty passes over all 257 checked-in files produced 12,850 samples per parser:

| Parser | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|
| v2 | 0.033 ms | 0.396 ms | 1.107 ms | 3.210 ms |
| frozen v1 | 0.027 ms | 1.369 ms | 5.766 ms | 20.833 ms |

Thirty maximum-source parses measured v2 p50 34.184 ms, p95 71.905 ms, and max 73.733 ms. Normalization/tokenization remain single-pass; the compatibility rope uses logarithmic piece operations only for the explicitly detected offset-era shape.

## Consumer and publication evidence

- View-model, fetched TSS cache/retry, and UI manifest compiler tests preserve original error identity and position fields; failure empties/restores singleton state.
- Runtime source contains no `require()`, third-party dependency, dynamic load, `eval`, logging, or handwritten TypeScript/declaration file.
- `npm pack --dry-run --json` reports `@jtorm/tss-parser@2.0.0`, 12,919-byte tarball / 49,051-byte unpacked, with exactly `README.md`, `package.json`, and `src/tss-parser.js`.
- Package major version, malformed-input migration, lower-only limits, rollback pin, and no-dual-parser policy are documented.

## Reliability and data-flow review

The changed feature has no endpoint, database, queue, durable handoff, provider call, or external side effect. The applicable reset/retry boundaries have one owner each:

| Invariant / transition | Owner | Failure-matrix result |
|---|---|---|
| A successful parse publishes one complete `tree`/`pairs`/`tss`; any tokenize/grammar/resource failure publishes three empty fields | `tss-parser.handle()` | Synchronous call cannot overlap itself; success and parse/tokenize failures are covered |
| Rejected configuration cannot expose mixed syntax/regex/limit policy | `tss-parser.config()` | Candidate is validated locally and published once; identity/state preservation is covered |
| A fetched parser rejection remains retryable and cannot delete a newer cache identity | `tss-model` promise cache | Existing identity-checked rejection cleanup remains unchanged; located-error retry is covered |
| Build-time parser failure cannot poison shared compiler collaborators | UI manifest compiler lock/snapshot owner | Existing overlap lock and `finally` restoration remain unchanged; identity/position/restoration is covered |

The failure-before-publication, failure-during-parse, retry, overlap, stale-state, and reset paths therefore have explicit tests. Post-side-effect bookkeeping, cancellation, second-worker, recovery, and durable replay rows are N/A because parsing has no side effect or durable state.

## Formal review outcomes

- **review-router — PASS.** The 14-file local scope routes to test/source-ratchet and refactor review; the user-mandated architecture, differential security, tech-debt, and production gates were added. API, frontend, database, infrastructure, privacy-processing, AI, payments, queues, and growth domain reviews are otherwise N/A.
- **review-architecture — PASS.** `config → validate → atomic publish` and `source → normalize/tokenize → recursive descent → optional bounded compatibility projection → atomic publish` retain one package owner, zero runtime imports, the public singleton, and the `{s,m,p,c}` boundary. View, fetched-cache, and compiler propagation terminate in the existing owners. No new trust boundary, endpoint, secret, persistence, collection, log, or downstream execution seam exists.
- **differential-review — PASS.** The security record traces the transitive render/build blast radius and closes five findings (one high, four medium). Semgrep, production audit, frozen-oracle integrity, publication exclusion, resource ceilings, and consumer propagation are clean. The installed skill's four referenced supplemental files were absent and that coverage limit is recorded rather than implied.
- **review-refactor — PASS.** Valid behavior is independently frozen; malformed/config narrowing is a documented major-version contract; no export, dependency, adjacent production package, suppression, or speculative abstraction was added. Historical helpers remain only because they are a locked published surface. The direct parser is linear in source/tokens and the bounded compatibility path is `O(nodes log nodes)`.
- **review-privacy — PASS / applicability N/A.** Source is transient trusted framework text, no personal-data field or data store is added, and errors contain only fixed text plus numeric position. No source excerpt, value, logging, retention, transfer, moderation, audit, consent, or erasure path changes; all privacy/compliance checklist items are consequently N/A for this diff.
- **source-ratchet-review — PASS.** Complete-file SHA-256 plus mutate/append/truncate controls dominate oracle drift; package enumeration proves exclusion. A separate gzip dominating invariant has a deterministic incompressible over-budget control. Neither guard parses callable aliases, so the alias provenance matrix is out of scope.
- **production-readiness — PASS.** Exact hard ceilings, measured latency/RSS, package contents, error taxonomy, retry/restoration behavior, major-version rollout, rollback pin, and synchronous-host residual risk are documented. There is no schema, infrastructure, service, queue, or deployment-order operation. Score: 100/100.
- **cross-model adversarial review — PASS.** Two skeptic/architect/minimalist rounds found the compatibility drift, resource ceiling, stale publication, dead mapping, extension-documentation, and quadratic parent lookup issues now fixed. Proposals to remove the compatibility phase or restore exact malformed helper internals were rejected because they respectively violate exact valid-output compatibility or the replacement boundary.

## Feature evaluation score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Single DI-owned parser package; grammar and compatibility phases are bounded; adjacent owners unchanged |
| Consistency | 10/10 | Exact valid AST/order, singleton surface, quote regexes, reset state, and 257-file corpus |
| Type Safety | 10/10 | Primitive/config validation, native errors, pure JS; no handwritten types |
| Validation | 10/10 | Located malformed grammar and exact/over source/token/depth/node/declaration limits |
| Error Handling | 10/10 | Atomic publication, fixed diagnostics, identity propagation, cache retry, compiler restoration |
| Security/Privacy | 10/10 | STRIDE/resource controls, no excerpts/logging/imports/dependencies, oracle excluded from package |
| Performance | 10/10 | Bounded single-pass front end, iterative chains, logarithmic compatibility projection, measured ceilings |
| Maintainability | 10/10 | Explicit grammar, phase ownership, frozen oracle, README/spec, SemVer/rollback/migration |
| Testability | 10/10 | Red-first ledger, generated and 200k differential, snapshots, consumer and mutation controls |
| Readability | 10/10 | Terse project style with named lexical/grammar/compatibility phases and documented invariants |
| **Total** | **100/100** | No local finding remains open |

Fresh verification re-read every changed runtime/test file after the Fenwick fix, reapplied STRIDE and the locked architecture, confirmed the newly added tests execute, and found no hardcoded secret, TODO, suppression, import, or unbounded retry. Verification pass 1 confirms 100/100 with no new finding.

## Gate ledger

| Gate | Status | Evidence / remaining action |
|---|---|---|
| Focused differential/parser/resource/consumers | PASS | 69/69 after final quote-array and ratchet controls |
| Exact `npm test` | PASS | 579/579 on the reviewed candidate |
| `npm run typecheck` | PASS | `tsc -p jsconfig.json` clean |
| Package dry-run | PASS | Three intended files only |
| Source/oracle guards | PASS | Oracle hash controls, unchanged snapshot, no imports/types, and 10 KiB production ratchet pass |
| Semgrep | PASS | 83 rules on eight changed JavaScript targets, zero findings |
| `git diff --check` / syntax | PASS | Diff hygiene and all changed JavaScript syntax clean |
| review-router | PASS | Routed review plus explicit user-mandated gates complete |
| review-architecture | PASS | Locked package/DI/AST/consumer boundaries and traced flows retained |
| differential-review | PASS | Security record has five fixed findings and no open finding |
| review-refactor | PASS | Behavior, scope, complexity, and publication checks clean |
| review-privacy | PASS / N/A | No PII, data processing, retention, logging, or transfer change |
| source-ratchet-review | PASS | Oracle and gzip dominating invariants converge with negative controls |
| tech-debt-ratchet | PASS | Working-tree rerun is clean; exact staged payload confirmation required before commit |
| production-readiness | PASS | Limits/latency/RSS/package/rollout evidence; 100/100 |
| Feature evaluation / verification | PASS | Ten dimensions at 10/10; fresh verification pass found no issue |
| CI/current-head Codex | PENDING | Requires ready PR; PR must remain unmerged |

## Current judgment

No known compatibility, security, privacy, maintainability, or production-resource finding remains unresolved locally. Completion still waits on the exact staged tech-debt gate, ledger/backlog delivery records, ready PR, green CI, and clean current-head Codex review.
