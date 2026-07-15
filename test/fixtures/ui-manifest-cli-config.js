'use strict';

const {
  jTormUiResolverModel: resolver
} = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const {
  jTormTSSParser: tssParser
} = require('../../src/parsers/tss-parser/src/tss-parser.js');
const {
  jTormDataParser: dataParser
} = require('../../src/parsers/data-parser/src/data-parser.js');

const UI = {
  id: 'test/cli-ui',
  alias: '@x',
  framework: 'schema',
  mapper: {
    Root: {
      default: { h: '/root.html' }
    }
  }
};

tssParser.config({});
dataParser.tssParser = tssParser;
dataParser.init();
resolver.default = 'default';
resolver.framework = 'schema';
resolver.ui = { mapper: null };
resolver.uis = [UI];

function config(id) {
  return {
    id,
    roots: [{ c: 'Root.default', f: 'self', t: 1, h: 1, m: 0 }],
    resolver,
    tssParser,
    dataParser,
    methods: {
      get: { params: ['h', 't', 'd', 'a'] },
      ui: { params: ['f', 'c', 't', 'h', 'm'] }
    },
    uis: [UI],
    source: {
      version: 'cli-fixture-v1',
      read: async ({ type, request }) => {
        if (type !== 'html' || request !== '/root.html')
          throw new Error('missing ' + type + ' ' + request)
        ;
        const raw = Buffer.from('<main></main>');
        return { id: request, raw, text: raw.toString('utf8') };
      }
    },
    namespaces: ['/'],
    dynamicAllow: [],
    toolchain: {
      resolver: '1.0.0',
      dataParser: '1.0.3',
      tssParser: '1.0.0'
    }
  };
}

module.exports = [config('cli-one'), config('cli-two')];
