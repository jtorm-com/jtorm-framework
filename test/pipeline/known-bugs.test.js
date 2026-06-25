'use strict';

// Characterizations of suspect/known-broken behavior. As items are fixed, their
// test moves to the relevant positive suite. See jtorm-code-review.md #25-27.
//
// RESOLVED — no open characterizations remain:
//   #25 unwrap/wrap set() signature mismatch — FIXED (test/pipeline/wrap-unwrap.test.js)
//   #26 data-parser unresolved-var regression (incl. dead if &&/||) — FIXED
//       (test/parsers/data-parser-var-semantics.test.js)
//   #27 find child-scoping: the chained child targeted the find rule's own
//       selector instead of the descendant — FIXED (test/pipeline/find.test.js);
//       root cause was document-model.getSelector() returning the bare ancestor
//       selector instead of a `<ancestor> <descendant>` scope.
