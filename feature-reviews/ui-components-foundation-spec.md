# Feature Spec: Framework-neutral UI component foundation

**Date:** 2026-07-18
**Author:** Codex
**Status:** Approved
**Amended:** 2026-07-19 - user-approved static-shell/data-binding split using the existing UI fragment cache.

## Problem Statement

A jTorm application author who needs common UI pieces today must choose between a small set of legacy recipes in @jtorm/components-ui and hand-built TSS. That creates observable costs: component names and data shapes vary by application, accessible semantics are easy to omit, caller data can accidentally enter a raw-HTML path, and later UI-framework adapters would have no stable contract to implement. The first foundation must therefore define a small, popular, framework-neutral component API whose fallback output is semantic, dependency-free, isomorphic, safe for caller-provided text, and explicit about ethical UX.

## Selection Rationale

The first slice is the useful intersection of the component catalogs published by Bootstrap, Material UI, and the U.S. Web Design System: button, badge/tag, alert, card, accordion/disclosure, and loading/status. The implementation follows native HTML and WAI-ARIA guidance where a native element exists. Behavior-heavy widgets are excluded until jTorm has a framework-neutral interaction and focus-management owner.

Primary references:

- Bootstrap components: https://getbootstrap.com/docs/5.3/components/
- Material UI component catalog: https://mui.com/material-ui/all-components/
- U.S. Web Design System component catalog: https://designsystem.digital.gov/components/overview/
- WAI-ARIA Authoring Practices patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- FTC dark-pattern guidance: https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf

## Scope

### In Scope

- Define canonical component and variant names for:
  - button.default, button.primary, button.secondary, button.destructive
  - badge.default
  - alert.default, alert.info, alert.success, alert.warning, alert.error
  - card.default
  - accordion.default and accordion.item
  - loading.default
- Render a dependency-free semantic fallback by composing existing @jtorm/html-ui leaves.
- Preserve every existing mapper key and published export.
- Keep existing button.primaryButton, button.secondaryButton, button.primaryAnchor, and button.secondaryAnchor behavior unchanged.
- Harden the existing badge.default and loading.default outputs while preserving their component keys.
- Establish the data-shape and intent contract that later framework-specific mapper packages must implement.
- Split every canonical fallback into a private, data-free static shell and a per-render binding layer; allow only the shell iteration to carry a versioned UI fragment-cache identity.
- Support only a narrow root attribute surface: id, class, lang, and dir; button additionally supports form, name, and value.
- Isolate data passed to nested leaves so root IDs, classes, and other fields cannot leak onto descendants.
- Render all caller-provided visible copy through the escaped text insert path.
- Route card action URLs through the existing guarded href attribute sink.
- Document usage, non-usage, accessibility, localization, ethical-persuasion, adapter, migration, and rollback guidance.
- Add mapper, artifact-graph, parser-snapshot, full-pipeline, regression, and security edge-case tests.
- Harden @jtorm/each-method array traversal to canonical own enumerable indices because accordion composition depends on that collection boundary.
- Harden @jtorm/if-method bare type gates so a null current model fails closed without entering compound-binding parsing.
- Bump @jtorm/components-ui from 0.0.6 to 0.1.0 and align its stale mapper ID with the package version.
- Perform implementation in a clean feat/ui-components-foundation worktree based on dev so unrelated current-checkout files remain untouched.

### Out of Scope (Non-Goals)

- Bootstrap, Material UI, Tailwind, or other framework adapters.
- CSS, tokens, themes, icons, animation, or visual brand decisions.
- Dialog/modal, tabs, toast/snackbar, tooltip/popover, menu, combobox, date picker, or other widgets that require focus management, keyboard state machines, portals, announcements, or client-side lifecycle ownership.
- Mutually exclusive accordion state; the native foundation is a group of independent disclosures and may have multiple open items.
- Rich-HTML slots or caller-provided child markup.
- Schema.org domain components; those remain owned by @jtorm/schema-ui.
- New runtime JavaScript, event handling, dependencies, imports, or framework coupling.
- Changes to resolver/compiler ownership, dispatch, the HTML attribute guard, or each semantics beyond canonical own-enumerable-array-index traversal.
- A claim of complete visual WCAG conformance. The base owns semantic markup and native keyboard behavior; adapters own contrast, visible focus styling, motion, layout, and pointer target sizing.
- Automatic confirmation, undo, analytics, or business behavior for destructive actions. The component represents intent; the host owns the action flow.

