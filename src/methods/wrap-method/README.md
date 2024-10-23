# jTorm Wrap Method

## Install
```js
npm install @jtorm/wrap-method
```


## Properties

| Option | Type       | Required | Description        |
|--------|------------|----------|--------------------|
| `s`    | `selector` | `true`   | Wrap CSS Selector. |
| `d`    | `data`     | `true`   | Data.              |
| `h`    | `string`   | `false`  | Direct HTML.       |


## Example

From `<h1>Heading</h1>` to `<h1><span>Heading</span></h1>`.

```js
h1->wrap {
  s: "span";
  h: "<span></span>";
}
```