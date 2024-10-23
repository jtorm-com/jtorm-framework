# jTorm CSS Method

Adds external CSS to the plugin collection to process.

## Install
```js
npm install @jtorm/css-method
```


## Properties

| Option           | Type      | Required |
|------------------|-----------|----------|
| `href`           | `string`  | `true`   |
| `crossorigin`    | `string`  | `false`  |
| `defer`          | `boolean` | `false`  |
| `hreflang`       | `string`  | `false`  |
| `media`          | `string`  | `false`  |
| `referrerpolicy` | `string`  | `false`  |
| `rel`            | `string`  | `false`  |
| `sizes`          | `string`  | `false`  |
| `title`          | `string`  | `false`  |
| `type`           | `string`  | `false`  |


## Example

```js
->css {
    href: 'https://cdn.example.com/test.css';
    rel: 'row';
    crossorigin: 'a';
    defer: '1';
}
```