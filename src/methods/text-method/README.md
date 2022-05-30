# jTorm Text Method

Add text with multilangual abilities. It looks in the context.session object for a language setting, if not found then it looks in the config for the language setting. As a fallback it uses english (en). Language can be set in the c attribute for example:
`jTormTextMethod.data.nl = {"Example title": "Voorbeeld titel", etc.}`


## Install

```js
npm install @jtorm/text-method
```


## Example

Alias = `t`

```js
body->insert {
  h: '<p></p>';
  m: 'a';
  p->text(sampleText: 'Example title')->append {
    h: sampleText;
  }
}
```