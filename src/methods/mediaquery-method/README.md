# jTorm Mediaquery Method

Use mediaqueries with help of the [matchMedia method](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia).


## Install
```js
npm install @jtorm/mediaquery-method
```


## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `q`    | `string` | `true`   | Mediaquery. |


## Example

```js
->mediaquery(q: '(min-width: 950px)') {
  body->attr {
    n: 'class';
    v: 'min-width-950';
    m: 'a';
  }
}
->mq {
  q: '(max-width: 949px)';
  body->attr {
    n: 'class';
    v: 'max-width-949';
    m: 'p';
  }
}
```