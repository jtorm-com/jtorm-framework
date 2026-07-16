# jTorm CSS Plugin

## Install
```js
npm install @jtorm/css-plugin
```

Inject `assetPluginModel`, `cssMethod`, `uiResolverModel`, and `requestModel`. The shared asset
owner expands aliases and enforces the request URL allowlist before creating or injecting a
stylesheet; this plugin retains its public cache, collection, lifecycle methods, attributes,
custom `rel`, and media-print defer behavior.
