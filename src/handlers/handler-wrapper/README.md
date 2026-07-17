# jTorm Handler Wrapper

A wrapper for the main handler which adds events and prepares an isolated iteration.

## Rendering contract

The wrapper boils an `each`, child-bearing `insert`, or child-bearing `wrap` body in a detached document. It captures the source child array before `before.iteration`, then creates one invocation-local projection after that event. Every projected direct child targets `body`; declarations, methods, and nested children retain their existing values and identities. The source TSS tree's structural `{s,m,p,c}` fields are never rewritten, so one tree can be reused by sequential, interleaved, warm-cache, and tenant-isolated renders.

The optional compiled-binding cache is the deliberate exception: projected nodes expose an enumerable `b` getter/setter which forwards to the corresponding source node. Cold compilation, warm identity reuse, and declaration/grammar invalidation therefore remain source-owned. Custom event/debug integrations may observe new identities for projected direct nodes and should not use those transient identities as cross-render cache keys; nested node identities are unchanged.

Projection takes `O(d)` time and transient space for `d` direct children and does not walk or clone descendants. With `q` concurrent active calls of the same width, peak transient projection space is `O(q*d)`; no projection is retained on the singleton, source tree, parent view/context, or another invocation. Existing event order, detached `body` default, locale/parent context, `cid`/`cs`, `v.r`, ancestor scoping, traversal, loud zero-match behavior, and rejection propagation remain unchanged.

## Install

```js
npm install @jtorm/handler-wrapper
```
