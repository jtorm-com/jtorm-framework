/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLanguageModel: {
        // DI
        // configModel: null,
        // sessionModel: null,

        current: null,
        data: {},
        default: 'en',

        init: function() {
            this.current = this.getCurrent();
        },

        getCurrent: function() {
            const s = this;
            let l = s.sessionModel.get('language');

            if (!l)
                l = s.configModel.get('language');

            if (!l)
                l = s.default;

            if (!s.data[l]) {
                if (/^[a-z][a-z]-[A-Z][A-Z]/.test(l))
                    l = l.split('-')[0];

                if (!s.data[l])
                    l = s.default;

                s.sessionModel.set('language', l);
            }

            return l;
        },

        getDate(d) {
            return d.toUTCString();
        },

        get: function (s) {
            const l = this.current;

            return (
                this.data[l] !== undefined
                && this.data[l][s] !== undefined
            )
                ? this.data[l][s]
                : s;
        },

        set: function (l, k, v) {
            if (this.data[l] === undefined)
                this.data[l] = {};

            this.data[l][k] = v;
        }
    }
};