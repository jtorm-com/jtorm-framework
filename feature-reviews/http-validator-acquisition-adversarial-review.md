# HTTP Validator Acquisition — Adversarial Review

**Date:** 2026-07-19
**Status:** PASS — current-head GitHub Codex review clean with zero unresolved threads

## Skeptic Lens

The strongest failure hypothesis is that a 304 can outlive the bytes or authority it supposedly
validates. The implementation counters this with one private record owner and exact
Map/key/promise/token/base-validator checks at transaction read, reuse, settlement, and
publication. Tests detach the pair through purge, purge-all, reset, eviction, Map replacement,
manual/newer work, policy drift, synchronous pre-install races, and in-flight base-metadata removal.
No path synthesizes a body.

The second hypothesis is cross-scope replay. Conditional requests re-run URL policy, compare the
captured key against the already-resolved URL under current tenant/origin/base authority, and send
no header before those checks. Manifest packs also bind expected hash. Adversarial drift and ABA
tests fail closed.

## Architect Lens

The change could have wrapped public values, added a parallel validator Map, or moved HTTP parsing
into promise-cache. It does none of those. Request-model owns HTTP; promise-cache owns generation
atomicity; each consumer owns acceptance; manifest owns integrity/root policy. Default traffic and
public promise/value identities remain intact. Six additive packages take minor releases.

## Minimalist Lens

The minimum safe feature is exactly one opt-in field, one additive request facade, one private cache
transaction, and four thin consumer bridges. No cache-header freshness policy, persistence,
rendered-fragment behavior, timer, retry, stale fallback, cancellation, response-metadata merge, or
runtime dependency was added. ETag strength/payload and Last-Modified date semantics remain opaque.

## Challenge Outcomes

- Independent code-explorer review: PASS after design clarifications.
- Independent code-architect review: PASS after ten design findings were incorporated.
- Local architecture, differential security, insecure-default, source-ratchet, Semgrep,
  tech-debt, and production-readiness reviews: no unresolved valid finding.
- The cross-model adversarial CLI was not run because it required sending repository-derived
  prompts outside the authorized workspace. The policy guard blocked the attempt before export;
  no repository data was sent and no bypass was used.
- The mandatory external gate passed on final head `cfba4b0`: Codex reported no major issues and
  the thread-aware review query returned zero unresolved threads before PR #69 merged.
