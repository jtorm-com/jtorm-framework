'use strict';
const path = require('node:path');

const UIS_DIR = path.join(__dirname, '..', '..', 'src', 'uis');
const UIS_PKG = { s: 'schema-ui', c: 'components-ui', h: 'html-ui' };
// html-ui nests element groups behind sub-aliases (`@e` -> element, ...). parseUrl
// would expand these via mapperAlias, but parseUrl is css/js-asset-only and never runs
// on the get fetch path, so the raw `@h/@e/...` reaches the transport; expand it here.
const UIS_SUBALIAS = { d: 'doc', e: 'element', f: 'form', t: 'typography', tb: 'table', m: 'media' };

/** Resolve a `@s/@c/@h` component-artifact URL to its real src/uis/** disk path (or null). */
function uisDiskPath(u) {
    const m = /^@([a-z]+)\/(.*)$/.exec(u);
    if (!m || !UIS_PKG[m[1]]) return null;
    const rest = m[2].replace(/^@([a-z]+)\//, (_s, a) => (UIS_SUBALIAS[a] || a) + '/');
    return path.join(UIS_DIR, UIS_PKG[m[1]], 'src', rest);
}

module.exports = { UIS_DIR, uisDiskPath };
