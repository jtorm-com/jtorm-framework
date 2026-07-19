'use strict';

const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { uisDiskPath } = require('./uis-disk-path.js');
const {
  jTormUiManifestCompiler: compiler
} = require('../../tooling/ui-manifest-compiler/src/ui-manifest-compiler.js');
const {
  jTormUiManifestModel: manifest
} = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
const {
  jTormUiResolverModel: resolver
} = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const {
  jTormTSSParser: tssParser
} = require('../../src/parsers/tss-parser/src/tss-parser.js');
const {
  jTormDataParser: dataParser
} = require('../../src/parsers/data-parser/src/data-parser.js');
const {
  jTormGetMethod: getMethod
} = require('../../src/methods/get-method/src/get-method.js');
const {
  jTormUiMethod: uiMethod
} = require('../../src/methods/ui-method/src/ui-method.js');
const {
  jTormSchemaUi: schemaUi
} = require('../../src/uis/schema-ui/src/schema-ui.js');
const {
  jTormComponentsUI: componentsUi
} = require('../../src/uis/components-ui/src/components-ui.js');
const {
  jTormHtmlUi: htmlUi
} = require('../../src/uis/html-ui/src/html-ui.js');

const PRODUCT_DYNAMIC = [
  ['@s/image-object/figure-default.tss', '/0', 'd', 'data', '@id'],
  ['@s/image-object/figure-default.tss', '/0/c/0/c/0/c/0/c/0/c/1/c/0/c/0', 'd', 'data', 'width.@id'],
  ['@s/image-object/figure-default.tss', '/0/c/0/c/0/c/0/c/0/c/1/c/0/c/0/c/0', 'd', 'data', 'height.@id'],
  ['@s/image-object/image-object-default.tss', '/0/c/0/c/0', 'd', 'data', '@id'],
  ['@s/image-object/image-object-default.tss', '/0/c/0/c/0/c/0', 'd', 'data', 'size.@id'],
  ['@s/image-object/image-object-default.tss', '/0/c/0/c/0/c/0/c/0', 'd', 'data', 'size.additionalProperty.@id'],
  ['@s/image-object/image-object-default.tss', '/0/c/0/c/0/c/0/c/0/c/0/c/0', 'd', 'data', 'width.@id'],
  ['@s/image-object/image-object-default.tss', '/0/c/0/c/0/c/0/c/0/c/0/c/0/c/0', 'd', 'data', 'height.@id'],
  ['@s/thing/thing-contents.tss', '/0/c/0/c/3/c/0/c/0/c/2/c/0/c/0/c/0', 'd', 'data', '@id'],
  ['@s/thing/thing-contents.tss', '/0/c/0/c/3/c/0/c/0/c/2/c/0/c/0/c/0/c/0/c/0/c/0', 'c', 'component', '@type']
].map(([from, at, param, type, binding]) => ({
  from,
  at,
  param,
  type,
  binding,
  implicit: false
}));

const FAQ_DYNAMIC = [];

async function productManifest() {
  const uis = [schemaUi, componentsUi, htmlUi];

  tssParser.config({});
  dataParser.tssParser = tssParser;
  dataParser.init();
  resolver.default = 'default';
  resolver.framework = 'schema';
  resolver.ui = { mapper: null };
  resolver.uis = uis;
  manifest.digest = async bytes => new Uint8Array(
    createHash('sha256').update(bytes).digest()
  );
  compiler.manifest = manifest;

  return compiler.compile({
    id: 'product',
    roots: [{ c: 'Product.default', f: 'self', t: 1, h: 1, m: 0 }],
    resolver,
    tssParser,
    dataParser,
    methods: { get: getMethod, ui: uiMethod },
    uis,
    source: {
      version: 'uis-disk-v1',
      read: async ({ type, request }) => {
        const filename = uisDiskPath(request);
        if (!filename) throw new Error('missing ' + type + ' ' + request);
        const raw = fs.readFileSync(filename);
        return { id: request, raw, text: raw.toString('utf8') };
      }
    },
    namespaces: ['@c/', '@h/', '@s/'],
    dynamicAllow: PRODUCT_DYNAMIC,
    toolchain: {
      resolver: '1.0.0',
      dataParser: '1.0.3',
      tssParser: '1.0.0'
    }
  });
}

async function faqManifest() {
  const uis = [schemaUi, componentsUi, htmlUi];

  tssParser.config({});
  dataParser.tssParser = tssParser;
  dataParser.init();
  resolver.default = 'default';
  resolver.framework = 'schema';
  resolver.ui = { mapper: null };
  resolver.uis = uis;
  manifest.digest = async bytes => new Uint8Array(
    createHash('sha256').update(bytes).digest()
  );
  compiler.manifest = manifest;

  return compiler.compile({
    id: 'faq',
    roots: [{ c: 'FAQPage.accordion', f: 'self', t: 1, h: 1, m: 0 }],
    resolver,
    tssParser,
    dataParser,
    methods: { get: getMethod, ui: uiMethod },
    uis,
    source: {
      version: 'uis-disk-v1',
      read: async ({ type, request }) => {
        const filename = uisDiskPath(request);
        if (!filename) throw new Error('missing ' + type + ' ' + request);
        const raw = fs.readFileSync(filename);
        return { id: request, raw, text: raw.toString('utf8') };
      }
    },
    namespaces: ['@c/', '@h/', '@s/'],
    dynamicAllow: FAQ_DYNAMIC,
    toolchain: {
      resolver: '1.0.0',
      dataParser: '1.0.3',
      tssParser: '1.0.0'
    }
  });
}

module.exports = { FAQ_DYNAMIC, PRODUCT_DYNAMIC, faqManifest, productManifest };
