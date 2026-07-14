# jTorm Handler

Contains a handler for processing data, TSS and HTML.

Truthy TSS method names must match an own entry in the injected method registry
or one of its registered aliases. Unknown methods throw before their children
render; selector-only rules continue to pass through to their children.

## Install

```js
npm install @jtorm/handler
```
