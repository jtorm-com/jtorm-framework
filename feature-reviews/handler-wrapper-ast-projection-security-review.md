# Handler-Wrapper AST Projection — Differential Security Review

**Branch:** `agent/eliminate-handler-wrapper-ast-mutation`
**Baseline:** `dev` at `4dd7e3a53b01fca24ab30e9c121783035e4681c5`
**Date:** 2026-07-17
**Risk:** MEDIUM (shared in-memory render integrity and tenant isolation)
**Verdict:** PASS — no unresolved security finding

## Scope and Coverage

The review covers the complete feature diff: the `@jtorm/handler-wrapper` runtime,
package metadata and README; direct runtime callers in `each`, `insert`, and `wrap`;
the cached `tss-model` identity and compiled-binding `node.b` contract; focused unit
and pipeline regressions; and the feature/evaluation/backlog records. The runtime
blast radius is one shared wrapper seam, three direct method callers, and three
published package consumers whose existing `^1.0.5` ranges accept wrapper `1.0.6`.

The repository is large, so differential review was surgical around the one changed
runtime package and deep across its one-hop owners/callers. Git blame and history were
read for the removed write. All changed JavaScript was scanned with 83 Semgrep
JavaScript/security rules with zero findings. Production and full dependency audits
both report zero vulnerabilities.

## Historical Baseline

- `247cd98` changed the direct wrapper-child selector assignment to `body` while
  repairing ancestor scoping. The assignment remained an in-place write to a parsed
  tree subsequently shared by `tss-model`.
- `d24de77` established the current entry-time child-array capture and before/after
  event timing. The projection preserves that timing: it captures `t.c` before the
  before event and projects the captured array after the event.
- `cd1c19e` made `node.b` the intentional lazy compiled-binding cache. The new
  projection forwards that one mutable syntax cache instead of accidentally turning
  it into invocation-local work.

No validation, fail-closed gate, scope-restoration, request policy, parser grammar, or
sink control is removed.

## Trust Boundary and Data Flow

```text
trusted parsed/caller TSS node (possibly cached and shared)
                    |
                    | capture direct child array
                    v
             before.iteration event
                    |
                    | O(d) direct projection
                    v
 invocation-local [{s:'body', m, p, c, live b accessor}]
                    |
                    v
      detached view creation -> handler traversal -> after event
                    |
                    v
                fragment HTML
```

The projection contains syntax references only. It stores no model, DOM, request,
locale, tenant key, identity, credential, or event payload. Direct projected node and
array identities are invocation-local; declarations and nested AST identities remain
shared by design. The source node owns the compiled-binding cache through a live
enumerable accessor, so syntax compilation and invalidation remain reusable without
retaining render data.

## Attack Scenarios and Controls

| Scenario | Potential impact | Control and evidence |
|---|---|---|
| One tenant/render runs a wrapper before another render reuses the same fetched AST | The old `s='body'` write changed the second render's selector and could move output outside the intended target | The wrapper writes only projected direct nodes; cached-tree success/failure reuse matches a fresh parse and source `{s,m,p,c}` identities/values remain unchanged. |
| Two calls interleave on one AST identity | One call's temporary selector could influence the other | Every call receives distinct projected arrays and direct nodes; a deliberate selector write in call A is invisible to call B and the source. |
| Before/create/handler/after rejects | A partial overlay could remain attached to shared state and poison later renders | Projection is stored on no wrapper singleton, source node, parent context, or sibling invocation; every failure path rejects normally and structural snapshots remain exact. |
| Projection breaks or forks the binding cache | Repeated compilation, stale descriptors, or syntax crossing between nodes | An own enumerable getter/setter forwards `b` to the corresponding source node; tests cover cold install, ordinary source data-property descriptors, warm identity, multiple nodes, live replacement, declaration mutation, and grammar invalidation. |
| A very wide wrapper body consumes resources | Allocation/CPU amplification | One non-recursive pass performs `O(d)` work and transient allocation for direct children only. Parser-produced trees have a hard 4,096-node ceiling; `q` active calls peak at `O(q*d)` and no projection is retained. |
| Projection changes selector inheritance or scope | Explicit/selectorless rules could bypass the existing zero-match drift guard or escape get/UI ancestry | Every direct rule still targets detached `body`; eager parser inheritance, nested identities, document scoping, handler recursion, and loud zero-match behavior are unchanged and covered by each/insert/wrap/get/UI pipelines. |
| A custom injected collaborator retains or mutates its arguments | It could retain an invocation projection or write shared `p`, `c`, or `b` | Such collaborators already execute with full render/DOM/AST authority. The wrapper introduces no new authority and does not itself retain collaborator arguments; sandboxing hostile DI is outside this framework contract. |

