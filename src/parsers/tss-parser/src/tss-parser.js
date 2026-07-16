/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const HARD = Object.freeze({
    source: 131072,
    tokens: 32768,
    depth: 128,
    nodes: 4096,
    declarations: 16384
});
const WS = /\s/u;
const TEXT = 'text';
const OPEN = 'opening';
const CLOSE = 'closing';
const PS = 'propertySeparator';
const PE = 'propertyEnd';
const SO = 'propertyShorthandOpening';
const SC = 'propertyShorthandClosing';
const SS = 'propertyShorthandSeparator';
const METHOD = 'methodSeparator';
const EOF = 'eof';

function lineBreak(c) {
    return c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';
}

function point(source, offset) {
    let line = 1, column = 1;
    for (let i = 0; i < offset; i++) {
        if (source[i] === '\r') {
            if (source[i + 1] === '\n' && i + 1 < offset)
                i++
            ;
            line++;
            column = 1;
        } else if (source[i] === '\n' || source[i] === '\u2028' || source[i] === '\u2029') {
            line++;
            column = 1;
        } else
            column++
        ;
    }
    return {line: line, column: column};
}

function fail(Type, message, source, offset) {
    const p = point(source, offset), e = new Type(
        message + ' at line ' + p.line + ', column ' + p.column
    );
    e.line = p.line;
    e.column = p.column;
    e.offset = offset;
    throw e;
}

function invalid() {
    throw new TypeError('TSS parser config invalid');
}

function escapeRegex(value) {
    const special = '\\^$.*+?()[]{}|-';
    let out = '';
    for (const c of value)
        out += special.includes(c) ? '\\' + c : c
    ;
    return out;
}

function regex(pattern, flags, fallback) {
    try {
        return new RegExp(pattern, flags);
    } catch (_) {
        return new RegExp(fallback, flags);
    }
}

function regexes(c) {
    const q = c.quotes, qs = String(q);
    const r = '(?=(?:[^' + qs + ']|[' + qs + '][^' + qs + ']*[' + qs + '])*$)';
    const aq = Array.isArray(q) ? q.join('') : q;
    const eq = escapeRegex(aq);
    const safe = '(?=(?:[^' + eq + ']|[' + eq + '][^' + eq + ']*[' + eq + '])*$)';

    return {
        clean: /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
        cleanWhiteSpace: /\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm,
        propertySeparator: regex(c.propertySeparator + r, 'm', escapeRegex(c.propertySeparator) + safe),
        propertyEnd: regex(c.propertyEnd + r, 'm', escapeRegex(c.propertyEnd) + safe),
        propertyShorthandOpening: regex('\\' + c.propertyShorthandOpening + r, 'm', escapeRegex(c.propertyShorthandOpening) + safe),
        propertyShorthandClosing: regex('\\' + c.propertyShorthandClosing + r, 'm', escapeRegex(c.propertyShorthandClosing) + safe),
        propertyShorthandSeparator: regex(c.propertyShorthandSeparator + r, 'm', escapeRegex(c.propertyShorthandSeparator) + safe),
        quotes: regex('(' + qs + ')+', 'gm', '(' + eq + ')+')
    };
}

function quoteSet(c) {
    return new Set(Array.isArray(c.quotes) ? c.quotes : [c.quotes]);
}

function cleaned(source) {
    const chars = [], starts = [];
    let i = 0;

    while (i < source.length) {
        if (source.startsWith('/*', i)) {
            const end = source.indexOf('*/', i + 2);
            if (end === -1)
                fail(SyntaxError, 'TSS unclosed comment', source, i)
            ;
            i = end + 2;
            continue;
        }

        if (
            source.startsWith('//', i) &&
            (i === 0 || (source[i - 1] !== '\\' && source[i - 1] !== ':'))
        ) {
            i += 2;
            while (i < source.length && !lineBreak(source[i]))
                i++
            ;
            continue;
        }

        chars.push(source[i]);
        starts.push(i);
        i++;
    }

    const parity = new Uint8Array(chars.length + 1);
    for (i = 0; i < chars.length; i++)
        parity[i + 1] = parity[i] ^ ((chars[i] === "'" || chars[i] === '"') ? 1 : 0)
    ;

    const future = new Uint8Array(chars.length + 1);
    let mask = 1 << parity[chars.length];
    future[chars.length] = mask;
    for (i = chars.length - 1; i >= 0; i--) {
        if (lineBreak(chars[i]))
            mask |= 1 << parity[i]
        ;
        future[i] = mask;
    }

    const out = [], os = [];
    function push(value, start) {
        out.push(value);
        os.push(start);
    }

    i = 0;
    while (i < chars.length) {
        if (!WS.test(chars[i])) {
            push(chars[i], starts[i]);
            i++;
            continue;
        }

        const from = i;
        while (i < chars.length && WS.test(chars[i]))
            i++
        ;
        let collapse = 0;
        for (let end = i; end > from; end--)
            if (future[end] & (1 << parity[end])) {
                collapse = end;
                break;
            }
        ;

        if (collapse) {
            push(' ', starts[from]);
            for (let j = collapse; j < i; j++)
                push(chars[j], starts[j])
            ;
        } else
            for (let j = from; j < i; j++)
                push(chars[j], starts[j])
            ;
    }

    return {text: out.join(''), starts: os};
}

