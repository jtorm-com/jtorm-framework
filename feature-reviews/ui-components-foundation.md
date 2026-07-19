# Feature Development: UI Components Foundation

**Status:** MERGED — PR #66 landed in `dev` at `6f6e8cf`
**Claimed:** 2026-07-18T18:11:28Z
**Agent:** Codex `/root`
**Current Mode:** Complete

---

## Resumption Context

**Last Completed Mode:** Final Ratification
**Current Mode:** Complete
**Next Action:** Design the separate UI-framework adapter layer; preserve the canonical model,
semantic/accessibility, per-render binding, and versioned shell-cache contracts before selecting
and implementing the first framework backend.
**Files Created:**
- `feature-reviews/ui-components-foundation.md`
- `feature-reviews/ui-components-foundation-spec.md`
- `feature-reviews/stride-ui-components-foundation.md`
- `feature-reviews/ui-components-foundation-eval.md`
- `feature-reviews/ui-components-foundation-adversarial-review.md`
- `test/uis/components-ui.test.js`
- `test/pipeline/components-ui.test.js`
- Shared button/alert bases and intent artifacts, card, and accordion TSS under `src/uis/components-ui/src/`
- Seven private literal-only shell artifacts under the canonical button, badge, alert, card, accordion, and loading directories.
**Files Modified:**
- `src/uis/components-ui/src/components-ui.js` - Registered 14 canonical variants and aligned mapper ID.
- `src/uis/components-ui/package.json` - Bumped 0.0.6 to 0.1.0.
- `src/uis/components-ui/README.md` - Documented API, safety, accessibility, ethical UX, adapters, migration, and rollback.
- `src/uis/components-ui/src/badge/badge-default.tss` and `loading/loading-default.tss` - Hardened existing defaults.
- `src/methods/each-method` - Restricted array traversal to canonical own enumerable indices and bumped 1.0.4 to 1.0.5.
- `src/methods/if-method` - Made bare type gates null-safe, documented the current-model contract, and bumped 1.0.5 to 1.0.6.
- `test/uis/artifact-paths.test.js`, parser/regex/golden/manifest ratchets, and `test/fixtures/tss-snapshot.json` - Integrated intentional output/artifact changes.
- `.claude-tasks/agent-outcomes.jsonl` and feature-review documents - Recorded plan/design evidence.
**Tests Written:** 26 net-new contracts: 4 mapper/source and 22 pipeline/integration tests, including artifact resolution, each-method collection integrity, and cold/warm shell-cache data isolation.
**Issues Found and Fixed:**
- Initial red run: 17 expected failures proved missing canonical keys/artifacts and legacy badge/loading gaps.
- Variant selectors initially restyled matching pre-existing descendants; public wrappers now inject trusted intent/role before fetching their scoped bases.
- Whole-model and primitive enum gates now reject top-level arrays/scalars/functions/null and string-coercible objects.
- Card action copy retains safe literal separation when summary is absent; loading no longer claims permanent busy state and rejects malformed caller labels.
- Direct accordion.item composition now appends without replacing existing target content.
- The raw-HTML source ratchet now uses the parsed AST, detects comment-interleaved parameter forms, and locks the canonical static support closure.
- A red pipeline regression proved each-method rendered inherited and named array properties; canonical own enumerable filtering fixes it while sparse indices/order remain characterized.
- An external red probe proved a null current model entered if-method compound parsing without a `d:` expression; the owner guard now treats it as false and preserves real compound expressions.
- Intentional ratchets cover the 278-file TSS corpus, dir/intent/role regex witnesses, badge/loading output, and manifest digest.
- A pre-publication architecture review traced the existing resolver descriptor cache and UI fragment cache. A red pipeline test proved canonical components had no shell-cache entry; the final split caches seven static shells and binds fresh data afterward.
**Implementation Decisions Confirmed:**
- Each canonical binding artifact gates/projects data, appends one versioned private shell through the existing UI-cache lifecycle, then binds caller/localized values in the fresh detached fragment.
- Shell artifacts contain literal parameters only; source tests couple each cid to components-ui 0.1.0 and the default structural variant. The resolver cache remains descriptor-only.
- Every semantic html-ui template uses `t: '0'` and explicit approved attributes.
- Required caller copy is escaped with `t:`; card href alone reaches the guarded URL attr sink.
- Canonical buttons default to `type=button`; public intent wrappers inject trusted data and statically fetch a shared base.
- Badge preserves zero and historical `badge`; loading removes implicit ID and adds status semantics.
- Accordion aliases item iteration, skips invalid items, supports multiple open disclosures, leaves frozen input unchanged, and ignores inherited/named array properties.
- Bare `if(to:)` gates treat null as false; compound `d:` expressions retain their existing parser path.
- No runtime import, dependency, CSS/JS asset, event/DI behavior, resolver/compiler change, handwritten TypeScript, database, or network surface was added.
**Verification Evidence:**
- Shell-cache red phase: the focused component suite failed 1/19 because no canonical cache entry existed; the expanded seven-shell cold/warm and source ratchets now pass.
- Required red phase recorded before source changes.
- Focused if-method and canonical-component suite: 41/41 passing; source convergence: 27/27.
- Parser snapshot and v1 differential: 15/15 passing across all 278 TSS files.
- Final PR head on current dev: full repository suite 786/786 passing; component source contracts
  4/4, real component pipeline 19/19, and parser snapshot plus frozen-v1 differential 15/15.