No reproducible bypass remains. The adversarial pass found no source-to-sink path:
the runtime diff adds no HTML/URL/script/filesystem/process/network sink, dynamic code,
request input, secret, authentication state, or log.

## Architecture Security Checklist

1. **New trust boundary:** none; a trusted host-injected wrapper already receives the
   same parsed AST and collaborators.
2. **New reachable input:** none; existing trusted TSS nodes retain the parser and
   method validation boundaries.
3. **New secret/key/token:** none.
4. **New dependency:** none; runtime remains dependency-free and import-free.
5. **New collected/retained data:** none; projections are transient syntax views.
6. **New external endpoint:** none.
7. **New log:** none.
8. **Blast radius:** a projection defect is limited to the current wrapper fragment;
   failures reject the current render and outer handler cleanup restores lexical
   scope. The fix removes the previous cross-render selector cascade.

STRIDE is complete in the feature specification. Applicable Tampering and Denial of
Service controls are the structural/interleaving/failure tests and the direct-only
resource bound. Spoofing, Repudiation, Information Disclosure, and Elevation of
Privilege add no reachable surface and are N/A with the data-flow evidence above.

## Package, Sink, and Supply-Chain Review

- The published singleton/export and `handle(h,t,m,v)` signature are unchanged.
- Only `@jtorm/handler-wrapper` moves from `1.0.5` to `1.0.6`; all three consumer
  ranges already accept it, so no coordinated release is needed.
- `npm pack --dry-run --json` contains only the package README, metadata, and runtime
  source.
- No dependency, lockfile, install script, browser artifact, handwritten TypeScript,
  declaration, or compatibility shim is added.
- `npm audit --omit=dev` and full `npm audit` both report zero vulnerabilities.
- Semgrep reports zero findings; a targeted added-line sink scan found only test-only
  `require()` statements.

## Findings

### Open findings

None.

### Accepted residual compatibility difference

Downstream observers see fresh direct projected node identities and an accessor
descriptor for projected `b`; the source node's `b` remains an ordinary writable,
enumerable, configurable data property. This is necessary to combine invocation
isolation with source-owned cache reuse and is documented in the package README.
Custom observers must not use transient projected identities as cross-render keys.

## Limitations and Confidence

- The differential-review skill's linked `methodology.md`, `adversarial.md`,
  `reporting.md`, and `patterns.md` files are absent from the installed ai-config
  checkout. Its required risk/history/blast-radius/adversarial/report workflow was
  applied directly; this absence is recorded rather than silently claimed as loaded.
- External production host composition is outside this repository. The local engine
  injects the same published singleton graph and exercises SSR/live detached fragments,
  cached identities, get/UI ancestry, and all direct callers.
- No production-like load environment exists for this internal allocation-only patch.
  Resource confidence therefore comes from the non-recursive direct loop, the parser's
  hard node ceiling, explicit two-call interleaving, and no-retention failure tests—not
  from an invented latency percentile.

Confidence is high for repository-owned integrity, traversal, failure propagation,
cache behavior, and package compatibility. Differential security review approves the
change.
