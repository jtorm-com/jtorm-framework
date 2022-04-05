/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormMediatargetMethod: {
        alias: 'mt',
        target: {
            mobile: 'only screen and (min-width: 320px) and (max-width: 480px)',
            mobileS: 'only screen and (min-width: 320px) and (max-width: 374px)',
            mobileM: 'only screen and (min-width: 375px) and (max-width: 414px)',
            mobileL: 'only screen and (min-width: 415px) and (max-width: 480px)',
            tablet: 'only screen and (min-width: 481px) and (max-width: 1024px)',
            tabletS: 'only screen and (min-width: 481px) and (max-width: 640px)',
            tabletM: 'only screen and (min-width: 641px) and (max-width: 834px)',
            tabletL: 'only screen and (min-width: 835px) and (max-width: 1024px)',
            desktop: 'only screen and (min-width: 1025px)',
            desktopS: 'only screen and (min-width: 1025px) and (max-width: 1280px)',
            desktopM: 'only screen and (min-width: 1281px) and (max-width: 1440px)',
            desktopL: 'only screen and (min-width: 1441px)'
        },
        params: ['t'],
        validate: function (j, v) {
            return !!v.d.t;
        },
        handle: function (j, v) {
            v.d.q = this.target[v.d.t];
            console.log(v.d);
            j.context.methods.mediaquery.handle(j ,v);
        }
    }
};