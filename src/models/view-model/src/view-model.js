/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormViewModel: {
        cid: null,// cache id
        cs: null,// cache scope
        c: {
            c: 1,// create doc
            s: null,// parent selector
        },
        h: null,// html
        m: null,// model
        d: null,// method data
        tss: null,
        t: null,// method tss
        r: null, // result from handlechildren
        io: {
            d: null, // alt data
            c: 1, // handle children
            r: 1, // repeat current iteration
            v: 0 // validated
        }
    }
};