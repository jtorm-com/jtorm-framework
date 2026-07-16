# jTorm UI Cache Model

## Install
```js
npm install @jtorm/ui-cache-model
```

Inject `renderContextModel` before rendering. The exported fragment cache/order remain shared
and host-resettable; only the dirty flag is namespaced to each bounded render root.
