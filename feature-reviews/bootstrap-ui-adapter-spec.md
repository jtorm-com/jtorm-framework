# Feature Spec: Bootstrap UI Adapter

**Date:** 2026-07-19
**Author:** Codex
**Status:** Implemented and locally verified; PR delivery gates pending
**Approved by:** Maintainer in the current conversation on 2026-07-19

## Problem Statement

A jTorm host can render the canonical `@jtorm/components-ui` catalog, but it cannot select a Bootstrap presentation without replacing the canonical mapper or duplicating its data binding. The first framework adapter must prove that the existing resolver/compiler boundary supports a real UI framework while keeping schema, data validation, semantic HTML, escaped text, and fragment-cache ownership in the canonical layer.

The user need is a predictable Bootstrap 5 presentation for the 14 canonical component variants. The business need is a reusable adapter pattern that future UI frameworks can implement without changing application models or the jTorm runtime. Those goals align: the adapter is deliberately a thin presentation registry, not a second component model.

## Scope

### In Scope

- Publish `@jtorm/bootstrap-ui@0.1.0` from `src/uis/bootstrap-ui`.
- Export `jTormBootstrapUI` with framework `bootstrap`, alias `@b`, and ID `jtorm/bootstrap-ui-0.1.0/src`.
- Map all 14 canonical variants from `@jtorm/components-ui`.
- Compile each descriptor in this order:
  1. the canonical `@c/...` binding artifact;
  2. one data-binding-free Bootstrap `@b/...` presentation overlay.
- Preserve the canonical model directly; do not rename, mirror, or translate caller fields.
- Add literal Bootstrap classes only after the canonical component has rendered and bound fresh data.
- Mirror only the canonical output-validity gates needed to make overlays zero-match safe. The badge overlay may reuse the canonical derived `label || count` presence gate so numeric zero remains valid; that value is never rendered or forwarded by the adapter.
- Keep the canonical semantic elements, roles, accessible names, URL policy, localization, and native behavior.
- Keep Bootstrap CSS loading under host control and document compatibility with Bootstrap `^5.3.8`.
- Keep the native `details`/`summary` accordion and style it without Bootstrap Collapse JavaScript.
- Integrate the package into disk-path, artifact-closure, parser-snapshot, and full-pipeline tests.
- Verify framework resolution, fallback, explicit-framework nesting, cache isolation, invalid-model behavior, and class mappings.

### Out of Scope (Non-Goals)

- Bootstrap JavaScript, Collapse, Popper, event handlers, `data-bs-*`, or synthetic `aria-expanded` state.
- Automatic CDN, CSS, font, icon, or JavaScript asset loading.
- A fork of canonical HTML or a Bootstrap-specific data model.
- Adapter cache IDs or adapter-owned shells while structure remains byte-identical to the canonical shell.
- Resolver, compiler, UI method, cache model, method-dispatch, or canonical component changes.
- Legacy non-canonical `components-ui` recipes such as `button.primaryButton`.
- Components outside the 14-item canonical catalog.
- Exact stock Bootstrap accordion/card markup where that would require changing semantic structure.
- Claims that including Bootstrap CSS alone proves WCAG conformance in every host theme.
- Authorization, confirmation, audit, analytics, network, persistence, or application behavior.

## Public Contract

There are no HTTP endpoint, database, event, storage, or request-policy API changes. The public contract is one injected UI registry singleton. Its fixed `@b/*.tss` aliases use the existing TSS acquisition path alongside the canonical `@c/*.tss` aliases.

```js
module.exports = {
    jTormBootstrapUI: {
        id: "jtorm/bootstrap-ui-0.1.0/src",
        alias: "@b",
        framework: "bootstrap",
        url: "http://localhost:4001/",
        mapper: {}
    }
};
```

The mapper implements exactly these canonical keys:

