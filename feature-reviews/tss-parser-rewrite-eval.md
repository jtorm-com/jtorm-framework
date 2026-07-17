# TSS Parser Rewrite — Evaluation Record

**Date:** 2026-07-17
**Branch:** `agent/p3-tss-parser-rewrite` from merged PR #54 / `dev` `6e352fa`
**Status:** READY PR #55 — local gates clean; CI/current-head Codex delivery gates pending

## Outcome

`@jtorm/tss-parser` now uses an import-free hand-written tokenizer and recursive-descent grammar with original UTF-16 line/column/offset diagnostics and immutable source/token/depth/node/declaration ceilings. The public CommonJS singleton and JSON `{s,m,p,c}` contract remain intact. The v1 implementation exists only as a source-hashed test oracle and is absent from the package tarball.

Package prepack now also runs exact-pinned Terser `5.49.0` to generate a licensed
classic-browser artifact. The canonical CommonJS `main` is unchanged; direct script
users receive the same singleton at `globalThis.jTormTSSParser`. The output is
deterministic, SRI-pinned in the README, and independently checked against the full
257-file corpus; Terser remains build-only and runtime dependencies stay empty.

The coordinated npm seam now also patch-releases the three direct metadata consumers:
`tss-model@1.0.6`, `data-parser@1.0.4`, and `attrs-method@1.0.4` require
`@jtorm/tss-parser@^2.0.0`. A current-head Codex finding and red-first package test
proved that leaving `^1.0.0` would make ordinary installs continue resolving v1.
No adjacent runtime source changed.

Compatibility-sensitive one-character interleavings are handled after parsing by one bounded method-lowering layout and an implicit piece rope. This phase is gated to nested declaration/child or document-root offset-collision shapes, scans the layout once for legacy coordinates, never retokenizes/re-enters the grammar/fixed-point rescans, and does not execute the frozen engine. Non-interleaved inputs return the direct recursive-descent AST.

An in-memory instrumentation probe found 55 of the 257 checked-in files enter the conservative compatibility gate, while none currently produce a different tree from the direct path. The phase remains required by the explicit external-valid-input contract: minimized quote-free sources and the generated matrices do produce different v1 outputs. Tightening the syntactic gate further would add another unproven classifier and is not required for measured corpus performance.

## Pre-PR evaluation scope

- **Mode/base:** pre-PR branch evaluation against `origin/dev` / merged-PR-#54 commit `6e352fa29295235ff989d25fc3d4b36ac076a14b`; the evaluated range is that base plus the complete tracked/untracked task diff.
- **Feature map:** runtime parser package and README; generated browser publication
  metadata plus root build dependency/lock; test-only oracle/differential/error/
  resource/browser guards; direct view/fetched-TSS/build-compiler propagation tests;
  CI differential scale; three direct-consumer package metadata seams;
  architecture/spec/security/evaluation/agent records. No adjacent runtime source changed.
- **Entry points traced:** `config()`, `handle()`, `view-model.create() → handle()`, `tss-model.get() → handle() → identity cache cleanup/retry`, and manifest `compile() → lock/snapshot → handle() → finally restore`.
- **Junction questions:** no nullable/void/async authorization/count-modify/token/env-fallback junction exists in synchronous parsing. The affected async callers await their parse path, preserve error identity, and use existing identity/lock controls; parser failure cannot be mistaken for success or leave a partial AST.
- **PR comments:** ready PR #55 is open into `dev`; no review thread existed at publication. The local cross-model specification, implementation, and final-diff reviews are recorded below.
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
| Browser artifact/build contract was absent | 2/2 browser publication tests failed: no CDN fields/build script and `npm run build` exited missing-script | Exact Terser build, metadata, deterministic/SRI/size guards, classic-script execution, and 257-file parity pass |
| Exact gzip length was treated as cross-toolchain identity | CI produced 6,115 bytes from the same 16,575-byte/SRI artifact versus local Node 25 zlib's 6,120 | Exact raw bytes and SRI lock the artifact; README pins the measured toolchain figure and every zlib must satisfy the portable 7 KiB ratchet |
| Extended differential was manual and array-backed | Final adversarial review found CI ran 4,096 cases while the cited 200,000-case run peaked near 1.4 GiB | PR CI selects 200,000; streamed comparison preserves the frozen digest and passes at 167 MiB peak RSS |
| Multiline diagnostics depended on a mirrored test helper | Skeptic review showed a shared location bug could pass both implementation and helper | Hard-coded LF/CRLF/CR/U+2028/U+2029/comment positions plus the exact source-limit CRLF boundary pass |
| Parser 2.x was unreachable through direct consumer ranges | Current-head Codex found all three published direct consumers still declared `^1.0.0`; the package test failed at `tss-model@1.0.5 !== 1.0.6` | Patch-bumped consumer metadata requires `^2.0.0`; focused package/source guards and three dry-runs pass |