- `npm run typecheck`: passing.
- Package dry-runs contain only intended files: components-ui 0.1.0 has 53 files; each-method
  1.0.5 and if-method 1.0.6 have 3 each.
- Semgrep: 88 rules over three changed JavaScript files, zero findings; full and production audits report zero vulnerabilities.
- External skeptic, architect, and minimalist lenses passed; one Low null-model finding was fixed red-first and its focused follow-up passed.

**Context for Next Session:**
PR #66 merged the reviewed foundation into `dev` as `6f6e8cf` on 2026-07-19 after green CI,
a clean current-head Codex review, and zero unresolved review threads. The next UI-system work is a
separate adapter-layer feature. Framework selection is intentionally deferred; any adapter must keep
the canonical caller model framework-neutral and own distinct versioned shell identities unless its
structure is deliberately byte-compatible with the fallback.

---

## Research Summary

- **Modules involved:** src/uis/components-ui is the published cross-framework component mapper; src/uis/html-ui supplies semantic HTML leaves; src/uis/schema-ui supplies schema.org domain compositions; ui-resolver-model owns descriptor resolution/cache; ui-cache-model/plugin plus handler-wrapper own bounded fragment reuse; test/helpers/engine.js exercises the real schema -> components -> HTML pipeline.
- **Existing catalog:** `components-ui` currently exposes head metadata, contents, badge, loading, hero, grid, mini-search, four button recipes, and login/register recipes. Several are skeletal or legacy-shaped; only head variants currently have direct full-pipeline coverage.
- **Existing patterns:** mapper keys resolve component.variant to UiDescriptor objects; TSS composes HTML leaves through ->ui; insert t is the escaped content sink while text is the locale seam; artifact URLs use @c; the runtime mapper is a dependency-free CommonJS singleton.
- **Type interfaces:** `UiPackage` describes a UI registry, `UiDescriptor` describes `h/t/d/ui/pT/di`, and `UiResolution` is the resolver result, all sourced from `src/types/src/types.js`.
- **Test ratchets:** full-pipeline HTML goldens use `render()`; artifact paths are checked in `test/uis/artifact-paths.test.js`; every `src/**/*.tss` AST is hash-locked in `test/fixtures/tss-snapshot.json`; `npm test` and `npm run typecheck` are the repository gates.
- **Constraints discovered:** preserve every published package/export; do not add runtime imports or dependencies; use pure JS/TSS only; retain trailing TSS semicolons; compose rather than duplicate `html-ui`; avoid schema-specific component contracts in `components-ui`; package changes require an appropriate version bump.
- **Repository state:** the initial checkout contained unrelated work, so implementation moved to a dedicated worktree and was later rebased onto current `dev` without touching the original checkout.
- **Documentation surface:** this repository has no `FEATURES.md` or `docs/features/`; relevant durable documentation is the package README, root README when architecture changes, and this feature-review record.
- **Open questions:** behavior-heavy widgets (dialog, tabs, toast, tooltip) need a clear interaction/focus owner; including them before that owner exists would make a static SSR shell look complete while remaining behaviorally incomplete.

## Plan Summary

The reviewed contract is in feature-reviews/ui-components-foundation-spec.md. It defines 14 canonical variants across six component families, their public data shapes, fallback semantics, adapter invariants, validation/failure behavior, tests, risks, blast radius, and rollback.

Implementation is split into five checkpoints:

1. Add failing mapper, artifact, and pipeline contract tests.
2. Add shared semantic bases, private data-free shells, and public intent/role wrappers; keep caller binding outside the versioned shell-cache iteration.
3. Add security, accessibility, localization, data-isolation, immutability, and legacy-regression edge cases.
4. Update deterministic snapshots and package documentation, then run the full verification/review loop.
5. Reopen architecture review before publication when the user requests the existing UI-cache layering; prove cold/warm equivalence and caller-data exclusion before creating the PR.

## Design Detail

### Guidance Applied

