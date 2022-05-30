/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormMediatargetMethod: {
        // DI
        mediaqueryMethod: null,

        alias: 'mt',
        current: [],
        params: ['t'],
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
                    this.current.push(k);
            }
        },

        validate: function (v) {
            return !!v.d.t;
        },

        handle: function (v) {
            v.io.c = this.current.indexOf(v.d.t) !== -1;
        },

        process: function (v) {
            v.d.q = this.target[v.d.t];

            this.mediaqueryMethod.handle(v);
        }
    }
};
