# jTorm TSS Parser

## Install

```js
npm install @jtorm/tss-parser
```

## Config

| Option                       | Type     | Default             | Description |
|------------------------------|----------|---------------------|-------------|
| `opening`                    | `string` | `'{'`               | Opening tag |
| `closing`                    | `string` | `'}'`               | Closing tag |
| `propertySeparator`          | `string` | `':'`               | Property seperator e.g. key:value/key=value/etc |
| `propertyEnd`                | `string` | `';'`               | Property ending tag |
| `propertyShorthandOpening`   | `string` | `'('`               | Property ending tag |
| `propertyShorthandClosing`   | `string` | `')'`               | Property ending tag |
| `propertyShorthandSeparator` | `string` | `','`               | Property ending tag |
| `methodSeparator`            | `string` | `'->'`              | Method seperator |
| `quotes`                     | `array`  | ``['"', "'", '`']`` | Used quotes in TSS |


## Example

```js
...
let config = {
  opening: '{',
  closing: '}',
  propertySeparator: ':',
  propertyEnd: ';',
  propertyShorthandOpening: '(',
  propertyShorthandClosing: ')',
  propertyShorthandSeparator: ',',
  methodSeparator: '->',
  quotes: ['"', "'", '`']
};
jTormTSSParser.config(config);

let tss = `
body {
  ->insert {
    m: 'a';
    ->get {
      h: 'template.html';
    }
  }
}
// or shorthand
body->insert(m:'a')->get {
  h: 'template.html';
}
`;

try {
  tss = jTormTSSParser.handle(tss);
  console.log(tss);
} catch (err) {
  console.trace(err);
}
```