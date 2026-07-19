# HTTP Validator Acquisition — Differential Security Review

**Date:** 2026-07-19
**Status:** PASS
**Base:** `origin/dev` at `af5c62c`
**Range:** `origin/dev...feat/http-validator-acquisition`

## Blast Radius

The runtime diff changes six packages: the shared request and promise-cache policy owners plus four
safe acquisition consumers. It also changes the deterministic engine harness, focused
model/pipeline/policy tests, package metadata, and documentation. No route, browser service worker,
rendered-fragment cache, persistence adapter, database, build compiler, authentication, PII, secret,
or third-party runtime code changes.

Relevant history was traced through request-triggered SWR (`5d79d5f`), finite TTL/purge
(`e791896`), fail-closed cache participation (`faa7a5e`), and centralized runtime policies
(`3183a49`). The change extends those owners instead of introducing a competing cache or request
path.

## Added and Removed Behavior

- Added exact-true conditional acquisition to data, HTML, TSS, and validated manifest packs.
- Added private generation transactions and parsed 200/bodyless 304 request envelopes.
- Added bounded ETag/Last-Modified capture and one conditional request header.
- Preserved unconditional behavior for absent/false options, unscoped calls, and incomplete
  additive collaborators.
- Removed no export, package, parser step, URL guard, timeout, promise identity, or cache
  invalidation behavior.

## Adversarial Diff Checks

- No runtime import, dynamic evaluation, process execution, synchronous filesystem I/O, timer,
  retry, persistence, debugger, console sink, suppression, placeholder, or skipped test was added.
- Candidate metadata never reaches a public value, cache key, log, error, persistence adapter, or
  rendered-fragment state.
- A 200 reaches publication only after the same parser/integrity checks as an unconditional
  acquisition.
- A 304 reaches publication only after exact sent-validator and current base-record checks.
- UI-manifest remains isolated by expected hash and rechecks both URL policy and composite identity.
- Package changes are additive minor releases; the manifest wire version does not change.

## Review Findings

Six implementation findings were fixed with red tests: request key snapshot, one-time validator
capability read, base-validator identity recheck, published manifest cache-key seam preservation,
single raw/composite admission snapshot, and current request-collaborator reacquisition after the
hard guard. No unresolved finding remains.

The installed differential-review package lacked its referenced supplemental
`methodology.md`, `adversarial.md`, `reporting.md`, and `patterns.md` resources. The complete
top-level high-risk workflow, direct data-flow tracing, repository history, threat model, focused
race tests, Semgrep, dependency audits, and current-head review loop were used; the missing
resources are not represented as completed.
