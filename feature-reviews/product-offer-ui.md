# Feature Development: Product + Offer UI

**Status:** COMPLETED
**Claimed:** 2026-07-13T12:11:14Z
**Agent:** /root coordinator
**Current Mode:** Delivery complete

---

## Resumption Context

**Last Completed Mode:** Delivery
**Current Mode:** Complete
**Next Action:** Archived: PR #37 merged into `dev`; follow-up work is tracked in the architecture backlog.
**Files Created:** Product/Offer TSS artifacts and focused pipeline/mapper tests.
**Files Modified:** schema mapper, schema-ui README/version, and parser snapshot.
**Tests Written:** 28 focused Product/Offer pipeline cases plus mapper/artifact coverage. Initial red proved unresolved Product/Offer components; later red tests proved and fixed mutation, Unicode-anchor, helper-key poisoning, and Brand href-collision defects.
**Issues Found (not yet fixed):** None in scope. Framework-wide ambient HTML-attribute trust and legacy `Thing.default` update artifacts were recorded as pre-existing/out of scope; this PR adds no core or HTML-UI changes.
**Design Decisions Made:** Product + Offer is the only component slice in this PR; later schema components get separate PRs. Reuse `Thing.default`/`Thing.item`, `ImageObject`, `Text`, and HTML leaves. Treat Brand/Organization as thin aliases only if needed by an actual nested Product path.

**Context for Next Session:**
The user requested delegated execution, with /root coordinating and reviewing. Follow project AGENTS.md over generic stack assumptions in this skill. GitHub origin is the only remote; target `dev`; maintainer merged PR #37.

---

## Progress Log

### Research Mode
- [x] Repository and branch state checked
- [x] Existing schema-ui conventions mapped
- [x] Full resolver/compiler pipeline mapped
- [x] Official schema.org contracts verified

## Research Summary

- **Modules involved:** `@jtorm/schema-ui` mapper/artifacts and full-pipeline/artifact tests; resolver/compiler are exercised but remain unchanged.
- **Existing patterns:** schema types compose a parent via `ui: { c: 'Parent.variant' }` and add the smallest possible `.tss` overlay; `Thing` owns shared name/description/image/url rendering; `Text` and normal HTML content use inert `insert t:`.
- **Data flow:** `ui-method` lifecycle -> `ui-resolver-model` lookup/cache -> `ui-compiler-model` descriptor compilation -> `get-method` scoped artifact load -> SSR DOM serialization.
- **Schema contracts:** Product and Offer inherit Thing; `brand` expects Brand/Organization, `offers` expects Offer/Demand, `availability` belongs on Offer, `price` is Number/Text and must preserve zero, `priceCurrency` is separate Text, and no property is mandatory.
- **Constraints discovered:** no ancestor fallback; no raw `h:` data sink; URL schemes stay behind hardened `attr`; optional collections require guards; keep artifacts few because fetches are sequential; only `@jtorm/schema-ui` should need a package bump.
- **Open questions:** none; the user supplied complete scope and acceptance criteria.

## Feature Spec: Schema.org Product + Offer UI

**Date:** 2026-07-13
**Author:** /root coordinator with delegated research/review
**Status:** Approved for implementation (user requested immediate first-PR execution)

### Problem Statement

Framework consumers can render generic `Thing` data but cannot resolve schema.org `Product` or its nested `Offer`, so commerce data fails before producing useful SSR HTML. The slice must prove the separated resolver/compiler architecture can render a secure, compact detail/card commerce path without host-specific fields or runtime dependencies.

### Scope

#### In Scope

- `Product.default`, `Product.item`, and nested `Offer.default` mapper paths.
- Schema.org properties: inherited `name`, `description`, `image`, `url`; Product `sku`, `gtin`, `brand`, `offers`; Offer `price`, `priceCurrency`, `availability`.
- Typed `ImageObject` input through the existing component; typed Brand/Organization via thin useful Thing composition only if required.
- Singular or repeated nested offers where existing guarded `each` composition supports both without extra complexity.
- Presence-aware price rendering, including numeric `0` and text `"0.00"`.
- Focused full-pipeline SSR goldens, optional-field/escaping/unsafe-URL cases, mapper/artifact coverage, snapshot, public package docs, and package version.

#### Out of Scope

- JSON-LD/Rich Results, ontology generation, ancestor fallback, AggregateOffer/Rating/Review, CSS/JS collector work, resolver/compiler refactors, new UI backend, deployment, Magento, and GitLab metadata.
- Claiming every schema.org cardinality/range shape; direct image `URL` support remains the existing `ImageObject` boundary unless it is already supported without core changes.
- `Product.link`: existing `Thing.link` can produce an empty visible anchor for ordinary Product data.

### Requirements

#### Functional

1. Resolve Product detail and item/card variants through the real schema -> components -> HTML pipeline.
2. Reuse the content-safe `Thing.item`/`Thing.contents` path; never compose page-level `Thing.default` update behavior.
3. Render identifiers, typed brand, and nested Offer only when present; absence must not leave commerce-specific empty wrappers/labels or throw.
4. Render Offer price and currency separately without symbol/locale inference, preserve zero, expose availability with a deterministic human-readable label derived from its schema enumeration value, and use a meaningful link only when visible content exists.
5. Keep all text inert and all URL attributes on the existing hardened attribute path.

