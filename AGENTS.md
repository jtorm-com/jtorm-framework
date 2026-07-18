# AGENTS.md — jTorm framework

Guidance for automated reviewers (Codex et al.) and contributors. Public, committed.
Treat this as the review contract: flag deviations from it; do **not** flag the locked
patterns below as bugs — they are intentional and load-bearing.

## What jTorm is
An **isomorphic** (SSR + SPA/PWA), **dependency-free**, vanilla-JS template/component framework.
- **TSS** — a CSS-like DSL that selects nodes in a pristine HTML/XML template and applies transforms
  out-of-band at render time (the upstream template is never forked → upgrade-safe).
- **schema.org-typed components** — components keyed to schema.org types render into a UI framework,
  with JSON-LD/SEO falling out for free.

## Build & test
- `npm test` → `node --test "test/**/*.test.js"` (Node built-in `node:test`, zero deps).
  Do **not** use `node --test test/` — it mis-resolves the directory on this Node.
- `npm run typecheck` → `tsc -p jsconfig.json` (JSDoc types; `checkJs` scoped to `src/types/src/types.js`
  + `view-model.js`). No Biome/ESLint/Knip in this repo.
- **`@jtorm/types`** has the repo's only declaration build: a `prepack` runs `tsc --emitDeclarationOnly` to
  generate its published `.d.ts` from the JSDoc (gitignored artifact; `typescript` is its devDep).
- **`@jtorm/tss-parser`** has a production-browser build: its `prepack` runs the exact pinned Terser
  version over canonical CommonJS source and emits a gitignored `tss-parser.min.js` classic script.
  CommonJS `main` stays unchanged; direct browser loading exposes `globalThis.jTormTSSParser`.
- Full-pipeline harness: `test/helpers/engine.js`
  (`render(html,tss,data,url,fixtures,c,manifests,warm,options)`), goldens in `test/pipeline/`. The
  optional final arguments prepare UI manifests, expose transport request/byte metrics, and let
  compatibility tests unregister optional JSON-LD; `jsdom`+`lodash` are devDeps, while the runtime
  stays dependency-free.

## Locked architecture — must hold (flag violations)
- **Pure CommonJS; dependency-free runtime *code*** — the `src/` tree calls `require()` **nowhere**
  (zero third-party *or* inter-package imports); every collaborator and external (`_` lodash subset,
  DOM/`windowModel`, the fetch transport) is **dependency-injected** by the host (`// DI`). Each
  package is `module.exports = { jTormX: { ...singleton } }`; methods use `this`. (`package.json`
  `dependencies` declare the `@jtorm/*` wiring — and DI'd libs, e.g. `view-model` → `lodash` — as
  metadata, not `require()` edges.) **`@jtorm/types`** is a new **type-only** entry there: JSDoc + a
  generated `.d.ts`, zero runtime code, so its `ViewModel` typedef resolves for TypeScript consumers.
  The parser's generated browser artifact is build output, preserves the same singleton, and adds no
  runtime dependency or import.
- **Pure JS only — never add *hand-written* `.ts`/`.d.ts`.** Types are JSDoc validated by
  `jsconfig.json`. Sole exception: **`@jtorm/types`** publishes a `.d.ts` **generated** from its JSDoc
  at `prepack` (`tsc --emitDeclarationOnly`; gitignored build artifact, never authored by hand) so
  downstream TypeScript can consume the shared typedefs. Source stays pure JS.
