# jTorm UI Method

Registry and handling different UI frameworks.


## Install
```js
npm install @jtorm/ui-method
```


## Properties

| Option | Type      | Required | Description |
|--------|-----------|----------|-------------|
| `c`    | `string`  | `true`   | Component, e.g. header, menu, button, footer, etc.
| `f`    | `string`  | `false`  | Registered framework, fallback `default` if set, else first key/value in object.
| `t`    | `boolean` | `false`  | Use component tss
| `h`    | `boolean` | `false`  | Use component html
| `m`    | `boolean` | `false`  | Use mediatarget check if suffixes exists registered by it e.g. defaultDesktopL, defaultTabletS etc


## Notes

Use mediatarget is not allowed for the fallback to default.
You have to explicit define it e.g. WPHeader > WPHeader.default
