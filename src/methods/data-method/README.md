# jTorm Data Method

Preset and manipulate data before the following method call.

## Install

```js
npm install @jtorm/data-method
```


## Properties

Any `key: value` is supported. It supports also an `or` statement, to see if a variable has been set or else use a default e.g. `tesKey: test || 'default'`.


## Example

```js
body->data(html: myHtmlVar || '<p>test</p>')->append {
    h: html;
}
```
