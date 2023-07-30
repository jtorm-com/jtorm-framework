/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLanguageModel: {
        // DI
        // configModel: null,
        // sessionModel: null,

        // language: null,
        // fallback: null
        data: {},
        default: 'en-US',

        init: function() {
            this.setLanguage(this.initLanguage());
        },

        initLanguage: function() {
            const s = this;
            let l = s.sessionModel.get('language');

            if (!l)
                l = s.configModel.get('language');

            if (!l)
                l = s.default;

            if (!s.data[l]) {
                l = s.getFallback();

                if (!s.data[l])
                    l = s.default;

                s.sessionModel.set('language', l);
            }

            return l;
        },

        getFallback: function (l) {
            return (/^[a-z][a-z]-[A-Z][A-Z]/.test(l))
                ? l.split('-')[0]
                : l;
        },

        setLanguage: function(l) {
            this.language = l;
            this.fallback = this.getFallback(l);
        },

        getDate(d) {
            return d.toUTCString();
        },

        get: function (s) {
            let l = this.language;

            if (!this.data[l] || !this.data[l][s])
                l = s.fallback;

            return (
                this.data[l]
                && this.data[l][s]
            )
                ? this.data[l][s]
                : s;
        },

        set: function (l, k, v) {
            if (!this.data[l])
                this.data[l] = {};

            this.data[l][k] = v;
        }
    }
};