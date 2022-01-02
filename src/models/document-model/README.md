# Universal document wrapper used in jTorm

Universal document wrapper used in jTorm in combination with for example Node.js, RequireJS, CommonJS, Vanilla JS / plain javascript.
Promise based XHR/XMLHttpRequests with [axios](https://github.com/axios/axios) for the browser and Node.js

Todo

## Features

☑ GET method cache with header Cache-Control: max-age=<seconds>


## Install
```js
npm install jtorm-com/jtorm-document
```


### context.config.createDoc flag

Supports manipulation on the current DOM (works only in browsers) or create a virtual DOM.


## Config

html = If HTML is not empty the document will overwrite the current HTML.
config = Object

| Option           | Type      | Description |
|------------------|-----------|-------------|
| `window`         | `object`  | Valid window object, for example a web browser window or jsdom object |
| `path`           | `any`     | User defined function or URL, used to, but not limited to, generate an URL for xhr requests. If an object with method responseText is returned then the method will return that object |
| `createDocument` | `boolean` | Use current window document or create a new HTML document. For example an each method will use create new document to generate the child HTML and place the result in the parent document |


### Example Node.js, CommonJS

```js
const {jTormDocument} = require('jtorm-document');
const {window} = require('jtorm-window');

let config = {
  window: window,
  path: function (uri, method) {
    return new Promise(async function (resolve, reject) {
      return resolve('http://localhost:3000/' + uri);
    });
  },
  createDocument: false
};

let html = `
<html>
  <head>
    <title>Title</title>
  </head>
  <body>
    <header>
      <h1>Header</h1>
    </header>
    <main>
      <p>Contents</p>
    </main>
    <footer><small>Footer</small></footer>
  </body>
</html>
`;

var newDocument = new jTormDocument(html, config);
```

### Example Vanilla JS / plain Javascript
```js
let config = {
  window: window,
  path: false,
  createDocument: false
};

let html = `
<html>
  <head>
    <title>Title</title>
  </head>
  <body>
    <header>
      <h1>Header</h1>
    </header>
    <main>
      <p>Contents</p>
    </main>
    <footer><small>Footer</small></footer>
  </body>
</html>
`;

new window.jTormDocument(html, config);
```


## Methods

### xhr

Make a xhr (XMLHttpRequest) request with GET request cache support. Check out the [axios config](https://github.com/axios/axios#request-config) object parameter.


### select

Select an element by CSS selector.

| Option     | Type     | Description  |
|------------|----------|--------------|
| `selector` | `string` | CSS selector |

### selectAll

Select all elements by CSS selector.

| Option     | Type     | Description  |
|------------|----------|--------------|
| `selector` | `string` | CSS selector |

### set

Select an element with the select method, and if element exists, process the callback.

| Option     | Type       | Description  |
|------------|------------|--------------|
| `selector` | `string`   | CSS selector |
| `fn`       | `function` | Callback function with the element as a parameter |

### body

Get the body inner HTML of the document.

### html

Get the complete HTML of the document.