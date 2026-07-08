/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormMediatargetMethod: {
        // DI
        // mediaqueryMethod

        alias: 'mt',
        // Child gate: handle sets v.io.c from the active-target set. On a validate MISS
        // (no `t`) the handler fails CLOSED (skip children) rather than leak the guarded content.
        gate: 1,
        current: [],
        params: [
            't'// Target
        ],
        target: {
            Mobile: 'only screen and (min-width: 320px) and (max-width: 480px)',
            MobileS: 'only screen and (min-width: 320px) and (max-width: 374px)',
            MobileM: 'only screen and (min-width: 375px) and (max-width: 414px)',
            MobileL: 'only screen and (min-width: 415px) and (max-width: 480px)',
            Tablet: 'only screen and (min-width: 481px) and (max-width: 1024px)',
            TabletS: 'only screen and (min-width: 481px) and (max-width: 640px)',
            TabletM: 'only screen and (min-width: 641px) and (max-width: 834px)',
            TabletL: 'only screen and (min-width: 835px) and (max-width: 1024px)',
            Desktop: 'only screen and (min-width: 1025px)',
            DesktopS: 'only screen and (min-width: 1025px) and (max-width: 1280px)',
            DesktopM: 'only screen and (min-width: 1281px) and (max-width: 1440px)',
            DesktopL: 'only screen and (min-width: 1441px)'
        },

        init: function(j) {
            let k, v;

            for (k in this.target) {
                v = {d: {t: k}};

                this.process(v);

                if (v.io.c)
                    this.current.push(k)
                ;
            }
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.t;
        },

        /**
         * Gate children on whether the named breakpoint `v.d.t` is in the currently-active target set.
         * @param {ViewModel} v
         */
        handle: function (v) {
            v.io.c = this.current.indexOf(v.d.t) !== -1;
        },

        process: function (v) {
            v.d.q = this.target[v.d.t];

            this.mediaqueryMethod.handle(v);
        }
    }
};
