/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormInsertMethod: {
        // DI
        // errorHandler
        // handlerWrapper
        // viewModel

        alias: 'i',
        params: [
            'h',// Html (RAW — the explicit opt-in: author literals + composed child markup)
            't',// Text (ESCAPED — the safe path: data bound as content, rendered inert)
            'p',// Html prefix
            's',// Html suffix
            'd',// Data
            'm',// Method
            'l',// Cache language
            'cid',// Cache id
            'cs'// Cache scope
        ],

        // HTML raw-text elements: their content serializes VERBATIM (RAWTEXT/PLAINTEXT
        // parsing — no entity escaping), so `textContent` cannot make it inert. The safe
        // `t:` path FAILS CLOSED for these rather than falsely advertising escaping.
        rawText: {
            script: 1, style: 1, iframe: 1, xmp: 1,
            noembed: 1, noframes: 1, noscript: 1, plaintext: 1, template: 1
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            return (
                // `t` keys on PRESENCE (!= null), not truthiness: a resolved falsy
                // text value (0, '') is real content to escape, not a missing bind.
                (v.d.t != null || v.d.h || v.t.c.length)
                && (v.d.m || this.m)
            );
        },

        /**
         * Insert escaped text (`v.d.t` — the SAFE default: data bound as content,
         * rendered inert via the DOM's native text APIs), raw html (`v.d.h` — the
         * explicit RAW opt-in: author literals + composed markup), or boiled children,
         * via the chosen mode; throw via errorHandler when the target element is absent.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            let e, h, c = 1;

            v.cid = v.d.cid;
            v.cs = v.d.cs;
            v.l = v.d.l;

            if (v.d.t != null) {
                // SAFE content: a data value bound as element text. textContent /
                // insertAdjacentText let the DOM escape it (inert) — an XSS payload
                // in `v.m` renders as text, never markup. The raw `h:` path below is
                // the deliberate, greppable opt-in for author-trusted HTML. Presence
                // (!= null) not truthiness: 0 / '' are real content (0 renders, ''
                // clears), only an unresolved bind (null) falls through.
                await this.processText(v.h, String(v.d.t), v.d.m, v);
            } else if (v.d.h) {
                if (v.d.p)
                    v.d.h = v.d.p + v.d.h
                ;

                if (v.d.s)
                    v.d.h += v.d.s
                ;

                await this.process(v.h, v.d.h, v.d.m, v);
            } else if (v.d.d === null)
                c = 0
            ; else if (
                (v.d.d === undefined || v.d.d)
                && v.t.c.length > 0
            ) {
                e = v.h.select(
                    v.t.s
                        ? v.t.s
                        : 'body'
                );

                if (e) {
                    h = await this.handlerWrapper.handle('', v.t, v.d.d ? v.d.d : v.m, v);

                    v.r = null;

                    await this.process(v.h, h, v.d.m, v);

                    c = 0;
                } else
                    this.errorHandler.handle(v.t.s + ' not found', v)
                ;
            }

            v.cid = v.cs = v.l = null;

            v.io = {c: c};
        },

        process: async function (h, h2, m, v) {
            await h.set(v, async e => {
                const o = v._.isObject(h2);

                if (m === 'r') {
                    if (!o)
                        h2 = await this.viewModel.create(h2)
                    ;

                    e.parentNode.replaceChild(h2.h.select(h2.h.getSelector(v.d.s, v.c.s)), e);
                } else {
                    const c = o
                        ? h2.select('body').innerHTML
                        : h2
                    ;

                    if (m === 'i')
                        e.innerHTML = c
                    ; else
                        e.insertAdjacentHTML(
                            m === 'b'
                                ? 'beforebegin'
                                : m === 'p'
                                    ? 'afterbegin'
                                    : m === 'a'
                                        ? 'beforeend'
                                        : m === 'af'
                                            ? 'afterend'
                                            : m,
                            c
                        )
                    ;
                }
            });
        },

        // The SAFE-content writer: mirrors process()'s mode map but uses the DOM's
        // native TEXT APIs (textContent / insertAdjacentText / a replacement text node)
        // so `txt` is ESCAPED — a data value never becomes markup. Dep-free and
        // isomorphic: the elements come from windowModel's document via v.h.set.
        // FAILS CLOSED when writing INSIDE a raw-text element (i/a/p → the element's own
        // content): script/style/iframe/… serialize their text VERBATIM, so textContent
        // can't escape it — the safe t: contract must throw, not silently emit unescaped.
        // Outside-target modes (before/after/replace write into the PARENT) stay safe.
        // Arrow callback preserves `this` (the method) for errorHandler/rawText.
        processText: async function (h, txt, m, v) {
            await h.set(v, e => {
                if (
                    (m === 'i' || m === 'a' || m === 'p')
                    && this.rawText[e.tagName.toLowerCase()]
                )
                    this.errorHandler.handle('unsafe t: content in raw-text <' + e.tagName.toLowerCase() + '> (serializes verbatim — use rawcontent/h: with a sanitizer)', v)
                ; else if (m === 'i')
                    e.textContent = txt
                ; else if (m === 'r')
                    e.parentNode.replaceChild(e.ownerDocument.createTextNode(txt), e)
                ; else
                    e.insertAdjacentText(
                        m === 'b'
                            ? 'beforebegin'
                            : m === 'p'
                                ? 'afterbegin'
                                : m === 'a'
                                    ? 'beforeend'
                                    : m === 'af'
                                        ? 'afterend'
                                        : m,
                        txt
                    )
                ;
            });
        }
    }
};
