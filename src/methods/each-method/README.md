# jTorm Each Method

## Install

```js
npm install @jtorm/each-method
```

## Properties

| Option | Type     | Required | Description                                     |
|--------|----------|----------|-------------------------------------------------|
| `d`    | `string` | `true`   | Data collection.                                |
| `a`    | `string` | `true`   | As current item reference within the loop.      |
| `m`    | `string` | `false`  | E.g. append, prepend, replace. Default: append. |
| `e`    | `string` | `false`  | Set certain elements to the scope to process.   |


## Example

```js
body->each(d: dataSet, a: row)->append {
    h: row.html;
}
```
