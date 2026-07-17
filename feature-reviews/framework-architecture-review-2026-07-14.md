# jTorm framework — architecture evaluation

**Date:** 2026-07-14 · **Reviewer:** Claude Fable 5 (4-lens parallel deep-read + primary-file review)
**Scope:** whole framework at `feature/schema-product-offer` (working tree as-is). Evidence cited `file:line`.

> **Backlog update — 2026-07-15 (`dev` at `9dd480a`):** the three actionable
> data-to-sink gaps are closed: S1 by PR #38, S2 by PR #39, and S3 by PR #40;
> the `Thing.default` demo-junk leak is closed by PR #41, and the unknown-verb
> drift guard is closed by `@jtorm/handler@1.0.5`. Binding compilation landed
> in PR #44; the precompile/manifest UI-closure slice is now in progress on
> `feature/ui-closure-manifest`.
> Separate release gate: publish `@jtorm/regex-policy-model@1.0.0` before
> `@jtorm/if-method@1.0.3`, and wire the model into both production host composition
> roots before either host adopts the new method version.
>
> **Backlog update — 2026-07-16 (`dev` at `0600c4a`):** PR #46 completed the
> UI-closure manifest, PR #47 completed inline JSON-LD, and PR #49 completed the
> remaining P2 control-flow item. All runtime methods now return
> `{children, repeat, data}`, `handler.dispatch()` owns normal/alias/synthesized
> lifecycle policy, missing effects cannot repeat, and explicit repeats are capped.
>
> **Backlog update — 2026-07-16 (`dev` at `ee548c9`):** PR #51 completed the P3
> DRY-debt slice with explicit injected policy owners for bounded render context/state,
> promise-cache/LRU mechanics, and CSS/JS asset lifecycle. Existing packages remain
> compatibility facades with their public singleton/reset surfaces intact; source ratchets
> prevent duplicate policy copies.
>
> **Backlog update — 2026-07-16 (`dev` at `9902390`):** PR #53 completed the P3
> error-handler privacy slice: diagnostics default off, only literal
> `debug === true` retains the historical dump, disabled handling does not observe the view or need
> injected `util`, and the render harness resets the mutable flag. Final head `5b9ce89` passed CI
> and clean Codex review before the maintainer merged it into `dev`;
> parser replacement remains the next independent P3 task.
>
> **Backlog update — 2026-07-16 (PR #55 from merged PR #54 / `dev`
> at `6e352fa`):** the parser P3 is locally complete and in delivery. The active package is now a
> bounded tokenizer plus recursive-descent parser with located diagnostics, exact valid v1 AST
> compatibility against a frozen oracle and all 257 shipped TSS files, immutable resource ceilings,
> and a documented `2.0.0` migration/rollback. An exact-pinned Terser prepack also emits the same
> singleton as a classic browser script (16,575 raw / 6,120 gzip-9 bytes on the recorded Node 25 toolchain; 6,115 on CI LTS zlib). Local gates are 582/582;
> PR CI now streams the full 200,000-case differential at 167 MiB peak RSS. Ready PR #55 targets
> `dev`, with CI/current-head Codex review tracked in the feature record.

---

## Verdict up front

jTorm is a **genuinely novel idea on a fragile-but-fenced core**, ~5% of the way to its stated scope. The central bet — *schema.org `@type` in your data selects the component that renders it, upstream template never forked* — is real and works today (`ui { c: @type }` dispatches live). The escaping/security model around untrusted data is, in most places, better-engineered than most hand-rolled template engines. But the TSS parser is an unmaintainable black box, the runtime pays a heavy uncached fetch-waterfall cost, the "SEO for free" claim is ~15% delivered, and three data→sink security gaps remained open at review time (all three are now closed; see the backlog update above).

Promising research-grade framework, not yet production-grade. The gap is mostly **tooling + a build step it philosophically refuses**, plus finishing the security net it already started.

---

## 1. What it is

Two pillars, one pain: the coupling between template markup and application data.