function offsetMap(text, c) {
    const out = new Int32Array(text.length + 1);
    const delimiters = [c.opening, c.closing, c.propertyEnd];
    let last = -1;
    for (let i = 0; i < text.length; i++) {
        out[i] = last;
        for (const delimiter of delimiters)
            if (text.startsWith(delimiter, i) && i > last)
                last = i
            ;
    }
    out[text.length] = last;
    return out;
}

function tokenize(parser, source) {
    if (source.length > parser.limits.source)
        fail(RangeError, 'TSS source limit exceeded', source, parser.limits.source)
    ;

    const clean = cleaned(source), text = clean.text, q = quoteSet(parser.c);
    const syntax = [
        {t: OPEN, v: parser.c.opening},
        {t: CLOSE, v: parser.c.closing},
        {t: PS, v: parser.c.propertySeparator},
        {t: PE, v: parser.c.propertyEnd},
        {t: SO, v: parser.c.propertyShorthandOpening},
        {t: SC, v: parser.c.propertyShorthandClosing},
        {t: SS, v: parser.c.propertyShorthandSeparator},
        {t: METHOD, v: parser.c.methodSeparator}
    ].sort((a, b) => b.v.length - a.v.length);
    const tokens = [];
    let i = 0, start = 0, quote = false, quoteOffset = 0, boundary = -1;

    function add(type, from, to) {
        if (from === to)
            return
        ;
        const offset = clean.starts[from] === undefined ? source.length : clean.starts[from];
        if (tokens.length === parser.limits.tokens)
            fail(RangeError, 'TSS tokens limit exceeded', source, offset)
        ;
        tokens.push({
            t: type,
            v: text.slice(from, to),
            n: from,
            z: to,
            o: offset,
            f: boundary > 0 ? boundary + 1 : 0
        });
        if (type === OPEN || type === CLOSE || type === PE)
            boundary = from
        ;
    }

    while (i < text.length) {
        if (quote) {
            if (text[i] === quote)
                quote = false
            ;
            i++;
            continue;
        }

        if (q.has(text[i])) {
            quote = text[i];
            quoteOffset = clean.starts[i];
            i++;
            continue;
        }

        let match = false;
        for (const item of syntax)
            if (text.startsWith(item.v, i)) {
                match = item;
                break;
            }
        ;

        if (!match) {
            i++;
            continue;
        }

        add(TEXT, start, i);
        add(match.t, i, i + match.v.length);
        i += match.v.length;
        start = i;
    }

    if (quote)
        fail(SyntaxError, 'TSS unclosed quote', source, quoteOffset)
    ;

    add(TEXT, start, i);
    tokens.push({
        t: EOF,
        v: '',
        n: text.length,
        z: text.length,
        o: source.length,
        f: boundary > 0 ? boundary + 1 : 0
    });
    return {
        tokens: tokens,
        text: text
    };
}

function first(tokens, from, to) {
    for (let i = from; i < to; i++)
        if (tokens[i].t !== TEXT || tokens[i].v.trim() !== '')
            return tokens[i]
        ;
    return tokens[to];
}

function countDeclaration(state, token) {
    state.declarations++;
    if (state.declarations > state.limits.declarations)
        fail(
            RangeError,
            'TSS declarations limit exceeded',
            state.source,
            token.o
        )
    ;
}

function assign(target, key, value) {
    target[key] = value;
}

function merge(target, source) {
    for (const key in source)
        assign(target, key, source[key])
    ;
}

