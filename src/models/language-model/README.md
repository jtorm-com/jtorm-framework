# jTorm Handler

Contains a handler for processing data, TSS and HTML.


## Install

```js
npm install @jtorm/handler
```


## Options

### Plugins

Before plugins triggers before data parsing, validation and method handler.
`jTormHandler.plugins.before = []`

After plugins triggers after the method handler.
`jTormHandler.plugins.after = []`


### Method alias

A shorthand version of the method name for minified TSS.
`jTormExampleMethod.alias = 'shortAlias'`


### Set TSS flag

For analysing and optimizing the final result TSS. It can be set in the handler method with the last parameter (`save`/shorthand `s`):
`async handle (HTML, TSS, data, createDoc, save)`

The result TSS will be saved here:
`jTormHandler.tss = {}`