## Compatibility evidence

| Gate | Result |
|---|---|
| Frozen v1 source | SHA-256 `1a597fe542048ba719d277341ebe840a730b2f2c1152ac92b49821ec19648c27`; mutation/append/truncate controls pass |
| Published singleton/helpers | Exact initial key order, `c`, `regexes.quotes`, consumed/characterized helper behavior, and writable reset fields pass |
| Curated grammar/custom syntax | Pass, including comments, dual-quote whitespace, shorthand, inheritance, arrays, and one-character custom syntax |
| Declaration/child matrix | 260 cases; oracle fixture hash `860ab1f0cc22c2a1b4a864900227c28d1e520338cbc876e4b568b04233d6209d` |
| Existing generated matrix | 768 cases; oracle fixture hash `91b878566d30f856592c6219742cd9d8faf51548d80cd2fd09159ee59acff3ba` |
| Adversarial generated matrix | 4,096 nested/interleaved cases; oracle fixture hash `3d274ffe1c4bf7db6b46ab9e428ed34536f9c5fccbe2bd57d16db676aca07875` |
| Reproducible extended generator | PR CI sets `TSS_PARSER_DIFFERENTIAL_CASES=200000`; 200,000 streamed cases pass in 33.8 s / 167 MiB peak RSS (initial independent approximation diverged on 8,218) |
| Checked-in TSS | Direct oracle equality for all 257 `src/**/*.tss` files; existing snapshot JSON unchanged |
| Intentional v2 corrections | Quoted structural/header delimiters and literal multi-character syntax have direct expected-output tests rather than false v1 equality |
| Generated browser artifact | Exact initial/configured key order, regex source/flags, diagnostics, reset fields, custom syntax, and all 257 files equal canonical CommonJS behavior |

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
| Browser artifact | 16,575 minified bytes / 6,120 gzip-9 bytes / 5,574 Brotli-11 bytes on Node v25.5.0; CI LTS zlib emits 6,115 gzip bytes; portable 7 KiB ratchet |
| Frozen v1 under same browser wrapper | 5,197 minified bytes / 1,826 gzip-9 bytes / 1,666 Brotli-11 bytes |

The browser artifact is therefore about 3.2× v1 raw and 3.35× v1 gzip, an
absolute increase of 11,378 raw / 4,294 gzip bytes. This misses the architecture
review's original same-gzip estimate. The retained cost buys bounded malformed-input
handling, original locations, configurable literal syntax, and exact offset-era valid
outputs; the latter requires the isolated compatibility projection.

Fifty passes over all 257 checked-in files produced 12,850 samples per parser:

| Parser | p50 | p95 | p99 | max |
|---|---:|---:|---:|---:|
| v2 | 0.033 ms | 0.396 ms | 1.107 ms | 3.210 ms |
| frozen v1 | 0.027 ms | 1.369 ms | 5.766 ms | 20.833 ms |

Thirty maximum-source parses measured v2 p50 34.184 ms, p95 71.905 ms, and max 73.733 ms. Normalization/tokenization remain single-pass; the compatibility rope uses logarithmic piece operations only for the explicitly detected offset-era shape.

## Consumer and publication evidence

- View-model, fetched TSS cache/retry, and UI manifest compiler tests preserve original error identity and position fields; failure empties/restores singleton state.
- Runtime source and generated browser code contain no `require()`, runtime third-party
  dependency, dynamic load, `eval`, logging, or handwritten TypeScript/declaration
  file. Terser is an exact-pinned build-only dependency.
- `npm pack --dry-run --json` reports `@jtorm/tss-parser@2.0.0`, 19,835-byte tarball / 68,266-byte unpacked, with exactly `README.md`, `package.json`, `src/tss-parser.js`, and generated `tss-parser.min.js`; tests/oracle/build dependency code do not ship.
- Direct-consumer dry-runs report three-file packages: `tss-model@1.0.6`
  (1,227-byte tarball), `data-parser@1.0.4` (3,111 bytes), and
  `attrs-method@1.0.4` (1,705 bytes), each with parser `^2.0.0` metadata.