function declaration(state, from, end, target) {
    const tokens = state.tokens, stop = tokens[end];
    countDeclaration(state, first(tokens, from, end));
    let separator = -1;
    for (let i = from; i < end; i++)
        if (tokens[i].t === PS) {
            separator = i;
            break;
        }
    ;
    if (separator === -1)
        return
    ;
    const start = from < end ? tokens[from].n : stop.n;
    const key = state.text.slice(start, tokens[separator].n).trim();
    const value = state.text.slice(tokens[separator].z, stop.n).trim();
    assign(target, key, value);
}

function findOutside(value, delimiter, quotes) {
    let quote = false;
    for (let i = 0; i < value.length;) {
        if (quote) {
            if (value[i] === quote)
                quote = false
            ;
            i++;
        } else if (quotes.has(value[i])) {
            quote = value[i];
            i++;
        } else if (value.startsWith(delimiter, i))
            return i
        ; else
            i++
        ;
    }
    return -1;
}

function properties(value, c) {
    const out = {}, q = quoteSet(c);
    let quote = false, start = 0, i = 0;
    while (i < value.length) {
        if (quote) {
            if (value[i] === quote)
                quote = false
            ;
            i++;
        } else if (q.has(value[i])) {
            quote = value[i];
            i++;
        } else if (value.startsWith(c.propertyEnd, i)) {
            const part = value.slice(start, i);
            const separator = findOutside(part, c.propertySeparator, q);
            if (separator !== -1)
                assign(
                    out,
                    part.slice(0, separator).trim(),
                    part.slice(separator + c.propertySeparator.length).trim()
                )
            ;
            i += c.propertyEnd.length;
            start = i;
        } else
            i++
        ;
    }
    return out;
}

function shorthand(state, opening, closing) {
    const tokens = state.tokens, out = {};
    let from = opening + 1, cursor = tokens[opening].z, text = '';
    for (let i = from; i <= closing; i++) {
        if (i !== closing && tokens[i].t !== SS)
            continue
        ;
        const stop = i === closing ? tokens[closing] : tokens[i];
        countDeclaration(state, first(tokens, from, i));
        let separator = -1;
        for (let j = from; j < i; j++)
            if (tokens[j].t === PS) {
                separator = j;
                break;
            }
        ;
        if (separator !== -1) {
            const start = from < i ? tokens[from].n : stop.n;
            assign(
                out,
                state.text.slice(start, tokens[separator].n).trim(),
                state.text.slice(tokens[separator].z, stop.n).trim()
            );
        }
        text += state.text.slice(cursor, stop.n) + state.c.propertyEnd;
        cursor = stop.z;
        from = i + 1;
    }
    return {p: out, t: text};
}

function method(state, part) {
    const tokens = state.tokens;
    let opening = -1, closing = -1;
    for (let i = part.a; i < part.b; i++) {
        if (tokens[i].t === SO && opening === -1)
            opening = i
        ; else if (tokens[i].t === SC && closing === -1)
            closing = i
        ;
    }

    if (closing !== -1 && opening === -1)
        fail(SyntaxError, 'TSS malformed shorthand', state.source, tokens[closing].o)
    ;
    if (opening === -1)
        return {
            name: state.text.slice(part.n, part.z).trim(),
            p: {},
            h: state.text.slice(part.n, part.z),
            d: ''
        }
    ;
    if (closing === -1 || closing < opening)
        fail(SyntaxError, 'TSS malformed shorthand', state.source, tokens[opening].o)
    ;
    if (state.text.slice(tokens[closing].z, part.z).trim() !== '')
        fail(SyntaxError, 'TSS malformed shorthand', state.source, tokens[closing].o)
    ;

    if (tokens[opening].z === tokens[closing].n)
        return {
            name: state.text.slice(part.n, part.z).trim(),
            p: {},
            h: state.text.slice(part.n, part.z),
            d: ''
        }
    ;

    const parsed = shorthand(state, opening, closing);
    return {
        name: state.text.slice(part.n, tokens[opening].n).trim(),
        p: parsed.p,
        h: state.text.slice(part.n, tokens[opening].n),
        d: parsed.t
    };
}

function makeNode(state, selector, methodName, props, token, depth) {
    if (depth > state.limits.depth)
        fail(RangeError, 'TSS depth limit exceeded', state.source, token.o)
    ;
    state.nodes++;
    if (state.nodes > state.limits.nodes)
        fail(RangeError, 'TSS nodes limit exceeded', state.source, token.o)
    ;
    return {
        node: {s: selector || false, m: methodName || false, p: props, c: []},
        depth: depth
    };
}

