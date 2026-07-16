# @jtorm/render-context-model

Dependency-injected owner for bounded render-parent traversal and namespaced root state.
Runtime source has no imports and stores no render data.

```js
consumer.renderContextModel = renderContextModel;
const root = renderContextModel.context(viewOrContext);
const state = renderContextModel.state(consumer, view, { n: 'feature', f: 'freshState' });
```

`context()` accepts a view or context, follows at most `max` parent edges (128 by
default), and returns `null` for malformed, cyclic, or over-limit chains. `state()`
resolves through the consumer's public `context()` facade, initializes the root namespace
once, aliases it onto child contexts, and returns the consumer singleton when no valid root
exists. The optional `f` names a consumer-owned state factory.
