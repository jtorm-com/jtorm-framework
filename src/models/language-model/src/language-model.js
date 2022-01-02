/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormLanguageModel: {
        data: {},
        default: 'en',
        getCurrent: function (jT) {
            var s = this, l;

            if (jT.context.session) l = jT.context.session.get('language');
            if (!l && jT.context.config) l = jT.context.config.get('language');
            if (!l) l = s.default;

            if (!s.data[l]) {
                if (/^[a-z][a-z]-[A-Z][A-Z]/.test(l))
                    l = l.split('-')[0];

                if (!s.data[l])
                    l = s.default;

                if (jT.context.session) jT.context.session.set('language', l);
            }

            return l;
        },
        getDate(l, d) {
            return d.toUTCString();
        },
        get: function (l, s) {
            return this.data[l] !== undefined && this.data[l][s] !== undefined ? this.data[l][s] : s;
        },
        set: function (l, k, v) {
            if (this.data[l] === undefined) this.data[l] = {};
            this.data[l][k] = v;
        }
    }
};