- code-explorer and code-architect passes traced the live resolver/compiler/get/html pipeline and confirmed the component design fits existing owners; implementation review later required the narrow each-method own-index correction.
- Architect, planner, security-architect, threat-modeling-enforcer, platform-engineer, backend-architect, Elysia, Bun, and TypeScript guidance was checked against the project contract.
- Stack-specific Elysia route, Bun server, handwritten TypeScript, database, deployment, and infrastructure recommendations are not applicable: this slice is trusted static CommonJS metadata plus TSS and adds no service, database, deployment unit, or runtime dependency.
- The configured database-architect persona file is not installed. This is non-blocking because the feature has no database/schema/query surface and adds no persistence owner; optional static shell persistence stays behind the existing UI-cache adapter.
- Project AGENTS.md overrides generic stack assumptions: pure dependency-free JS/TSS, no source imports, no handwritten TypeScript, singleton preservation, trailing TSS semicolons, and existing resolver/compiler ownership remain locked.
- Applicable checklist controls are explicit error behavior, no placeholders/suppressions, tests-first, source self-review, domain ownership, runtime safety, type-shape documentation, injection prevention, dependency/secrets safety, threat modeling, deploy rollback, and planning rigor.

### Artifact and Ownership Map

| Artifact | Responsibility |
|----------|----------------|
| components-ui.js | Preserve existing keys and register 14 canonical direct-wrapper descriptors |
| button/button-base.tss | Required label gate, native template, escaped label, safe type default, allowed button/root attrs |
| button/button-{default,primary,secondary,destructive}.tss | Whole-model gate, trusted intent injection, static fetch of the shared base |
| badge/badge-default.tss | Presence-based label/count selection, zero preservation, non-live native span |
| alert/alert-base.tss | Required copy gates, named semantic section, escaped title/message |
| alert/alert-{default,info,success,warning,error}.tss | Whole-model gate, trusted role/intent injection, static fetch of the shared base |
| card/card-default.tss | Named article, optional summary, explicit guarded action link |
| accordion/accordion-default.tss | Array gate, native group wrapper, one aliased pass over items |
| accordion/accordion-item.tss | Required-copy gate, native details/summary, boolean open |
| loading/loading-default.tss | Named status, hidden indicator, caller label or localized fallback; no permanent busy state |
| *-shell.tss (7) | Literal-only invariant semantic structure; no caller/localized binding |
| html-ui templates | Trusted native element markup only; always composed with t: 0 |
| each-method | Existing iteration owner; canonical own enumerable array indices only |
| attr/insert/if/text methods | Existing injected policy/lifecycle seams; unchanged |
| resolver/compiler/get/manifest/request | Existing resolution, compilation, artifact, and URL-policy owners; unchanged |
| ui-cache-model/plugin and handler-wrapper | Existing scoped fragment-cache/lifecycle owners; cache and restore static shell bytes only |
### Render Design

1. A canonical mapper descriptor resolves through the existing fallback graph.
2. Every public wrapper rejects arrays and non-object models. Button and alert wrappers inject trusted intent/role data before a static base fetch.
3. Structural binding TSS wraps the caller model with a one-item source alias, gates required fields, and projects only documented values.
4. Each binding artifact appends a private literal-only shell inside a package-versioned cid/default iteration. On a valid scoped hit, ui-cache-model restores only those static bytes; unscoped/disabled paths render the same shell cold.
5. Caller/localized values are bound after the shell exists in the fresh detached fragment. No model value enters the cached iteration; card href still reaches the guarded attr sink.
6. Native html-ui templates are requested with t: 0. Explicit fields prevent html-ui global.tss from copying unknown data.
7. Detached-fragment selectors bind only the newly created shell, so matching descendants already present in the target remain untouched.
8. Accordion aliases every source item before calling accordion.item; each-method visits canonical own enumerable indices only, preserving frozen inputs, sparse order, and linear output.
9. Later adapters may replace templates/classes but must keep the data-free-shell/per-render-binding boundary and own distinct versioned shell identities.

### Red-Flag Validation

| Red flag | Design result |
|----------|---------------|
| Runtime require/import/dependency | PASS - none planned |
| Resolver/compiler responsibility moved | PASS - mapper/TSS only |
| Completed render cached with caller data | PASS - only literal static shell iterations carry cid; binding follows every cold/hit path |
| Cache identity becomes stale across package versions | PASS - source ratchet couples every shell cid to the package version; independent host resolver changes require purge/isolation |
| Raw caller HTML or arbitrary attrs | PASS - t: only and explicit allowlist |
| Empty interactive controls | PASS - gate precedes template injection |
| Implicit submit | PASS - literal type=button precedes allowlisted override |
| Caller/source mutation | PASS - aliased wrapper iteration |
| Root-field leakage | PASS - t: 0 plus explicit attrs and child scopes |
| Unbounded/super-linear work | PASS with residual - one linear loop; host owns collection cap |
| Behavior without focus/keyboard owner | PASS - behavior-heavy widgets deferred |
| Misrepresented destructive authority | PASS with adapter duty - stable hook only; host owns authorization and visible treatment |
| Whitespace-only accessible names | Host precondition - no Unicode-safe TSS validator exists |
| Database/deployment blast radius | N/A - no such resources |
| Rollback | PASS - revert before publish or pin 0.0.6 after publish; seven unused static shell IDs can be evicted exactly or expire |

