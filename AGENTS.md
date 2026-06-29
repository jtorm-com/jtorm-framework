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
- **`@jtorm/types`** has the repo's only build step: a `prepack` runs `tsc --emitDeclarationOnly` to
  generate its published `.d.ts` from the JSDoc (gitignored artifact; `typescript` is its devDep).
- Full-pipeline harness: `test/helpers/engine.js` (`render(html,tss,data,url,fixtures)`), goldens in
  `test/pipeline/`. `jsdom`+`lodash` are devDeps; the runtime stays dependency-free.

## Locked architecture — must hold (flag violations)
- **Pure CommonJS; dependency-free runtime *code*** — the `src/` tree calls `require()` **nowhere**
  (zero third-party *or* inter-package imports); every collaborator and external (`_` lodash subset,
  DOM/`windowModel`, the fetch transport) is **dependency-injected** by the host (`// DI`). Each
  package is `module.exports = { jTormX: { ...singleton } }`; methods use `this`. (`package.json`
  `dependencies` declare the `@jtorm/*` wiring — and DI'd libs, e.g. `view-model` → `lodash` — as
  metadata, not `require()` edges.) **`@jtorm/types`** is a new **type-only** entry there: JSDoc + a
  generated `.d.ts`, zero runtime code, so its `ViewModel` typedef resolves for TypeScript consumers.
- **Pure JS only — never add *hand-written* `.ts`/`.d.ts`.** Types are JSDoc validated by
  `jsconfig.json`. Sole exception: **`@jtorm/types`** publishes a `.d.ts` **generated** from its JSDoc
  at `prepack` (`tsc --emitDeclarationOnly`; gitignored build artifact, never authored by hand) so
  downstream TypeScript can consume the shared typedefs. Source stays pure JS.
- **`v` is typed from the `@jtorm/types` decoder ring.** The published **`@jtorm/types`** package (`src/types/src/types.js`) is the single source of truth for the view object `v` (`v.t/v.d/v.m/v.h/v.io/v.c`); methods (`handle`/`validate`/`data`) and handlers import `ViewModel` from it (`import('@jtorm/types')`, declared as a dependency; downstream it resolves through the package's **generated `.d.ts`** `types` entry, in-repo through the `jsconfig` `paths` alias), annotate `@param {ViewModel} v`, and carry a one-line contract comment atop each verb. The per-method `@param`/typedef annotations are editor-hover aids — `jsconfig` `include` stays scoped to `src/types/src/types.js` + `view-model.js`, so they are intentionally **not** batch-checked: do **not** flag them as dead/unused (wiring them into `tsc` is a tracked follow-up needing `@this`/DI typing).
- **Published packages** — each `src/**` dir is a published `@jtorm/*` package. **Never delete or
  deprecate exports / remove packages** (external projects depend on them). Greenfield: no
  backward-compat shims; bug-fixes get a **patch** bump to the touched package's `package.json`.
- **Terse style** — single-letter locals, minimal/DRY/SOLID; match surrounding density, don't reformat.
- **Singletons** — modules are singletons; tests must reset the mutable fields they touch.
- **Bug fixes are failing-test-first** — prove with a red test, fix, then re-run the full suite.

## Known non-issues — do NOT flag these as bugs
- **TSS requires a trailing `;`** on the final property — by design (a final property without it is dropped).
- **`tss-parser` arithmetic is correct** — the brace `i <= ps.length` and the whitespace/offset code
  were reviewed and **DEBUNKED**; "fixing" them corrupts 190/252 fixtures. Do not touch.
- **Zero-match contract** — transform verbs (`attr`/`attrs`/`insert`/`text`/`move`/`swap`/`remove`…)
  **throw loud** via `error-handler` on zero matches: that is the upgrade-safe drift detector, not a
  bug. `if`/`->else`/`each` are control flow; optional target = `->if(el: X)->verb`.
- **`get{t}`/`ui` boil fetched TSS document-global** (not scoped to the get target) — a known,
  tracked limitation pending a core ancestor-scope mechanism (see `docs/backlog.md`), locked by a
  `test.todo` in `test/pipeline/get.test.js`. Don't "fix" it ad hoc.
- **`getSelector` is intentionally string-only** (no regex) — selectors are not regexes.

## Git / PR workflow
- **`dev` is the integration branch** — branch off `dev`, open PRs **into `dev`**. `dev` → `main`
  only for releases. Both are protected (require PR, no force-push).
- **Codex review is the quality gate.** A PR is mergeable only when Codex's automated review against
  the **current head commit** returns a clean 👍 with no valid unresolved findings, and `test` CI is
  green. Iterate: apply valid fixes (failing-test-first), reply-and-resolve false positives with a
  reason, push, re-request `@codex review`, re-poll until clean. A 👍 against an older head is stale.
- Conventional commits (`feat|fix|refactor|docs|test|chore|perf|ci: …`).

This repo mirrors `gitlab.com/jtorm/jtorm-framework`. Private strategy/planning lives in a separate
repo and is intentionally absent here.