## Requirements

### Functional Requirements

1. A host can resolve every canonical component/variant through the existing UI resolver with no new DI collaborator.
2. button.default renders a native button only when label is a non-empty string.
3. Every canonical button has visible text as its accessible name, uses native disabled behavior, accepts only the primitive strings button/reset/submit, and falls back to type=button when type is missing or invalid.
4. Button visual intent is represented by stable jtorm-button class hooks; the default variant is neutral so a primary call to action must be chosen deliberately.
5. badge.default renders a non-interactive span when label or count is present, prefers label when both exist, and preserves numeric zero.
6. Badge output has no live-region role and does not imply urgency or popularity on its own.
7. Every alert requires a non-empty string heading and message, displays both, and assigns semantics by variant:
   - default/info: role=region
   - success: role=status
   - warning: role=region
   - error: role=alert
8. Every alert container has an accessible name derived from its visible heading. No explicit aria-live duplicates an implicit role.
9. card.default requires a non-empty string heading and renders a named article with an optional plain-text summary.
10. A card action renders only when action.href and action.label are both present; it is a normal link with explicit text, stays visibly separated from the title when summary is absent, and does not make the entire card clickable.
11. accordion.default accepts an items array and composes accordion.item for each valid canonical own enumerable index without mutating the caller's array or item objects; inherited and named properties are ignored.
12. accordion.item requires non-empty string summary and content values and uses native details/summary elements. open is opt-in and boolean-driven; multiple items may be open at once.
13. loading.default renders a visible status label, role=status, a decorative indicator hidden from assistive technology, no permanently busy live region, and no implicit globally duplicated ID.
14. A truthy primitive-string loading label wins; otherwise the existing localization seam supplies the Loading fallback.
15. Missing required fields omit the component or invalid repeated item rather than emitting an empty interactive control.
16. id, class, lang, and dir apply to the component root only. Unknown data fields do not become descendant attributes.
17. Existing public mapper keys remain resolvable, and the four legacy button/anchor recipes retain byte-for-byte pipeline output.
18. Later adapters can replace the fallback descriptors while consuming the same canonical names, variants, required fields, intent meanings, and accessibility contract.
19. Every canonical component accepts one object model; top-level arrays, scalars, functions, and null emit no component, while accordion.items remains the sole bounded-by-host collection field.
20. Cold and warm-cache renders are byte-equivalent for the same model; a warm shell must bind the current model and must never contain caller or localized values from any render.

### Non-Functional Requirements

- Architecture: pure CommonJS package metadata plus TSS artifacts; no require call in src, runtime dependency, handwritten TypeScript, or responsibility moved into the resolver/compiler.
- Performance: zero component JavaScript or CSS assets and zero dependencies; top-level non-object models are rejected before iteration, inherited and named array properties are ignored, and render work plus emitted markup remain linear in canonical accordion item count. Seven bounded invariant shells may reuse the existing fragment cache; binding work remains per render.
- Security: caller copy is inserted only as escaped text; no new h/raw-HTML data sink; href uses the existing unsafe-scheme guard and fails closed.
- Privacy: the existing UI fragment cache may retain trusted static shell bytes only. Caller and localized values are bound after the shell iteration and never enter live or persisted canonical shell entries; host cache scope, TTL, persistence policy, and invalidation remain unchanged owners.
- Accessibility: semantic/native behavior and accessible names meet the markup-level requirements applicable to WCAG 2.2 AA; adapter documentation makes visual AA requirements mandatory.
- Localization: all caller-supplied labels, headings, messages, summaries, and accordion copy are already-localized strings; the only built-in copy is Loading and continues through the language model.
- Compatibility: no mapper key or package export is removed; intentional badge/loading DOM changes are documented for the 0.1.0 release.
- Determinism: the same template, data, locale, and mapper order produce the same SSR and SPA markup.
- Maintainability: every canonical variant is an intent name, not a framework class name; shared TSS artifacts hold common structure, variants only supply intent/role data, and every shell cache ID embeds the components-ui package version.
- Ethical UX: guidance prohibits fabricated counts, false urgency, disguised destructive actions, imbalanced consent choices, hidden fees/terms, or using accordions to conceal information required for an informed choice.