- Package major version, malformed-input migration, lower-only limits, rollback pin, and no-dual-parser policy are documented.
- `main` remains `src/tss-parser.js`; `unpkg`/`jsdelivr` select the generated classic
  script without a bundler `browser` remap. The README exact-version CDN example's
  SHA-384 SRI is derived from and tested against the deterministic artifact.

## Reliability and data-flow review

The runtime feature has no endpoint, database, queue, durable handoff, provider call,
or external side effect. Package build has one deterministic local file output before
publication. The applicable reset/retry/build boundaries have one owner each:

| Invariant / transition | Owner | Failure-matrix result |
|---|---|---|
| A successful parse publishes one complete `tree`/`pairs`/`tss`; any tokenize/grammar/resource failure publishes three empty fields | `tss-parser.handle()` | Synchronous call cannot overlap itself; success and parse/tokenize failures are covered |
| Rejected configuration cannot expose mixed syntax/regex/limit policy | `tss-parser.config()` | Candidate is validated locally and published once; identity/state preservation is covered |
| A fetched parser rejection remains retryable and cannot delete a newer cache identity | `tss-model` promise cache | Existing identity-checked rejection cleanup remains unchanged; located-error retry is covered |
| Build-time parser failure cannot poison shared compiler collaborators | UI manifest compiler lock/snapshot owner | Existing overlap lock and `finally` restoration remain unchanged; identity/position/restoration is covered |
| Package build cannot silently expose a different parser | package prepack + exact Terser command | Double-build bytes, SRI, public surface, diagnostics, custom config, full corpus, size, and package allowlist are covered |
| Normal dependent installation must select parser v2 | direct-consumer package metadata | Red-first exact version/range assertions plus coordinated release source guard and dry-runs cover all three direct edges |

The failure-before-publication, failure-during-parse, retry, overlap, stale-state, and reset paths therefore have explicit tests. Post-side-effect bookkeeping, cancellation, second-worker, recovery, and durable replay rows are N/A because parsing has no side effect or durable state.

## Formal review outcomes

- **review-router — PASS.** The 25-file branch scope routes to test/source-ratchet and refactor review; the user-mandated architecture, differential security, tech-debt, production, and large-diff adversarial gates were added. API, frontend, database, infrastructure, privacy-processing, AI, payments, queues, and growth domain reviews are otherwise N/A.
- **review-architecture — PASS.** `config → validate → atomic publish` and `source → normalize/tokenize → recursive descent → optional bounded compatibility projection → atomic publish` retain one runtime package owner, zero runtime imports, the public singleton, and the `{s,m,p,c}` boundary. View, fetched-cache, and compiler propagation terminate in the existing owners. Exact Terser and optional CDN delivery are separately modeled build/publication boundaries with deterministic parity and rollback controls.
- **differential-review — PASS.** The security record traces the transitive render/build/package blast radius and closes nine findings (two high, seven medium). Semgrep, zero-vulnerability audit, frozen-oracle integrity, publication exclusion, resource ceilings, CI-scale differential, package resolution, and consumer propagation are clean. The installed skill's four referenced supplemental files were absent and that coverage limit is recorded rather than implied.
- **review-refactor — PASS.** Valid behavior is independently frozen; malformed/config narrowing is a documented major-version contract; no export, runtime dependency, adjacent runtime source, suppression, or speculative abstraction was added. One exact build-only dependency produces the required browser artifact. Three direct-consumer metadata packages are patch-bumped solely so normal resolution adopts parser 2.x. Historical helpers remain only because they are a locked published surface. The direct parser is linear in source/tokens and the bounded compatibility path is `O(nodes log nodes)`.
- **review-privacy — PASS / applicability N/A.** Source is transient trusted framework text, no personal-data field or data store is added, and errors contain only fixed text plus numeric position. No source excerpt, value, logging, retention, transfer, moderation, audit, consent, or erasure path changes; all privacy/compliance checklist items are consequently N/A for this diff.
- **source-ratchet-review — PASS.** Complete-file SHA-256 plus mutate/append/truncate controls dominate oracle drift; package enumeration proves exclusion. A separate gzip dominating invariant has a deterministic incompressible over-budget control. Neither guard parses callable aliases, so the alias provenance matrix is out of scope.
- **production-readiness — PASS.** Exact hard ceilings, measured latency/RSS,
  canonical/minified sizes, deterministic build/SRI, package contents, error taxonomy,
  retry/restoration behavior, major-version rollout, rollback pin, and synchronous-host
  residual risk are documented. There is no schema, infrastructure, service, queue,
  or deployment-order operation.
