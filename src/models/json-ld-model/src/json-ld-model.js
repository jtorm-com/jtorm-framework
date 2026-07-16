/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsonLdModel: {
        context: 'https://schema.org',
        maxText: 1048576,
        maxValues: 262144,
        maxDepth: 128,

        keywords: Object.freeze([
            '@base', '@container', '@context', '@direction', '@graph', '@id',
            '@import', '@included', '@index', '@json', '@language', '@list',
            '@nest', '@none', '@prefix', '@propagate', '@protected', '@reverse',
            '@set', '@type', '@value', '@version', '@vocab'
        ]),

        plain: function (v) {
            if (!v || typeof v !== 'object' || Array.isArray(v))
                return false
            ;

            const p = Object.getPrototypeOf(v);
            return p === Object.prototype || p === null;
        },

        data: function (d) {
            return d && Object.prototype.hasOwnProperty.call(d, 'value');
        },

        eligible: function (v) {
            if (!this.plain(v))
                return false
            ;

            const d = Object.getOwnPropertyDescriptor(v, '@type');

            if (!d || !d.enumerable || !this.data(d)
                || typeof d.value !== 'string')
                return false
            ;
            this.text(d.value, '$["@type"]');
            return /\S/.test(d.value);
        },

        optedOut: function (v) {
            const d = Object.getOwnPropertyDescriptor(v, '@meta');

            if (!this.data(d) || !d.value || typeof d.value !== 'object')
                return false
            ;

            const j = Object.getOwnPropertyDescriptor(d.value, 'jsonLd');
            return !!(this.data(j) && j.value === false);
        },

        path: function (p, k) {
            return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)
                ? p + '.' + k
                : p + '[' + JSON.stringify(k) + ']';
        },

        fail: function (m, p) {
            throw new Error('JSON-LD ' + m + (p ? ' at ' + p : ''));
        },

        limits: function () {
            if (!Number.isSafeInteger(this.maxText) || this.maxText < 1
                || !Number.isSafeInteger(this.maxValues) || this.maxValues < 1
                || !Number.isSafeInteger(this.maxDepth) || this.maxDepth < 0)
                this.fail('limits invalid')
            ;
            if (typeof TextEncoder !== 'function')
                this.fail('TextEncoder missing')
            ;
        },

        allowed: function (k) {
            return k.charAt(0) !== '@' || this.keywords.includes(k);
        },

        text: function (v, p) {
            if (v.length > this.maxText)
                this.fail('text limit', p)
            ;
        },

        token: function (v, p) {
            this.text(v, p);
            return JSON.stringify(v).replace(/[<>&\u2028\u2029]/g, function (c) {
                return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
            });
        },

        write: function (s, v, p) {
            if (v.length > this.maxText)
                this.fail('text limit', p)
            ;

            const n = /^[\x00-\x7f]*$/.test(v)
                ? v.length
                : s.encoder.encode(v).length;

            if (s.bytes + n > this.maxText)
                this.fail('text limit', p)
            ;

            s.bytes += n;
            s.output.push(v);
        },

        symbols: function (v, p) {
            for (const k of Object.getOwnPropertySymbols(v)) {
                const d = Object.getOwnPropertyDescriptor(v, k);

                if (d && d.enumerable)
                    this.fail('value invalid', p + '[' + String(k) + ']')
                ;
            }
        },

        enter: function (v, d, p, s) {
            if (d > this.maxDepth)
                this.fail('structure limit', p)
            ;
            if (s.seen.has(v))
                this.fail('cycle', p)
            ;

            s.seen.add(v);
        },

        value: function (v, d, p, s, r) {
            if (++s.values > this.maxValues)
                this.fail('structure limit', p)
            ;
            if (v === null)
                return this.write(s, 'null', p)
            ;
            if (typeof v === 'string')
                return this.write(s, this.token(v, p), p)
            ;
            if (typeof v === 'boolean')
                return this.write(s, v ? 'true' : 'false', p)
            ;
            if (typeof v === 'number') {
                if (!Number.isFinite(v))
                    this.fail('value invalid', p)
                ;
                return this.write(s, JSON.stringify(v), p);
            }
            if (Array.isArray(v)) {
                if (Object.getPrototypeOf(v) !== Array.prototype)
                    this.fail('value invalid', p)
                ;
                return this.array(v, d, p, s);
            }
            if (!this.plain(v))
                this.fail('value invalid', p)
            ;

            return this.object(v, d, p, s, r);
        },

        array: function (v, d, p, s) {
            let q;
            this.enter(v, d, p, s);

            try {
                this.symbols(v, p);
                for (const k in v) {
                    if (!Object.prototype.hasOwnProperty.call(v, k))
                        continue
                    ;
                    this.text(k, p);
                    if (!/^(0|[1-9][0-9]*)$/.test(k) || +k >= v.length)
                        this.fail('value invalid', this.path(p, k))
                    ;
                }

                this.write(s, '[', p);
                for (let k = 0; k < v.length; k++) {
                    q = p + '[' + k + ']';
                    const x = Object.getOwnPropertyDescriptor(v, String(k));

                    if (!this.data(x))
                        this.fail('value invalid', q)
                    ;
                    if (k)
                        this.write(s, ',', q)
                    ;
                    this.value(x.value, d + 1, q, s, false);
                }
                this.write(s, ']', p);
            } finally {
                s.seen.delete(v);
            }
        },

        object: function (v, d, p, s, r) {
            const h = Object.getOwnPropertyDescriptor(v, '@context');
            let c = false;
            this.enter(v, d, p, s);

            try {
                this.symbols(v, p);
                this.write(s, '{', p);

                if (r && (!h || !h.enumerable)) {
                    this.write(s, this.token('@context', p) + ':', p);
                    this.value(this.context, d + 1, '$["@context"]', s, false);
                    c = true;
                }

                for (const k in v) {
                    if (!Object.prototype.hasOwnProperty.call(v, k))
                        continue
                    ;
                    this.text(k, p);
                    if (!this.allowed(k)) {
                        if (++s.values > this.maxValues)
                            this.fail('structure limit', this.path(p, k))
                        ;
                        continue
                    }

                    const q = this.path(p, k);
                    const x = Object.getOwnPropertyDescriptor(v, k);

                    if (!x || !x.enumerable || !this.data(x))
                        this.fail('value invalid', q)
                    ;
                    if (c)
                        this.write(s, ',', q)
                    ;
                    this.write(s, this.token(k, q) + ':', q);
                    this.value(x.value, d + 1, q, s, false);
                    c = true;
                }

                this.write(s, '}', p);
            } finally {
                s.seen.delete(v);
            }
        },

        serialize: function (v) {
            if (!this.eligible(v) || this.optedOut(v))
                return null
            ;

            this.limits();
            const s = {
                bytes: 0,
                values: 0,
                output: [],
                seen: new Set(),
                encoder: new TextEncoder()
            };

            this.value(v, 0, '$', s, true);
            return s.output.join('');
        }
    }
};
