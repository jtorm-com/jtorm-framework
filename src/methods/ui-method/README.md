# jTorm UI Method

Registry and handling different UI frameworks.

## Install
```js
npm install @jtorm/ui-method
```


## Properties

| Option | Type      | Required | Description                                                                                     |
|--------|-----------|----------|-------------------------------------------------------------------------------------------------|
| `c`    | `string`  | `true`   | Component registered by an UI package.                                                          |
| `f`    | `string`  | `false`  | Registered framework, fallback `default` if set, else first key/value in object.                |
| `t`    | `boolean` | `false`  | Use component TSS.                                                                              |
| `h`    | `boolean` | `false`  | Use component HTML.                                                                             |
| `m`    | `boolean` | `false`  | Use mediatarget check if suffixes exists registered by it e.g. defaultDesktopL, defaultTabletS. |


Use mediatarget does not work for the fallback to default, you have to explicit define it, e.g. WPHeader > WPHeader.default.


## Example

```js
body->append->ui {
    c: '@e.header';
}
```
