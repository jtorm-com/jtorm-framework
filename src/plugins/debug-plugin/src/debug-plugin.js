/*! (c) jTorm and other contributors | www.jtorm.com/license */

module.exports = {
    jTormDebugPlugin: {
        // DI
        util: null,

        event: {
            before: {
                method: {
                    weight: 9999
                },
                iteration: {
                    weight: 9999
                }
            },
            after: {
                method: {
                    weight: 9999
                },
                iteration: {
                    weight: 9999
                }
            }
        },

        debug: function(v) {
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
                else console.log(this.util.inspect(v[k], false, 10, true /* enable colors */));
                console.log('');
            }
        },

        beforeMethod: function(v) {
            console.log('************ START method');
            console.log('');
            console.log('##### Before:Start ' + v.t.m + ' #####');
            this.debug(v);
            // console.log('##### Before:End #####');
            console.log('');
        },

        beforeIteration: function(v) {
            console.log('************ START iteration');
            this.debug(v);
            // console.log('##### Before:End #####');
            console.log('');
        },

        afterMethod: function(v) {
            console.log('');
            console.log('$$$$$ After:Start ' + v.t.m + ' $$$$$');
            this.debug(v);
            console.log('$$$$$ After:End $$$$$');
            console.log('');
            console.log('************ END');
        },

        afterIteration: function(v) {
            console.log('************ END iteration');
            this.debug(v);
            // console.log('##### Before:End #####');
            console.log('');
        }
    }
};