function header(state, from, to, open, parentSelector, parentDepth) {
    const tokens = state.tokens, parts = [];
    let a = from, n = from < to ? tokens[from].n : open.n, before = false;

    for (let i = from; i < to; i++)
        if (tokens[i].t === METHOD) {
            parts.push({a: a, b: i, n: n, z: tokens[i].n, before: before, after: tokens[i]});
            before = tokens[i];
            a = i + 1;
            n = tokens[i].z;
        }
    ;
    parts.push({a: a, b: to, n: n, z: open.n, before: before, after: false});

    const selector = state.text.slice(parts[0].n, parts[0].z).trim();
    const methods = [];
    for (let i = 1; i < parts.length; i++) {
        const raw = state.text.slice(parts[i].n, parts[i].z);
        if (raw.trim() === '') {
            const token = parts[i].after || parts[i].before;
            fail(SyntaxError, 'TSS empty method', state.source, token.o);
        }
        const item = method(state, parts[i]);
        if (!item.name) {
            const token = parts[i].before || first(tokens, parts[i].a, parts[i].b);
            fail(SyntaxError, 'TSS empty method', state.source, token.o);
        }
        item.token = parts[i].before;
        methods.push(item);
    }

    const at = first(tokens, from, to), chain = methods.length;
    const methodNodes = [];
    let root, owner, depth, built, effective;
    if (methods.length && selector) {
        built = makeNode(state, selector, false, {}, at, parentDepth + 1);
        root = owner = built.node;
        depth = built.depth;
        effective = selector;
    } else if (methods.length) {
        effective = parentSelector || false;
        built = makeNode(
            state,
            effective,
            methods[0].name,
            methods[0].p,
            methods[0].token,
            parentDepth + 1
        );
        root = owner = built.node;
        depth = built.depth;
        methodNodes.push(methods[0]);
        methods.shift();
    } else {
        effective = selector || parentSelector || false;
        built = makeNode(state, effective, false, {}, at, parentDepth + 1);
        root = owner = built.node;
        depth = built.depth;
    }

    for (const item of methods) {
        built = makeNode(
            state,
            effective,
            item.name,
            item.p,
            item.token,
            depth + 1
        );
        owner.c.push(built.node);
        owner = built.node;
        depth = built.depth;
        methodNodes.push(item);
    }
    return {
        root: root,
        owner: owner,
        depth: depth,
        methods: chain,
        methodNodes: methodNodes,
        selector: selector,
        selectorRaw: state.text.slice(parts[0].n, parts[0].z)
    };
}

function virtualLayout(state, roots) {
    const parts = [], frames = [];
    let length = 0;

    function add(value) {
        if (!value)
            return
        ;
        parts.push(value);
        length += value.length;
    }

    function opening(selector, methodName) {
        const frame = {
            s: selector || false,
            m: methodName || false,
            open: length
        };
        frames.push(frame);
        add(state.c.opening);
        return frame;
    }

    function rule(meta) {
        const opened = [];
        if (!meta.methods) {
            add(state.text.slice(meta.start, meta.open.n));
            opened.push(opening(meta.selector, false));
        } else {
            add(meta.selectorRaw);
            if (meta.selector || meta.collision)
                opened.push(opening(meta.selector, false))
            ;
            for (const methodNode of meta.methodNodes) {
                add(state.c.methodSeparator + methodNode.h);
                opened.push(opening(
                    false,
                    methodNode.name
                ));
                add(methodNode.d);
            }
        }

        let from = meta.open.z;
        for (const child of meta.rules) {
            add(state.text.slice(from, child.start));
            rule(child);
            from = child.close.z;
        }
        add(state.text.slice(from, meta.close.n));
        for (let i = opened.length - 1; i >= 0; i--) {
            opened[i].close = length;
            add(state.c.closing);
        }
    }

    let from = 0;
    for (const root of roots) {
        add(state.text.slice(from, root.start));
        rule(root);
        from = root.close.z;
    }
    add(state.text.slice(from));
    return {text: parts.join(''), frames: frames};
}

