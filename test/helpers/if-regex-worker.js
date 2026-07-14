'use strict';
const { render } = require('./engine.js');

const p = JSON.parse(process.argv[2]);

render('<body><p>x</p></body>', p.tss, { text: p.text })
  .then(() => { process.exitCode = 2; })
  .catch((e) => { process.exitCode = e.message === p.error ? 0 : 3; });
