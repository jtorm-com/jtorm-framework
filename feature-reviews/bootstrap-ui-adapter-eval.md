# Bootstrap UI Adapter Evaluation

**Date:** 2026-07-19
**Status:** COMPLETE — PR #71 merged into `dev` as `d97556c`
**Scope:** `@jtorm/bootstrap-ui@0.1.0` and its test/documentation integration
**Verdict:** PASS with zero open blocker, high, or medium findings; three-lens
opposite-model adversarial review completed and adjudicated

## Outcome

The adapter is a thin presentation layer over the canonical component package. The traced flow is:

```text
trusted host registry
  -> resolver descriptor cache
  -> canonical @c artifact and static shell cache
  -> fresh canonical model binding
  -> fixed-literal @b class overlay
  -> semantic DOM
```

No endpoint, service client, database, queue, secret, log, analytics event, personal-data store,
or executable Bootstrap runtime enters that flow. Fixed `@c` and `@b` TSS aliases use the
framework's existing request/manifest path. Resolver, compiler, method, request-policy, and cache
ownership remain unchanged.

Five review gaps were found and closed:

1. The first source ratchet allowed reviewed verb names without constraining every `if` parameter.
   An `if(v: label)` mutation passed the old analyzer, was locked as a failing adversarial fixture,
   and now fails the exact parsed-AST allow-list.
2. The first persistence proof sampled one canonical shell although the acceptance criterion names
   seven. The final test exercises all seven live and persisted shell entries through cold
   Bootstrap, warm neutral, and warm Bootstrap renders with fresh caller data.
3. Optional DOM gates duplicated their selector in a brace body. They now use the locked
   `selector->if(el: selector)->attr` chain, and the parsed-AST ratchet proves selector/guard/sink
   identity.
4. Standalone accordion-item decoration depended on one-pass execution for exact-once classes.
   Item, summary, and content now use idempotency sentinels and optional gates.
5. Runtime evidence and documentation now prove empty-value isolation beside same-variant stale
   hooks, fresh-root append ordering, global Bootstrap selection across every mapped family,
   canonical fallback request provenance, and the required overlay-TSS acquisition/failure boundary.

## Eight-Question Architecture Review

1. **New trust boundary:** No new application trust boundary. Caller models retain their existing
   untrusted-data boundary in `@jtorm/components-ui`. Trusted `@b` package code extends the
   existing TSS acquisition surface under the same request/manifest policy. An optional
   host-selected Bootstrap stylesheet is the only new deployment boundary; this package never
   chooses or fetches it.
2. **Reachable inputs and validation:** The existing canonical models remain the only inputs.
   Canonical TSS validates the object shape and required fields before rendering. Overlays mirror
   only the exact no-output gates needed for zero-match safety, target exact canonical hooks, and
   emit allow-listed literal class appends. Unknown model fields are not read.
