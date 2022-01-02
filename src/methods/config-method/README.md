# jTorm Config Method

Access config variables from the context. Functions like an `if` method, except without an `else` function.
`jTorm.context.config = {createDoc: 1}`


## Install

```js
npm install @jtorm/config-method
```


## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `n`    | `string` | `true`   | Config name |
| `v`    | `any`    | `false`  | Config value to match it with |


## Example

```js
body {
  ->config(d: createDoc, v: 1)->append { h: 'Config createDoc set'; }
  ->config(d: createDoc, v: 0)->append { h: 'Config createDoc not set'; }
}
```