function pieceRope(text) {
    let seed = 0;
    function priority() {
        seed = (seed + 0x6D2B79F5) | 0;
        let value = seed;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return (value ^ value >>> 14) >>> 0;
    }
    function size(node) {
        return node ? node.z : 0;
    }
    function own(node) {
        return node.s ? node.b - node.a : node.n;
    }
    function update(node) {
        node.z = size(node.l) + own(node) + size(node.r);
        return node;
    }
    function piece(source, from, to, spaces) {
        if ((!source && !spaces) || (source && from === to))
            return false
        ;
        return {
            s: source,
            a: from || 0,
            b: to || 0,
            n: spaces || 0,
            p: priority(),
            l: false,
            r: false,
            z: source ? to - from : spaces
        };
    }
    function merge(left, right) {
        if (!left || !right)
            return left || right
        ;
        if (left.p > right.p) {
            left.r = merge(left.r, right);
            return update(left);
        }
        right.l = merge(left, right.l);
        return update(right);
    }
    function split(node, at) {
        if (!node)
            return [false, false]
        ;
        const left = size(node.l), length = own(node);
        if (at < left) {
            const cut = split(node.l, at);
            node.l = cut[1];
            return [cut[0], update(node)];
        }
        if (at > left + length) {
            const cut = split(node.r, at - left - length);
            node.r = cut[0];
            return [update(node), cut[1]];
        }
        if (at === left) {
            const out = node.l;
            node.l = false;
            return [out, update(node)];
        }
        if (at === left + length) {
            const out = node.r;
            node.r = false;
            return [update(node), out];
        }
        const offset = at - left;
        const first = node.s
            ? piece(node.s, node.a, node.a + offset, 0)
            : piece(false, 0, 0, offset);
        const second = node.s
            ? piece(node.s, node.a + offset, node.b, 0)
            : piece(false, 0, 0, length - offset);
        return [merge(node.l, first), merge(second, node.r)];
    }
    function read(node, from, to, out) {
        if (!node || from >= to)
            return
        ;
        const left = size(node.l), length = own(node);
        if (from < left)
            read(node.l, from, Math.min(to, left), out)
        ;
        const a = Math.max(0, from - left), b = Math.min(length, to - left);
        if (a < b)
            out.push(node.s
                ? node.s.slice(node.a + a, node.a + b)
                : ' '.repeat(b - a))
        ;
        if (to > left + length)
            read(
                node.r,
                Math.max(0, from - left - length),
                to - left - length,
                out
            )
        ;
    }

    let root = piece(text, 0, text.length, 0);
    return {
        slice: function (from, to) {
            const out = [];
            read(root, from, to, out);
            return out.join('');
        },
        blank: function (from, close) {
            const left = split(root, from), right = split(left[1], close + 2 - from);
            root = merge(
                merge(left[0], piece(false, 0, 0, from + close + 2)),
                right[1]
            );
        }
    };
}

function projectedTree(state, roots) {
    const layout = virtualLayout(state, roots), frames = layout.frames;
    const map = offsetMap(layout.text, state.c);
    for (const frame of frames) {
        const last = map[frame.open];
        frame.from = last > 0 ? last + 1 : 0;
    }
    frames.sort((a, b) => b.close - a.close);

    const values = [...new Set(frames.map(frame => frame.from))].sort((a, b) => a - b);
    const ranks = new Map(values.map((value, rank) => [value, rank]));
    const bits = new Uint16Array(values.length + 1), active = new Uint8Array(values.length);
    function add(rank) {
        for (let i = rank + 1; i < bits.length; i += i & -i)
            bits[i]++
        ;
    }
    function count(rank) {
        let out = 0;
        for (let i = rank; i; i -= i & -i)
            out += bits[i]
        ;
        return out;
    }
    function select(order) {
        let rank = 0, step = 1;
        while (step < bits.length)
            step <<= 1
        ;
        for (step >>= 1; step; step >>= 1) {
            const next = rank + step;
            if (next < bits.length && bits[next] < order) {
                rank = next;
                order -= bits[next];
            }
        }
        return rank;
    }
    for (let i = 0; i < frames.length;) {
        let end = i + 1;
        while (end < frames.length && frames[end].close === frames[i].close)
            end++
        ;
        for (let j = i; j < end; j++) {
            const rank = ranks.get(frames[j].from), before = count(rank);
            if (before)
                frames[j].parent = values[select(before)]
            ;
        }
        for (let j = i; j < end; j++) {
            const rank = ranks.get(frames[j].from);
            if (!active[rank]) {
                active[rank] = 1;
                add(rank);
            }
        }
        i = end;
    }

    const groups = new Map();
    for (const frame of frames)
        if (frame.parent !== undefined) {
            if (!groups.has(frame.parent))
                groups.set(frame.parent, [])
            ;
            groups.get(frame.parent).push(frame);
        }
    ;

    const rope = pieceRope(layout.text), processed = new Set(), tree = [];
    function parse(list, parent) {
        for (const frame of list) {
            if (processed.has(frame.from))
                continue
            ;
            processed.add(frame.from);
            const node = {
                s: frame.s,
                m: frame.m,
                p: {},
                c: []
            };
            if (!parent)
                tree.push(node)
            ; else if (frame.parent === parent.frame.from) {
                if (!node.s && parent.node.s)
                    node.s = parent.node.s
                ;
                parent.node.c.push(node);
            }
            const children = groups.get(frame.from);
            if (children)
                parse(children, {frame: frame, node: node})
            ;
            node.p = properties(
                rope.slice(frame.open + state.c.opening.length, frame.close),
                state.c
            );
            node.c.reverse();
            rope.blank(frame.from, frame.close);
        }
    }
    parse(frames, false);
    tree.reverse();
    return tree;
}

