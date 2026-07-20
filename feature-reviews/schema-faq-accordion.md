# Feature Development: Schema FAQ Accordion

**Status:** MERGED — PR #72 landed in `dev` as `9f0fe28`; browser pre-publication evidence remains open
**Claimed:** 2026-07-19T15:38:07Z
**Agent:** /root
**Current Mode:** Delivery complete — external browser evidence pending

---

## Resumption Context

**Last Completed Mode:** Delivery
**Current Mode:** Delivery complete — external browser evidence pending
**Next Action:** Before publishing the coordinated package trio, run Phase 9 against a configured host page with browser integration, then re-score Validation and Testability to 10/10.
**Files Created:**
- `feature-reviews/schema-faq-accordion.md` - Feature-dev state and decision record.
- `feature-reviews/schema-faq-accordion-spec.md` - Approved and implemented public contracts, architecture, package/version plan, risk, rollback, and checkpoints.
- `feature-reviews/schema-faq-accordion-test-plan.md` - Failing-first functional, security, cache, framework, JSON-LD, package, and browser test matrix.
- `feature-reviews/stride-schema-faq-accordion.md` - Full plan-level STRIDE analysis and control traceability.
- `feature-reviews/schema-faq-accordion-eval.md` - Batch-simulator ratification record and open browser gate.
- `src/uis/components-ui/src/accordion/accordion-group.tss` - Public canonical root binder.
- `src/uis/bootstrap-ui/src/accordion/accordion-group.tss` - Root-only Bootstrap presentation overlay.
- `src/uis/schema-ui/src/faq-page/faq-page-accordion.tss` - Narrow FAQPage/Question/Answer projection.
- `test/uis/schema-faq.test.js` and `test/pipeline/schema-faq.test.js` - Source and end-to-end FAQ contracts.
**Files Modified:** Three UI mapper/package/README surfaces, canonical cache identities and accordion binder, focused UI/pipeline tests, parser/manifest ratchets, and the review ledger.
**Tests Written:** Sixteen net new FAQ/group/Bootstrap/manifest/cache cases across the source and pipeline suites; the repository total advances from 912 to 928.
**Issues Found and resolved:**
- The published package is `@jtorm/schema-ui@0.1.2`, while its singleton has retained the legacy asset namespace `jtorm/schema-ui-0.0.4/src` since the package first advanced to 0.0.5.
- An explicit outer framework request does not propagate through registry fallback into nested implicit UI calls; the current pipeline proves `WebPage.default; f:'bootstrap'` under a globally neutral framework leaves its nested canonical loading component neutral.
- Schema TSS cannot safely array-map into `accordion.default`, and directly acquiring a private shell would cross package ownership. A public root-only `accordion.group` is required.
- Reusing or loosening the existing Bootstrap default overlay would decorate pre-existing hooks for invalid default models. A separate root-only overlay is required.
- JSON-LD rejects some hostile array structures that canonical `each` safely ignores; UI ownership tests and structured-data tests must remain separate.
- Ordinary TSS data paths intentionally resolve inherited properties, while `each` is own-index-only and JSON-LD is stricter. The plan characterizes that split rather than changing the shared parser.
- Current canonical `accordion.default` uses the same seven cold requests and 4,443 artifact bytes for one and 32 items. The shared group binder deliberately ratchets that path to eight constant requests; semantic/cache behavior stays exact.
- Implementation review found missing FAQ-specific prepared-manifest and persisted-restart evidence; both regression paths are now covered.
- The published schema README now exposes inherited-property and whitespace-only accessible-name host-validation boundaries.
- Stale planning-state headers and duplicated progress checkpoints were reconciled with the approved implementation state.

**Design Decisions Made:** Seven handoff decisions resolved; see the decision record below and the feature specification.

**Context for Next Session:**
Final feature head `314eb71` passed 928/928 local tests, green CI, and a clean current-head Codex
review with zero unresolved threads before the maintainer merged PR #72 into `dev` as `9f0fe28`.
The feature worktree and local/remote feature branches were removed. Implementation and automated
delivery are complete; live browser accessibility QA through a configured host page remains an
explicit pre-publication gate.

---

## Research Summary