| Component | Canonical artifact | Bootstrap overlay |
|---|---|---|
| `button.default` | `@c/button/button-default.tss` | `@b/button/button.tss` |
| `button.primary` | `@c/button/button-primary.tss` | `@b/button/button.tss` |
| `button.secondary` | `@c/button/button-secondary.tss` | `@b/button/button.tss` |
| `button.destructive` | `@c/button/button-destructive.tss` | `@b/button/button.tss` |
| `badge.default` | `@c/badge/badge-default.tss` | `@b/badge/badge.tss` |
| `alert.default` | `@c/alert/alert-default.tss` | `@b/alert/alert.tss` |
| `alert.info` | `@c/alert/alert-info.tss` | `@b/alert/alert.tss` |
| `alert.success` | `@c/alert/alert-success.tss` | `@b/alert/alert.tss` |
| `alert.warning` | `@c/alert/alert-warning.tss` | `@b/alert/alert.tss` |
| `alert.error` | `@c/alert/alert-error.tss` | `@b/alert/alert.tss` |
| `card.default` | `@c/card/card-default.tss` | `@b/card/card.tss` |
| `accordion.default` | `@c/accordion/accordion-default.tss` | `@b/accordion/accordion.tss` |
| `accordion.item` | `@c/accordion/accordion-item.tss` | `@b/accordion/accordion-item.tss` |
| `loading.default` | `@c/loading/loading-default.tss` | `@b/loading/loading.tss` |

The package declares `@jtorm/components-ui` as metadata dependency because its descriptors reference `@c` artifacts. Bootstrap is an optional peer compatibility contract: a host may install Bootstrap from npm or supply a pinned/self-hosted stylesheet.

## Presentation Mapping

All classes are appended to the canonical `jtorm-*` hooks; caller-supplied root classes remain present.

| Canonical intent/element | Bootstrap classes appended |
|---|---|
| button root, common | `btn` |
| `button.default` | `btn-secondary` |
| `button.primary` | `btn-primary` |
| `button.secondary` | `btn-outline-secondary` |
| `button.destructive` | `btn-danger` |
| badge root | `text-bg-secondary` (`badge` already exists canonically) |
| alert root, common | `alert` |
| `alert.default` | `alert-secondary` |
| `alert.info` | `alert-info` |
| `alert.success` | `alert-success` |
| `alert.warning` | `alert-warning` |
| `alert.error` | `alert-danger` |
| alert title | `alert-heading d-block` |
| alert message | `mb-0` |
| card root | `card p-3` |
| card title | `card-title d-block` |
| card summary | `card-text` |
| card action | `card-link` |
| loading root | `d-inline-flex align-items-center gap-2` |
| loading indicator | `spinner-border spinner-border-sm` |
| accordion group | `accordion` |
| accordion item | `accordion-item` |
| accordion summary | `accordion-header p-3 fw-semibold` |
| accordion content | `accordion-body` |

The accordion intentionally does not use `accordion-button`, `accordion-collapse`, `collapse`, `collapsed`, or `show`. Those classes encode Bootstrap Collapse's JavaScript state contract and would conflict with native `details[open]` state. The resulting control is a Bootstrap-themed native disclosure, not a claim of byte-identical stock accordion markup.

## Rendering and Cache Boundary

The canonical binding artifact remains the only data owner:

```text
canonical shell cache -> canonical fresh-data binding -> Bootstrap literal class overlay
```

- Existing `jtorm/components-ui-0.1.0/*-shell` entries contain trusted canonical structure only.
- Bootstrap overlays run after every cold or warm shell render and never execute inside a `cid` iteration.
- Canonical and overlay TSS are required descriptor artifacts acquired through the existing request policy and optional manifest lookup. An unavailable or denied overlay remains a loud existing get/request failure rather than a partially styled success.
- No Bootstrap class is stored in a canonical shell cache entry.
- The adapter adds no `cid`, `cs`, cache model, cache namespace, or structure.
- If a later adapter version changes HTML structure, it must introduce distinct, versioned `jtorm/bootstrap-ui-<version>/*` shell IDs and repeat the cache-isolation analysis.
- Resolver descriptors are cached separately from HTML. A host that changes registered UI packages or framework configuration must call the existing resolver initialization/reset path.

