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
- `npm run typecheck` → `tsc -p jsconfig.json` (JSDoc types; `checkJs` scoped to `types.js` +
  `view-model.js`). No Biome/ESLint/Knip in this repo.
- Full-pipeline harness: `test/helpers/engine.js` (`render(html,tss,data,url,fixtures)`), goldens in
  `test/pipeline/`. `jsdom`+`lodash` are devDeps; the runtime stays dependency-free.

## Locked architecture — must hold (flag violations)
- **Pure CommonJS, dependency-free runtime** (`dependencies: {}`). Every package is
  `module.exports = { jTormX: { ...singleton } }`; methods use `this`. All externals (`_` lodash
  subset, DOM/`windowModel`, the fetch transport) are **dependency-injected** (`// DI`).
- **Pure JS only — never add `.ts`/`.d.ts`.** Types are JSDoc validated by `jsconfig.json`.
- **`v` is typed from the `types.js` decoder ring.** `types.js` is the single source of truth for the view object `v` (`v.t/v.d/v.m/v.h/v.io/v.c`); methods (`handle`/`validate`/`data`) and handlers import `ViewModel` from it, annotate `@param {ViewModel} v`, and carry a one-line contract comment atop each verb. JSDoc/editor-hover only — `jsconfig` `include` stays scoped to `types.js` + `view-model.js`, so the per-method `@param`/typedef annotations are intentional and **not** batch-checked: do **not** flag them as dead/unused (wiring them into `tsc` is a tracked follow-up needing `@this`/DI typing).
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
