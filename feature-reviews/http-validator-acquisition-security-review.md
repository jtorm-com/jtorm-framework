# HTTP Validator Acquisition — Security Review

**Date:** 2026-07-19
**Status:** PASS
**Threat model:** [stride-http-validator-acquisition.md](stride-http-validator-acquisition.md)

## Security Boundary

Conditional response metadata is untrusted. It may optimize reacquisition only after the same
request-model URL policy, resolved URL, tenant/origin/base discriminator, and exact cache generation
that authorized the bytes are still current. A validator never grants authority, selects another
key, enters an error/log, persists, or becomes application content.

## Control Review

| Risk | Control and evidence |
|---|---|
| unpaired or unsolicited 304 | request-model requires one valid condition actually selected; promise-cache `reuse()` requires exact current base bytes and validator |
| cross-tenant/origin/base replay | captured raw key, resolved-URL rederivation after awaited `allow()`, scoped owner key, and manifest expected-hash composite |
| SSRF/policy bypass | conditional requests use request-model URL resolution, timeout signal, injected `allow()`, and injected transport in the same order as ordinary requests |
| response-header injection | one ETag envelope or Last-Modified value, 1024 UTF-8 byte maximum, control rejection, ETag precedence, and one emitted header |
| retagging predecessor bytes | a 304 ignores response replacement metadata and retains only the exact validator sent |
| invalid-body metadata publication | JSON/text/TSS and complete manifest digest/schema/structure/value validation finish before `accept()` |
| race resurrection | exact Map/key/promise/token/base-validator and generation checks at reuse and publication; all invalidators detach |
| stale-lifetime extension | only successful 200/304 publication stamps a new generation; ordinary hits and failed refreshes do not slide |
| unsafe default | validators are absent/false by default; inaccessible or incomplete additive collaborators take the original unconditional path |

## Findings and CWE Mapping

| Finding | Severity | Mapping | Disposition |
|---|---:|---|---|
| request key and validator capability observations could drift around awaited policy/transport | High | CWE-362, CWE-367 | fixed with pre-await key snapshot and single immediate capability read; adversarial tests pass |
| detached base validator record could survive the first generation check | High | CWE-362 | fixed with exact metadata identity checks in both phases; hard and SWR detachment tests pass |
| manifest raw/composite admission could observe different authority snapshots | High | CWE-639, CWE-362 | fixed with one raw-key admission snapshot through the public composite seam |
| deferred manifest hard guard could invoke an obsolete request adapter | Medium | CWE-367 | fixed by re-reading the current conditional collaborator after the guard |
| malformed ETag could broaden a request into wildcard/list semantics | Medium | CWE-113 | fixed with a single safe ASCII entity-tag envelope while payload/strength remain opaque |

No suppression or accepted high/medium finding remains.

## Checklist Disposition

- Authentication, session, payment, PII, privacy-rights, audit-log, database, queue, and secret
  checklists are not applicable: none of those assets or flows changed.
- Authorization and SSRF checks apply to cache authority and outbound URL policy; tenant/origin/base
  drift, blocked URLs, unscoped keys, and resolved-base ABA are covered before header/transport work.
- Injection checks apply to the outbound header boundary; CR/LF, controls, wildcard/list/unquoted
  tags, non-ASCII ETags, and 1024/1025-byte boundaries are tested.
- Dependency and insecure-default checks pass: no runtime dependency/import, exact-false default,
  zero audit vulnerabilities, and an immediate per-owner kill switch.
- Rate limiting remains host/request driven. This feature adds no retry, timer, or proactive loop;
  the existing one-refresh-per-generation SWR single-flight remains the only coalescing policy.

## Residual Risk

Redirect, DNS rebinding, credentials, and transport-level header implementation remain owned by the
injected transport and host URL policy. A configured timeout of zero remains a host operational
choice. These are pre-existing boundaries; the conditional path neither broadens nor bypasses them.