Overlay transforms are zero-match loud, so every overlay repeats the canonical top-level type and required-field gate before selecting the newly appended `:last-child` root. This prevents an invalid new model from either throwing or styling an older matching node in the same target. Optional transforms use the locked selector-chained `selector->if(el: selector)->verb` form. Descendant and standalone accordion styling uses optional DOM gates and `:not(<bootstrap-class>)` selectors so it is idempotent when nested items already resolved through Bootstrap.

## Bootstrap Asset Ownership

The adapter does not fetch Bootstrap CSS, JavaScript, fonts, icons, or other Bootstrap assets. The normal jTorm request path still acquires its trusted `@b/*.tss` code artifacts. The host must load one compatible Bootstrap `^5.3.8` stylesheet before rendering styled pages and owns:

- npm versus self-hosted versus CDN delivery;
- exact version pinning and upgrade testing;
- Content Security Policy and, for third-party delivery, Subresource Integrity and `crossorigin`;
- offline/PWA caching and failure behavior;
- theme/color-mode selection and custom Sass/variable overrides;
- global Reboot impact on the rest of the document.

This avoids silently adding a cross-origin request, unpinned global CSS, or a stylesheet that a host cannot account for in CSP/offline policy. The semantic output remains understandable if CSS fails to load.

## Accessibility and UX Requirements

- Native button, link, status, alert, article, details, and summary behavior is unchanged.
- Visible canonical copy remains the accessible name; the adapter adds no icon-only control.
- Error/destructive intent is visibly differentiated with Bootstrap's danger treatment.
- Default buttons remain neutral; the adapter never promotes every action to primary.
- Loading's indicator remains `aria-hidden`; the visible label and canonical `role=status` remain authoritative.
- Accordion state remains native, keyboard-operable, and independent per item.
- No animation or behavior is added, so reduced-motion behavior cannot regress in the adapter itself.
- Hosts must verify focus visibility, contrast, forced colors, zoom/reflow, RTL, and light/dark/custom-theme behavior with the actual stylesheet they deploy.
- No fabricated badge count, urgency, authority, scarcity, default consent, or other persuasive signal is introduced. The adapter visually clarifies an existing canonical intent only.

## Validation and Failure Behavior

| Condition | Required result |
|---|---|
| Missing/invalid canonical data | Same canonical no-output result; no overlay throw; no pre-existing node restyled |
| Numeric badge count `0` | Badge renders and receives Bootstrap treatment |
| Caller copy contains markup | Remains inert escaped text |
| Card action URL is unsafe | Existing canonical URL guard throws before overlay |
| Caller root class exists | Preserved alongside fixed adapter classes |
| Caller class conflicts with an intent class | Trusted host override behavior; adapter does not sanitize or reinterpret it |
| `f:'bootstrap'` with non-Bootstrap global framework | Root and nested accordion items still receive Bootstrap treatment |
| Global framework is Bootstrap | Nested accordion classes appear once, not duplicated |
| Adapter lacks a component | Existing resolver fallback selects the next registered framework |
| Required `@b` TSS is unavailable or denied | Existing request/get path fails loud; no partially styled success |
| Bootstrap CSS absent | Semantic unstyled canonical UI remains usable |
| Bootstrap JS absent | All supported components remain functional; native accordion continues to work |
| Warm shell cache hit | Fresh caller data plus fresh overlay classes; no caller value in cache bytes |

## Affected Files

| File | Change | Risk |
|---|---|---|
| `src/uis/bootstrap-ui/package.json` | New published package metadata | Medium: public package contract |
| `src/uis/bootstrap-ui/README.md` | Install, registration, assets, a11y, cache, migration, rollback | Low |
| `src/uis/bootstrap-ui/src/bootstrap-ui.js` | New registry singleton and 14 descriptors | Medium |
| `src/uis/bootstrap-ui/src/{button,badge,alert,card,accordion,loading}/*.tss` | Seven literal presentation overlays | Medium: zero-match behavior |
| `test/helpers/engine.js` | Register adapter and support per-render framework option/reset | Medium: singleton isolation |
| `test/helpers/uis-disk-path.js` | Add `@b` disk alias | Low |
| `test/uis/artifact-paths.test.js` | Include Bootstrap artifacts in closure checks | Low |
| `test/uis/bootstrap-ui.test.js` | Registry/source/cache-layer ratchets | Low |
| `test/pipeline/bootstrap-ui.test.js` | Full render, security, fallback, and cache tests | Low |
| `test/fixtures/tss-snapshot.json` | Add seven deterministic parser snapshots | Low |
| `AGENTS.md` | Update factual TSS corpus count | Low |
| `feature-reviews/framework-architecture-review-2026-07-14.md` | Mark the Bootstrap P5 slice delivered | Low |
| `feature-reviews/bootstrap-ui-adapter*.md` | Spec, threat model, progress, evaluation | Low |

