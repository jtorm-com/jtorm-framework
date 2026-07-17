# @jtorm/render-context-model

Dependency-injected owner for bounded render-parent traversal and namespaced root state.
Runtime source has no imports and stores no render data.

```js
consumer.renderContextModel = renderContextModel;
const root = renderContextModel.context(viewOrContext);
const cacheRoot = renderContextModel.cacheContext(viewOrContext);
const state = renderContextModel.state(consumer, view, { n: 'feature', f: 'freshState' });
```

`context()` accepts a view or context, follows at most `max` parent edges (128 by
default), and returns `null` for malformed, cyclic, or over-limit chains. `state()`
resolves through the consumer's public `context()` facade, initializes the root namespace
once, aliases it onto child contexts, and returns the consumer singleton when no valid root
exists. The optional `f` names a consumer-owned state factory.

`cacheContext()` applies the same bound while requiring the view-to-context handoff and every
traversed parent link to be an own field. Cache policy owners use this stricter resolver so
prototype-inherited links cannot opt a render into shared state; ordinary `context()` behavior
and callers remain unchanged.
