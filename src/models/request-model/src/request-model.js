/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormRequestModel: {
        // DI
        axios: null,
        uiMethod: null,
        windowModel: null,

        url: null,

        init: function() {
            let l = this.windowModel.location;

            this.url = l.protocol + '//' + l.host + '/';
        },

        xhr: async function(j, req) {
            let r, xhr,
                l = this.windowModel.location;

            req.url = this.uiMethod.parseUrl(req.url);

            if (/^http/.test(req.url) === false)
                req.url = this.url + req.url;

            xhr = await this.axios.request(req);

            r = {
                t: xhr.headers["cache-control"],
                d: xhr.data
            };

            return r;
        },

        request: async function(j, url, h, m, c) {
            return await this.xhr(j, {
                method: m ? m : "GET",
                url: url,
                headers: {
                    "Content-Type": h + '; charset=' + (c ? c : this.charset)
                }
            });
        }
    }
};
