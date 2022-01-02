/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    jTormCssMethod: {
        params: ['href'],
        validate: function (j, v) {
            return !!v.d.href;
        },
        handle: function (j, v) {
            var s = j.context.plugins.css.after.view;
            if (v.c.c || !s.cache[v.t.p.href])
                s.cache[v.d.href] = 0;
            v.io = {c: 1};
        }
    }
};