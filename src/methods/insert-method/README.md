# jTorm Insert Method

Insert HTML in the Document Object Model (DOM) tree with help of the [insertAdjacentHTML method](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML).
The following method aliases are available as well to set in the context methods:
jTormAppendMethod = append/beforeend
jTormPrependMethod = prepend/afterbegin
jTormBeforeMethod = before/beforebegin
jTormAfterMethod = after/afterend
jTormReplaceMethod = replace/innerHTML


## Install

```js
npm install @jtorm/insert-method
```


## Config

| Option | Required | Type    | Description |
|--------|----------|---------|-------------|
| `m`    | `true`   | string  | Method: a=append/beforeend, p=prepend/afterbegin, b=before/beforebegin, af=after/afterend, r=replace/innerHTML |
| `h`    | `false`  | html    | HTML |
| `d`    | `false`  | data    | When there are child items, alternative data to process can be set here |
| `p`    | `false`  | data    | Prefix for 'h' |
| `s`    | `false`  | data    | Suffix for 'h' |
| `cid`  | `false`  | data    | Cache id |
| `cs`   | `false`  | data    | Cache scope |


## Example

```js
body->insert {
  m: 'a';
  h: '<div><b>append me</b></div>';
  div {
    ->prepend {
      h: '<header><h3>Header</h3></header>';
    }
    ->append {
      h: '<footer>footer</footer>';
    }
  }
}
```