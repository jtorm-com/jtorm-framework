/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormTimeMethod: {
        // DI
        // languageModel

        labels: {
            future: [
                'Just now',
                '1 second from now',
                '%d seconds from now',
                '1 minute from now',
                '%d minutes from now',
                '1 hour from now',
                '%d hours from now',
                'Tomorrow',
                '%d days from now',
                'Next week',
                '%d weeks from now',
                'Next month',
                '%d months from now',
                'Next year',
                '%d years from now',
                'Next century',
                '%d centuries from now'
            ],
            past: [
                'Just now',
                '1 second ago',
                '%d seconds ago',
                '1 minute ago',
                '%d minutes ago',
                '1 hour ago',
                '%d hours ago',
                'Yesterday',
                '%d days ago',
                'Last week',
                '%d weeks ago',
                'Last month',
                '%d months ago',
                'Last year',
                '%d years ago',
                'Last century',
                '%d centuries ago'
            ]
        },
        params: [
            'as',
            'dT',// DateTime
            'd'// Date
        ],
        secs: [
            [],
            [1],
            [60, 1],
            [120],
            [3600, 60],
            [7200],
            [86400, 3600],
            [172800],
            [604800, 86400],
            [1209600],
            [2620780, 604800],
            [5241560],
            [31449360, 2620780],
            [62898720],
            [3144936000, 31449360],
            [6289872000],
            [628987200000, 3144936000]
        ],

        validate: function (v) {
            return v.d.as && (v.d.dT || v.d.d);
        },

        handle: function (v) {
            const l = this.languageModel,
                  nD = {};

            let dT, r;

            if (v.d.dT) {
                dT = new Date(v.d.dT);
                nD.dateTime = v.d.dT;
            } else if (v.d.d) {
                dT = new Date(v.d.d);
                nD.date = v.d.d;
            }

            nD.o = dT.toISOString();
            nD.d = dT;

            r = this.time(dT);

            nD[v.d.as] = l.get(r[0]);

            if (r[1])
                nD[v.d.as] = nD[v.d.as].replace('%d', r[1])
            ;

            nD.l = l.getDate(nD.d);
            nD.title = nD.l;

            v.io = {c: 1, d: nD};
        },

        time: function (t) {
            if (typeof t === 'string')
                t = +new Date(t)
            ; else if (typeof t === 'object' && t.constructor === Date)
                t = t.getTime()
            ; else
                t = +new Date()
            ;

            let secs = (+new Date() - t) / 1000,
                c = 'past',
                i = 1,
                s = this,
                r
            ;

            if (secs < 0) {
                secs = Math.abs(secs);
                c = 'future';
            }

            if ((secs > 0 && secs < 1) || (secs > -1 && secs < 0))
                return [s.labels[c][0]]
            ;

            while (r = s.secs[i]) {
                if (secs < r[0]) {
                    if (!r[1])
                        return [s.labels[c][i]]
                    ; else {
                        t = Math.floor(secs / r[1]);
                        if (t === 1)
                            return [s.labels[c][i - 1]]
                        ;

                        return [s.labels[c][i], t];
                    }
                }

                i++;
            }

            return [t];
        }
    }
};