function parseRule(state, parentSelector, parentDepth, parent) {
    const tokens = state.tokens, from = state.i;
    let open = from;
    while (tokens[open].t !== OPEN) {
        if (tokens[open].t === CLOSE)
            fail(SyntaxError, 'TSS unexpected closing delimiter', state.source, tokens[open].o)
        ;
        if (tokens[open].t === EOF) {
            const token = first(tokens, from, open);
            fail(SyntaxError, 'TSS expected rule', state.source, token.o);
        }
        open++;
    }

    const opening = tokens[open];
    const projectedFrom = opening.f;
    const collision = !!parent && projectedFrom === parent.from;
    const built = header(
        state,
        from,
        open,
        opening,
        parentSelector,
        parentDepth
    );
    const meta = {
        root: built.root,
        owner: built.owner,
        depth: built.depth,
        start: from < open ? tokens[from].n : opening.n,
        from: projectedFrom,
        open: opening,
        close: false,
        rules: [],
        collision: collision,
        methods: built.methods,
        methodNodes: built.methodNodes,
        selector: built.selector,
        selectorRaw: built.selectorRaw,
        declarations: false
    };
    state.i = open + 1;
    const natural = {};

    while (true) {
        let stop = state.i;
        while (
            tokens[stop].t !== PE &&
            tokens[stop].t !== OPEN &&
            tokens[stop].t !== CLOSE &&
            tokens[stop].t !== EOF
        )
            stop++
        ;

        if (tokens[stop].t === PE) {
            declaration(state, state.i, stop, natural);
            meta.declarations = true;
            state.i = stop + 1;
        } else if (tokens[stop].t === OPEN) {
            const child = parseRule(state, built.owner.s, built.depth, meta);
            meta.rules.push(child);
            built.owner.c.push(child.root);
        } else if (tokens[stop].t === CLOSE) {
            meta.close = tokens[stop];
            state.i = stop + 1;
            break;
        } else
            fail(SyntaxError, 'TSS unclosed block', state.source, opening.o)
        ;
    }

    if (collision || (meta.rules.length && meta.declarations))
        state.compat = true
    ;
    merge(built.owner.p, natural);
    const pair = {from: meta.from, open: opening.n, close: meta.close.n};
    if (parent)
        pair.parent = parent.from
    ;
    state.pairs.push(pair);
    return meta;
}

function parseSheet(parser, source, scanned) {
    const state = {
        c: parser.c,
        limits: parser.limits,
        source: source,
        text: scanned.text,
        tokens: scanned.tokens,
        i: 0,
        nodes: 0,
        declarations: 0,
        compat: false,
        pairs: []
    };
    const tree = [], roots = [];

    while (state.tokens[state.i].t !== EOF) {
        let end = state.i;
        while (state.tokens[end].t === TEXT && state.tokens[end].v.trim() === '')
            end++
        ;
        if (state.tokens[end].t === EOF) {
            state.i = end;
            break;
        }
        if (state.tokens[end].t === CLOSE)
            fail(
                SyntaxError,
                'TSS unexpected closing delimiter',
                source,
                state.tokens[end].o
            )
        ;
        const rule = parseRule(state, false, 0, false);
        tree.push(rule.root);
        roots.push(rule);
    }

    state.pairs.sort((a, b) => b.close - a.close);
    return {tree: tree, pairs: state.pairs, roots: roots, state: state};
}

function configValue(config, key, fallback) {
    const value = config[key];
    if (!value)
        return fallback
    ;
    if (typeof value !== 'string' || value.length > 64)
        invalid()
    ;
    return value;
}

