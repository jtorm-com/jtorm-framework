# jTorm Handler

Contains a handler for processing data, TSS and HTML.

Truthy TSS method names must match an own entry in the injected method registry
or one of its registered aliases. Unknown methods throw before their children
render; selector-only rules continue to pass through to their children.

Every method returns a partial `{ children, repeat, data }` effect. `dispatch(v,
preparedData?)` is the sole registered-method execution path and returns a complete normalized
effect after data preparation, validation, before/after method events, and handling. Missing
effects default to `repeat: false`; gate methods default to `children: false`; explicit repeat is
bounded to 100 lifecycle executions and then throws. Only own boolean control fields are accepted;
malformed or inherited values use those handler-owned defaults.

Synthesized callers provide a complete `v.t` node and optional prepared data to `dispatch()`.
Prepared data still passes through a method's custom `data(v, preparedData)` hook. `handle()` owns
only TSS traversal, child recursion, and lexical scope restoration around this dispatch seam.

## Install

```js
npm install @jtorm/handler
```
