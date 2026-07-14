# jTorm Regex Policy Model

Validates and evaluates the bounded regular-expression subset used by `if(r: true)`.
It is a small policy language, not a general JavaScript-regex sanitizer.

## Install

```js
npm install @jtorm/regex-policy-model
```

## API

- `validate(pattern)` throws `Unsafe regex pattern` unless the pattern belongs to
  the supported subset.
- `test(pattern, subject)` revalidates the pattern, rejects subjects over 1,024
  UTF-16 code units, and returns the native match result.

Patterns are limited to 256 UTF-16 code units. The subset accepts ASCII
letters/digits and `-:/`, dot wildcards, escaped dot/slash, the exact classes
`[0-9]`, `[a-z]`, `[A-Z]`, `[.]`, and `[\x0A\x0D\u2028\u2029]`, branch-boundary
anchors, alternation, and capturing groups nested at most two deep.

`?` may quantify an atom or finite group without an inner quantifier, at most twice.
`+` may quantify only dot or `[.]`, `[0-9]`, `[a-z]`, or `[A-Z]` in a
start-anchored pattern, at most once and without top-level alternation. It cannot
quantify the line-break class. The exact shipped `^([0-9]+x[0-9]+)|(any)$` pattern
is the sole two-`+`/top-level-alternation exception. The only lookaround is the
exact fixed-width `(?!ListItem$)` immediately after root `^`.

All other syntax—including `*`, `{m,n}`, shorthand/arbitrary classes,
backreferences, other lookarounds, repeated groups, and non-capturing groups—fails
closed before native compilation.
