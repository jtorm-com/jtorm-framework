# jTorm Request Model

## Install
```js
npm install @jtorm/request-model
```


## How To

request: url, contentType, method=GET, charset=utf-8

```js
const request = require('@jtorm/request-model').jTormRequestModel;

request.base = 'https://cdn.example/';
request.allow = url => new URL(url).hostname === 'cdn.example';

const html = await request.get('/page.html').text();
```

`allow(url)` receives the resolved URL before the transport runs. By default, relative
URLs and URLs on `base`'s origin are allowed; other absolute URLs are blocked.
