# jTorm Time Method

## Install

```js
npm install @jtorm/time-method
```

## Config

| Option | Type       | Required | Description |
|--------|------------|----------|-------------|
| `as`   | `data`     | `true`   | Data key for mapping |
| `d`    | `Date`     | `true`   | Date |
| `dT`   | `DateTime` | `true`   | DataTime |

Note: Date OR DateTime is required


## Example

```js
body->insert {
  h: '<time></time>';
  m: 'a';
  time->time(as: 'html', dT: '2020-02-20 12:00:00') {
    ->append {
      h: html;
    }
    ->attrs {
      n: 'datetime,title';
      v: o,l;
    }
  }
}
// <time datetime="2020-02-20T00:00:00.000Z" title="Thu, 20 Feb 2020 00:00:00 GMT">2 months ago</time>
```