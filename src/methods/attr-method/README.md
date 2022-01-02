# jTorm Attr/Attribute Method

Manipulate an attribute with help of the [getAttribute method](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute).

## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `n`    | `string` | `true`   | Attribute name |
| `v`    | `string` | `false`  | Attribute value |
| `m`    | `string` | `false`  | Method a:append, p:prepend, r:remove |
| `ns`   | `boolean`| `false`  | Add no white space between existing attribute value(s) |
| `a`    | `string` | `false`  | Append to value |
| `p`    | `string` | `false`  | Prepend to value |

Value or method is required. To remove an attribute no value is needed.


## Example

```js
div->att {
  n: 'class';
  v: 'row';
  m: 'a';
}
```