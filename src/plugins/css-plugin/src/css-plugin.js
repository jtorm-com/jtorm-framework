/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCssPlugin: {
        // DI
        // cssMethod
        // uiMethod

        cache: {},
        collection: [],
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },

        process: async function(v, css) {
            if(!this.cache[css.href]) {
                await v.h.set({t: {s: 'head'}, c: {s: null}}, el => {
                    const
                        po = v.h.d.createElement('link'),
                        p = this.cssMethod.params
                    ;

                    for (let k in p)
                        if (
                            css[p[k]]
                            && ['defer', 'href'].indexOf(p[k]) === -1
                        )
                            po.setAttribute(p[k], css[p[k]])
                    ;

                    po.href = this.uiMethod.parseUrl(css.href);
                    po.rel = css.rel ? css.rel : 'stylesheet';

                    // defer: load without blocking via the media=print swap (main's
                    // "Bugfix defer method"), then restore the INTENDED media on load —
                    // not hardcoded 'all', or a deferred media='print'/responsive sheet
                    // would apply everywhere after load. The real media is passed as DATA
                    // (data-media), not interpolated into the inline handler, so a media
                    // string can never break out into the onload JS.
                    if (css.defer) {
                        if (css.media)
                            po.setAttribute('data-media', css.media)
                        ;
                        po.media = 'print';
                        po.setAttribute('onload', "this.media=this.getAttribute('data-media')||'all'; this.onload=null;");
                    }

                    el.appendChild(po);

                    this.cache[css.href] = true;
                });
            }
        },

        afterView: async function(v) {
            for (let css of this.collection)
                await this.process(v, css)
            ;

            this.cache = {};
            this.collection = [];

            return v.h;
        }
    }
};