## Public Component Contract

There are no HTTP endpoints or network request/response changes. This is the public @jtorm/components-ui mapper and render-data contract.

### Shared Root Fields

Within this pure-TSS boundary, a required string is a primitive string with a truthy value. The existing bounded `if` grammar cannot distinguish Unicode whitespace-only text without introducing a new validation owner, so hosts and future adapters must reject whitespace-only accessible names before rendering. This keeps validation in the host while the component layer remains dependency-free and escaped-by-default.

Every canonical component consumes one object model. Top-level arrays, scalars, functions, and null are outside the public contract and emit nothing; only `accordion.items` is iterated.

| Field | Shape | Behavior |
|-------|-------|----------|
| id | string, optional | Applied only to the component root; never synthesized |
| class | string, optional | Preserved on the root and combined with jtorm fallback hooks |
| lang | string, optional | Applied only to the root and inherited naturally |
| dir | primitive string ltr, rtl, or auto; optional | Applied only to the root and inherited naturally; non-string or invalid values are omitted |

Other HTML-global fields are not part of the foundation contract. Framework adapters must not require adapter-specific data fields.

### Components and Variants

| Component | Required data | Optional data | Fallback semantics |
|-----------|---------------|---------------|--------------------|
| button.default | label: string | type, disabled, form, name, value, shared root fields | neutral native button |
| button.primary | label: string | same as default | primary-intent native button |
| button.secondary | label: string | same as default | secondary-intent native button |
| button.destructive | label: string | same as default | destructive-intent native button |
| badge.default | label: string or count: string/number | shared root fields | non-interactive span; label wins; 0 is retained |
| alert.default | heading and message strings | shared root fields | named region; same semantics as info |
| alert.info | heading and message strings | shared root fields | named region |
| alert.success | heading and message strings | shared root fields | named status |
| alert.warning | heading and message strings | shared root fields | named region |
| alert.error | heading and message strings | shared root fields | named alert |
| card.default | heading: string | summary, action, shared root fields | named article with explicit optional action link |
| accordion.default | items: array | shared root fields | disclosure group containing valid native items |
| accordion.item | summary and content strings | open, shared root fields | native details/summary disclosure |
| loading.default | none | label: string and shared root fields | visible named status; localized fallback for missing/invalid label |

The card action shape is { href: string, label: string }. An incomplete action is omitted. An unsafe URL reaches the existing guarded href sink and aborts that render with the established unsafe-attribute error.

Badge count is contractually a string or number. Numeric zero is presence-gated rather than truthiness-gated; rejecting other count types remains a host/adaptor data-validation responsibility.

Alert and card heading fields are visible title copy, rendered with emphasis and used to name their containers; the foundation does not impose a fixed document heading level. Error/alert and success/status variants are for newly inserted, time-sensitive feedback, while static informational content should use default/info region semantics.

Each accordion item has { summary: string, content: string, open?: boolean, id?: string, class?: string, lang?: string, dir?: string }. accordion.default wraps each source item under a new iteration scope before mapping these fields, so the each lifecycle metadata never mutates the source object. The injected each owner visits only canonical own enumerable array indices and ignores inherited or named properties.

### Adapter Invariants

A future framework adapter may change templates, classes, and asset URLs, but it must preserve:

- canonical component and variant names;
- the public data shapes and label/count precedence;
- native element behavior or an accessibility-equivalent implementation;
- type=button as the missing/invalid button-type fallback;
- variant intent, including a neutral default and a stable destructive hook that adapters must treat visibly as destructive;
- alert role mapping and accessible names;
- escaped caller copy and guarded URL attributes;
- loading visibility and status semantics without permanent busy state;
- canonical own-enumerable-index accordion collection semantics;
- data-free shell caching followed by per-render caller/localized-value binding;
- a distinct versioned shell identity for adapter-specific structure;
- no data collection or fabricated persuasive signals.

### Rendering and Cache Boundary

Every canonical fallback has two private layers. A *-shell.tss artifact uses only literal TSS parameters to build invariant native structure. Its binding artifact validates/projects the current model, appends that shell inside a cid iteration, and only then applies caller and localized values in the fresh detached fragment.