- **Packages and owners involved:** `@jtorm/schema-ui` owns schema.org projection and the published `FAQPage` mapper; `@jtorm/components-ui` owns the canonical `accordion.default` / `accordion.item` model, native `details` / `summary` shells, escaped binding, and static-shell cache IDs; `@jtorm/bootstrap-ui` owns only literal post-binding classes; the existing resolver/compiler/UI-method, each/data/if methods, request/manifest seams, JSON-LD model/plugin, and UI-cache model remain their current owners.
- **Observed data flow:** The public root model is passed unchanged to the selected schema mapper and independently serialized by the after-view JSON-LD plugin. Canonical accordion validates an object with an array `items`, restores/builds data-free root/item shells, then maps each own canonical array index to `accordion.item` using `summary` and `content`. Bootstrap descriptors execute canonical artifacts first and fixed-literal overlays second.
- **Existing FAQ behavior:** `FAQPage.default` is a published one-artifact delegation to `WebPage.default`; `Question` and `Answer` have no mapper keys or artifacts.
- **Existing projection patterns:** Schema TSS uses lexical `->data` copies and `->each` aliases to avoid mutating frozen caller objects. The data method can project scalar/nested paths into scoped child data, but it has no array-map operation. The each method iterates only own enumerable canonical array indices and ignores inherited/named properties.
- **Validation and failures:** Canonical accordion rejects null/scalar/array top-level models and non-array `items` with no output, renders an empty root for an empty array, skips items unless both `summary` and `content` are truthy strings, and treats only boolean `open: true` as open. Required TSS acquisition and selector drift remain loud. Collection length is currently host-owned; the canonical README explicitly requires hosts to bound attacker-influenced item counts.
- **Framework resolution:** Implicit lookup tries custom mapper, configured framework, then registry order. Explicit `f` skips the custom mapper but still falls back through other registries. Nested implicit UI calls use the configured global framework; the explicit framework that missed and fell back is not inherited. Existing Bootstrap accordion handles explicit selection only because Bootstrap owns the outer canonical descriptor and its overlay decorates the completed subtree.
- **Cache behavior:** Canonical accordion has two versioned literal-only entries, `accordion-shell` and `accordion-item-shell`. Caller question/answer text is bound after restoration; Bootstrap adds classes afterward and owns no fragment identity. The harness supports cold, shared-warm, and restart/persistence restoration paths through scoped render context, deterministic clocks, a save adapter, and `uiCacheInit`.
- **JSON-LD parity:** The JSON-LD plugin serializes the unchanged eligible root after rendering, omits internal `@meta`, rejects hostile structures, and uses script-safe text. Google’s current general guidance requires structured data to represent visible content; its FAQ rich-result policy remains restricted mainly to authoritative government and health sites.
- **Package identity history:** Package and singleton ID last matched at 0.0.4. Package releases 0.0.5 through 0.1.2 changed metadata without changing or documenting the ID. The ID participates in public artifact/manifest identity, so this is a compatibility decision rather than a cosmetic string update.
- **Relevant interfaces:** Published mapper descriptors (`ui`, `t`, `h`, `d`, `pT`, `di`), canonical accordion models, `UiResolution`, root `ViewModel` / render context, and JSON-LD root serialization. No HTTP, database, event, auth, or storage API is introduced by the requested slice.
- **Locked constraints:** additive published contracts; pure CommonJS metadata/TSS; no runtime imports, handwritten TypeScript, caller HTML, Bootstrap behavior/assets, duplicate adapter model, cache identity leakage, root-model mutation, or rich-result claim; escaped text sinks; native independent disclosures; existing resolver/compiler/dispatch/request/cache ownership.
- **Questions resolved in plan:** all seven decisions are recorded below. No implementation question remains open.

---

## Design Decision Record

1. **Schema surface:** add `FAQPage.accordion`; preserve `FAQPage.default` and `FAQPage.link` exactly.
2. **Canonical composition:** publish root-only `accordion.group`. Keep `accordion.default`’s exact `items` gate, then acquire the same-package group binder through required `->get` before the existing item loop.
3. **Schema projection:** accept only exact `FAQPage -> Question -> acceptedAnswer: Answer` object shapes with truthy string `name` / `text`; copy only `summary` and `content` into item data. Preserve ordinary inherited data-path lookup while retaining own-index array traversal.
4. **Invalids and bounds:** invalid roots render nothing; a valid empty/all-invalid array renders one empty group; malformed entries skip independently; host validation owns item/string bounds; over-limit regex operands retain the existing loud failure.
5. **Bootstrap:** add a group-only literal overlay and leave existing default/item overlays strict. FAQ Bootstrap presentation is supported through global configured framework; explicit outer framework propagation is out of scope and characterized.
6. **Published identity:** coordinated minor releases `components-ui@0.2.0`, `bootstrap-ui@0.2.0`, and `schema-ui@0.2.0`; advance components/Bootstrap singleton IDs and all seven canonical cache IDs; retain schema’s legacy `jtorm/schema-ui-0.0.4/src` asset namespace; publish components, then Bootstrap, then schema.
7. **JSON-LD:** serialize the original root unchanged; prove exact ordered parity only for valid dense supported models; keep invalid UI traversal and serializer-hostile array tests separate.