No root lockfile change is planned because the repository has no npm workspaces and tests do not need Bootstrap's package bytes to verify emitted class contracts.

## Alternatives Considered

| Alternative | Decision |
|---|---|
| Duplicate canonical components and bind Bootstrap-shaped data | Rejected: creates a second model, duplicates security/a11y logic, and risks caching caller data |
| Replace canonical shells with stock Bootstrap markup | Deferred: unnecessary for the first class-only adapter and requires adapter-owned cache IDs |
| Add Bootstrap classes to `components-ui` | Rejected: violates framework neutrality and couples all hosts to one presentation system |
| Modify resolver/compiler to understand adapters | Rejected: ordered descriptor artifacts already provide the required seam |
| Load Bootstrap automatically from a CDN | Rejected: host must own pinning, CSP, SRI, privacy, Reboot, and offline behavior |
| Use Bootstrap Collapse accordion | Rejected: adds JavaScript/state/ARIA ownership and conflicts with native `details` |
| Ship a Bootstrap-variable accordion bridge stylesheet | Deferred: utilities and safe component classes are sufficient for the first slice; add only if real browser QA proves a visual gap worth a host-loaded asset |
| Use Tailwind or Material UI first | Rejected for this test: Bootstrap is CSS-first, mature, broadly used, and can validate the adapter seam without a runtime renderer |

## Dependencies and Critical Path

1. Approved canonical `@jtorm/components-ui@0.1.0` contract (complete).
2. Registry and source contracts fail red.
3. Seven overlays and package metadata make source contracts green.
4. Harness registration enables pipeline tests.
5. Pipeline/cache/invalid-model tests make behavior green.
6. Parser snapshot, docs, package dry-run, full verification, and current-head review complete the release gate.

The critical path is 1 -> 2 -> 3 -> 4 -> 5 -> 6. Bootstrap's external stylesheet is not on the package test critical path because the adapter contract is the emitted semantic DOM and class set; actual host theme QA remains a documented deployment responsibility.

## Risk Register

| Risk | Probability | Impact | Owner | Mitigation/contingency |
|---|---|---|---|---|
| Invalid model causes loud zero-match or styles an older node | Medium | High | Adapter package | Mirror canonical output gates; `:last-child` scoping; adversarial pipeline tests |
| Explicit outer framework does not propagate to nested accordion items | High | Medium | Adapter package | Idempotently style the newly rendered accordion subtree; test explicit and global paths |
| Duplicate Bootstrap tokens on globally resolved nested items | Medium | Low | Adapter package | `:not(...)` selectors plus optional element gates; exact class assertions |
| Bootstrap CSS version changes class behavior | Medium | Medium | Host | Optional `^5.3.8` peer range, pinned deployed CSS, visual regression before upgrades |
| Required overlay TSS is unavailable or denied | Low to host-dependent | Medium | Host/framework | Existing request policy and loud get failure; reliable same-origin/package serving or prepared UI manifest |
| CDN/CSP/offline failure leaves UI unstyled | Medium | Low | Host | No automatic CDN; semantic progressive-enhancement baseline; self-host/caching guidance |
| Canonical cache accidentally stores adapter or caller data | Low | High | Adapter package | No adapter `cid`; inspect live/persisted cache bytes; cold/warm mixed-framework tests |
| Caller root class overrides Bootstrap intent | Medium | Medium | Trusted host | Document class as trusted host styling and test supported non-conflicting composition |
| Native accordion differs visually from stock Bootstrap docs | High | Low | Adapter package | Document the deliberate semantic tradeoff; defer bridge CSS until browser evidence |

