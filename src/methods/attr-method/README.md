# jTorm Attr/Attribute Method

Manipulate an attribute with help of the [getAttribute method](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute).

## Properties

| Option | Type     | Required | Description                                            |
|--------|----------|----------|--------------------------------------------------------|
| `n`    | `string` | `true`   | Attribute name                                         |
| `v`    | `string` | `true`   | Attribute value (not required when method=remove)      |
| `m`    | `string` | `false`  | Method a:append, p:prepend, r:remove, (empty):replace  |
| `ns`   | `boolean`| `false`  | Add no white space between existing attribute value(s) |
| `a`    | `string` | `false`  | Append to value                                        |
| `p`    | `string` | `false`  | Prepend to value                                       |


## Example

```js
div->attr {
  n: 'class';
  v: 'row';
  m: 'a';
}
```