- **Pillar A — out-of-band transformation.** Leave a pristine HTML/XML template untouched; write **TSS**, a CSS-like stylesheet whose selectors match nodes and whose "properties" are *verbs* (`text`, `attr`, `insert`, `each`, `if`, `move`, `wrap`…) that transform them at render. You never fork the upstream template → upgrade-safe (no merge/reconcile). Lifted from the PHP project **Transphporm** (credited).
- **Pillar B — schema.org-typed components.** Components keyed to schema.org types; JSON-LD-shaped data carries `@type`, engine renders the matching component. Same typed data is meant to drive UI *and* SEO structured data.

Live in production on a Magento store via a Node host engine.

### Claims, checked

| Claim | Reality |
|---|---|
| Dependency-free runtime | **True.** `dependencies: {}`; lodash-subset, DOM, fetch, `util.inspect` all DI'd; zero `require()` in `src/`. |
| Vanilla JS, no build | **True and load-bearing** — pure CommonJS singletons, JSDoc-typed. Also the root of its worst perf weakness (no compile/manifest). |
| Isomorphic (SSR + SPA) | **Structurally true.** One `windowModel` DI seam; `v.c.c` toggles detached-doc (SSR) vs live-DOM (client). Some paths silently no-op on one side. |
| Schema.org → SEO for free | **Overstated (~15%).** No JSON-LD/microdata emitted (`grep itemscope\|itemprop\|itemtype` → 0 hits). Today = semantic HTML + head meta + an external `.jsonld` link. |

**Size:** 50 packages; core runtime (excl. UI assets) 4,600 LOC / ~30 KB gz; UI assets 257 `.tss` + 112 `.html` + 52 `.json` ≈ 115 KB on disk. First commit 2022; 300 commits.

---

## 2. Architecture analysis

### Render flow (one paragraph)

`viewModel.create(html, tss, data)` parses TSS once (cached) into an AST of `{s,m,p,c}` nodes and wraps HTML in a `document-model`. The **handler** is the single driver loop: `dispatch()` resolves the verb/alias, prepares data, validates, fires before/after events, runs `handle` (mutating the DOM through the one seam `v.h.set` → `document-model.set`), normalizes its returned effect, and applies bounded repeat; `handle()` owns rule traversal and child recursion within lexical scope. Everything hangs off a view object `v` with one-letter fields (`v.t/v.d/v.m/v.h/v.c`) plus an explicit `{children,repeat,data}` result, documented centrally in `@jtorm/types`.

### Best design decisions (keep in any rebuild)

