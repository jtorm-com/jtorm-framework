/*! (c) jTorm and other contributors | www.jtorm.com/license */
const util = require('util');

const debug = function (v) {
    for (let k in v) {
        if (
            !v[k]
            || k === '_'
            // || k === 'tss'
            // || k === 'model'
            // || k === 'm'
        ) continue;
        console.log('');
        console.log('---- Param: ' + k + ' ----');
        if (k === 'html' || k === 'h' || k === 'r') console.log(v[k].html());
        else console.log(util.inspect(v[k], false, 10, true /* enable colors */));
        console.log('');
    }
};

module.exports = {
    before: {
        method: {
            handle: function(j, v) {
                console.log('************ START method');
                console.log('');
                console.log('##### Before:Start ' + v.t.m + ' #####');
                debug(v);
                // console.log('##### Before:End #####');
                console.log('');
            }
        },
        iteration: {
            handle: function(j, v) {
                console.log('************ START iteration');
                debug(v);
                // console.log('##### Before:End #####');
                console.log('');
            }
        }
    },
    after: {
        method: {
            handle: function (j, v) {
                console.log('');
                console.log('$$$$$ After:Start ' + v.t.m + ' $$$$$');
                debug(v);
                console.log('$$$$$ After:End $$$$$');
                console.log('');
                console.log('************ END');
            }
        },
        iteration: {
            handle: function(j, v) {
                console.log('************ END iteration');
                debug(v);
                // console.log('##### Before:End #####');
                console.log('');
            }
        }
    }
};