# STRIDE: Bootstrap UI Adapter

**Date:** 2026-07-19
**Status:** Implemented and verified
**Feature spec:** [bootstrap-ui-adapter-spec.md](bootstrap-ui-adapter-spec.md)
**Scope owner:** `@jtorm/bootstrap-ui`

## Executive Summary

The adapter adds no endpoint, credential, persistence, executable dependency, or caller-data flow. It registers trusted descriptors that render the existing canonical component first and then append fixed Bootstrap CSS classes. The descriptors extend the existing trusted TSS acquisition surface from `@c` to `@c` plus `@b`; the only optional new deployment boundary is host-owned Bootstrap CSS. The principal risks are presentation tampering, unavailable/tampered overlay code, accidental styling of a pre-existing node after canonical no-output, framework-state confusion in nested accordions, and contamination of the canonical fragment cache.

Residual risk is low when the controls and tests below pass. This model must be revisited if the adapter later adds structure, assets, JavaScript, `data-bs-*`, caller-selected classes, or another data field.

## System and Trust Boundaries

```text
trusted host registration
        |
        v
UI resolver ---- descriptor cache ---- existing request/manifest policy (@c + @b TSS)
        |
        v
canonical @c binding ---- caller model (untrusted text/URL, existing boundary)
        |
        +---- canonical static shell <---- existing fragment cache
        |
        v
fixed @b class overlay (trusted package literals; no caller values)
        |
        v
semantic DOM in browser ---- host-selected Bootstrap ^5.3.8 CSS (optional external asset boundary)
```

Trust-boundary notes:

- Registry JavaScript and TSS artifacts are trusted package code selected by a trusted host.
- Both canonical and overlay TSS use the existing request authorization/failure policy; the adapter adds fixed artifact aliases, not a new loader or endpoint.
- Caller component models keep their existing untrusted-data classification. The adapter never adds a sink for them.
- Canonical cached shell bytes keep their existing internal/trusted classification and must remain free of caller and adapter data.
- Rendered DOM is public to the page/user and may contain intentionally visible caller copy.
- Bootstrap CSS is public code but may cross a network/supply-chain boundary chosen by the host. This package neither chooses nor fetches it.

## Asset Inventory

| Asset | Classification | Security property |
|---|---|---|
| Registry identity and mapper | Public package metadata, integrity-sensitive | Cannot be spoofed or redirected by caller data |
| Canonical and Bootstrap TSS artifacts | Trusted package code, integrity/availability-sensitive | Existing request/manifest policy applies; fixed aliases only; required misses fail loud |
| Canonical caller model | May contain untrusted/public text and URL values | Must use existing escaped text and guarded URL sinks only |
| Bootstrap class literals | Public, integrity-sensitive | Fixed allow-listed package literals only |
| Canonical fragment cache bytes | Internal/trusted structure | No caller, localized, or adapter values retained |
| Rendered semantic DOM | Public | Canonical roles/names/state preserved; intent remains truthful |
| Host Bootstrap stylesheet | Public executable presentation input | Host pins/protects delivery and validates theme/accessibility |

No secret, credential, PII store, financial state, authorization decision, audit record, or restricted data asset is introduced.

## Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| Malicious/buggy caller model | Supplies copy, URLs, classes, invalid shapes, and large collections through the existing component API | Injection, misleading presentation, denial of service, or accidental drift |
| Compromised stylesheet/CDN | Can alter page presentation if a host loads untrusted Bootstrap bytes | Phishing, visual concealment, or availability impact |
| Misconfigured host | Registers packages in the wrong order, changes framework without resolver reset, or loads incompatible CSS | Accidental semantic/presentation breakage |
| Supply-chain attacker | Attempts to replace package/TSS contents or a Bootstrap distribution | Tampering with fixed class mapping or presentation |
| Framework maintainer error | Introduces a selector that hits old DOM, throws on no-output, duplicates classes, or enters cached shell execution | Accidental regression |

## STRIDE Analysis

### Spoofing

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| A neutral or destructive action is styled as a trusted primary action | Low | Medium | Fixed variant-to-class allow-list; neutral default; destructive uses `btn-danger`; adapter never derives intent from caller fields | Mapper/source ratchet and exact pipeline class tests |
| A caller treats a visual variant as authorization/identity | Low | Medium | README states presentation only; no auth/session field or behavior; canonical names remain intent rather than authority | Documentation review and no-new-field source ratchet |
| A package/alias impersonates Bootstrap | Low | Medium | Exact ID/version/alias/framework contract; host controls injected registry | Registry identity tests |