Rejected alternatives:

- changing `FAQPage.default`;
- adding broad `Question.default` / `Answer.default` contracts;
- feeding the raw root to `accordion.default`;
- schema UI acquiring `accordion-shell.tss` or duplicating its markup/cache identity;
- nesting an implicit group UI call inside canonical default;
- loosening the existing Bootstrap default overlay;
- modifying resolver/context framework propagation;
- normalizing or weakening JSON-LD;
- renderer-local silent truncation.

---

## Review Inputs Applied

### Feature-dev agents

- **Code explorer:** confirmed the lack of a safe array-map path, the independent utility of a public root group, configured-framework behavior, cache ownership, and the JSON-LD split.
- **Code architect:** approved with conditions incorporated into the plan: required same-package group binding for default, a separate Bootstrap group overlay, no Question/Answer defaults, global-only FAQ Bootstrap, coordinated versions, stable schema asset namespace, valid-only parity, and host-owned bounds.

### Required personas and checklists

- **Architecture/planning/code review:** additive mapper contracts, one owner per responsibility, exact default characterization, failure-first checkpoints, rollback and blast radius.
- **Frontend/UI/accessibility:** preserve native `details` / `summary`, progressive operation without JavaScript, fixed-literal presentation only, and browser evidence for keyboard/focus/zoom/reflow.
- **Security/threat modeling:** full STRIDE, exact type/shape gates, two derived allowlists, escaped sinks, no data-bearing cache, regex-policy reuse, and host resource bounds.
- **Privacy/compliance/audit:** public-content minimization, no new collection/store/log/audit decision, and host ownership of content provenance and erasure.
- **Performance/production readiness:** linear traversal, 32-item evidence, constant artifact acquisition, coordinated rollout/rollback, cache cold migration, and no new runtime dependency.
- **Backend/Elysia/Bun/TypeScript/database/platform/routing:** reviewed as not applicable to the change surface; no endpoint, server runtime, authored type source, database, deploy primitive, or core route is added.

The generic database-architect persona and frontend-eval prompt referenced by review guidance were not installed. Database review is out of scope; installed frontend review skills and WCAG/design-system checklists were used for the frontend gate.

---

## Plan Quality Gate

**Scope:** `FRONTEND`, `SECURITY`
**STRIDE status:** complete, 6/6 categories; no PASTA trigger
**Threat model:** `feature-reviews/stride-schema-faq-accordion.md`
**Specification:** `feature-reviews/schema-faq-accordion-spec.md`
**Test plan:** `feature-reviews/schema-faq-accordion-test-plan.md`

| Dimension | Score |
|---|---:|
| Architecture | 10/10 |
| Consistency | 10/10 |
| Type Safety | 10/10 |
| Validation | 10/10 |
| Error Handling | 10/10 |
| Security/Privacy | 10/10 |
| Performance | 10/10 |
| Maintainability | 10/10 |
| Testability | 10/10 |
| Readability | 10/10 |

**Total:** 100/100 — PASSED
**Open plan/design blockers:** none
**Approval blocker:** cleared

**Approval received:** 2026-07-19 — maintainer approved the specification and test plan.

---

## Progress Log

### Research Mode
- [x] Read repository `AGENTS.md` and the complete handoff.
- [x] Fetched current `origin/dev` and created a clean isolated worktree/branch.
- [x] Mapped involved packages and end-to-end data flow.
- [x] Cataloged analogous schema projections and tests.
- [x] Recorded constraints and open questions without proposing changes.

### Plan Mode
- [x] Entered plan mode.
- [x] Read the feature specification template.
- [x] Wrote the feature specification and exact test plan.

### Plan Quality Gate
- [x] Scope classified.
- [x] Relevant review guidance applied.
- [x] All 10 dimensions pass at plan level.
- [x] STRIDE pre-analysis complete.
- [x] Plan refined and presented for maintainer approval.

