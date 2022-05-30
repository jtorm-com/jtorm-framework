# jTorm Move Method

## Install
```js
npm install jtorm-com/jtorm-move-method
```


## Properties

| Option | Type       | Required | Description         |
|--------|------------|----------|---------------------|
| `l`    | `selector` | `true`   | To location         |
| `m`    | `method`   | `true`   | Append, prepend, replace, etc. |


## Example

From `<h1>Heading</h1>`

To `<h1><span>Heading</span></h1>`


### Children

```js
h1->move {
  l: "body";
  m: "replace";
}
```