# jTorm Find Method

Find an element.

## Install

```js
npm install @jtorm/find-method
```


## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `e`    | `string` | `true`   | Element.    |


## Example

```js
->find(e: 'a[href="' + currentUrl + '"]')
->attr {
    n: 'class';
    v: 'active';
    m: 'a';
}
```
