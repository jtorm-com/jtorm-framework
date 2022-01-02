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


### Component Options

In `jTormUiMethod.ui` you can define your own UI, when no framework is defined it first looks at this. If found, it will set the framework to the default `jTormUiMethod.framework` of the found component if ui exists (best practice).

| Option | Description                                                          |
|--------|----------------------------------------------------------------------|
| `&`    | Combines tss e.g. button.unelevated-anchor&dense-anchor              |
| `|`    | Look for one within framework button.unelevated-anchor|dense-anchor  |

