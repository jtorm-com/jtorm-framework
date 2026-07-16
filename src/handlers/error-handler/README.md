# jTorm Error Handler

Throws framework errors without inspecting or logging the view model by default. This keeps normal
SSR/SPA failures quiet and avoids exposing resolved data or document HTML to process logs.

## Install

```sh
npm install @jtorm/error-handler
```

## Debug dump

The exported singleton has a mutable `debug` flag that defaults to `false`. Only the literal boolean
`true` enables the historical diagnostic dump; non-HTML fields use the host-injected `util.inspect`
collaborator, while `html`, `h`, and `r` use their `html()` method.

```js
const util = require('node:util');
const { jTormErrorHandler } = require('@jtorm/error-handler');

jTormErrorHandler.util = util; // DI, needed only for debug dumps
jTormErrorHandler.debug = true;
```

Debug output can contain PII and the complete rendered document. Enable it only for protected,
temporary diagnostics and reset it to `false` between requests/tests. Hosts that enable it own the
resulting logs' access, retention, and erasure policy. `handle(message, view)` always throws
`new Error(message)`; the flag changes only the pre-throw dump.
