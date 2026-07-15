/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const write = require('./ui-manifest-writer.js');
const measure = require('./ui-manifest-value.js');

module.exports = {
    jTormUiManifestCompiler: {
        // DI
        // manifest

        active: new Set(),
        version: '1.0.0',
        defaults: {
            roots: 256,
            vertices: 16384,
            edges: 65536,
            graphDepth: 128,
            assets: 8192,
            dynamic: 8192,
            rawBytes: 4194304,
            text: 1048576,
            values: 262144,
            valueDepth: 128,
            output: 1048576
        },

        plain: function (v) {
            if (!v || typeof v !== 'object' || Array.isArray(v))
                return false
            ;

            const p = Object.getPrototypeOf(v);
            return p === Object.prototype || p === null;
        },

        fields: function (v, a, r) {
            const k = Object.keys(v);

            return !k.some(function (n) { return !a.includes(n); })
                && !r.some(function (n) { return !Object.prototype.hasOwnProperty.call(v, n); })
            ;
        },

        config: function (c) {
            const s = this;
            let l;

            if (!s.plain(c)
                || !s.fields(c, [
                    'id', 'roots', 'resolver', 'tssParser', 'dataParser', 'methods',
                    'uis', 'source', 'namespaces', 'dynamicAllow', 'toolchain',
                    'extraRoots', 'mediatargets', 'limits'
                ], [
                    'id', 'roots', 'resolver', 'tssParser', 'dataParser', 'methods',
                    'uis', 'source', 'namespaces', 'dynamicAllow', 'toolchain'
                ])
                || typeof c.id !== 'string'
                || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(c.id)
                || !Array.isArray(c.roots)
                || c.extraRoots !== undefined && !Array.isArray(c.extraRoots)
                || c.mediatargets !== undefined
                    && (!Array.isArray(c.mediatargets)
                        || c.mediatargets.some(function (n) {
                            return typeof n !== 'string';
                        }))
                || !c.resolver || typeof c.resolver.init !== 'function'
                || typeof c.resolver.parseComponent !== 'function'
                || typeof c.resolver.getComponent !== 'function'
                || typeof c.resolver.default !== 'string'
                || typeof c.resolver.framework !== 'string'
                || !Array.isArray(c.resolver.uis)
                || !c.tssParser || typeof c.tssParser.handle !== 'function'
                || !c.dataParser || typeof c.dataParser.compile !== 'function'
                || !c.methods || !c.methods.get || !Array.isArray(c.methods.get.params)
                || c.methods.get.params.some(function (n) { return typeof n !== 'string'; })
                || !c.methods.ui || !Array.isArray(c.methods.ui.params)
                || c.methods.ui.params.some(function (n) { return typeof n !== 'string'; })
                || !Array.isArray(c.uis)
                || c.uis.length !== c.resolver.uis.length
                || c.uis.some(function (ui, i) {
                    return ui !== c.resolver.uis[i] || !s.plain(ui)
                        || !s.fields(ui,
                            ['id', 'alias', 'framework', 'url', 'mapperAlias', 'mapper'],
                            ['id', 'alias', 'framework', 'mapper'])
                        || typeof ui.id !== 'string' || typeof ui.alias !== 'string'
                        || typeof ui.framework !== 'string'
                        || ui.url !== undefined && typeof ui.url !== 'string'
                        || ui.mapperAlias !== undefined
                            && (!s.plain(ui.mapperAlias)
                                || Object.keys(ui.mapperAlias).some(function (n) {
                                    return typeof ui.mapperAlias[n] !== 'string';
                                }))
                        || !s.plain(ui.mapper);
                })
                || !c.source || typeof c.source.version !== 'string'
                || typeof c.source.read !== 'function'
                || !Array.isArray(c.namespaces)
                || c.namespaces.some(function (n) { return typeof n !== 'string'; })
                || !Array.isArray(c.dynamicAllow)
                || !s.plain(c.toolchain)
                || Object.keys(c.toolchain).some(function (n) {
                    const v = c.toolchain[n];
                    return typeof v !== 'string' && typeof v !== 'boolean'
                        && (typeof v !== 'number' || !Number.isFinite(v));
                })
                || ['compiler', 'manifestModel', 'sourceAdapter'].some(function (n) {
                    return Object.prototype.hasOwnProperty.call(c.toolchain, n);
                })
                || c.limits !== undefined && !s.plain(c.limits)
                || c.limits !== undefined && Object.keys(c.limits).some(function (n) {
                    return !Object.prototype.hasOwnProperty.call(s.defaults, n);
                })
                || !s.manifest || typeof s.manifest.serialize !== 'function'
                || typeof s.manifest.version !== 'string'
                || typeof s.manifest.hash !== 'function'
                || typeof s.manifest.hashBytes !== 'function'
                || typeof s.manifest.pack !== 'function')
                throw new Error('Manifest compiler config invalid')
            ;
            if (!c.tssParser.regexes || !c.dataParser.appendRegex || !c.dataParser.dataRegex)
                throw new Error('Manifest compiler collaborators not initialized')
            ;

            l = {...s.defaults, ...(c.limits || {})};
            for (const k of Object.keys(l))
                if (!Number.isSafeInteger(l[k]) || l[k] < 1)
                    throw new Error('Manifest compiler limit invalid ' + k)
                ;
            if (c.roots.length + (c.extraRoots && c.extraRoots.length || 0) > l.roots)
                throw new Error('Manifest compiler root limit')
            ;
            if (c.dynamicAllow.length > l.dynamic)
                throw new Error('Manifest compiler dynamic limit')
            ;
            try {
                for (const v of c.roots.concat(c.extraRoots || []))
                    s.state(v)
                ;
                for (const v of c.dynamicAllow)
                    s.diagnostic(v)
                ;
            } catch (e) {
                throw new Error('Manifest compiler config invalid');
            }

            return {
                ...c,
                extraRoots: c.extraRoots || [],
                mediatargets: c.mediatargets || [],
                limits: l
            };
        },

        collaborators: function (c) {
            return [c.resolver, c.tssParser, c.dataParser];
        },

        lock: function (c) {
            const a = this.collaborators(c);

            if (a.some((v) => this.active.has(v)))
                throw new Error('Manifest compiler collaborators busy')
            ;
            for (const v of a)
                this.active.add(v)
            ;
        },

        unlock: function (c) {
            for (const v of this.collaborators(c))
                this.active.delete(v)
            ;
        },

        snapshot: function (c) {
            const r = {};
            let k;

            r.resolver = { cache: c.resolver.cache, regexp: c.resolver.regexp };
            r.tss = {
                tree: c.tssParser.tree,
                pairs: c.tssParser.pairs,
                tss: c.tssParser.tss,
                last: {}
            };
            for (k of Object.keys(c.tssParser.regexes || {}))
                r.tss.last[k] = c.tssParser.regexes[k].lastIndex
            ;
            r.data = {
                append: c.dataParser.appendRegex.lastIndex,
                data: c.dataParser.dataRegex.lastIndex
            };

            return r;
        },

        restore: function (c, r) {
            let k;

            c.resolver.cache = r.resolver.cache;
            c.resolver.regexp = r.resolver.regexp;
            c.tssParser.tree = r.tss.tree;
            c.tssParser.pairs = r.tss.pairs;
            c.tssParser.tss = r.tss.tss;
            for (k of Object.keys(r.tss.last))
                c.tssParser.regexes[k].lastIndex = r.tss.last[k]
            ;
            c.dataParser.appendRegex.lastIndex = r.data.append;
            c.dataParser.dataRegex.lastIndex = r.data.data;
        },

        compile: async function (input) {
            const c = this.config(input);
            const r = this.snapshot(c);

            this.lock(c);
            try {
                await c.resolver.init();
                return await this.build(c);
            } finally {
                try {
                    this.restore(c, r);
                } finally {
                    this.unlock(c);
                }
            }
        },

        build: async function (c) {
            const x = {
                c,
                assets: new Map(),
                assetStack: [],
                dynamic: [],
                mapper: new Map(),
                sources: new Map(),
                graph: new Map(),
                edges: 0
            };
            const roots = c.roots.concat(c.extraRoots).map((v) => this.state(v));

            for (const r of roots)
                await this.component(r, x, [])
            ;

            this.policy(x);

            const assets = Array.from(x.assets.values()).sort(function (a, b) {
                return a.type.localeCompare(b.type) || a.request.localeCompare(b.request);
            });
            const dynamic = x.dynamic.sort((a, b) =>
                this.manifest.serialize(a).localeCompare(this.manifest.serialize(b))
            );
            const mappers = [];
            for (const [id, branches] of Array.from(x.mapper).sort(function (a, b) {
                return a[0].localeCompare(b[0]);
            })) {
                const value = Array.from(branches.values()).sort(function (a, b) {
                    return a.key.localeCompare(b.key);
                });
                this.measure(value, c.limits, 0, {v: 0});
                mappers.push({ id, hash: await this.manifest.hash(value) });
            }
            const sources = Array.from(x.sources.values()).sort(function (a, b) {
                return a.id.localeCompare(b.id);
            });
            const methods = ['get', 'ui'].map(function (id) {
                return { id, params: c.methods[id].params.slice() };
            }).sort(function (a, b) { return a.id.localeCompare(b.id); });
            const uis = c.uis.map(function (ui) {
                const v = { id: ui.id, alias: ui.alias, framework: ui.framework };
                if (ui.mapperAlias !== undefined) v.mapperAlias = {...ui.mapperAlias};
                return v;
            });
            const allow = c.dynamicAllow.map((v) => this.diagnostic(v))
                .sort((a, b) => this.manifest.serialize(a).localeCompare(this.manifest.serialize(b)));
            const toolchain = {
                ...c.toolchain,
                compiler: this.version,
                manifestModel: this.manifest.version,
                sourceAdapter: c.source.version
            };
            const config = {
                default: c.resolver.default,
                framework: c.resolver.framework,
                roots,
                uis,
                namespaces: Array.from(new Set(c.namespaces)).sort(),
                methods
            };
            if (c.mediatargets.length)
                config.mediatargets = c.mediatargets.slice()
            ;
            config.dynamicAllow = allow;
            config.toolchain = toolchain;
            config.limits = {...c.limits};

            const payload = {
                format: '@jtorm/ui-manifest',
                version: 1,
                id: c.id,
                config,
                assets,
                dynamic,
                mappers,
                sources
            };
            const hash = await this.manifest.hash(payload);
            const manifest = {
                format: payload.format,
                version: payload.version,
                id: payload.id,
                hash,
                config: payload.config,
                assets: payload.assets,
                dynamic: payload.dynamic,
                mappers: payload.mappers,
                sources: payload.sources
            };
            await this.manifest.pack(manifest, hash);
            const json = this.manifest.serialize(manifest);
            if (json.length > c.limits.output)
                throw new Error('Manifest compiler output limit')
            ;

            return {
                manifest,
                json,
                hash,
                filename: c.id + '.' + hash + '.json'
            };
        },

        state: function (v) {
            if (!this.plain(v)
                || !this.fields(v, ['c', 'f', 't', 'h', 'm'], ['c'])
                || typeof v.c !== 'string' || !v.c
                || v.f !== undefined && typeof v.f !== 'string'
                || ['t', 'h', 'm'].some(function (n) {
                    return v[n] !== undefined
                        && typeof v[n] !== 'string' && typeof v[n] !== 'number';
                }))
                throw new Error('Manifest root invalid')
            ;

            const r = {
                c: v.c,
                f: v.f || 'self',
                t: v.t === undefined ? 1 : parseInt(v.t),
                h: v.h === undefined ? 1 : parseInt(v.h),
                m: v.m === undefined ? 0 : parseInt(v.m)
            };

            if ([r.t, r.h, r.m].some(Number.isNaN))
                throw new Error('Manifest root invalid')
            ;

            return r;
        },

        component: async function (v, x, stack, o) {
            const c = x.c;
            let b, d, id, k, next, r, ui;

            v = this.state(v);
            v.c = c.resolver.parseComponent(v.c);
            k = JSON.stringify([v.c, v.f, v.t, v.h, v.m]);
            next = stack.concat(k);
            if (stack.includes(k))
                throw new Error('Manifest component cycle ' + next.join(' -> '))
            ;
            if (++x.edges > c.limits.edges)
                throw new Error('Manifest compiler edge limit')
            ;
            if (stack.length >= c.limits.graphDepth)
                throw new Error('Manifest compiler graph depth')
            ;
            if (x.graph.get(k) === 2)
                return 1
            ;
            if (!x.graph.has(k) && x.graph.size >= c.limits.vertices)
                throw new Error('Manifest compiler vertex limit')
            ;

            x.graph.set(k, 1);
            r = await c.resolver.getComponent(v.c, v.f);
            if (!r || !r.c) {
                if (o) {
                    x.graph.delete(k);
                    return 0;
                }
                throw new Error('Manifest component missing ' + v.c + ' ' + v.f);
            }
            d = r.c;
            ui = r.ui || {};
            id = ui.id || 'custom';
            if (!x.mapper.has(id))
                x.mapper.set(id, new Map())
            ;
            b = {
                key: k,
                component: v.c,
                framework: r.f,
                descriptor: d
            };
            this.measure([b], c.limits, 0, {v: 0});
            x.mapper.get(id).set(k, b);

            if (v.h)
                await this.artifacts('html', d.h, x, next)
            ;
            if (v.t)
                await this.artifacts('tss', d.t, x, next)
            ;
            await this.artifacts('data', d.d, x, next);

            if (d.ui)
                await this.ui(d.ui, x, next)
            ;
            if (d.pT)
                await this.scan(Array.isArray(d.pT) ? d.pT : [d.pT],
                    'mapper:' + id + ':' + v.c, '/pT', x, next)
            ;

            if (v.m)
                for (const m of c.mediatargets)
                    await this.component({...v, c: v.c + m, m: 0}, x, next)
                ;

            x.graph.set(k, 2);
            return 1;
        },

        artifacts: async function (type, value, x, stack) {
            let a = value, all = [[]], next;

            if (a === undefined || a === null || a === false)
                return
            ;
            if (!Array.isArray(a))
                a = [a]
            ;

            a = a.map(function (v) {
                if (v && typeof v === 'object') {
                    if (typeof v.url !== 'string')
                        throw new Error('Manifest artifact invalid')
                    ;
                    return {
                        url: v.url,
                        guarded: !!(v.di && v.di.m && Object.keys(v.di.m).length)
                    };
                }
                if (typeof v !== 'string')
                    throw new Error('Manifest artifact invalid')
                ;

                return { url: v, guarded: false };
            });

            if (type === 'tss') {
                for (const v of a)
                    await this.asset(type, v.url, x, stack)
                ;
                return;
            }

            for (const v of a) {
                if (v.guarded) {
                    next = [];
                    for (const q of all) {
                        next.push(q);
                        next.push(q.concat(v.url));
                    }
                    if (next.length > x.c.limits.assets + 1)
                        throw new Error('Manifest compiler asset limit')
                    ;
                    all = next;
                } else
                    for (const q of all)
                        q.push(v.url)
                    ;
            }

            for (const q of all)
                if (q.length)
                    await this.asset(type, String(q), x, stack)
                ;
        },

        asset: async function (type, request, x, stack) {
            const c = x.c, key = JSON.stringify([type, request]);
            let r, rawHash, value, valueHash;

            if (x.assetStack.includes(key))
                throw new Error('Manifest source cycle ' + x.assetStack.concat(key).join(' -> '))
            ;
            if (x.assets.has(key))
                return
            ;
            if (x.assets.size >= c.limits.assets)
                throw new Error('Manifest compiler asset limit')
            ;

            x.assetStack.push(key);
            try {
                try {
                    r = await c.source.read({ type, request });
                } catch (e) {
                    throw new Error('Manifest source rejected ' + type + ' ' + request + ': '
                        + (e && e.message || String(e)));
                }
                if (!r || typeof r.id !== 'string'
                    || !(r.raw instanceof Uint8Array)
                    || typeof r.text !== 'string')
                    throw new Error('Manifest source invalid ' + type + ' ' + request)
                ;
                if (r.raw.byteLength > c.limits.rawBytes || r.text.length > c.limits.text)
                    throw new Error('Manifest source limit ' + type + ' ' + request)
                ;

                rawHash = await this.manifest.hashBytes(r.raw);
                if (x.sources.has(r.id)) {
                    const q = x.sources.get(r.id);
                    if (q.hash !== rawHash || q.bytes !== r.raw.byteLength)
                        throw new Error('Manifest source identity conflict ' + r.id)
                    ;
                } else
                    x.sources.set(r.id, { id: r.id, hash: rawHash, bytes: r.raw.byteLength })
                ;

                if (type === 'tss') {
                    value = c.tssParser.handle(r.text);
                    if (!Array.isArray(value))
                        throw new Error('Manifest parsed TSS invalid ' + request)
                    ;
                } else if (type === 'data') {
                    try {
                        value = JSON.parse(r.text);
                    } catch (e) {
                        throw new Error('Manifest parsed data invalid ' + request)
                        ;
                    }
                } else
                    value = r.text
                ;

                this.measure(value, c.limits, 0, {v: 0});
                valueHash = await this.manifest.hash(value);
                x.assets.set(key, { type, request, valueHash, value });

                if (type === 'tss')
                    await this.scan(value, request, '', x, stack || [])
                ;
            } finally {
                x.assetStack.pop();
            }
        },

        measure: function (v, l, d, n) {
            return measure(v, l, d, n);
        },

        scan: async function (nodes, from, base, x, stack) {
            if (!Array.isArray(nodes))
                throw new Error('Manifest parsed TSS invalid ' + from)
            ;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i], at = base + '/' + i;

                if (!n || typeof n !== 'object'
                    || !n.p || typeof n.p !== 'object' || Array.isArray(n.p)
                    || !Array.isArray(n.c))
                    throw new Error('Manifest parsed TSS invalid ' + from + at)
                ;

                if (n.m === 'get')
                    await this.getNode(n, from, at, x, stack)
                ; else if (n.m === 'ui')
                    await this.uiNode(n, from, at, x, stack)
                ;

                await this.scan(n.c, from, at + '/c', x, stack);
            }
        },

        params: function (n, method, c) {
            const p = {...n.p}, implicit = !Object.keys(p).length && !n.c.length;
            const a = c.methods[method].params;

            if (implicit)
                for (const k of a)
                    p[k] = k
                ;

            return { p, implicit };
        },

        binding: function (raw, c) {
            const compile = function (v) {
                const b = c.dataParser.compile(v);
                if (!b || typeof b !== 'object' || typeof b.t !== 'string')
                    throw new Error('Manifest binding invalid')
                ;
                return b;
            };
            const b = Array.isArray(raw) ? raw.map(compile) : compile(raw);
            const dynamic = this.hasPath(b);

            return {
                dynamic,
                value: dynamic ? undefined : Array.isArray(b)
                    ? b.map((v) => this.literal(v))
                    : this.literal(b)
            };
        },

        hasPath: function (b) {
            if (Array.isArray(b))
                return b.some((v) => this.hasPath(v))
            ;
            if (!b || typeof b !== 'object')
                return false
            ;
            if (b.t === 'p')
                return !b.n
            ;
            return Array.isArray(b.v) && b.v.some((v) => this.hasPath(v));
        },

        literal: function (b) {
            let r = '', v;

            if (b.t === 'v')
                return b.v
            ;
            if (b.t === 'p' && b.n)
                return b.v[0]
            ;
            if (b.t !== 'a')
                throw new Error('Manifest binding dynamic')
            ;
            for (const p of b.v) {
                v = this.literal(p);
                if (v)
                    r += v
                ;
            }

            return r;
        },

        addDynamic: function (from, at, param, type, raw, implicit, x) {
            if (x.dynamic.length >= x.c.limits.dynamic)
                throw new Error('Manifest compiler dynamic limit')
            ;

            x.dynamic.push(this.diagnostic({
                from,
                at,
                param,
                type,
                binding: Array.isArray(raw) ? raw.slice() : raw,
                implicit
            }));
        },

        diagnostic: function (v) {
            if (!v || typeof v !== 'object'
                || !this.fields(v,
                    ['from', 'at', 'param', 'type', 'binding', 'implicit'],
                    ['from', 'at', 'param', 'type', 'binding', 'implicit'])
                || typeof v.from !== 'string' || typeof v.at !== 'string'
                || typeof v.param !== 'string' || typeof v.type !== 'string'
                || typeof v.implicit !== 'boolean'
                || typeof v.binding !== 'string'
                    && !(Array.isArray(v.binding)
                        && v.binding.every(function (n) { return typeof n === 'string'; })))
                throw new Error('Manifest dynamic policy invalid')
            ;

            return {
                from: v.from,
                at: v.at,
                param: v.param,
                type: v.type,
                binding: Array.isArray(v.binding) ? v.binding.slice() : v.binding,
                implicit: v.implicit
            };
        },

        getNode: async function (n, from, at, x, stack) {
            const q = this.params(n, 'get', x.c);
            const types = { h: 'html', t: 'tss', d: 'data' };

            for (const p of x.c.methods.get.params) {
                if (!types[p] || q.p[p] === undefined)
                    continue
                ;

                const b = this.binding(q.p[p], x.c);
                if (b.dynamic)
                    this.addDynamic(from, at, p, types[p], q.p[p], q.implicit, x)
                ; else if (!Array.isArray(b.value) && !b.value)
                    continue
                ; else if (types[p] === 'tss' && Array.isArray(b.value))
                    for (const v of b.value)
                        await this.asset(types[p], String(v), x, stack)
                    ;
                else
                    await this.asset(types[p], String(b.value), x, stack)
                ;
            }
        },

        uiNode: async function (n, from, at, x, stack) {
            const q = this.params(n, 'ui', x.c), v = {}, dynamic = {};

            for (const p of x.c.methods.ui.params) {
                if (!['c', 'f', 't', 'h', 'm'].includes(p) || q.p[p] === undefined)
                    continue
                ;
                const b = this.binding(q.p[p], x.c);
                if (b.dynamic) {
                    dynamic[p] = 1;
                    this.addDynamic(from, at, p, 'component', q.p[p], q.implicit, x);
                } else
                    v[p] = b.value
                ;
            }

            await this.ui(v, x, stack, dynamic);
        },

        ui: async function (v, x, stack, dynamic) {
            let found = 0;

            dynamic = dynamic || {};
            if (dynamic.c || !v.c)
                return
            ;

            const fs = dynamic.f
                ? Array.from(new Set(['self', x.c.resolver.framework]
                    .concat(x.c.uis.map(function (ui) { return ui.framework; }))
                    .concat(x.c.uis.map(function (ui) { return ui.alias; }))))
                : [v.f === undefined ? 'self' : String(v.f)];
            const ts = dynamic.t ? [0, 1] : [v.t === undefined ? 1 : +v.t];
            const hs = dynamic.h ? [0, 1] : [v.h === undefined ? 1 : +v.h];
            const ms = dynamic.m ? [0, 1] : [v.m === undefined ? 0 : +v.m];

            for (const f of fs)
                for (const t of ts)
                    for (const h of hs)
                        for (const m of ms)
                            found += await this.component(
                                { c: String(v.c), f, t, h, m }, x, stack, !!dynamic.f)
                        ;

            if (dynamic.f && !found)
                throw new Error('Manifest component missing ' + v.c + ' dynamic framework')
            ;
        },

        policy: function (x) {
            const allow = new Map();

            for (const v of x.c.dynamicAllow) {
                const d = this.diagnostic(v), k = this.manifest.serialize(d);
                if (allow.has(k))
                    throw new Error('Manifest dynamic policy duplicate ' + d.from + d.at + ' ' + d.param)
                ;
                allow.set(k, d);
            }
            for (const v of x.dynamic) {
                const k = this.manifest.serialize(v);
                if (!allow.has(k))
                    throw new Error('Manifest dynamic policy missing ' + v.from + v.at + ' ' + v.param)
                ;
                allow.delete(k);
            }
            if (allow.size) {
                const v = allow.values().next().value;
                throw new Error('Manifest dynamic policy unused ' + v.from + v.at + ' ' + v.param);
            }
        },

        write
    }
};
