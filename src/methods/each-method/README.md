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
Resolved arrays iterate only canonical own enumerable indices in ascending key order. Sparse holes, inherited properties, and named properties are ignored. A truthy non-array value remains one iteration item.


## Example

```tss
body->each(d: dataSet, a: row)->append {
    t: row.label;
}
```