Status: controls required; no authentication system is in scope.

### Tampering

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| Caller data injects a Bootstrap class, raw HTML, script, or `data-bs-*` through the adapter | Medium | High | Adapter class values are fixed literals; no caller-bound attr/text/h/raw/asset sink; canonical escaping and URL guard remain first | Static source ratchet, XSS text test, unsafe URL regression |
| Invalid canonical data makes an unconditional selector modify an older matching node | Medium | High | Mirror canonical output gates; target only new `:last-child` root; test invalid input beside pre-existing hooks | Invalid/pre-existing pipeline tests |
| Accordion descendant classes are duplicated or mixed between frameworks | Medium | Medium | Root-scoped idempotent `:not(...)` selectors and optional DOM gates; test explicit/global framework paths | Exact token-count tests |
| Compromised external CSS hides or falsifies content | Low to host-dependent | High | No automatic Bootstrap asset fetch; host owns pinning, SRI/CSP/self-hosting and upgrade QA; semantic HTML remains in DOM | README contract; no Bootstrap asset descriptor or external Bootstrap URL |
| Compromised or redirected `@b` TSS changes presentation logic | Existing package/request boundary | High | Trusted fixed aliases, existing request URL/allow policy and manifest digest validation, exact source/artifact closure ratchets | Descriptor/source/artifact tests; existing request/manifest tests |

Status: package controls are testable. Host stylesheet integrity remains an explicit deployment responsibility.

### Repudiation

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| A user/host assumes a styled destructive button proves an action, confirmation, or audit occurred | Low | Medium | Adapter performs presentation only and emits no event; README assigns authorization, execution, confirmation, audit, and undo to host | No JavaScript/event/data-bs ratchet; docs review |
| Adapter selection cannot be diagnosed after framework configuration changes | Low | Low | Stable framework/alias/ID and documented resolver re-init requirement | Resolver tests and README |

Status: no auditable business mutation is introduced; audit-trail controls are N/A.

### Information Disclosure

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| Caller/localized data enters canonical persisted shell bytes | Low | High | Canonical binding precedes overlay; overlay adds no cache ID and executes after binding; inspect live/persisted cache entries | Cold/warm/mixed/persisted cache tests |
| Unknown caller fields become DOM attributes/classes | Low | Medium | Adapter never reads caller fields except exact output-validity gates; canonical root contract remains unchanged | Source field allow-list and DOM leak tests |
| Host leaks information through third-party CSS request | Host-dependent | Low | Adapter makes no automatic Bootstrap asset request; host chooses self-host/CDN and privacy policy | Package source/pack contents contain no external Bootstrap URL or asset verb |

Status: no new data retention or telemetry. Visible canonical copy remains intentionally public DOM content.

### Denial of Service

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| Zero-match transforms throw for invalid/no-output models | Medium | Medium | Exact canonical validity gates before transforms; optional descendant gates | Invalid-model matrix test |
| Overlay work becomes super-linear or adds per-item network/JS work | Low | Medium | Seven bounded required TSS artifacts use existing acquisition/cache/manifest paths; linear DOM class transforms; no per-item fetch, asset verb, JS, or adapter cache | Source ratchet, request provenance, and representative multi-item pipeline test |
| Required overlay TSS is unavailable or denied | Low to host-dependent | Medium | Existing get/request failure stays loud; no partial-success ambiguity; host serves package aliases reliably or prepares a validated UI manifest | README/spec contract, descriptor request assertions, existing request/get/manifest tests |
| Large accordion collection exhausts rendering resources | Existing/unchanged | Medium | Canonical host-owned collection bound remains; adapter adds linear fixed transforms only | Multi-item characterization; README retains host limit ownership |
| CSS fails to load and blocks supported behavior | Medium | Low | Semantic HTML and native details work without CSS/JS; no automatic Bootstrap asset dependency | Unstyled output/native behavior assertions |

Status: existing collection-size residual risk is unchanged and remains host-owned.

### Elevation of Privilege

