# jTorm Insert Method

Insert HTML in the Document Object Model (DOM) tree with help of the [insertAdjacentHTML method](https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML).
The following method aliases are available as well to set in the context methods:
- jTormAppendMethod = append/beforeend
- jTormPrependMethod = prepend/afterbegin
- jTormBeforeMethod = before/beforebegin
- jTormAfterMethod = after/afterend
- jTormReplaceMethod = replace/innerHTML

## Install

```js
npm install @jtorm/insert-method
```


## Properties

| Option | Required | Type    | Description                                                              |
|--------|----------|---------|--------------------------------------------------------------------------|
| `m`    | `true`   | string  | Method: a=append, p=prepend, b=before, af=after, r=replace.              |
| `h`    | `false`  | html    | HTML.                                                                    |
| `d`    | `false`  | data    | When there are child items, alternative data to process can be set here. |
| `p`    | `false`  | data    | Prefix for 'h'.                                                          |
| `s`    | `false`  | data    | Suffix for 'h'.                                                          |
| `l`    | `false`  | data    | Cache language scope.                                                    |
| `cid`  | `false`  | data    | Cache id.                                                                |
| `cs`   | `false`  | data    | Cache scope.                                                             |


## Example

```js
body->insert {
    m: 'a';
    h: '<section><b>append me</b></section>';
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
