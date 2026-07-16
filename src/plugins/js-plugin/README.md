# jTorm JS Plugin

## Install
```js
npm install @jtorm/js-plugin
```

Inject `assetPluginModel`, `jsMethod`, `uiResolverModel`, and `requestModel`. The shared asset
owner expands aliases and enforces the request URL allowlist before creating or injecting a
script; this plugin retains its public cache, collection, lifecycle methods, attributes, and
original-`src` dedupe behavior.