#### Non-Functional

- **Security:** no data-bound `h:`; adversarial Product/Offer text remains text; unsafe URL schemes fail through existing guards.
- **Scalability:** component names are static; no data-derived unbounded resolver keys or state; singleton tests reset state through the harness.
- **Performance:** minimum schema artifacts; no dependency/runtime-code additions; reuse cached resolver/compiler/TSS paths.
- **UX/accessibility:** semantic SSR, meaningful link text, no empty interactive anchors, image alt inherited from `ImageObject.name`, availability readable by humans.

### Affected Components

| Component | Change | Risk |
|---|---|---|
| `src/uis/schema-ui/src/schema-ui.js` | Add Product/Offer and required thin aliases | Medium |
| `src/uis/schema-ui/src/product/*.tss` | Product overlay/variant boundary | Medium |
| `src/uis/schema-ui/src/offer/*.tss` | Offer commerce rendering | Medium |
| `src/uis/schema-ui/src/item-availability/*.tss` | Only if required for safe enum-to-label UX | Low |
| `test/pipeline/*.test.js` | Exact SSR, optional, zero, escaping, URL cases | Low |
| `test/uis/artifact-paths.test.js` / parser snapshot | Mapper/artifact integrity | Low |
| `src/uis/schema-ui/{package.json,README.md}` | Version and public contract | Low |

### Dependencies and API Contract

- No network/database/API endpoint or runtime dependency change.
- Public surface is additive mapper resolution: `Product.default`, `Product.item`, `Offer.default`, plus any required typed alias. Existing exports/descriptors remain unchanged.
- Official source contracts: `https://schema.org/Product`, `https://schema.org/Offer`, and `https://schema.org/ItemAvailability`.

### Security Assessment (Focused STRIDE)

- **Spoofing:** N/A; renderer has no identity/auth state.
- **Tampering:** schema data is untrusted; it reaches only existing inert text and hardened URL attribute sinks.
- **Repudiation:** N/A; pure rendering adds no mutation or audit event.
- **Information Disclosure:** no extra properties, fetches, logs, or hidden data are introduced.
- **Denial of Service:** static component keys and bounded existing TSS cache; no recursion/itemOffered back-reference; tests cover omitted data.
- **Elevation of Privilege:** no execution/raw-HTML sink or new trust boundary; explicit framework DI boundaries stay unchanged.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Optional fields trigger zero-match/fallback iteration | Medium | High | Guard collections/targets and exact absent-optionals golden |
| Numeric zero disappears via truthiness | High | Medium | Presence-aware `data -> insert t:` path; tests for `0` and `"0.00"` |
| XSS/unsafe URL from commerce data | Medium | High | Existing `t:`/`attr` seams; adversarial text and scheme tests |
| Extra artifacts increase sequential fetch work | Medium | Medium | Reuse Thing/HTML leaves; one artifact per real type/variant boundary |
| Misrepresent schema range/cardinality | Medium | Medium | Document typed ImageObject and scoped Offer support; no AggregateOffer alias |

### Trade-offs Considered

| Decision | Alternatives | Why |
|---|---|---|
| Compose content-safe `Thing.item` | `Thing.default`; duplicate Product scaffold | Avoid page update artifact and duplication |
| Thin Brand/Organization aliases | Local `brandName`; new visual artifacts | Keeps real schema types and reuses Thing |
| No Product.link | Delegate to Thing.link; custom link artifact | Existing link can be empty; custom artifact is not needed for acceptance |
| Human availability label from canonical enum | Display raw URL; invent `availabilityLabel` | Better UX without non-schema input |
| Preserve Number/Text price as text | Currency formatting/symbol inference | Matches Offer contract and avoids locale/precision invention |

### Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Existing schema mapper, Thing/ImageObject/Text, HTML leaves, resolver/compiler DI |
| Direct dependents | Hosts resolving the new component names; full-pipeline tests |
| Cascade on outage | Missing artifact makes only Product/Offer rendering fail loudly |
| Cascade on slow | Extra schema artifact loads add bounded first-render latency then use existing cache |
| Cascade on bad data | Bad text stays inert; unsafe URLs throw; absent data omits commerce sections |
| Compromised-session impact | N/A; no session/data access; renderer only receives caller-supplied model |
| Fault isolation boundary | Component render/get boundary and existing zero-match/error handler |

### Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Revert the additive commit/PR; existing component paths are unaffected |
| Schema rollback | No database schema |
| Data rollback | No state or migration |
| Auto-rollback trigger | Package consumer/CI test failure blocks merge/release; no deployment in scope |
| Manual rollback runbook | GitHub revert of the Product + Offer commit into `dev` |
| Last rollback drill | N/A for an additive library PR with no deployment or schema state |

### Open Questions

None.

### Success Criteria

