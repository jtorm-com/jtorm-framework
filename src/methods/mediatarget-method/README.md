# jTorm Mediatarget Method

## Install
```js
npm install @jtorm/mediatarget-method
```


## Properties

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `t`    | `string` | `true`   | Target.     |


## Example

```js
->mediatarget(t: 'mobile') {
  body->attr {
    n: 'class';
    v: 'mobile';
    m: 'a';
  }
}
->mt {
  t: 'desktop';

  body->attr {
    n: 'class';
    v: 'desktop';
    m: 'p';
  }
}
```