- **cross-model adversarial review — PASS.** The final skeptic/architect/minimalist pass found no parser-output defect; the skeptic independently reported about 850,000 both-accepted cases with zero drift. CI-scale differential enforcement/memory, independent location anchors, exact raw/SRI guards, documented local gzip measurement, and a portable gzip ratchet were fixed. Removing the compatibility phase remains rejected because it violates explicit exact valid-output compatibility. A stale-model lodash non-existence finding was retracted against live registry/integrity/audit/install evidence.

## Feature evaluation score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 9/10 | Single DI-owned runtime parser package and bounded phases; compatibility projection and build boundary are explicit costs |
| Consistency | 10/10 | Exact valid AST/order, singleton surface, quote regexes, reset state, and 257-file corpus |
| Type Safety | 10/10 | Primitive/config validation, native errors, pure JS; no handwritten types |
| Validation | 10/10 | Located malformed grammar and exact/over source/token/depth/node/declaration limits |
| Error Handling | 10/10 | Atomic publication, fixed diagnostics, identity propagation, cache retry, compiler restoration |
| Security/Privacy | 10/10 | STRIDE/resource controls, no excerpts/logging/runtime imports or dependencies, oracle excluded from package |
| Performance | 9/10 | Bounded single-pass front end and logarithmic projection; browser gzip is 3.35× v1 and maximum parses remain synchronous |
| Maintainability | 8/10 | Explicit grammar/phase ownership and frozen oracle, offset compatibility still requires substantial specialized machinery |
| Testability | 10/10 | Red-first ledger, generated and 200k differential, snapshots, consumer and mutation controls |
| Readability | 8/10 | Named lexical/grammar phases are legible; the quarantined projection and retained legacy helper surface remain dense |
| **Total** | **94/100** | No local blocker remains; size and compatibility complexity are accepted residual costs |

Fresh verification re-read every changed runtime/test file after the final adversarial corrections, reapplied STRIDE and the locked architecture, confirmed the newly added tests execute, and found no hardcoded secret, TODO, suppression, import, or unbounded retry. The 94/100 score records the real size/complexity trade-off rather than hiding it behind gate success.

## Gate ledger

| Gate | Status | Evidence / remaining action |
|---|---|---|
| Focused differential/parser/resource/consumers | PASS | 110/110 including final browser, package-policy, CI-streaming, location, and ratchet controls |
| Exact `npm test` | PASS | 582/582 on the reviewed candidate |
| `npm run typecheck` | PASS | `tsc -p jsconfig.json` clean |
| Package dry-run | PASS | Parser four-file dry-run plus three direct-consumer three-file dry-runs; exact sizes recorded above |
| Source/oracle guards | PASS | Oracle hash controls, unchanged snapshot, no imports/types, and 10 KiB production ratchet pass |
| Semgrep | PASS | 68 JavaScript rules on ten targets plus 22 security-audit rules on four targets; zero findings |
| `git diff --check` / syntax | PASS | Diff hygiene and all changed JavaScript syntax clean |
| review-router | PASS | Routed review plus explicit user-mandated gates complete |
| review-architecture | PASS | Locked package/DI/AST/consumer boundaries and traced flows retained |
| differential-review | PASS | Security record has nine fixed findings and no open finding |
| review-refactor | PASS | Behavior, scope, complexity, and publication checks clean |
| review-privacy | PASS / N/A | No PII, data processing, retention, logging, or transfer change |
| source-ratchet-review | PASS | Oracle and gzip dominating invariants converge with negative controls |
| adversarial-review | PASS | Three final lenses; accepted CI/memory/location/raw-SRI/gzip-budget guards fixed, false high retracted |
| tech-debt-ratchet | PASS | Exact final staged payload reports no new debt pattern |
| production-readiness | PASS | Limits/latency/RSS/package/rollout evidence; accepted synchronous and size residuals documented |
| Feature evaluation / verification | PASS | 94/100; no local blocker, with size/compatibility complexity scored explicitly |
| CI/current-head Codex | PENDING | Ready PR #55 is open; PR must remain unmerged |

## Current judgment

No known compatibility, security, privacy, or production-resource blocker remains unresolved locally. The parser is materially larger than v1 even after minification; that accepted maintainability/distribution cost is explicit above. The exact staged debt gate and ledger/backlog reconciliation are complete. Delivery waits on green CI and a clean current-head Codex review; PR #55 remains unmerged.