The existing @jtorm/ui-cache-model and plugin remain the sole fragment-cache owners. Scoped hosts may reuse shell bytes; unscoped hosts and hosts without the plugin render the same path cold. The resolver cache remains separate and continues to cache descriptors, not HTML. Shell IDs are jtorm/components-ui-<package-version>/<shell> with structural variant default; source tests force the package version and IDs to advance together. A host changing its resolver/native-template configuration independently must purge these IDs or isolate cache storage. Future adapters own distinct versioned IDs unless their structure is intentionally byte-compatible.

Fallback jtorm-* classes are hooks for the unstyled base and are not framework-adapter input fields.

## Validation and Failure Behavior

| Condition | Required behavior |
|-----------|-------------------|
| Missing/empty required string | Emit no component or skip that accordion item |
| Invalid button type | Render type=button, never an implicit submit button |
| Type or dir token exceeds the existing regex-policy input bound | Abort through the existing policy instead of bypassing validation |
| Top-level model is an array, scalar, or function | Emit no canonical component |
| Button type or root dir is non-string | Omit dir; retain type=button |
| Loading label is missing, empty, or non-string | Render the localized Loading fallback |
| Badge count is 0 | Render 0 |
| Badge has label and count | Render label |
| Card action is incomplete | Render no action link |
| Card href has an unsafe scheme | Throw through the existing Unsafe attribute href guard |
| Caller copy contains markup/script text | Render it inert as text |
| Accordion items is absent/non-array | Emit no accordion |
| Accordion array has inherited or named properties | Ignore them; render canonical own enumerable indices only |
| Accordion item open is false/missing | Omit the native open attribute |
| Unknown field is present | Do not copy it to descendants |
| Warm shell cache hit | Restore static bytes, then bind only the current model; cold/warm output must agree |
| Shell artifact contains a dynamic parameter or caller marker | Fail the components-ui source/cache-isolation tests |
| Existing TSS artifact path drifts | Fail the artifact-path test |
| Existing public key disappears | Fail the mapper-contract test |

## Affected Components

