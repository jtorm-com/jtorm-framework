# jTorm Unwrap Method

## Install

```js
npm install @jtorm/unwrap-method
```

## Properties

| Option | Type       | Required | Description             |
|--------|------------|----------|-------------------------|
| `s`    | `selector` | `true`   |  CSS Selector to unwrap |

## Example

From `<h1><span>Heading</span></h1>`
To `<h1>Heading</h1>`

```js
h1->unwrap {
  s: "span";
}
```