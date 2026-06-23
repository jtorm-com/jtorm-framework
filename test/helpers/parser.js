'use strict';
const { jTormTSSParser } = require('../../src/parsers/tss-parser/src/tss-parser.js');
const { jTormDataParser } = require('../../src/parsers/data-parser/src/data-parser.js');

// NOTE: real DI/config is done by the external nodejs-jtorm-ui-engine; these
// defaults are an assumption to reconcile with the engine later.
function makeTssParser() {
  const p = jTormTSSParser;
  p.config({});                         // defaults: { } : ; ( ) , -> '
  p.tree = []; p.pairs = []; p.tss = ''; // isolate singleton state between tests
  return p;
}
function makeDataParser() {
  const tssParser = makeTssParser();
  const dp = jTormDataParser;
  dp.tssParser = tssParser;
  dp.init();
  return dp;
}
module.exports = { makeTssParser, makeDataParser };