## Plan Quality Gate

**Scope tags:** FRONTEND
**Gate status:** PASSED - user approved 2026-07-18

### Guidance Consulted

- Project AGENTS.md locked architecture and test contract.
- review-frontend guidance and frontend-eval rubric, adapted to this dependency-free vanilla-JS/TSS repository.
- frontend-developer, ui-designer, brand-guardian, accessibility-tester, and code-review-enforcer evaluation criteria.
- Persuasive design, neuro-design, design-system integrity, inclusive design, usability, WCAG perceivable/operable/understandable/robust, injection, tests-written, and i18n checklists.
- Official Bootstrap, Material UI, USWDS, WAI-ARIA, WCAG 2.2, and FTC dark-pattern guidance.

### Review Findings Resolved

| Finding | Resolution in plan |
|---------|--------------------|
| Broad catalog risked static shells for behavior-heavy widgets | Deferred modal, tabs, toast, tooltip, menu, combobox, and date picker until an interaction/focus owner exists |
| Rich component slots would introduce an unbounded trust contract | Foundation accepts plain, escaped, already-localized text only |
| Missing/invalid button type could become an implicit submit | Canonical buttons fail closed to type=button |
| Merged component data could leak root IDs/classes to descendants | Every base projects a narrow root object and isolates child scopes |
| Existing each behavior could mutate accordion source items | Iteration aliases each item into a new scope before field projection |
| Existing each traversal admitted prototype and named array properties | each-method now filters Object.keys to canonical in-range indices; sparse order and public index values are locked |
| A default primary action could encode coercive prominence | button.default is neutral; primary and destructive intent are explicit |
| Alert naming and accordion state semantics were ambiguous | All alert containers are named; disclosures explicitly allow multiple open items |
| Existing loading output synthesized a duplicate-prone global ID | New default has no implicit ID; callers may provide one |
| An unstyled fallback could be mistaken for full WCAG conformance | Base owns semantic/native behavior; adapters explicitly own contrast, focus, motion, layout, and target size |
| Framework names/classes could become public API | Canonical variants are intent-based and fallback hooks are jtorm-namespaced |

### STRIDE Pre-analysis

All six categories are concretely analyzed in the spec. Mandatory controls cover intent spoofing, text/URL tampering, action/audit ownership, DOM information leakage, linear collection rendering, and the host authorization boundary. The feature introduces no authentication, persistence, PII, network, payment, or execution boundary.

### Plan-level Quality Score

| Dimension | Score |
|-----------|-------|
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
| **Total** | **100/100** |

---

## Progress Log

### Research Mode
- [x] Mapped existing component packages and render pipeline
- [x] Catalogued conventions, interfaces, and constraints
- [x] Recorded open questions

### Plan Mode
- [x] Explored codebase
- [x] Wrote feature spec

### Plan Quality Gate Checklist
- [x] Scope classified (tags: FRONTEND)
- [x] Relevant review guidance consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined with review feedback
- [x] Plan presented and approved

### Design Mode
- [x] Loaded relevant design personas
- [x] Created threat model
- [x] Validated against red flags

### Implement Mode
- [x] Checkpoint 1: Scaffold - failing contracts and mapper surface
- [x] Checkpoint 2: Core logic - mapper, bases, variants, semantic templates
- [x] Checkpoint 3: Edge cases - escaping, unsafe URL, validation, isolation, immutability
- [x] Checkpoint 4: Integration - ratchets, docs, package version, full pipeline
- [x] Checkpoint 5: Cache layering - seven versioned static shells plus post-cache binding

### Test Mode
- [x] Tests written failing-first
- [x] Targeted null/component and source suites passing (41/41 and 27/27)
- [x] Full suite passing (732/732; typecheck passing)

### Review Mode
- [x] Local architecture, frontend, privacy, security, refactor, and production reviews passed
- [x] Local 100/100 code quality evaluation
- [x] External adversarial review resolved
- [x] Final no-edit source/debt verification loop passed
- [x] All tests passing

### Documentation Mode
- [x] Package README, feature spec, STRIDE model, workflow, and evaluation updated
- [x] Architecture corpus count updated in AGENTS.md
- [x] No project progress index exists; not applicable
- [x] PR #66 passed current-head CI and Codex review and merged into `dev` as `6f6e8cf`