| Threat | Likelihood | Impact | Control | Verification |
|---|---|---|---|---|
| Styling a button/alert grants application privilege or executes behavior | None in adapter | High if misused | No event handler, JS, auth field, request, or state mutation; host authorizes independently | Source ratchet and presentation-only documentation |
| Caller selects arbitrary framework artifact/path | Existing trusted-host boundary | Medium | Mapper and artifact paths are trusted literals; caller model is not used for component/asset resolution | Exact descriptor test and no source-derived path |
| Bootstrap Collapse attributes trigger behavior not reviewed here | Low | Medium | `data-bs-*`, Collapse classes/state, and Bootstrap JS are prohibited | Static source ratchet |

Status: no privilege boundary is crossed by this feature.

## Attack Tree

Goal: make the rendered component communicate or retain something the canonical model did not authorize.

```text
OR
|- inject executable/content data
|  AND
|  |- reach adapter-controlled sink
|  `- supply caller value
|     -> blocked: adapter has fixed literal class attrs only
|- restyle an unrelated existing node
|  AND
|  |- canonical emits no new root
|  `- overlay selector still executes
|     -> blocked: mirrored output gate + :last-child + regression test
|- poison reusable HTML
|  AND
|  |- overlay runs inside reusable shell iteration
|  `- cache persists result
|     -> blocked: no adapter cid; cache-byte tests
|- replace or suppress overlay code
|  AND
|  |- control @b artifact acquisition
|  `- bypass host request/manifest policy
|     -> blocked: fixed aliases + existing URL/allow/digest policy; required failure stays loud
|- activate unreviewed Bootstrap behavior
|  AND
|  |- emit Collapse/data-bs contract
|  `- host loads Bootstrap JS
|     -> blocked in package: no JS/data-bs/collapse classes
`- compromise host stylesheet
   OR
   |- replace CDN bytes
   `- deploy incompatible/custom Bootstrap theme
      -> host control: pin/SRI/CSP/self-host + visual/accessibility QA
```

No PASTA deep dive is required: this is not a money, identity, credential, authorization, PII, or new application trust-boundary flow.

## Control-to-Test Linkage

| Control | Planned test/evidence |
|---|---|
| Fixed 14-variant mapping and identity | `test/uis/bootstrap-ui.test.js` |
| Canonical-first then overlay ordering | `test/uis/bootstrap-ui.test.js` |
| Required overlay aliases use proven artifact/request paths | `test/uis/artifact-paths.test.js`, `test/pipeline/bootstrap-ui.test.js` |
| No data-model mapping/raw sink/JS/data-bs/assets/cache ID | `test/uis/bootstrap-ui.test.js`, source-contract scan |
| Invalid input cannot throw/restyle old hooks | `test/pipeline/bootstrap-ui.test.js` |
| Canonical escaping and unsafe URL behavior | `test/pipeline/bootstrap-ui.test.js` |
| Explicit/global nested accordion correctness and idempotence | `test/pipeline/bootstrap-ui.test.js` |
| Cache contains static canonical bytes only | `test/pipeline/bootstrap-ui.test.js` |
| Artifact closure/parser determinism | `test/uis/artifact-paths.test.js`, TSS snapshot tests |
| No unplanned package files/assets | package `npm pack --dry-run` |
| Host asset/security ownership | `src/uis/bootstrap-ui/README.md` review |

## Residual Risk and Acceptance

- A trusted host can intentionally append conflicting classes through the existing canonical `class` field. The adapter does not try to sanitize trusted host styling; applications must not expose that field directly to untrusted end users.
- A host can load compromised or inaccessible CSS. This package cannot enforce CSP, SRI, hosting, theme contrast, or Bootstrap asset availability because it deliberately makes no automatic asset request.
- Required `@b` TSS shares the framework's existing request/manifest availability boundary; a denied or missing artifact fails the render rather than degrading silently to canonical-only presentation.
- Native accordion visuals will not exactly match Bootstrap Collapse documentation. The semantic/native-state benefit is accepted for this first adapter.
- Very large canonical accordion arrays remain a host resource-policy concern; adapter work remains linear.

These residual risks are low for the package boundary and were accepted by the maintainer when approving the CSS-first, host-asset-owned design on 2026-07-19. Re-evaluate on any structural shell, asset, JavaScript, behavior, arbitrary-class, model, or cache-identity change.