### Design Mode
- [x] Loaded and applied required agent personas.
- [x] Completed architecture and data-flow design.
- [x] Resolved all seven handoff decisions.
- [x] Validated the design against repository red flags.
- [x] Stopped before implementation for maintainer approval.

### Baseline Verification
- [x] Full `npm test`: 912/912 pass with the primary checkout’s existing `.bin` and `node_modules` exposed read-only.
- [x] `npm run typecheck`: pass.
- [x] Initial 911/912 run diagnosed as an isolated-worktree PATH issue only (`terser: not found`); exact rerun with the installed pinned binary passed.
- [x] Cold canonical accordion characterization: 1 item and 32 items both use 7 requests / 4,443 bytes and the same artifact path list.
- [x] No feature tests or runtime/package source changes were made.

### Implement Mode
- [x] Failing-test gate: 50 focused tests executed; 29 passed and 21 failed only on the intentionally absent mapper keys, artifacts, projection behavior, acquisition path, and coordinated versions. No syntax or harness failure.
- [x] Red tests added in `test/uis/{components-ui,bootstrap-ui,schema-faq}.test.js` and `test/pipeline/{components-ui,bootstrap-ui,schema-faq}.test.js`.
- [x] Checkpoint 1: Scaffold — additive mapper entries, artifacts, coordinated package versions/dependencies, singleton identities, and seven cache-generation IDs.
- [x] Checkpoint 2: Core logic — canonical group extraction and exact FAQPage/Question/Answer projection through derived group/item models.
- [x] Checkpoint 3: Edge cases — malformed roots/entries, arrays, type near-matches, inherited paths, own-index traversal, frozen models, escaping, and regex-policy limits.
- [x] Checkpoint 4: Integration — canonical/Bootstrap framework matrix, direct composition, unchanged JSON-LD root, cache purity, and constant acquisition.

### Test Mode
- [x] Tests written failing-first where applicable.
- [x] Initial implemented focused tests passing: 50/50.
- [x] Post-review focused UI/manifest/restart set passing: 59/59.
- [x] Full `npm test` passing: 928/928.
- [x] `npm run typecheck` passing.
- [x] Three `npm pack --dry-run --json` publish surfaces contain the intended new artifacts.

### Review Mode
- [x] Required architecture, frontend, and privacy implementation reviews have no remaining valid code/documentation finding.
- [x] Architecture implementation score: 100/100.
- [x] Privacy/compliance implementation score: 100/100.
- [x] Automated verification loop passed: 928 tests, typecheck, package dry-runs, source ratchets, manifest determinism, and `git diff --check`.
- [x] PR #72 passed green CI and a clean current-head Codex review, then merged into `dev` as `9f0fe28`.
- [ ] Live browser evidence is required to move the feature-dev score from 98/100 to 100/100.
- [ ] Phase 9 browser verification loop passed.

### Documentation Mode
- [x] User-facing/package documentation updated as approved.
- [x] Specification, test plan, STRIDE, progress, batch, and review ledger records reconciled.
- [x] Generic feature-dev application documents are N/A: this repository has no `docs/`, `docs/frontend/feature-actions.md`, or `feature-reviews/PROGRESS.md`; package READMEs and feature-review records are its established owners.
- [x] On-demand batch-simulator record written.
- [x] Canonical architecture backlog records the merge, remaining browser gate, and next UI tranche.

---

## Implementation Quality Gate

| Dimension | Score |
|---|---:|
| Architecture | 10/10 |
| Consistency | 10/10 |
| Type Safety | 10/10 |
| Validation | 9/10 |
| Error Handling | 10/10 |
| Security/Privacy | 10/10 |
| Performance | 10/10 |
| Maintainability | 10/10 |
| Testability | 9/10 |
| Readability | 10/10 |
| **Total** | **98/100** |

There is no remaining valid implementation finding. The two-point holdback is
evidence-only: this session has no required Chrome MCP/browser tools and the
repository defines no development URL or host page. Phase 9 must verify native
keyboard activation, focus, accessibility-tree names/state, real Bootstrap CSS,
contrast/touch targets, 200–400% zoom/reflow, RTL/long text, CSS-disabled
operation, and screenshots before this record may become `COMPLETED`.

The feature-dev test-engineer persona was unavailable; the installed
`e2e-runner` and `tdd-guide` personas plus repository `node:test` patterns
were used. The named `architect-review.md` persona was also unavailable; the
indexed `architect.md` and review-architecture controls were used and the gap
was recorded rather than inventing instructions.
