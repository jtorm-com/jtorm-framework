# jTorm Attributes Method

Manipulate multiple attributes with help of the attribute method.

## Install

```js
npm install @jtorm/attrs-method
```


## Properties

| Option | Type     | Required | Description                                            |
|--------|----------|----------|--------------------------------------------------------|
| `n`    | `string` | `true`   | Attribute names.                                       |
| `v`    | `string` | `false`  | Attribute values.                                      |
| `m`    | `string` | `false`  | Method a:append, p:prepend, r:remove, (empty):replace. |


## Example

```js
div->attrs {
    n: 'class,id';
    v: 'row,row-1';
    m: 'a';
}
```