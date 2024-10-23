# jTorm - Layer Method


## Install
```js
npm install @jtorm/layer-method
```


## Properties

| Option | Type     | Required | Description                                                                    |
|--------|----------|----------|--------------------------------------------------------------------------------|
| `e`    | `string` | `true`   | Event when to process e.g. before, after.                                      |
| `t`    | `string` | `true`   | Type when to process e.g. iteration, view.                                     |
| `i`    | `string` | `false`  | ID, optional when component has a cache ID from parent, also overrules parent. |
| `z`    | `int`    | `false`  | Z-index.                                                                       |


## Example

```
->layer {
    e: 'after';
    t: 'view';
    z: '1';

    a->attr {
        n: 'class';
        v: 'active';
    }
}
```
