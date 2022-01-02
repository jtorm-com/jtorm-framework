/*! (c) jTorm and other contributors | www.jtorm.com/license */

// todo de layers moeten ook worden opgeslagen anders kans dat er iets wordt gemist?
// een global zou ook kunnen na elke iteratie zodat het in de cache komt, maar bepaalde globals ook weer niet zoals sessie data, dus moet een extra var komen
// maar een global verzameling weten we pas na een render
// dus kunnen we alle cache bij langs gaan en de global daarop toepassen en opslaan

const handle = async function(j, v, e, t) {
    var c = j.context.models.layer.get(j, v, e, t, v.cid),
        vM;

    j.context.models.layer.reset(e, t);

    if (c) {
        // console.log(e, t, v.cid);
        // console.log('handleChildren');
        // console.log(v.h.html());

        vM = j.context.models.view.copy(j, v, null, c);
        // console.log(util.inspect(vM.tss, false, null, true /* enable colors */));
        await j.handle(null, null, null, 0, vM);
    }
};

const currentCid = [];

module.exports = {
    before: {
        iteration: {
            weight: 0,
            handle: async function (j, v) {
                if (v.cid) {
                    currentCid.push(v.cid);

                    j.context.models.layer.cid = v.cid;
                }
            }
        }
    },
    after: {
        view: {
            weight: 0,
            handle: async function (j, v) {
                // bij een global alle cache loopen en de global weg gooien

                // bij een sessie altijd uitvoeren

                handle(j, v, 'after', 'view');
            }
        },
        iteration: {
            weight: 0,
            handle: async function (j, v) {
                handle(j, v, 'after', 'iteration');

                if (v.cid && v.cid !== 'default') {
                    v._.remove(currentCid, function (el) {
                        return el === v.cid;
                    });

                    j.context.models.layer.cid = currentCid.length ? currentCid.pop() : 'default';
                }
            }
        }
    }
};