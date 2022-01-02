# jTorm Swap Method

Replace a tag for an other tag.


## Install
```js
npm install @jtorm/swap-method
```


## Properties

| Option | Type       | Required | Description         |
|--------|------------|----------|---------------------|
| `s`    | `string`   | `true`   | CSS Selector of target element added through `ui`, or `h`, or as a fallback it will create an element based on the selector |
| `ui`   | `string`   | `false`  | UI component        |
| `h`    | `string`   | `false`  | HTML                |
| `a`    | `boolean`  | `false`  | Keep attributes     |


## Example

```js
h1->swap {
  s: 'h2';
  a: 1;
}
```

```js
h1->swap {
  s: 'h2';
  ui: 'typography.h2';
  a: 1;
}
```

```js
h1->swap {
  s: 'h2';
  h: '<h2 id="h2-1" class="h2"></h2>';
  a: 0;
  h2->attr {
    n: 'class';
    v: 'schema-name';
    m: 'a';
  }
}
```