module.exports = {
    jTormTSSParser: {
        c: {},

        find: function (from) {
            const stack = [...this.tree];
            while (stack.length) {
                const node = stack.shift();
                if (node.pair && node.pair.from === from)
                    return node
                ;
                stack.unshift(...node.c);
            }
            return 0;
        },

        whitespace: function (times) {
            return ' '.repeat(Math.max(0, times + 1));
        },

        sortPairs: function () {
            const r = {};
            for (const p of this.pairs) {
                for (const key in r)
                    if (p.from > r[key].from && p.close < r[key].close)
                        p.parent = r[key].from
                    ;
                r[p.from] = p;
            }
        },

        parseCharacter: function (character, tss) {
            const out = [];
            let position = 0, next = 0;
            while ((next = tss.indexOf(character, position)) > -1) {
                position = next + 1;
                out.push(next);
            }
            return out;
        },

        parseOpenings: function (tss) {
            return this.parseCharacter(this.c.opening, tss);
        },

        parseClosings: function (tss) {
            return this.parseCharacter(this.c.closing, tss);
        },

        parseChildren: function () {
            for (const pair of this.pairs) {
                const header = this.tss.slice(pair.from, pair.open);
                const parts = header.split(this.c.methodSeparator);
                const selector = parts[0].trim();
                if (selector && parts.length > 1) {
                    const methods = parts.slice(1);
                    const body = this.tss.slice(
                        pair.open + this.c.opening.length,
                        pair.close
                    );
                    let out = selector + this.c.opening;
                    for (const methodName of methods)
                        out += this.c.methodSeparator + methodName + this.c.opening
                    ;
                    out += body + this.c.closing.repeat(methods.length + 1);
                    this.tss = this.tss.slice(0, pair.from) + out +
                        this.tss.slice(pair.close + this.c.closing.length);
                    return 1;
                }
            }
            return 0;
        },

        parseFrom: function () {
            for (const pair of this.pairs) {
                let last = 0;
                const header = this.tss.slice(0, pair.open);
                for (const delimiter of [this.c.opening, this.c.closing, this.c.propertyEnd]) {
                    const found = header.lastIndexOf(delimiter);
                    if (found > last)
                        last = found
                    ;
                }
                pair.from = last ? last + 1 : 0;
            }
        },

        hasChildren: function (i, openings, closings) {
            let children = false;
            for (let next = i + 1; next < openings.length; next++) {
                if (openings[next] < closings[i]) {
                    children = [next, i];
                    if (next === openings.length - 1)
                        return children
                    ;
                } else if (children)
                    return children
                ;
            }
            return false;
        },

        parseShorthandProperties: function (value) {
            const opening = findOutside(
                value,
                this.c.propertyShorthandOpening,
                quoteSet(this.c)
            );
            const closing = value.lastIndexOf(this.c.propertyShorthandClosing);
            const selector = value.slice(0, opening);
            const body = value.slice(
                opening + this.c.propertyShorthandOpening.length,
                closing
            ).split(this.c.propertyShorthandSeparator).join(this.c.propertyEnd);
            return {s: selector, p: body + this.c.propertyEnd};
        },

        parseProperties: function (value) {
            return properties(value, this.c);
        },

        parsePairs: function (openings, closings) {
            const events = [];
            for (const open of openings)
                events.push({open: true, at: open})
            ;
            for (const close of closings)
                events.push({open: false, at: close})
            ;
            events.sort((a, b) => a.at - b.at || (a.open ? -1 : 1));

            const stack = [], pairs = [];
            for (const event of events)
                if (event.open)
                    stack.push(event.at)
                ; else if (stack.length)
                    pairs.push({open: stack.pop(), close: event.at})
                ;
            pairs.sort((a, b) => b.close - a.close);
            this.pairs = pairs;
            this.parseFrom(0);

            for (const pair of pairs) {
                let parent = false;
                for (const candidate of pairs)
                    if (
                        candidate.open < pair.open &&
                        candidate.close > pair.close &&
                        (!parent || candidate.close - candidate.open < parent.close - parent.open)
                    )
                        parent = candidate
                    ;
                if (parent)
                    pair.parent = parent.from
                ;
            }
        },

        parse: function (tss, pairs, currentPairs, parent, processed) {
            let value, node, children, pair;
            for (pair of currentPairs) {
                if (processed.includes(pair.from))
                    continue
                ;
                processed.push(pair.from);
                value = tss.slice(pair.from, pair.open);
                const parts = value.split(this.c.methodSeparator);
                if (parts[0])
                    parts[0] = parts[0].trim()
                ;
                node = {pair: pair, s: false, m: false, p: [], c: []};
                if (parts[0])
                    node.s = parts[0]
                ; else if (parts[1])
                    node.m = parts[1].trim()
                ;
                if (!parent)
                    this.tree.push(node)
                ; else if (pair.parent === parent.pair.from) {
                    if (!node.s && parent.s)
                        node.s = parent.s
                    ;
                    parent.c.push(node);
                }
                children = pairs.filter(item => pair.from === item.parent);
                if (children.length)
                    tss = this.parse(tss, pairs, children, node, processed)
                ;
                node.p = this.parseProperties(tss.slice(pair.open + 1, pair.close));
                node.c.reverse();
                tss = tss.slice(0, pair.from) +
                    this.whitespace(pair.from + pair.close + 1) +
                    tss.slice(pair.close + 2);
            }
            return tss;
        },

        clean: function (tree) {
            const stack = [...tree];
            while (stack.length) {
                const node = stack.pop();
                delete node.pair;
                stack.push(...node.c);
            }
        },

        quotes: function (value) {
            const expression = this.regexes.quotes;
            expression.lastIndex = 0;
            return value.replace(expression, '');
        },

        config: function (config) {
            if (!config || typeof config !== 'object' || Array.isArray(config))
                invalid()
            ;
            const c = {
                opening: configValue(config, 'opening', '{'),
                closing: configValue(config, 'closing', '}'),
                propertySeparator: configValue(config, 'propertySeparator', ':'),
                propertyEnd: configValue(config, 'propertyEnd', ';'),
                propertyShorthandOpening: configValue(config, 'propertyShorthandOpening', '('),
                propertyShorthandClosing: configValue(config, 'propertyShorthandClosing', ')'),
                propertyShorthandSeparator: configValue(config, 'propertyShorthandSeparator', ','),
                methodSeparator: configValue(config, 'methodSeparator', '->')
            };

            const q = config.quotes ? config.quotes : "'";
            if (
                !(
                    (typeof q === 'string' && q.length === 1) ||
                    (
                        Array.isArray(q) &&
                        q.length > 0 &&
                        q.every(value => typeof value === 'string' && value.length === 1)
                    )
                )
            )
                invalid()
            ;
            c.quotes = q;

            const syntax = [
                c.opening,
                c.closing,
                c.propertySeparator,
                c.propertyEnd,
                c.propertyShorthandOpening,
                c.propertyShorthandClosing,
                c.propertyShorthandSeparator,
                c.methodSeparator
            ];
            const configuredQuotes = quoteSet(c);
            if (
                new Set(syntax).size !== syntax.length ||
                syntax.some(value =>
                    [...value].some(character => WS.test(character)) ||
                    value.startsWith('/*') ||
                    value.startsWith('//') ||
                    configuredQuotes.has(value[0])
                )
            )
                invalid()
            ;

            const limits = {...HARD}, supplied = config.limits;
            if (supplied) {
                if (typeof supplied !== 'object' || Array.isArray(supplied))
                    invalid()
                ;
                for (const key of Object.keys(supplied)) {
                    if (!Object.hasOwn(HARD, key))
                        invalid()
                    ;
                    const value = supplied[key];
                    if (
                        !Number.isSafeInteger(value) ||
                        value < 1 ||
                        value > HARD[key]
                    )
                        invalid()
                    ;
                    limits[key] = value;
                }
            }

            const configuredRegexes = regexes(c);
            for (const key in c)
                this.c[key] = c[key]
            ;
            this.regexes = configuredRegexes;
            this.max = HARD;
            this.limits = Object.freeze(limits);
        },

        handle: function (tss) {
            this.tree = [];
            this.pairs = [];
            this.tss = '';
            if (typeof tss !== 'string')
                throw new TypeError('TSS source must be a string')
            ;

            try {
                const scanned = tokenize(this, tss);
                this.tss = scanned.text;
                const parsed = parseSheet(this, tss, scanned);
                this.tree = (
                    this.c.opening.length === 1 &&
                    this.c.closing.length === 1 &&
                    this.c.propertyEnd.length === 1 &&
                    parsed.state.compat
                ) ? projectedTree(parsed.state, parsed.roots) : parsed.tree;
                this.pairs = parsed.pairs;
                return this.tree;
            } catch (error) {
                this.tree = [];
                this.pairs = [];
                this.tss = '';
                throw error;
            }
        }
    }
};
