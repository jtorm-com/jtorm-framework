/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormJsonLdPlugin: {
        // DI
        // jsonLdModel

        event: {
            after: {
                view: {
                    weight: 50
                }
            }
        },

        document: function (v) {
            const d = v && v.h && v.h.d;

            if (!d || !d.head || typeof d.createElement !== 'function'
                || typeof d.querySelectorAll !== 'function')
                throw new Error('JSON-LD document missing')
            ;

            return d;
        },

        remove: function (a) {
            for (let k = 0; k < a.length; k++)
                if (a[k].parentNode)
                    a[k].parentNode.removeChild(a[k])
                ;
        },

        /**
         * Publish the root public view model as one owned JSON-LD data block.
         * @param {ViewModel} v
         * @returns {*}
         */
        afterView: function (v) {
            if (!this.jsonLdModel
                || typeof this.jsonLdModel.serialize !== 'function')
                throw new Error('JSON-LD model missing')
            ;

            const t = this.jsonLdModel.serialize(v && v.m);
            const d = this.document(v);
            const a = d.querySelectorAll('script[data-jtorm-json-ld]');

            if (t === null) {
                this.remove(a);
                return v.h;
            }
            if (typeof t !== 'string')
                throw new Error('JSON-LD serialization invalid')
            ;

            const e = a[0] || d.createElement('script');
            e.setAttribute('data-jtorm-json-ld', '');
            e.setAttribute('type', 'application/ld+json');
            e.textContent = t;
            d.head.appendChild(e);

            for (let k = 1; k < a.length; k++)
                if (a[k].parentNode)
                    a[k].parentNode.removeChild(a[k])
                ;

            return v.h;
        }
    }
};