- **`v` and method effects are typed from the `@jtorm/types` decoder ring.** The published **`@jtorm/types`** package (`src/types/src/types.js`) is the single source of truth for the view object `v` (`v.t/v.d/v.m/v.h/v.c`) and the returned `MethodEffect`/`ViewEffect` contract. Methods (`handle`/`validate`/`data`) and handlers import these with `import('@jtorm/types')` JSDoc references (declared as dependencies; downstream they resolve through the package's **generated `.d.ts`** `types` entry, in-repo through the `jsconfig` `paths` alias), annotate `@param {ViewModel} v` plus effect returns, and carry a one-line contract comment atop each verb. The per-method annotations are editor-hover aids — `jsconfig` `include` stays scoped to `src/types/src/types.js` + `view-model.js`, so they are intentionally **not** batch-checked: do **not** flag them as dead/unused (wiring them into `tsc` is a tracked follow-up needing `@this`/DI typing).
- **Returned effects are the only method control-flow contract.** Runtime verbs return partial `{children, repeat, data}` intents; `@jtorm/handler.dispatch()` owns key/alias resolution, prepared/default data, validation, fail-closed gate defaults, before/after events, effect normalization, and explicit repeat (bounded to 100 lifecycle executions). `handler.handle()` alone owns rule traversal, child recursion, and lexical scope restoration. The view model has no mutable `io` side channel. Normal, aliased, and synthesized verbs (attrs/each/move/UI compiler `di`) must execute through the injected `dispatch()` seam; never call another registered verb's `handle()` directly. Only own boolean `children`/`repeat` fields are honored; missing or malformed controls use safe handler defaults (no repeat, and no children for a gate).
- **Persisted rendered-fragment age has two policy owners.** `@jtorm/ui-cache-model` owns the public versioned save-adapter envelope, restart-stable Unix-ms `settledAt`, whole-envelope validation, exact byte/timestamp pairing, bounded LRU persistence, and migration/rollback boundary; its exported live `cache` remains the nested HTML-only shape. `@jtorm/promise-cache-model` alone restores opaque process-local insertion records and owns current finite/zero/Infinity TTL, strict non-sliding freshness, and process-clock identity. Reload requires own data-property `saveModel.uiCacheScoped === true` plus own recognized wire version; legacy/unversioned stores are cold-cleared or externally migrated only with trustworthy original timestamps. Hosts finish `init()` before render roots, use a nondecreasing restart-stable Unix clock, isolate mixed reader versions, and clear/restore/disable persistence before downgrade. Do not invent reload/save/hit timestamps, parallel unpaired metadata, serialized clock/context identities, stale fallback/refresh, or HTTP validator behavior.
- **Published packages** — each `src/**` dir is a published `@jtorm/*` package. **Never delete or
  deprecate exports / remove packages** (external projects depend on them). Greenfield: no
  backward-compat shims; bug-fixes get a **patch** bump to the touched package's `package.json`.
- **UI resolution and compilation are separate DI models.** `@jtorm/ui-resolver-model` owns the
  custom/registered mapper graph, framework fallback, component cache, aliases, and asset URL
  expansion. `@jtorm/ui-compiler-model` owns descriptor → TSS compilation (`h/t/d`, nested `ui`,
  `pT`, and `di`). `@jtorm/ui-method` owns only the verb lifecycle, mediatarget orchestration, and a
  compatibility-forwarding facade for its published helper/state surface. Hosts inject both models
  before configuring that facade; CSS/JS plugins inject the resolver directly. Do not fold these
  responsibilities back into the verb or add runtime imports between them.
- **UI closure generation and runtime loading are separate DI owners.** The build-only
  `@jtorm/ui-manifest-compiler` traverses trusted static UI closures through the existing resolver
  and parsers, records dynamic edges, fingerprints inputs, and writes deterministic
  content-addressed JSON. Runtime `@jtorm/ui-manifest-model` owns wire canonicalization, digest and
  schema validation, bounded pack caching, root-local atomic indexes, and required/optional lookup
  policy. `@jtorm/get-method` owns only the optional lookup-before-legacy-model seam. Hosts prepare
  manifests after root-context creation and before events/handler traversal, and inject native
  SHA-256 plus the existing request model. Do not move graph discovery into runtime, prime the three
  fetch-model caches, bypass `request-model` URL policy on hits, or add runtime imports.
- **Regex validation and execution are one injected policy model.** `@jtorm/regex-policy-model`
  owns the bounded `if(r:)` micro-grammar, input limits, native compilation, and matching;
  `@jtorm/if-method` owns TSS-literal provenance and conditional flow. Hosts inject the policy
  model. Do not move the grammar or regex sink back into the verb or add a runtime import.
- **`schema-ui` follows schema.org first** — component data contracts should reuse schema.org
  types/properties and mapper composition before inventing local fields or per-type artifacts.
  Keep the shipped UI graph small: add a new `.tss` only for a real schema.org type/variant
  boundary that existing components cannot express; prefer shared `Thing`/`ItemList`/`ListItem`
  composition and thin type overlays.
- **Terse style** — single-letter locals, minimal/DRY/SOLID; match surrounding density, don't reformat.
- **Singletons** — modules are singletons; tests must reset the mutable fields they touch.
- **Bug fixes are failing-test-first** — prove with a red test, fix, then re-run the full suite.

## Known non-issues — do NOT flag these as bugs
- **TSS requires a trailing `;`** on the final property — by design (a final property without it is dropped).
- **The frozen v1 `tss-parser` oracle arithmetic is historical evidence** — the brace
  `i <= ps.length` and whitespace/offset code in `test/fixtures/tss-parser-oracle.js` were reviewed
  and piecemeal fixes were **DEBUNKED**; changing them corrupts the compatibility baseline. Do not
  edit that oracle or restore its fixed-point parser to production. The active v2 parser is the
  bounded tokenizer/recursive-descent implementation, locked against all 257 `src/**/*.tss` files.
  To preserve valid offset-era ASTs exactly, parsed one-character interleavings may enter one
  bounded compatibility-layout/blanking pass; it never executes, reparses, or fixed-point rescans
  the oracle/source.
- **Zero-match contract** — transform verbs (`attr`/`attrs`/`insert`/`text`/`move`/`swap`/`remove`…)
  **throw loud** via `error-handler` on zero matches: that is the upgrade-safe drift detector, not a
  bug. `if`/`->else`/`each` are control flow; optional target = `->if(el: X)->verb`.
- **`get{t}`/`ui` scope fetched TSS UNDER the get target** via `v.c.a` (the **resolved ancestor
  ELEMENT(S)**, not a selector string): `document-model.scope` matches each fetched rule WITHIN the
  ancestor element(s), **descendant-first → else self** (a selectorless rule, or a same-tag rule with
  no same-tag descendant, targets the element itself). A component re-naming its own root should use a
  **selectorless** rule; a same-tag tag-rule resolves to a same-tag descendant when one exists
  (`input.tss` is `input{}` only because it is itself a get-target — the lone such case). The handler
  restores `v.c.a` per subtree (no sibling leak). A fetched rule that structurally REPLACES its own
  scoped root (`->swap`/`->move` → `replaceChild`) orphans the snapshotted ancestor; `scope` skips the
  detached node, so later rules throw LOUD (zero-match drift detector) — jTorm does **not** follow a
  scope across a root replacement (scope-follows-replacement is a separate backlog item). Locked by
  `test/pipeline/{get,ui}.test.js`. Don't reintroduce string-selector composition (comma-list-fragile
  — PR #3 abandoned it) or document-wide tag scoping (leaks to same-tag siblings — the reverted
  `g===a` attempt).
- **`getSelector` is intentionally string-only** (no regex) — selectors are not regexes.

## Git / PR workflow
- **`dev` is the integration branch** — branch off `dev`, open PRs **into `dev`**. `dev` → `main`
  only for releases. Both are protected (require PR, no force-push).
- **PRs are ready for review by default** — do not create drafts unless the maintainer explicitly
  requests one.
- **Codex review is the quality gate.** A PR is mergeable only when Codex's automated review against
  the **current head commit** returns a clean 👍 with no valid unresolved findings, and `test` CI is
  green. Iterate: apply valid fixes (failing-test-first), reply-and-resolve false positives with a
  reason, push, re-request `@codex review`, re-poll until clean. A 👍 against an older head is stale.
- Conventional commits (`feat|fix|refactor|docs|test|chore|perf|ci: …`).

The canonical repository is `github.com/jtorm-com/jtorm-framework`. Architecture reviews and their
actionable backlog live in `feature-reviews/`; the automated review outcome ledger lives in
`.claude-tasks/`. Broader private strategy/planning remains in a separate repo.
