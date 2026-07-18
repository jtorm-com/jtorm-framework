/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiManifestModel: {
        // DI
        // promiseCacheModel
        // renderContextModel
        // requestModel
        // digest(Uint8Array) -> Promise<Uint8Array>

        version: '1.0.0',
        c: new Map(),
        max: 32,
        ttl: 300000,
        maxText: 1048576,
        maxValues: 262144,
        maxDepth: 128,
        maxAssets: 8192,
        maxMetadata: 65536,

        plain: function (v) {
            if (!v || typeof v !== 'object' || Array.isArray(v))
                return false
            ;

            const p = Object.getPrototypeOf(v);
            return p === Object.prototype || p === null;
        },

        fields: function (v, a, r) {
            const k = Object.keys(v);

            if (k.some(function (n) { return !a.includes(n); })
                || r && r.some(function (n) { return !Object.prototype.hasOwnProperty.call(v, n); }))
                return false
            ;

            return true;
        },

        order: function (p) {
            if (p === 'manifest')
                return ['format', 'version', 'id', 'hash', 'config', 'assets', 'dynamic', 'mappers', 'sources']
            ;
            if (p === 'config')
                return ['default', 'framework', 'roots', 'uis', 'namespaces', 'methods', 'mediatargets', 'dynamicAllow', 'toolchain', 'limits']
            ;
            if (p === 'roots[]')
                return ['c', 'f', 't', 'h', 'm']
            ;
            if (p === 'uis[]')
                return ['id', 'alias', 'framework', 'url', 'mapperAlias']
            ;
            if (p === 'methods[]')
                return ['id', 'params']
            ;
            if (p === 'dynamic[]' || p === 'dynamicAllow[]')
                return ['from', 'at', 'param', 'type', 'binding', 'implicit']
            ;
            if (p === 'assets[]')
                return ['type', 'request', 'valueHash', 'value']
            ;
            if (p === 'mappers[]')
                return ['id', 'hash']
            ;
            if (p === 'sources[]')
                return ['id', 'hash', 'bytes']
            ;

            return null;
        },

        path: function (p, k) {
            if (p === 'value')
                return 'value'
            ;
            if (p === 'manifest')
                return k
            ;
            if (p === 'config' && ['roots', 'uis', 'methods', 'dynamicAllow'].includes(k))
                return k
            ;
            if (p === 'assets[]' && k === 'value')
                return 'value'
            ;
            if (p === 'uis[]' && k === 'mapperAlias')
                return 'value'
            ;
            if ((p === 'dynamic[]' || p === 'dynamicAllow[]') && k === 'binding')
                return 'value'
            ;

            return 'meta';
        },

        encode: function (v, p) {
            let a, k, o;

            if (v === null)
                return 'null'
            ;
            if (typeof v === 'string' || typeof v === 'boolean')
                return JSON.stringify(v)
            ;
            if (typeof v === 'number') {
                if (!Number.isFinite(v))
                    throw new Error('Manifest value invalid')
                ;
                return JSON.stringify(v);
            }
            if (Array.isArray(v)) {
                a = [];
                for (k = 0; k < v.length; k++)
                    a.push(this.encode(v[k], p === 'value' ? 'value' : p + '[]'))
                ;
                return '[' + a.join(',') + ']';
            }
            if (!this.plain(v))
                throw new Error('Manifest value invalid')
            ;

            a = Object.keys(v);
            o = this.order(p);
            if (o) {
                k = new Set(a);
                a = o.filter(function (n) { return k.has(n); });
                a = a.concat(Object.keys(v).filter(function (n) { return !o.includes(n); }).sort());
            } else if (p !== 'value')
                a.sort()
            ;

            return '{' + a.map((n) => JSON.stringify(n) + ':' + this.encode(v[n], this.path(p, n))).join(',') + '}';
        },

        serialize: function (v) {
            return this.encode(v, v && v.format === '@jtorm/ui-manifest' ? 'manifest' : 'value');
        },

        bytes: function (v) {
            return new TextEncoder().encode(this.serialize(v));
        },

        result: function (v) {
            let h = '';

            if (!(v instanceof Uint8Array) || v.length !== 32)
                throw new Error('Manifest digest invalid')
            ;

            for (const b of v)
                h += b.toString(16).padStart(2, '0')
            ;

            return 'sha256-' + h;
        },

        hashBytes: async function (v) {
            if (typeof this.digest !== 'function')
                throw new Error('Manifest digest adapter missing')
            ;
            if (!(v instanceof Uint8Array))
                throw new Error('Manifest digest input invalid')
            ;

            return this.result(await this.digest(v));
        },

        hash: async function (v) {
            return this.hashBytes(this.bytes(v));
        },

        metadata: function (v) {
            let n = v.config.roots.length + v.config.uis.length
                + v.config.namespaces.length + v.config.methods.length
                + (v.config.mediatargets || []).length
                + v.config.dynamicAllow.length + v.dynamic.length
                + v.mappers.length + v.sources.length
                + Object.keys(v.config.toolchain).length
                + Object.keys(v.config.limits || {}).length;

            for (const a of v.config.uis)
                if (this.plain(a) && this.plain(a.mapperAlias))
                    n += Object.keys(a.mapperAlias).length
                ;
            for (const a of v.config.methods)
                if (this.plain(a) && Array.isArray(a.params))
                    n += a.params.length
                ;
            for (const a of v.dynamic.concat(v.config.dynamicAllow))
                if (this.plain(a) && Array.isArray(a.binding))
                    n += a.binding.length
                ;

            return n;
        },

        root: function (c) {
            return this.renderContextModel.context(c);
        },

        descriptors: function (d) {
            if (!Array.isArray(d) || d.length > 32)
                throw new Error('Manifest descriptors invalid')
            ;

            const s = this;

            return d.map(function (v) {
                if (!s.plain(v)
                    || !s.fields(v, ['url', 'hash', 'mode'], ['url', 'hash', 'mode'])
                    || typeof v.url !== 'string' || !v.url
                    || !/^sha256-[0-9a-f]{64}$/.test(v.hash)
                    || (v.mode !== 'required' && v.mode !== 'optional'))
                    throw new Error('Manifest descriptor invalid')
                ;

                return { url: v.url, hash: v.hash, mode: v.mode };
            });
        },

        prepare: function (d, c) {
            const s = this;
            let a, k, r;

            try {
                a = s.descriptors(d);
                k = JSON.stringify(a);
                r = s.root(c);
                if (!r || typeof r !== 'object')
                    throw new Error('Manifest context invalid')
                ;
                if (!s.requestModel || typeof s.requestModel.get !== 'function'
                    || typeof s.requestModel.url !== 'function'
                    || typeof s.requestModel.allow !== 'function')
                    throw new Error('Manifest request model invalid')
                ;
                if (typeof s.digest !== 'function')
                    throw new Error('Manifest digest adapter missing')
                ;
            } catch (e) {
                return Promise.reject(e);
            }

            return (async function () {
                s.result(await s.digest(new Uint8Array()));

                const q = r.manifest;
                if (q && q.key === k && q.promise)
                    return q.promise
                ;

                const x = {
                    generation: (q && q.generation || 0) + 1,
                    index: q && q.index,
                    key: k,
                    promise: null
                };
                const p = s.install(a, c, r, x);
                x.promise = p;
                r.manifest = x;

                return p;
            })();
        },

        install: async function (d, c, r, x) {
            const s = this;
            let a, e, i;

            try {
                a = await Promise.allSettled(d.map(function (v) { return s.load(v, c); }));
                i = s.index(d, a);
                if (r.manifest !== x)
                    throw new Error('Manifest prepare superseded')
                ;
                x.index = i;
                return;
            } catch (v) {
                e = r.manifest !== x ? new Error('Manifest prepare superseded') : v;
                if (r.manifest === x) {
                    x.key = null;
                    x.promise = null;
                }
                throw e;
            }
        },

        cacheKey: function (d, c) {
            const q = this.requestModel && typeof this.requestModel.cacheKey === 'function'
                ? this.requestModel.cacheKey(d.url, c) : undefined;

            return q == null || q === '' ? undefined : JSON.stringify([q, d.hash]);
        },

        purge: function (d, c) {
            let q;

            try {
                if (!this.plain(d)
                    || !this.fields(d, ['url', 'hash', 'mode'], ['url', 'hash'])
                    || typeof d.url !== 'string' || !d.url
                    || !/^sha256-[0-9a-f]{64}$/.test(d.hash)
                    || d.mode !== undefined && d.mode !== 'required' && d.mode !== 'optional')
                    return 0
                ;
                q = this.cacheKey(d, c);
            } catch (e) {
                return 0;
            }

            return this.promiseCacheModel.purge(this, q);
        },

        purgeAll: function () {
            return this.promiseCacheModel.purgeAll(this);
        },

        load: function (d, c) {
            const s = this, q = s.cacheKey(d, c);
            return s.promiseCacheModel.get(s, q, {
                hit: async function () {
                    try {
                        await s.allowed(d.url, c);
                    } catch (e) {
                        const x = new Error(e && e.message || String(e));
                        x.acquisition = 1;
                        throw x;
                    }
                },
                load: function () {
                    return (async function () {
                        let t;

                        try {
                            t = await s.requestModel.get(d.url, c).text();
                        } catch (e) {
                            const x = new Error(e && e.message || String(e));
                            x.acquisition = 1;
                            throw x;
                        }

                        if (typeof t !== 'string' || t.length > s.maxText)
                            throw new Error('Manifest text invalid')
                        ;

                        try {
                            return await s.pack(JSON.parse(t), d.hash);
                        } catch (e) {
                            if (e instanceof SyntaxError)
                                throw new Error('Manifest JSON invalid')
                            ;
                            throw e;
                        }
                    })();
                }
            });
        },

        walk: function (v, d, n) {
            let k;

            if (d > this.maxDepth || ++n.v > this.maxValues)
                throw new Error('Manifest structure limit')
            ;
            if (Array.isArray(v)) {
                for (k = 0; k < v.length; k++)
                    this.walk(v[k], d + 1, n)
                ;
            } else if (v && typeof v === 'object') {
                if (!this.plain(v))
                    throw new Error('Manifest value invalid')
                ;
                for (k of Object.keys(v))
                    this.walk(v[k], d + 1, n)
                ;
            } else if (v !== null && typeof v !== 'string'
                && typeof v !== 'boolean'
                && (typeof v !== 'number' || !Number.isFinite(v)))
                throw new Error('Manifest value invalid')
            ;

            return n.v;
        },

        pack: async function (v, expected) {
            let a, h, k, m, p;
            const flag = function (n) {
                return n === undefined || typeof n === 'string'
                    || typeof n === 'number' && Number.isFinite(n);
            };
            const primitive = function (n) {
                return typeof n === 'string' || typeof n === 'boolean'
                    || typeof n === 'number' && Number.isFinite(n);
            };

            if (!this.plain(v)
                || !this.fields(
                    v,
                    ['format', 'version', 'id', 'hash', 'config', 'assets', 'dynamic', 'mappers', 'sources'],
                    ['format', 'version', 'id', 'hash', 'config', 'assets', 'dynamic', 'mappers', 'sources']
                )
                || v.format !== '@jtorm/ui-manifest'
                || v.version !== 1
                || typeof v.id !== 'string'
                || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(v.id)
                || !/^sha256-[0-9a-f]{64}$/.test(v.hash)
                || !this.plain(v.config)
                || !this.fields(
                    v.config,
                    ['default', 'framework', 'roots', 'uis', 'namespaces', 'methods', 'mediatargets', 'dynamicAllow', 'toolchain', 'limits'],
                    ['default', 'framework', 'roots', 'uis', 'namespaces', 'methods', 'dynamicAllow', 'toolchain']
                )
                || typeof v.config.default !== 'string'
                || typeof v.config.framework !== 'string'
                || !Array.isArray(v.config.roots)
                || !Array.isArray(v.config.uis)
                || !Array.isArray(v.config.namespaces)
                || !Array.isArray(v.config.methods)
                || v.config.mediatargets !== undefined
                    && (!Array.isArray(v.config.mediatargets)
                        || v.config.mediatargets.some(function (n) {
                            return typeof n !== 'string';
                        }))
                || !Array.isArray(v.config.dynamicAllow)
                || !this.plain(v.config.toolchain)
                || Object.keys(v.config.toolchain).some(function (n) {
                    return !primitive(v.config.toolchain[n]);
                })
                || v.config.limits !== undefined && !this.plain(v.config.limits)
                || v.config.limits !== undefined
                    && Object.keys(v.config.limits).some(function (n) {
                        return !Number.isSafeInteger(v.config.limits[n])
                            || v.config.limits[n] < 1;
                    })
                || !Array.isArray(v.assets)
                || !Array.isArray(v.dynamic)
                || !Array.isArray(v.mappers)
                || !Array.isArray(v.sources))
                throw new Error('Manifest schema invalid')
            ;
            if (v.hash !== expected)
                throw new Error('Manifest hash mismatch')
            ;
            if (v.assets.length > this.maxAssets
                || this.metadata(v) > this.maxMetadata)
                throw new Error('Manifest metadata limit')
            ;

            this.walk(v, 0, { v: 0 });
            p = {
                format: v.format,
                version: v.version,
                id: v.id,
                config: v.config,
                assets: v.assets,
                dynamic: v.dynamic,
                mappers: v.mappers,
                sources: v.sources
            };
            h = await this.hash(p);
            if (h !== v.hash)
                throw new Error('Manifest hash mismatch')
            ;

            for (a of v.config.roots)
                if (!this.plain(a)
                    || !this.fields(a, ['c', 'f', 't', 'h', 'm'], ['c', 'f'])
                    || typeof a.c !== 'string' || typeof a.f !== 'string'
                    || !flag(a.t) || !flag(a.h) || !flag(a.m))
                    throw new Error('Manifest schema invalid')
                ;
            for (a of v.config.uis)
                if (!this.plain(a)
                    || !this.fields(a, ['id', 'alias', 'framework', 'url', 'mapperAlias'], ['id', 'alias', 'framework'])
                    || typeof a.id !== 'string' || typeof a.alias !== 'string'
                    || typeof a.framework !== 'string'
                    || a.url !== undefined && typeof a.url !== 'string'
                    || a.mapperAlias !== undefined
                        && (!this.plain(a.mapperAlias)
                            || Object.keys(a.mapperAlias).some(function (n) {
                                return typeof a.mapperAlias[n] !== 'string';
                            })))
                    throw new Error('Manifest schema invalid')
                ;
            for (a of v.config.methods)
                if (!this.plain(a)
                    || !this.fields(a, ['id', 'params'], ['id', 'params'])
                    || typeof a.id !== 'string' || !Array.isArray(a.params)
                    || a.params.some(function (n) { return typeof n !== 'string'; }))
                    throw new Error('Manifest schema invalid')
                ;
            for (a of v.dynamic.concat(v.config.dynamicAllow))
                if (!this.plain(a)
                    || !this.fields(a, ['from', 'at', 'param', 'type', 'binding', 'implicit'],
                        ['from', 'at', 'param', 'type', 'binding', 'implicit'])
                    || typeof a.from !== 'string' || typeof a.at !== 'string'
                    || typeof a.param !== 'string' || typeof a.type !== 'string'
                    || typeof a.binding !== 'string'
                        && !(Array.isArray(a.binding)
                            && a.binding.every(function (n) {
                                return typeof n === 'string';
                            }))
                    || typeof a.implicit !== 'boolean')
                    throw new Error('Manifest schema invalid')
                ;
            for (a of v.mappers)
                if (!this.plain(a)
                    || !this.fields(a, ['id', 'hash'], ['id', 'hash'])
                    || typeof a.id !== 'string' || !/^sha256-[0-9a-f]{64}$/.test(a.hash))
                    throw new Error('Manifest schema invalid')
                ;
            for (a of v.sources)
                if (!this.plain(a)
                    || !this.fields(a, ['id', 'hash', 'bytes'], ['id', 'hash', 'bytes'])
                    || typeof a.id !== 'string' || !/^sha256-[0-9a-f]{64}$/.test(a.hash)
                    || !Number.isSafeInteger(a.bytes) || a.bytes < 0)
                    throw new Error('Manifest schema invalid')
                ;

            m = new Map();
            for (a of v.assets) {
                if (!this.plain(a)
                    || !this.fields(a, ['type', 'request', 'valueHash', 'value'],
                        ['type', 'request', 'valueHash', 'value'])
                    || !['data', 'html', 'tss'].includes(a.type)
                    || typeof a.request !== 'string'
                    || !/^sha256-[0-9a-f]{64}$/.test(a.valueHash))
                    throw new Error('Manifest asset invalid')
                ;
                if (a.type === 'html' && typeof a.value !== 'string'
                    || a.type === 'tss' && !Array.isArray(a.value))
                    throw new Error('Manifest asset invalid')
                ;
                if (await this.hash(a.value) !== a.valueHash)
                    throw new Error('Manifest value hash mismatch')
                ;
                k = JSON.stringify([a.type, a.request]);
                if (m.has(k))
                    throw new Error('Manifest asset duplicate ' + a.type + ' ' + a.request)
                ;
                m.set(k, { value: a.value, valueHash: a.valueHash });
            }

            for (a of v.config.namespaces)
                if (typeof a !== 'string')
                    throw new Error('Manifest namespace invalid')
                ;

            return { assets: m, namespaces: v.config.namespaces.slice() };
        },

        index: function (d, a) {
            const r = { assets: new Map(), required: [] };
            let e, k, p, v;

            for (let i = 0; i < a.length; i++) {
                if (a[i].status === 'rejected') {
                    e = a[i].reason;
                    if (d[i].mode === 'optional' && e && e.acquisition)
                        continue
                    ;
                    throw e;
                }

                p = a[i].value;
                if (d[i].mode === 'required')
                    r.required.push(p.namespaces)
                ;
                for ([k, v] of p.assets) {
                    if (r.assets.has(k)
                        && r.assets.get(k).valueHash !== v.valueHash)
                        throw new Error('Manifest asset conflict ' + k)
                    ;
                    if (!r.assets.has(k))
                        r.assets.set(k, v)
                    ;
                }
            }

            return r;
        },

        own: function (i, u) {
            for (const a of i.required)
                for (const n of a)
                    if (u.startsWith(n))
                        return true
                    ;
            return false;
        },

        allowed: async function (u, c) {
            const r = this.requestModel.url(u, c);

            if (!(await this.requestModel.allow(r, c)))
                throw new Error('URL blocked ' + r)
            ;
        },

        get: async function (t, u, c) {
            const r = this.root(c), i = r && r.manifest && r.manifest.index;
            let a, k, v;

            if (!i)
                return undefined
            ;

            if (t === 'tss' && Array.isArray(u)) {
                a = u.map(function (n) { return String(n); });
                if (a.some((n) => !i.assets.has(JSON.stringify([t, n])))) {
                    v = a.find((n) => !i.assets.has(JSON.stringify([t, n])) && this.own(i, n));
                    if (!v)
                        return undefined
                    ;
                    for (k of a)
                        await this.allowed(k, c)
                    ;
                    throw new Error('Manifest asset missing ' + t + ' ' + v);
                }

                v = [];
                for (k of a) {
                    await this.allowed(k, c);
                    v = v.concat(i.assets.get(JSON.stringify([t, k])).value);
                }
                return v;
            }

            u = String(u);
            k = JSON.stringify([t, u]);
            if (!i.assets.has(k)) {
                if (!this.own(i, u))
                    return undefined
                ;
                await this.allowed(u, c);
                throw new Error('Manifest asset missing ' + t + ' ' + u);
            }

            await this.allowed(u, c);
            return i.assets.get(k).value;
        }
    }
};