Known assumption: Bootstrap class contracts remain compatible throughout the declared `^5.3.8` peer range. Known issue: this package cannot enforce a host's CSS delivery, TSS hosting availability, theme contrast, or collection-size policy. No database, endpoint, or cross-team dependency exists.

## Acceptance Criteria

1. The registry identity and package version align exactly and all 14 canonical variants resolve through `bootstrap` and `@b`.
2. Every descriptor lists the canonical artifact first and one adapter overlay second.
3. Adapter source contains no runtime import, raw HTML sink, data-model copy/rename, caller-bound attribute/text value, `cid`, `cs`, asset URL, JavaScript, or `data-bs-*`.
4. Only the documented Bootstrap class literals can be emitted; badge's derived presence gate does not become public data.
5. All valid variants retain canonical text, roles, attributes, escape behavior, URL rejection, and native state while adding the exact mapped classes.
6. Invalid/scalar/array/empty-required/missing-required models emit nothing without throwing and do not alter pre-existing matching hooks, including hooks that already carry the same variant class.
7. Explicit and global Bootstrap resolution both style every accordion item exactly once; neutral rendering remains neutral.
8. A component not in the Bootstrap mapper falls through to a proven canonical `@c` artifact using the existing resolver policy.
9. Cold, warm, mixed-framework, and persisted-cache tests show fresh caller data and only canonical static bytes in the seven shell entries.
10. All seven new TSS artifacts pass parser compatibility and deterministic snapshot ratchets.
11. `npm test`, `npm run typecheck`, focused review skills, package `npm pack --dry-run`, and clean current-head Codex review pass.
12. README and architecture backlog document asset ownership, compatibility, accessibility, cache behavior, upgrade, and rollback.

## Definition of Done

The feature is done only when every acceptance criterion passes, no valid severity finding remains, the full repository test/typecheck gates are green, documentation matches the delivered behavior, the package dry-run contains only intended files, the ready PR targets `dev`, CI is green, and Codex has returned a clean review against the PR's current head.

## Rollback

- Before publish: revert the feature commit/PR.
- After publish: consumers remove `jTormBootstrapUI` from `uis`, restore their prior framework setting, and pin the last known package set while a patch is prepared. Published packages are never deleted.
- Remove the Bootstrap stylesheet only after no other host UI uses it.
- Re-run resolver initialization after changing registry/framework configuration so cached descriptors cannot retain the removed adapter.
- No data/schema migration or cache eviction is required: the adapter creates no storage and owns no fragment-cache entry. Existing canonical shell entries remain valid.
- Automatic rollback triggers are a regression in canonical semantics, cache isolation, invalid-model behavior, accessibility/native interaction, or a clean-build/test failure.

## Planning and Design Gate Summary

- Planning rigor: PASS. Scope/non-goals, dependencies, critical path, risks, acceptance criteria, Definition of Done, assumptions, and rollback are explicit. Relative estimate is medium, anchored to the completed components-ui package slice; the fixed appetite is one adapter package/14 variants, with structure changes and JavaScript as circuit-breaker scope.
- Architecture: PASS under project `AGENTS.md`. The package extends the existing UI registry and preserves resolver/compiler/cache ownership, pure CommonJS, dependency-injected package metadata, and zero runtime imports.
- Frontend: PASS for planned scope. Semantic HTML precedes optional CSS; no JavaScript is added; visible copy remains localized caller data; no new async owner, storage, service-worker, or lifecycle behavior exists.
- Security/threat-model gate: PASS. The linked STRIDE controls are implemented and adversarially tested. No new application trust boundary exists; the host-owned stylesheet boundary and malicious-model behavior are explicitly analyzed.
- Persuasive/neuro design: PASS/N/A. The adapter clarifies existing intent with conventional Bootstrap patterns and a neutral default; it adds no prompt, choice architecture, behavioral signal, personalization, scarcity, consent, habit loop, animation, or content. Host-page hierarchy and measured usability remain host responsibilities.
- Backend, Elysia, Bun, database, API, infrastructure, and privacy implementation personas: N/A. No endpoint, server runtime, database, schema, PII, secret, request-policy implementation, deployment config, or background work changes.
