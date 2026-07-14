# jTorm Document Model

HTML Document wrapper.

The wrapper retains the injected live document as `root`. URL-sensitive methods
use it to evaluate detached fragment nodes against the page URL and base they will
eventually join.

## Install
```js
npm install @jtorm/document-model
```


## Methods

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


### head

Get the head inner HTML of the document.


### body

Get the body inner HTML of the document.


### html

Get the complete HTML of the document.
