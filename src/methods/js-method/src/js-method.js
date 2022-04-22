/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    // todo
    jTormJsMethod: {
        params: ['src'],
        validate: function (j, v) {
            return v.d.src;
        },
        handle: function (j, v) {
            var s = j.context.plugins.js.after.view;
            if (v.c.c || !s.cache[v.t.p.src]) {
                s.cache[v.t.p.src] = 0;
                s.collection.push({src: v.d.src});
            }

            v.io = {c: 1};
        }
    }
};