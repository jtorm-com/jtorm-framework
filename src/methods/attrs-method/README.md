# jTorm Attrs/Attributes Method

Manipulate multiple attributes with help of the attr method.

## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `n`    | `string` | `true`   | Attribute names |
| `v`    | `string` | `false`  | Attribute values |
| `m`    | `string` | `false`  | Method a:append, p:prepend, r:remove |

Value or method is required. To remove an attribute no value is needed.

## Options

### Separator

Names and values separator, defaults to a comma (,).
`jTormAttrsMethod.separator = ',';// Default ','`

## Example

```js
div->attrs {
  n: 'class,id';
  v: 'row,row-1';
  m: 'a';
}
```