| Component/file | Change Type | Risk |
|----------------|-------------|------|
| src/uis/components-ui/src/components-ui.js | Modify mapper, add canonical variants, align ID | High: public package contract |
| src/uis/components-ui/package.json | Minor version bump to 0.1.0 | Medium: release metadata |
| src/uis/components-ui/README.md | Replace install-only README with catalog and contracts | Low |
| src/uis/components-ui/src/button/button-*.tss | Add canonical base/intent artifacts; retain legacy files | Medium |
| src/uis/components-ui/src/badge/badge-default.tss | Harden escaped label/count behavior | Medium |
| src/uis/components-ui/src/alert/alert-*.tss | New shared alert plus role/intent variants | Medium |
| src/uis/components-ui/src/card/card-default.tss | New semantic card | Medium |
| src/uis/components-ui/src/accordion/accordion-*.tss | New native disclosure group/item | Medium |
| src/uis/components-ui/src/loading/loading-default.tss | Add status semantics, override label, remove implicit ID | Medium |
| src/uis/components-ui/src/{button,badge,alert,card,accordion,loading}/*-shell.tss | New literal-only cached semantic shells | Medium: persisted fragment identity |
| src/methods/each-method/src/each-method.js | Ignore inherited/named array properties; preserve sparse index order | Medium: published runtime behavior |
| src/methods/each-method/package.json and README.md | Patch bump to 1.0.5 and document traversal contract | Low |
| src/methods/if-method/src/if-method.js | Skip compound parsing for null when no `d:` expression exists | Medium: published runtime behavior |
| src/methods/if-method/package.json and README.md | Patch bump to 1.0.6 and document omitted-`d` semantics | Low |
| test/uis/components-ui.test.js | New mapper/API and legacy-preservation tests | Low |
| test/uis/artifact-paths.test.js | Include components-ui mapper artifacts | Low |
| test/pipeline/components-ui.test.js | New full-pipeline semantic/security goldens | Low |
| test/pipeline/each.test.js | Red-first inherited/named regression plus sparse characterization | Low |
| test/pipeline/if.test.js | Red-first null bare-type-gate regression | Low |
| test/fixtures/tss-snapshot.json | Update canonical AST hashes | Low: generated test ratchet |
| feature-reviews/ui-components-foundation.md | Update workflow state and review evidence | Low |
| feature-reviews/ui-components-foundation-spec.md | New approved feature contract | Low |

The root README remains unchanged. AGENTS.md receives only the factual 257-to-278 TSS corpus count; package ownership and DI boundaries do not change.

## Dependencies

- [x] Depends on the existing @jtorm/ui-resolver-model and @jtorm/ui-compiler-model contracts without modifying them.
- [x] Depends on existing @jtorm/html-ui semantic leaves, insert-method escaped t values, attr-method URL policy, language-model fallback, and native details/summary behavior.
- [x] Depends on the existing @jtorm/ui-cache-model, UI-cache plugin, and handler-wrapper lifecycle without modifying their ownership or adding a package dependency.
- [x] Depends on the existing pipeline harness and TSS snapshot ratchet.
- [x] Blocks future framework adapter packages until the canonical names and data shapes are approved.
- [x] External runtime services/libraries: none.
- [x] New npm dependencies: none.

## Security Assessment

### Threat Model Link

[stride-ui-components-foundation.md](stride-ui-components-foundation.md) traces the approved controls to the exact render boundary, artifacts, and tests.

### Initial STRIDE Analysis

| Category | Threat | Likelihood | Impact | Required control | Plan status |
|----------|--------|------------|--------|------------------|-------------|
| Spoofing | A visual intent could falsely present an action/status as authoritative or hide destructive intent | Low | Medium | Stable intent names, neutral default, stable destructive hook with adapter-owned visible treatment, no auth-state representation, ethical-use docs | Mandatory |
| Tampering | Caller strings or card URLs could inject executable markup or a javascript-like URL | Medium | High | t-only visible data, no h data path, existing URL attribute guard, adversarial pipeline tests | Mandatory |
| Repudiation | A destructive button could be mistaken for an audited action even though this package records nothing | Low | Medium | Document that components own presentation only and hosts own confirmation, authorization, execution, audit, and undo | Mandatory |
| Information Disclosure | Root data could leak into title/data/global attributes on nested elements or hidden DOM | Medium | Medium | Narrow explicit root field projection, isolated scalar/object child scopes, DOM assertions against leaked fields | Mandatory |
| Denial of Service | Large accordion arrays could create excessive markup or super-linear work | Low | Medium | No JS/assets, one linear pass, document caller-owned collection sizing, regression test representative multi-item output | Mandatory |
| Elevation of Privilege | A visual variant could be confused with permission to perform an action | Low | High | No events/actions/auth state in package; adapter contract forbids adding behavior; host remains authorization boundary | Mandatory |

No new authentication, authorization, persistence owner, PII, payment, network, or execution boundary is introduced. The existing optional UI-cache persistence path receives only trusted data-free canonical shell bytes.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope expands into behavior-heavy widgets with incomplete keyboard/focus behavior | Medium | High | Exhaustive non-goals; ship only native/static primitives in this slice |
| Existing consumers regress because published mapper keys or legacy button markup changes | Medium | High | Preserve all keys; do not modify four legacy button/anchor TSS files; lock mapper and pipeline goldens; use a minor version |
| Caller data reaches raw HTML or an unsafe href | Medium | High | t-only copy, no rich slots, guarded href, payload/unsafe-scheme tests |
| Root attributes leak onto descendants through merged TSS data | Medium | Medium | Explicit root projection and isolated each scopes; test IDs/classes appear once |
| Caller/localized data or a prior render leaks through a persisted shell | Low | High | Literal-only shell source ratchet; versioned IDs; cold/warm multi-family test asserts cache bytes contain no sentinels and second renders bind fresh data |
| Resolver/native-template configuration changes while old shell IDs remain live | Low | Medium | Versioned component IDs; host must purge/isolate cache when structural dependencies change independently |
| Future adapters reinterpret intent or accessibility differently | Medium | Medium | Durable README contract plus adapter invariants and canonical intent names |
| Unstyled fallback is mistaken for full visual WCAG conformance | Medium | Medium | State the ownership boundary explicitly; require adapter contrast/focus/target/motion checks |

## Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|----------|-------------------------|--------------|
| Start with six native/static families | Ship the entire Bootstrap/MUI catalog; ship buttons only | Covers the common cross-framework intersection while avoiding fake completeness and still proving composition/variant/list patterns |
| Native details/summary accordion | Custom JavaScript state machine; static div shell | Native behavior provides keyboard and disclosure semantics in SSR/SPA with zero JS or focus owner |
| Intent variants | Bootstrap/MUI class names; free-form variant string | Stable mapper keys are adapter-neutral, auditable, and reject framework leakage |
| Neutral button.default | Make default primary; infer importance from position | Primary emphasis is an explicit design choice and avoids coercive/default prominence |
| Plain-text fields | Raw HTML slots; sanitizer-dependent rich content | Escaped text is safe and deterministic; rich composition needs a separately designed trust contract |
| Explicit card link | Entire clickable card; click handler on article | Preserves normal link semantics, visible action wording, keyboard behavior, and text selection |
| Alert roles fixed by intent | Caller-provided arbitrary role; role-free divs | A small reviewed mapping prevents invalid combinations while retaining region/status/alert semantics |
| Shared base artifacts plus thin variant artifacts | Copy complete TSS per variant; dynamic framework class field | Keeps structure DRY without exposing adapter internals as data |
| Cache invariant shells, bind data afterward | Cache completed components; do not cache components | Reuses the existing bounded lifecycle while excluding caller/localized values and preserving useful cold behavior |
| Narrow projected root attributes | Pass the full model to every HTML leaf; support arbitrary attrs | Prevents accidental disclosure/duplication and gives adapters a stable minimal surface |
| Improve badge/loading in place | Add new parallel v2 keys; preserve every DOM detail | Keeps canonical defaults useful; 0.1.0 and migration docs communicate intentional output changes without deleting exports |
| No base CSS | Ship opinionated CSS; inline styles | Avoids framework conflicts and extra bytes; semantic hooks let later layers own visual conformance |
| Clean dev-based worktree | Continue on the unrelated named checkout; switch/reset current branch | Follows repository workflow and preserves unrelated user work |

## Blast Radius

| Dimension | Answer |
|-----------|--------|
| Direct dependencies | ui-resolver-model, ui-compiler-model, ui-cache-model/plugin, handler-wrapper, html-ui leaves, get/data/if/each/ui/attr/insert/text methods, language model, TSS parser, request-model-backed artifact loading |
| Direct dependents | Hosts resolving components.*, build-time UI manifest closure compilation, runtime UI manifests containing these artifact URLs, consumers styling existing badge/loading output |
| Cascade on outage | If a new TSS artifact is unavailable, the existing request/get path fails that render loudly; unrelated components and packages remain available |
| Cascade on slow | Cold renders wait on the same artifact request/cache path; no queue or background work accumulates; warm cache/manifests retain existing behavior |
| Cascade on bad data | Invalid required fields stop before shell insertion; unsafe href aborts in the detached binding phase; escaped copy cannot become active markup; cached shell bytes contain no caller/localized values |
| Compromised-session impact | No additional records become readable/modifiable: the package only renders data already present in the host's view model and performs no fetch, mutation, auth, storage, or telemetry |
| Fault isolation boundary | UI resolver/get request and current render subtree; parser/path drift fails CI, and runtime zero-match/unsafe-attribute errors stop through existing error handling |

## Rollback Plan

| Item | Answer |
|------|--------|
| Code rollback | Before publish, revert the feature commit. After publish, consumers pin @jtorm/components-ui@0.0.6 while a corrective 0.1.1 is prepared; published versions are never deleted |
| Schema rollback | No database or schema change |
| Data rollback | No caller-data migration. Versioned static shell entries may be evicted exactly per scoped null-language/default key or left unused until TTL/eviction; older code never requests them |
| Auto-rollback trigger | CI/release is blocked on any mapper, artifact, pipeline, snapshot, full npm test, or typecheck failure: tolerated failures=0 in the release run |
| Manual rollback runbook | Pin 0.0.6, restore the prior UI registration/manifest, and evict the seven versioned 0.1.0 shell IDs (or clear their isolated UI-cache namespace) before republishing a fix |
| Last rollback drill | First release of this contract; pre-release legacy-render and 0.0.6 pin drill scheduled as part of implementation verification on 2026-07-18 |

## Implementation Plan

1. Create a clean dev-based feat/ui-components-foundation worktree and confirm a clean baseline.
2. Write failing mapper/API, artifact-reference, and full-pipeline tests first, including legacy button output.
3. Add private literal-only shell TSS, invoke each through a versioned cache identity, and keep model validation/projection/binding in the final artifact; then update the mapper and package version.
4. Add edge-case coverage for missing fields, invalid button type, zero count, unsafe href, escaped payloads, root-field isolation, frozen accordion inputs, native open state, alert roles, and loading fallback.
5. Update the parser snapshot through the repository's deterministic fixture workflow.
6. Expand the package README with catalog, data contracts, examples, use/do-not-use guidance, adapter invariants, accessibility ownership, ethical persuasion, migration, and rollback.
7. Run targeted tests after each checkpoint, then npm test and npm run typecheck.
8. Review the diff against architecture, frontend/accessibility, privacy, security, performance, maintainability, and tech-debt ratchets; fix every valid issue and repeat verification.

## Test Strategy

- Mapper unit tests:
  - all existing keys remain;
  - all canonical variants map to served artifacts;
  - mapper ID equals package version;
  - no dependency/import/framework-class leakage.
- Pipeline golden tests:
  - exact semantic output for every canonical variant;
  - exact legacy output for the four existing button/anchor variants;
  - SSR-safe plain text and deterministic order.
- Edge/security tests:
  - markup payloads are escaped in every visible field;
  - javascript-like card href fails closed;
  - invalid/missing button type becomes button;
  - missing required copy emits no empty controls;
  - badge numeric zero renders;
  - IDs/classes occur only on roots;
  - frozen accordion input remains unchanged.
  - inherited and named accordion array properties do not render.
- Accessibility structure tests:
  - native button/details/summary/article elements;
  - accessible names;
  - alert role mapping;
  - disabled/open/busy/aria-hidden behavior;
  - no redundant explicit live-region attributes.
- Localization tests:
  - caller-provided copy is preserved as already-localized text;
  - loading uses caller label when present and the language-model Loading fallback otherwise.
- Ratchets:
  - components-ui mapper added to artifact-path scanner;
  - all new/changed TSS ASTs recorded in tss-snapshot.json.
  - every shell is referenced exactly once by its binding owner, uses a package-versioned cid, has the default cache variant, and contains literal parameters only;
  - cold/warm renders across all seven shell identities bind different caller values while cached bytes remain unchanged and sentinel-free.
- Verification commands:
  - node --test test/uis/components-ui.test.js
  - node --test test/uis/artifact-paths.test.js
  - node --test test/pipeline/components-ui.test.js
  - node --test test/parsers/tss-parser.test.js
  - npm test
  - npm run typecheck

## Open Questions

None. The requested framework layer, visual system, rich content, and behavior-heavy widgets are explicitly separate features. This bounded contract was approved before implementation.

## Success Criteria

- [x] All 14 canonical component/variant keys resolve through the real pipeline.
- [x] All pre-existing components-ui mapper keys still resolve.
- [x] Four legacy button/anchor recipes retain exact pipeline output.
- [x] All caller-provided visible fields pass adversarial escaping tests and no new h data binding exists.
- [x] Unsafe card href schemes fail through the existing attribute policy.
- [x] Missing/invalid fields follow the validation table with no empty interactive controls.
- [x] Badge count 0, button type fallback, alert roles, card link gating, independent accordion open state, loading localization/status, and root-scope isolation have full-pipeline assertions.
- [x] Frozen accordion data is unchanged after render.
- [x] No runtime import, dependency, JS asset, CSS asset, UI-owner change, or handwritten TypeScript is added.
- [x] All seven canonical shell identities contain only invariant structure; warm renders bind fresh values and live/persisted shell bytes contain no caller/localized data.
- [x] Package README documents API, a11y ownership, ethical UX, adapters, migration, and rollback.
- [x] TSS artifact and AST snapshot ratchets pass.
- [x] npm test and npm run typecheck pass.
- [x] Review finds no valid architecture, accessibility, security/privacy, performance, or maintainability issue.

## Approval

- [x] Requirements clear
- [x] Scope agreed
- [x] Risks have concrete mitigations
- [x] Rollback is defined
- [x] User approval to enter Design Mode

**Approved by:** User
**Date:** 2026-07-18
