# jTorm Data Parser

## Install

```js
npm install @jtorm/data-parser
```


## Options

Warning, changing the defaults will break UI libraries if not handled correctly. Best way to do this is through a before plugin setting the new options, and in an after plugin revert to the default options within the jTorm handler.


### Access current key in object or array

In some cases it can be desirable to just map the current key from an object or array.
`jTormDataParser.current = '@c';// Default '@c'`


### Append

Select a key with for example a part of it variable and a part static text.
`jTormDataParser.append = '+';// Default '+'`


### Object Separator

Target a specific key in an object or array.
`jTormDataParser.objectSeparator = '.';// Default '.'`


### Example

```js
...
var html = '<div id="content"></div>';
var data = {
  mainEntity: {
    CreativeWork: {
      '@type': 'CreativeWork',
      publisher: {
        Person: {
          '@type': 'Person',
          name: {Text: "John Doe"}
        }
      }
    }
  }
};
var tss = '#content->append( d: mainEntity.@c )->ui { c: @type + '.default'; }';// load UI component CreativeWork.default
```