1. **Single DOM-mutation chokepoint** (document-model.js:67-96). All 9 DOM-writing verbs route through `set()`; the zero-match **drift throw** (upgrade-safety detector), ancestor-scope, and find-scope live there — enforced once, unforgettable.
2. **The `t:`/`h:` escaping split** (insert-method.js:192-217) — strongest thing in the codebase. `t:` uses native text APIs the DOM escapes; `h:` is the greppable raw opt-in. **Fail-closed guard** refuses `t:` inside raw-text elements (`script`/`style`/`iframe`…) where `textContent` can't escape (insert-method.js:205-209). Every data-reachable raw-markup sink (insert/get/wrap/swap, all modes) routes through the host `sanitize()` DI seam, placed *lazily after target resolution* so drift stays drift. Verified sink-by-sink; the only bypasses are DOM-to-DOM relocations and the trusted template parse.
3. **Declarative fail-closed gates:** `handler.dispatch()` defaults missing/invalid gate effects to `children:false`, while non-gate misses pass through. Config/mediaquery/mediatarget skip children rather than leak — one policy owner for normal, aliased, and synthesized execution.
4. **Promise-cache done right** (tss-model.js:35-49): caches the in-flight promise (dedupes concurrent fetches) with identity-guarded delete-on-reject.
5. **Per-request isolation landed** (PRs #29–#34, verified on `dev`): per-render state threaded on the request's own context object `v.c`, typed `ViewContext` in `@jtorm/types`. Instance-per-request semantics without instances.
6. **The decoder-ring types package** — one canonical JSDoc source for `v` and the verb contract; what makes 981 LOC of one-letter fields legible at all.

### Weaknesses (ranked, whole-framework)

1. **✅ Addressed 2026-07-17 — the former TSS parser black box.** The fixed-point string-rewriting engine is frozen as a source-hashed test-only oracle and is absent from the package. Production now uses a bounded literal tokenizer and recursive-descent grammar with original UTF-16 line/column/offset diagnostics, iterative method chains, and source/token/depth/node/declaration ceilings. Exact `{s,m,p,c}` behavior is differential-tested over generated matrices and all 257 shipped TSS files. Offset-era one-character interleavings use one bounded post-parse virtual-layout projection rather than executing or re-entering the old parser; ordinary inputs return the direct grammar AST. The published helper/singleton surface remains intact for external hosts. The original approximately-300-LOC/same-gzip estimate was not met: under one Terser browser wrapper v1 is 5,197 raw / 1,826 gzip-9 bytes and v2 is 16,575 / 6,120 on the recorded Node 25 zlib toolchain. The extra 4,294 measured gzip bytes are the explicit cost of exact valid-output projection, diagnostics, literal custom syntax, and resource policy; CI's LTS zlib emits 6,115 bytes for the identical SRI-pinned artifact. **Legibility grade: B** (the direct grammar is clear; the exact-output projection remains deliberately intricate but isolated, bounded, measured, and characterized).
2. **Cold-render fetch waterfall — the biggest unpriced runtime cost.** One cold `Product.default` render = **28 sequential HTTP GETs** (17 TSS + 10 HTML shells + 1 JSON), a **~12-deep dependency chain**, because each composition hop's children are only discoverable after the parent's TSS arrives and the handler awaits each rule serially (handler.js:37-110). ~18 KB raw / ~3 KB gz of content delivered as 28 files. SSR amortizes via singleton caches (warm = 0 fetches); a browser SPA cold page pays it in full — ~250 ms chain latency minimum at 20 ms RTT. No manifest, no bundle, no prefetch, no sibling-parallelism. A build step the architecture refuses on principle would collapse 28→1 (≈40–50× request reduction).
3. **"SEO for free" is ~15% delivered.** The framework consumes schema.org shapes but emits none. The `.jsonld` alternate link (head-id.tss:24-40) points at an *externally* served document most crawlers won't treat as page markup. Emitting `<script type="application/ld+json">` from the already-typed model would be nearly free and is absent.
4. **Three open data→sink security gaps** (see §Security).
5. **Unknown verbs pass silently** (handler.js:95-98). A typo'd method name renders its children and drops the transform with **no signal** — while a typo'd *selector* throws loud. The core promise ("drift is detected loudly") has a hole exactly one token wide. Cheap fix: registry-membership check when `t.m` is truthy.
6. **✅ Closed 2026-07-16 — the former `v.io` implicit-replacement infinite-loop trap.** The view model no longer owns mutable control flags; all 23 methods return effect intents and the handler normalizes missing effects to `repeat:false`. Explicit repeat re-runs the full lifecycle, re-resolves rewritten nodes, and throws at 100 executions. A failing-test-first sentinel proves a method that returns nothing runs once.
7. **`handler-wrapper` mutates the cached AST at render time** (`t2[k].s = 'body'`, handler-wrapper.js:32-34) — writing onto trees that `tss-model` caches across renders/tenants. A repair in the wrong layer (undoing the parser's eager selector inheritance). Same family as the isolation gate, distinct mechanism.
8. **✅ Closed 2026-07-16 — internal lifecycle bypasses.** attrs, each, move, and UI compiler `di` build complete synthetic nodes and call injected `handler.dispatch()` with prepared data; mediatarget asks mediaquery's pure match helper instead of invoking a verb. Data hooks, validation, fail-closed gates, aliases, unknown errors, and before/after events are now dispatch invariants.
9. **Binding re-parse per node per render** (handler.js:73; data-parser has no cache). The AST is cached but every binding string is re-regexed and re-split on every render. Cheapest large perf win available: compile bindings onto the AST node once.
10. **DRY debt from the isolation retrofit.** 5 near-identical `context(v)` walks, 4 `state(v)` copies, 3 near-clone fetch models (tss/data/html, ~85% identical), 2 near-clone css/js plugins (~90% identical). Every isolation fix had to be applied in ≥4 places — the slice history shows exactly that. Directly against the CLAUDE.md DRY/smallest-bundle mandate.
11. **`Thing.default` ships demo junk.** `thing-update-1.0.1.tss` (schema-ui.js:336-338) appends a stray `<input type=email>` and a `ul` to `<body>` — so any bare `ui:{c:'Thing'}` (e.g. `Person.default`, schema-ui.js:427-430) inherits it. The one live instance of the "versioned update file" mechanic is a landmine; no end-to-end test covers `Thing.default` or `Person.default`.
12. **Fail-open tenant scoping.** Omit `c.request`/`c.tenant` and the cache policy key and ui-cache tenant prefix silently become `''` → cross-tenant shared caches (request-model.js:55-71, ui-cache-model.js:51-71). The easiest wiring is the unsafest. Plus: no TTL/purge on any of the 4 LRU caches — a template update needs a process restart.

### DRY / SOLID grade

- **SOLID: B+.** Verbs are single-responsibility; the handler is the only place dispatch/scope/gate/recursion live; DI is uniform, and the five pipeline bypasses are closed. The compatibility-forwarding `ui-method` facade remains deliberate published surface.
- **DRY: C+.** The isolation retrofit left 4-way duplication (context/state/fetch-models/plugins); the sanitize `clean()` seam is copied into 4 packages; css/js method+plugin are near-twins.

---

## 3. Security

**Trust model (correct as stated):** TSS is authored by trusted developers; *data* may be untrusted; multi-tenant SSR is deliberately disabled pending a host sanitizer policy. The findings below are all the same shape — **a developer binds untrusted data to a sink the safety net doesn't cover** — which is exactly the threat the net exists to stop elsewhere.

### What's solid
- `t:`/`h:` split + fail-closed raw-text guard (above).
- All data-reachable raw-markup sinks behind the `sanitize()` seam (verified: insert innerHTML/insertAdjacentHTML/replace, get{h}, wrap{h}, swap{h} — all cleaned; the 2 unclean sinks are DOM-to-DOM, no new markup).
- `attr` `safe()` (attr-method.js:85-121) is genuinely thorough for URL/event vectors: `on*` blocked, `javascript:`/`data:`/`vbscript:` filtered after control-char strip, `srcset` comma-split, srcdoc↔sandbox interaction guarded both directions, runs on the *composed* final value.

### Gaps at review time (verified against code; status updated after PR #40)

| # | Sev | Status | Gap | Evidence | Attack (needs a dev to bind untrusted data to the sink) |
|---|---|---|---|---|---|
| S1 | **High** | ✅ Closed — PR #38 | `js{src}` / `css{href}` had **no scheme/origin filter** before `<script>`/`<link>` injection. | Guarded by the injected URL policy before DOM injection. | Formerly, `js{src:<untrusted>}` could inject an arbitrary remote script. |
| S2 | Medium | ✅ Closed — PR #39 | `attr` omitted `style` and `ping`. | `style` now has a fail-closed policy and `ping` is origin-checked, including detached renders. | Formerly enabled CSS or click-ping exfiltration. |
| S3 | Medium | ✅ Closed — PR #40 | `if{r:}` ran an author regex against **untrusted data** with no backtracking bound. | `@jtorm/regex-policy-model` owns a bounded microgrammar and subject cap; `if-method` retains literal provenance. | Nested and overlapping repetition now fail before native compilation/matching. |
| S4 | Low/watch | Open invariant | `get{a:}` does `_.set(nD, v.d.a, r)` — lodash `_.set` with a path from the `a:` param. Prototype-pollution-*shaped* **iff `a:` ever becomes data-bound**. | get-method.js:37-38 | Today `a:` is author-authored (safe). Keep it that way and guard dangerous path segments defensively if the contract expands. |

Also noted, lower priority: `error-handler` `console.log`s every populated `v` field including resolved data (`v.d`, potential PII) and the whole document HTML on every drift throw (error-handler.js:17-33) — info-disclosure into SSR logs + dead weight in a "minimal" runtime. Move behind a debug flag.

**ReDoS sweep:** ~15 regex literals in parsers+methods; exactly **one** (`if{r:}`, S3) has data-reachable input. The parser's quote-lookahead regexes have nested quantifiers but their input is always trusted TSS source.

---

## 4. Rebuild scenario — what I'd keep and change

**Would I keep the overall architecture? Mostly yes — keep the *contracts*, replace the *parser* and add a *build step*.** The `{s,m,p,c}` node shape, declarative `gate` flag with handler-side fail-closed, the single `set()` zero-match chokepoint, element-ref scoping, promise-caching, `@type`-dispatch, and DI-everything isomorphism are all correct and battle-tested. They are the spec a rewrite should target.

### Templating approach
**Keep TSS-as-CSS-like-selectors + verbs** — it's the differentiator and the upgrade-safety story depends on out-of-band selection. **Implemented:** the active parser is a hand-written tokenizer plus recursive descent with position tracking, real line/column errors, bounded recursion/resources, and chain nesting as a grammar production. The 257-file snapshot plus frozen differential oracle are the conformance suite. Exact offset-era output requires a bounded post-parse projection for a narrow interleaving class, documented in the parser feature record. **Do not** adopt signals/tagged-templates/JSX — they re-introduce the template/data coupling jTorm exists to remove.

### Data/model layer
- **Compile bindings once** onto AST nodes (the AST is already cached); render-time becomes pure evaluation. Biggest cheap perf win.
- Decide `hasOwnProperty` vs inherited-walk **deliberately** (today `constructor`/`toString` resolve through the prototype chain — odd output, not a gadget, but sloppy), and make `0`/`''`/`false` bindable (today falsy bindings silently drop).
- **Emit inline JSON-LD** from the same typed model — turns the SEO pitch from aspiration into feature for near-zero cost.

### Component/UI system
- Keep descriptor `{t[], h, ui:{c}}` + dot-walk + default-variant fallback + `@type`-dispatch (the ~330-LOC resolver+compiler is the defensible core). **Delete** the `di`/`pT` compiler branches — zero users, dead speculative code.
- **Add a compile/manifest step (biggest single win):** pre-resolve each type's full closure (inheritance hops + get chains) into one precompiled AST bundle per component/page-pack. Keeps the runtime dep-free while collapsing 28 fetches → 1 and killing the 12-deep waterfall. The snapshot machinery already proves the ASTs are stable/hashable.
- Make `text`/label resolution **pure** (return into a scoped copy) so authors stop hand-rolling defensive `data()` copies (the whole reason offer-default.tss:3-10 exists).
- Replace the 12-key string-concat responsive convention with one `variants:{desktop:…}` field; replace boxed `move`-surgery with slot composition.
- Fix `Thing.default` now (demo junk) and quarantine or drop the versioned-update mechanic.

### Isomorphism / SSR
Keep the `windowModel` + `v.c.c` seams. Make the **root render context a first-class `RenderSession` object** created by one factory instead of lazily hung off `v.c` by 5 modules — deletes the 5 `context()` copies and the singleton-fallback bug class in one move. Singletons then hold only immutable boot config + shared caches. Make tenant discrimination **fail-closed** (refuse cache participation when no discriminator, don't silently share).

### Security
S1–S3 and the control-flow item are now closed. Keep the `t:`/`h:` split and fail-closed raw-text guard verbatim. Method control remains an explicit returned effect (`{children, repeat, data}`), with all registered execution (including synthesized nodes) routed through one internal `dispatch()` so validation, gates, events, and repeat bounds remain invariants.

### Bundle strategy
Realistic SPA payload today ≈ **27–31 KB gz** (framework + registries) — already small; bundle size is *not* the problem, the **asset waterfall is**. Priorities: (1) the manifest/precompile step above; (2) tree-shake the DI'd lodash subset (cherry-picked ≈4–8 KB gz vs ~25 KB full); (3) ship UI assets as one manifested pack per page rather than hundreds of 10–90 B files.

### Modern APIs worth leveraging
Native `AbortSignal.timeout` (already used), `DocumentFragment` for detached builds, `structuredClone` to replace `_.cloneDeep` in `view-model.copy`, declarative Shadow DOM for the "stateful widgets → web components" reactivity plan, `<script type="application/ld+json">` for SEO.

---

## 5. Prioritized recommendations

| Pri | Item | Status | Why | Effort |
|---|---|---|---|---|
| **P0** | Close S1 (`js{src}`/`css{href}` scheme filter) | ✅ Done — PR #38 | Arbitrary remote script if data-bound; worst reachable outcome | S |
| **P0** | Fix `Thing.default` demo-junk leak | ✅ Done — PR #41 | Ships stray `<input>` into every bare-`Thing` render today | S |
| **P1** | Registry-membership check for unknown verbs | ✅ Done — `@jtorm/handler@1.0.5` | Closes the one-token hole in the "loud drift" promise | S |
| **P1** | Close S2 (`style`/`ping`) + S3 (`if{r:}` bound) | ✅ Done — PRs #39/#40 | CSS-exfil + SSR DoS under untrusted data | S–M |
| **P1** | Compile bindings onto AST nodes | ✅ Done — PR #44 | Eliminates per-render re-parse; large perf win | M |
| **P2** | Precompile/manifest step for UI closures | ✅ Done — PR #46 | Collapses 27 static fetches→1 cold/0 warm; exact dynamic edges stay on the existing path | L |
| **P2** | Emit inline JSON-LD from typed model | ✅ Done — PR #47 | Makes the headline SEO claim true | M |
| **P2** | Normalize `v.io` → returned effect object | ✅ Done — PR #49 | Deletes the infinite-loop trap; makes dispatch an invariant | M |
| **P3** | Collapse DRY debt (context/state/fetch-models/plugins) | ✅ Done — PR #51 | 4-way duplication; bundle + maintainability | M |
| **P3** | Replace the parser (tokenizer + recursive descent) | In review — PR #55 | Unblocks all future DSL work + real diagnostics | L |
| **P3** | Move `error-handler` dump behind a debug flag | ✅ Done — PR #53 | Info-disclosure + dead weight | S |

### Comparable projects worth studying
- **Transphporm** (the acknowledged inspiration) — for how it handles the same selector-verb model in PHP.
- **Enhance / `@enhance`** — HTML-first, dependency-light isomorphic components; closest philosophical cousin.
- **lit-html / uhtml** — for template *caching* strategy (compile once, evaluate many) to steal for the binding-compile step.
- **Astro** — for the islands/partial-hydration model that fits the "delegate stateful widgets to web components" plan better than a full reactive runtime.
- **idiomorph** — already the stated DOM-morph choice for reactivity; sound.

---

## Overall

**Biggest potential:** `@type`-driven, upgrade-safe rendering is a real gap in the market — no forked templates, schema.org data drives both UI and (once JSON-LD is emitted) SEO. If the fetch-waterfall is solved with a precompile step and JSON-LD is emitted, the pitch becomes true rather than aspirational, and the "one component definition → many UI-framework skins" seam becomes testable with a second backend.

**Biggest risk:** the parser and the "no build step" principle together cap the ceiling. The parser can't be safely evolved, and the runtime-resolution model can't be made fast without the build step the project resists. Those two are the same decision viewed twice — and resolving them is what separates "interesting research framework in production on one Magento store" from "framework other people adopt."
