# jTorm Data Parser

## Install

```js
npm install @jtorm/data-parser
```


## Options

Warning, changing the defaults will break UI libraries if not handled correctly. Best way to do this is through a before plugin setting the new options, and in an after plugin revert to the default options within the jTorm handler.


## Compiled bindings

`compile(value)` converts binding syntax into a plain, model-free descriptor and
`evaluate(model, descriptor, omitUnresolved)` resolves it against the current model.
The existing `parse(model, value, omitUnresolved)` API remains a compatibility wrapper
over those two operations.

Framework binding paths cache descriptors on the parsed TSS node in `node.b`. The cache
is keyed by the effective parser grammar and an ordered shallow snapshot of the raw
declarations, so a reused AST compiles once while grammar changes, rewritten UI nodes,
and caller mutations invalidate safely. Raw `node.p` values are never replaced, and
model, DOM, request, function, and executable-regex values are never cached.


### Access current key in object or array

In some cases it can be desirable to just map the current key from an object or array.
`jTormDataParser.current = '@c';`


### Append

Select a key with for example a part of it variable and a part static text.
`jTormDataParser.append = '+';`


### Object Separator

Target a specific key in an object or array.
`jTormDataParser.objectSeparator = '.';`


### Example

```js
body->append->ui {
    c: typeVar + '.default';
}
```