3. **Secrets, keys, or tokens:** None.
4. **Dependencies:** The first-party `@jtorm/components-ui@^0.1.0` metadata edge records the
   referenced `@c` artifacts. Bootstrap `^5.3.8` is an optional MIT peer, not imported or
   installed when absent. Bootstrap 5.3.8 is the current documented 5.3 release and declares a
   Popper peer for its JavaScript distribution; this adapter uses CSS only and adds no install
   lifecycle hook or third-party bytes. See the official
   [Bootstrap versions](https://getbootstrap.com/docs/versions/)
   and [npm package](https://www.npmjs.com/package/bootstrap).
5. **Data collection or retention:** None. Caller data is rendered through the existing canonical
   path and is excluded from live and persisted static-shell cache bytes.
6. **External endpoint and failure mode:** No new endpoint or loader. Required `@b` TSS uses the
   existing request/get and optional validated-manifest paths; unavailable or denied code fails the
   render loud rather than returning a partial success. If a host-provided stylesheet is absent or
   fails, output remains unstyled semantic HTML with native controls; no adapter-owned retry,
   timeout, or circuit breaker is introduced.
7. **Logs and PII:** The package emits no log. It has no PII-specific input, telemetry, or diagnostic
   surface.
8. **Blast radius:** Limited to presentation of the selected 14 variants in hosts that register the
   adapter. A bad trusted overlay could mis-style rendered DOM but cannot read records, authorize an
   action, call a service, or persist caller values through this design. Rollback removes the
   registry entry, restores the prior framework, reinitializes resolution, and optionally removes
   host CSS. There is no schema, data, queue, or concurrent-traffic residue.

A service/data-flow blast-radius table is not applicable because the change adds no endpoint,
consumer, job, external call, or shared write path.

## Architecture and Source Review

- PASS: pure CommonJS singleton and no runtime `require`/import under package source.
- PASS: descriptors compose canonical binding first and one adapter overlay second.
- PASS: no resolver/compiler/UI-method/cache responsibility moved or duplicated.
- PASS: no adapter `cid`, `cs`, shell, cache namespace, or data mapping.
- PASS: framework fallback and explicit/global framework selection use existing resolver behavior.
- PASS: all seven overlay artifacts remain exactly compatible with the frozen v1 parser oracle.
- PASS: the semantic ratchet constrains root topology, conditional parameters, selectors, verbs,
  selector-chained optional sinks, attribute parameters, literal classes, and the single badge
  presence derivation.
- PASS: adversarial fixtures cover an unreviewed input, data mapping, global selector, behavior
  attribute, Collapse class, external artifact, and cache identity; inert comments are a safe
  negative.

## Frontend, Accessibility, and Ethical UX Review

- PASS: native button, link, article, region/status/alert, `details`, and `summary` semantics are
  preserved. No icon-only control or synthetic disclosure state is introduced.
- PASS: visible caller/localized text stays canonical, escaped, and unchanged. Unsafe card URLs
  still fail at the canonical attribute policy.
- PASS: invalid/scalar/array/empty-required/missing-required models neither throw nor restyle old
  matching hooks, including hooks with the same variant class.
- PASS: the default action is neutral, destructive intent is explicit, and status colors do not
  create new authority, urgency, scarcity, consent, social-proof, or behavioral claims.
- PASS: no animation, carousel, viewport trap, horizontal-scroll container, locale literal,
  debug statement, placeholder feature, service worker, or JavaScript lifecycle is added.
- PASS: native accordion items remain keyboard-operable without CSS or JavaScript; explicit and
  global Bootstrap paths add each presentation token once.
- Deployment-host verification: contrast, focus appearance, forced colors, reduced motion from host
  overrides, 200%/400% zoom, RTL, touch sizing, light/dark modes, and visual regression depend on
  the exact Bootstrap/custom theme bytes. The package deliberately ships no CSS, so this review
  makes no screenshot or theme-conformance claim.

## Privacy, Security, and Compliance Review

- Privacy/GDPR/CCPA: N/A. No personal-data field, purpose, lawful basis, consent, retention,
  processor, transfer, profiling, or data-subject-right flow changes.
- Audit/logging/anomaly detection: N/A. No security-relevant business event or logging path exists.
- Auth/authz/rate limiting/API assets/mobile security/ticketing/AI/DSA: N/A. No corresponding
  endpoint, identity, client, marketplace, recommender, AI system, or content-moderation feature.
- Injection/SSRF/secrets/crypto: PASS/N/A. The adapter adds only trusted literal class values and
  trusted literal artifact aliases. It has no raw HTML, URL, asset, code, secret, or crypto sink.
- Supply chain/license: PASS for the change scope. No third-party runtime code is bundled.
  Bootstrap is an optional MIT compatibility peer; the first-party package retains the repository's
  GPL-3.0 metadata. The production dependency audit reports zero vulnerabilities.

The STRIDE delta in [stride-bootstrap-ui-adapter.md](stride-bootstrap-ui-adapter.md) covers spoofing,
tampering, repudiation, disclosure, denial of service, and elevation paths plus residual host CSS
risk.

## Production Readiness

| Category | Verdict | Evidence |
|---|---|---|
| Critical flow | PASS | Registry -> resolver -> canonical binding/cache -> literal overlay is exercised end to end |
| Dependencies | PASS | First-party metadata edge; optional Bootstrap 5.3.8 MIT peer; no runtime import; audit clean |
| Failure modes | PASS | Invalid models fail closed; required TSS and unsafe URLs remain loud; CSS absence degrades to semantic unstyled UI |
| Performance/scale | PASS | Seven bounded overlays use existing TSS acquisition/cache paths and add linear class transforms with no per-item request, timer, event, or retained state |
| Observability | N/A | No independent operation, mutation, retry, queue, or failure channel requires telemetry |
| Rollout/rollback | PASS | Add/remove injected registry and host stylesheet; resolver re-init documented; no migration/cache purge |
| Runbook/docs | PASS | README covers install, assets, compatibility, accessibility, cache layers, upgrade, and rollback |

## Verification Evidence

- Focused adapter/source/artifact tests after adversarial hardening: 23/23 pass.
- Parser snapshot/differential gates: 15/15 pass; all 285 TSS files equal the frozen v1 oracle.
- Full repository suite after rebasing onto current `dev`: 912/912 pass.
- Delivery: final head `3fd58ed` passed CI and a clean current-head Codex review with zero
  unresolved threads before the maintainer merged PR #71 into `dev` as `d97556c`.
- Typecheck: `tsc -p jsconfig.json` passes.
- Dependency audit: zero production vulnerabilities.
- Package dry-run: 10 intended files; 4,828 bytes packed; 17,094 bytes unpacked; no bundled dependency.
- Semgrep: 104 JavaScript/security/secrets rules over seven changed JavaScript files; zero findings
  and full parse coverage with telemetry disabled.
- Diff hygiene and frontend/security scans: clean except expected negative-test and documentation
  vocabulary.
- Opposite-model adversarial review: PASS after maintainer-approved staged-diff disclosure. Claude
  skeptic, architect, and minimalist lenses completed. The lead rejected two high claims that
  contradicted the exact if/append engine contracts, accepted selector-chain/idempotence/test/doc
  hardening, and recorded every disposition in the review verdict. No valid high or medium remains.

## Opposite-Model Adversarial Review

The three lenses agreed that the package adds no executable Bootstrap runtime, raw sink,
caller-derived class, behavior attribute, or cache identity. The minimalist independently verified
that overlay validity gates match the canonical gates. Skeptic and architect challenges produced
five useful remediations: selector-chained optional transforms, independently idempotent standalone
accordion items, a factored common alert class, stronger global/stale-node/fallback tests, and an
explicit required-TSS acquisition/failure contract.

Claims that empty strings pass only the overlay or that pre-existing trailing children make the
fresh canonical root non-last were rejected against `if-method` truthiness and canonical
`append` execution, then locked with adversarial tests. Requests to remove explicit mixed-framework
accordions, split shared variant overlays into nine additional artifacts, change DI metadata to a
peer, or replace established package/snapshot conventions were rejected as unsupported trade-offs
or conflicts with the repository contract.

## Residual Host-Owned Risks

- A trusted host can append conflicting classes through the existing canonical `class` field.
- A compromised or inaccessible host stylesheet can alter or remove presentation.
- Native disclosure markup intentionally differs from Bootstrap Collapse documentation.
- Accessibility and visual quality of a deployed custom theme require host-level real-browser QA.

These risks do not justify moving data, assets, behavior, or cache ownership into the adapter. Any
future structural shell, JavaScript, `data-bs-*`, caller-selected class, or automatic asset change
must reopen architecture, cache, accessibility, privacy, and threat-model review.
