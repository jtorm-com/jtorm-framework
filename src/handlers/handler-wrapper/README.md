# jTorm Handler Wrapper

A wrapper for the main handler which adds events and prepares an isolated iteration.

## Rendering contract

The wrapper boils an `each`, child-bearing `insert`, or child-bearing `wrap` body in a detached document. It captures the source child array before `before.iteration`, then creates one invocation-local projection after that event. Every projected direct child targets `body`; declarations, methods, and nested children retain their existing values and identities. The source TSS tree's structural `{s,m,p,c}` fields are never rewritten, so one tree can be reused by sequential, interleaved, warm-cache, and tenant-isolated renders.

The optional compiled-binding cache is the deliberate exception: projected nodes expose an enumerable `b` getter/setter which forwards to the corresponding source node. Cold compilation, warm identity reuse, and declaration/grammar invalidation therefore remain source-owned. Custom event/debug integrations may observe new identities for projected direct nodes and should not use those transient identities as cross-render cache keys; nested node identities are unchanged.

Projection takes `O(d)` time and transient space for `d` direct children and does not walk or clone descendants. With `q` concurrent active calls of the same width, peak transient projection space is `O(q*d)`; no projection is retained on the singleton, source tree, parent view/context, or another invocation. Existing event order, detached `body` default, locale/parent context, `cid`/`cs`, `v.r`, ancestor scoping, traversal, loud zero-match behavior, and rejection propagation remain unchanged.

Each invocation also creates one ephemeral opaque token passed as an extra argument through its
existing before/after iteration handlers. After the body is available and the complete after chain
succeeds, the wrapper calls the event model's additive `complete` lifecycle. Any before, create,
render, body, after, or completion failure calls additive `abort` cleanup and then rethrows the
original error even if cleanup fails. The token is not added to the public view/context or retained
after completion. The detached child receives the parent cache language alongside `cid`/`cs`, both
before and after its handler traversal, so an explicit language keeps one exact lookup/stage key.
Hosts using `@jtorm/ui-cache-plugin@^1.0.2` must coordinate
`@jtorm/event-model@^1.0.2` and this package at `^1.0.7`.

## Install

```js
npm install @jtorm/handler-wrapper
```
