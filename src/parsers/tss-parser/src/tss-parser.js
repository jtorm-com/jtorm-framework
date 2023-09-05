/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
  jTormTSSParser: {
    c: {},

    find: function (from) {
      const s = this;
      let tmp, k;

      for (k in s.tree) {
        if (s.tree[k].pair.from === from)
          return s.tree[k];

        if (s.tree[k].c.length > 0) {
          tmp = s.find(s.tree[k].c);
          if (tmp)
            return tmp;
        }
      }
      return 0;
    },

    whitespace: function (times) {
      let r = '', i = 0;

      for (i; i <= times; i++)
        r += ' ';

      return r;
    },

    sortPairs: function () {
      let r = {}, p, k2;
      for (p of this.pairs) {
        for (k2 in r)
          if (p.from > r[k2].from && p.close < r[k2].close)
            p.parent = r[k2].from;
        r[p.from] = p;
      }
    },

    parseCharacter: function (character, tss) {
      let r = [], pos = 0, next = 0;
      while ((next = tss.indexOf(character, pos)) > -1) {
        pos = next + 1;
        r.push(next);
      }
      return r;
    },

    parseOpenings: function (tss) {
      return this.parseCharacter(this.c.opening, tss);
    },

    parseClosings: function (tss) {
      return this.parseCharacter(this.c.closing, tss);
    },

    parseChildren: function () {
      const s = this;
      let i, sl, r, ps, t, p;

      for (p of s.pairs) {
        sl = s.tss.substring(p.from, p.open);
        ps = sl.split(s.c.methodSeparator);
        t = ps[0].trim();

        if ((t === '' && ps.length > 2) || (t !== '' && ps.length > 1)) {
          if (ps[0].trim() !== '')
            r = ps[0] + s.c.opening + s.c.methodSeparator;
          else {
            r = s.c.methodSeparator + ps[1] + s.c.opening + s.c.methodSeparator;
            ps.shift();
          }

          ps.shift();

          r += ps.join(s.c.opening + s.c.methodSeparator);
          r += s.tss.substring(p.open, p.close);
          for (i = 0; i <= ps.length; i++)
            r += s.c.closing;

          s.tss = s.tss.substring(0, p.from) + r + s.tss.substring(p.close + 1);

          return 1;
        } else if (t === '' && /\(.+\)/s.test(sl)) {
          r = s.parseShorthandProperties(ps[1]);
          s.tss = s.tss.substring(0, p.from) + s.c.methodSeparator + r.s + s.c.opening + r.p + s.tss.substring(p.open + 1);
          return 1;
        }
      }
      return 0;
    },

    parseFrom: function (start) {
      const s = this;
      let withinBrackets, delimiter, findSelector, lastDelimiter, test, pair;
      for (pair of s.pairs) {
        withinBrackets = s.tss.substring(pair.open, pair.close);
        findSelector = s.tss.substring(start, pair.open);
        lastDelimiter = start;
        for (delimiter of [s.c.opening, s.c.closing, s.c.propertyEnd]) {
          test = findSelector.lastIndexOf(delimiter);
          if (test > lastDelimiter)
            lastDelimiter = test;
        }
        pair.from = (lastDelimiter) ? lastDelimiter + 1 : 0;
      }
    },

    hasChildren: function (i, openings, closings) {
      let hc = false, i2;
      for (i2 = i + 1; i2 < openings.length; i2++) {
        if (openings[i2] < closings[i]) {
          hc = [i2, i];
          if (i2 === (openings.length - 1))
            return hc;
        } else if (hc)
          return hc;
      }
      return false;
    },

    parseShorthandProperties: function (p) {
      let
        m = this.regexes['propertyShorthandOpening'].exec(p),
        s = p.substring(0, m.index);

      p = p.substring(m.index + 1);

      do {
        m = this.regexes['propertyShorthandSeparator'].exec(p);
        if (m)
          p = p.substring(0, m.index) + this.c.propertyEnd + p.substring(m.index + 1);
      } while (m);

      m = this.regexes['propertyShorthandClosing'].exec(p);
      p = p.substring(0, m.index) + this.c.propertyEnd;

      return {s: s, p: p};
    },

    parseProperties: function (str) {
      let r = {}, m, m2, i = 0, v, k, p;
      do {
        m = this.regexes['propertyEnd'].exec(str);
        if (m) {
          p = str.substring(i, m.index);
          m2 = this.regexes['propertySeparator'].exec(p);

          if (m2) {
            k = p.substring(0, m2.index).trim();
            v = p.substring(m2.index + 1).trim();
            r[k] = v;
          }

          str = this.whitespace(m.index) + str.substring(m.index + 1);
          i = m.index + 1;
        }
      } while (m);

      return r;
    },

    parsePairs: function (openings, closings) {
      const s = this;
      let hc, open, close, i;

      for (i = 0; i < openings.length; i++) {
        hc = s.hasChildren(i, openings, closings);
        if (hc) {
          open = hc[0];
          close = hc[1];
        } else {
          open = i;
          close = i;
        }

        s.pairs.push({open: openings[open], close: closings[close]});
        openings.splice(open, 1);
        closings.splice(close, 1);

        if (openings.length > 0)
          return s.parsePairs(openings, closings);
      }
      s.pairs.reverse();
      s.parseFrom(0);
      s.sortPairs();
    },

    parse: function (tss, pairs, currentPairs, parent, processed) {
      const s = this;
      let v, c, tmpP, p, k, parts;

      for (p of currentPairs) {
        if (processed.indexOf(p.from) !== -1)
          continue;
        processed.push(p.from);
        v = tss.substring(p.from, p.open);

        parts = v.split(s.c.methodSeparator);

        if (parts[0])
          parts[0] = parts[0].trim();

        c = {
          pair: p,
          s: false,
          m: false,
          p: [],
          c: []
        };

        if (parts[0])
          c.s = parts[0];
        else if (parts[1])
          c.m = parts[1].trim();

        if (!parent) {
          s.tree.push(c);
        } else if (parent && c.pair.parent === parent.pair.from) {
          if (!c.s && parent.s)
            c.s = parent.s;
          parent.c.push(c);
        }

        tmpP = [];
        for (k in pairs)
          if (p.from === pairs[k].parent)
            tmpP.push(pairs[k]);

        if (tmpP.length > 0)
          tss = s.parse(tss, pairs, tmpP, c, processed);

        c.p = s.parseProperties(tss.substring((p.open + 1), p.close));
        c.c.reverse();

        tss = tss.substring(0, p.from) + s.whitespace((p.from + p.close + 1)) + tss.substring((p.close + 2), tss.length);
      }

      return tss;
    },

    clean: function (tree) {
      for (let tss of tree) {
        delete tss.pair;
        if (tss.c.length > 0)
          this.clean(tss.c);
      }
    },

    quotes: function (v) {
      const r = this.regexes.quotes;
      r.lastIndex = 0;
      return v.replace(r, '')
    },

    config: function (config) {
      this.c.opening = config.opening ? config.opening : '{';
      this.c.closing = config.closing ? config.closing : '}';
      this.c.propertySeparator = config.propertySeparator ? config.propertySeparator : ':';
      this.c.propertyEnd = config.propertyEnd ? config.propertyEnd : ";";
      this.c.propertyShorthandOpening = config.propertyShorthandOpening ? config.propertyShorthandOpening : "(";
      this.c.propertyShorthandClosing = config.propertyShorthandClosing ? config.propertyShorthandClosing : ")";
      this.c.propertyShorthandSeparator = config.propertyShorthandSeparator ? config.propertyShorthandSeparator : ",";
      this.c.methodSeparator = config.methodSeparator ? config.methodSeparator : '->';
      this.c.quotes = config.quotes ? config.quotes : ['"', "'", '`'];

      const
        q = this.c.quotes.join(''),
        r = '(?=(?:[^' + q + ']|[' + q + '][^' + q + ']*[' + q + '])*$)';

      this.regexes = {
        clean: /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
        cleanWhiteSpace: /\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm,
        propertySeparator: new RegExp(this.c.propertySeparator + r, 'm'),
        propertyEnd: new RegExp(this.c.propertyEnd + r, 'm'),
        propertyShorthandOpening: new RegExp('\\' + this.c.propertyShorthandOpening + r, 'm'),
        propertyShorthandClosing: new RegExp('\\' + this.c.propertyShorthandClosing + r, 'm'),
        propertyShorthandSeparator: new RegExp(this.c.propertyShorthandSeparator + r, 'm'),
        quotes: new RegExp('(' + this.c.quotes.join('|') + ')+', 'gm')
      };
    },

    handle: function (tss) {
      const s = this, r = s.regexes.clean, c = s.regexes.cleanWhiteSpace;

      s.tree = [];

      r.lastIndex = 0;
      tss = tss.replace(r, '$1');

      c.lastIndex = 0;
      tss = tss.replace(c, ' ');

      s.tss = tss;

      do {
        s.pairs = [];
        s.parsePairs(s.parseOpenings(s.tss), s.parseClosings(s.tss));
      } while (s.parseChildren());

      s.pairs = [];
      s.parsePairs(s.parseOpenings(s.tss), s.parseClosings(s.tss));
      s.parse(s.tss, s.pairs, s.pairs, 0, []);
      s.clean(s.tree);
      s.tree.reverse();

      return s.tree;
    }
  }
};
