# @jtorm/asset-plugin-model

Dependency-injected owner for the shared CSS/JavaScript asset lifecycle: render-root state,
legacy queue adoption, alias and document-base URL resolution, awaited request policy, DOM
insertion, original-key dedupe, sequential draining, and failure-safe cleanup.

```js
assetPluginModel.renderContextModel = renderContextModel;
cssPlugin.assetPluginModel = assetPluginModel;
jsPlugin.assetPluginModel = assetPluginModel;
```

CSS and JS plugins retain their public compatibility methods and pass a private declarative
profile to this model. Request policy is checked before element creation or insertion. Runtime
source has no imports and stores no render or asset data.