- Exact detail/card/nested-offer SSR goldens pass through the full pipeline.
- Optional-only, numeric-zero, adversarial text, and unsafe-URL cases pass.
- Mapper paths and every referenced artifact exist; intentional TSS snapshot delta only.
- `npm test`, `npm run typecheck`, package/prepack checks, and finish-task reviews pass.
- Only the schema-ui published package is bumped unless evidence shows another package changed.
- PR targeted `dev`, passed current-head CI and Codex review, and was maintainer-merged.

## Plan Quality Gate

**Scope tags:** FRONTEND
**Gate status:** PASSED
**Agents consulted:** code-explorer, architecture/security researcher, official-schema reviewer, frontend-developer criteria
**Issues found and resolved in plan:** 6 — avoided `Thing.default`; preserved numeric zero; defined availability UX; omitted empty Product.link; scoped ImageObject range honestly; excluded AggregateOffer semantics.
**STRIDE status:** Complete for a frontend-only pure-rendering slice.
**Pre-review score:** 10/10 in all required dimensions.

## Agent Design Constraints

### architect / code-architect

- [x] Preserve exact DI ownership: mapper/artifacts only; no resolver/compiler/ui-method edits or runtime imports.
- [x] Use static component names and the smallest real schema type/variant graph.
- [x] Compose the content-safe `Thing.item`, not page-level `Thing.default` behavior.

### planner / code-explorer

- [x] Exact file-level scope and dependency order locked: red pipeline/mapper tests -> mapper/artifacts -> snapshot/docs/version -> full gates.
- [x] Each implementation step is independently testable through the full engine.

### frontend-developer

- [x] SSR/SEO path retained; semantic HTML, meaningful links, inert text, no new dependency/JS/CSS payload.
- [x] Optional/empty states and numeric zero are explicit acceptance cases.
- [x] Availability must be human-readable; no raw schema URL as visible UX.

### security-architect / threat-modeling-enforcer

- [x] Focused STRIDE recorded before implementation; no new trust boundary/endpoints/state.
- [x] Untrusted text must use `t:` transitively and URLs must stay behind `attr` scheme checks.
- [x] Security controls have same-PR adversarial text and unsafe-URL tests.

### backend-architect / elysia-expert / bun-expert / typescript-pro

- [x] Reviewed and marked stack-specific route/DB/TypeScript rules N/A: this is dependency-free CommonJS/TSS and project AGENTS forbids handwritten TypeScript.
- [x] Applicable constraints retained: no runtime dependencies, no unbounded work, explicit null/optional behavior, full test/typecheck evidence.

### platform-engineer / database-architect

- [x] No infrastructure, deployment, database, migration, secrets, or observability surface; criteria N/A.
- [x] `database-architect.md` is not installed/indexed; absence is non-blocking because the slice has no data layer.

### Threat model location

- Recorded inline in this workflow checkpoint, now tracked under `feature-reviews/` as project architecture history.

### Plan Mode
- [x] Entered plan mode
- [x] Explored codebase
- [x] Wrote feature spec

### Plan Quality Gate
- [x] Scope classified (tags: FRONTEND)
- [x] Relevant agents consulted
- [x] All 10 dimensions pass at plan level
- [x] SQL pre-review not applicable
- [x] STRIDE pre-analysis complete
- [x] Plan refined with agent feedback
- [x] Plan presented and approved (user requested immediate execution)
- [x] Exited plan mode

### Design Mode
- [x] Loaded applicable agent personas; incompatible stack rules recorded N/A
- [x] Spawned code-explorer
- [x] Spawned code-architect
- [x] Created focused threat model
- [x] Validated against red flags

### Implement Mode
- [x] Checkpoint 1: Red tests/scaffold captured before source implementation
- [x] Checkpoint 2: Core Product + Offer rendering
- [x] Checkpoint 3: Optional fields and escaping edge cases
- [x] Checkpoint 4: Full-pipeline integration (15 focused cases green)

### Test Mode
- [x] Focused tests written
- [x] Focused tests passing (34/34 combined focused pipeline/mapper/parser)
- [x] Full `npm test` passing (379/379)
- [x] `npm run typecheck` passing
- [x] Package/artifact checks passing (`@jtorm/schema-ui@0.1.0`, 84 files)

### Review Mode
- [x] review-architecture: PASS
- [x] review-privacy: PASS (no PII, persistence, logging, or privacy surface)
- [x] review-frontend: PASS
- [x] STRIDE controls implemented
- [x] 100/100 code quality (see `product-offer-ui-eval.md`)
- [x] Verification loop passed
- [x] All tests passing

### Documentation Mode
- [x] Relevant public documentation updated
- [x] Workflow and review records tracked in a follow-up documentation PR
- [x] Progress state completed
- [x] finish-task gate passed

### Delivery Mode
- [x] Conventional commits created (`9b4595b`, `2e6aa24`)
- [x] Branch pushed to GitHub origin
- [x] Ready-for-review PR #37 opened into `dev`
- [x] Codex review requested for current head `2e6aa24`
- [x] CI green and valid review findings resolved
- [x] PR #37 maintainer-merged into `dev`
