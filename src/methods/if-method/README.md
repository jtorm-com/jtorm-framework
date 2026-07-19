# jTorm If Method

If / Else method.


## Install

```js
npm install @jtorm/if-method
```


## Properties

| Option | Type     | Required | Description                                                        |
|--------|----------|----------|--------------------------------------------------------------------|
| `d`    | `data`   | `false`  | Data; when omitted, test the current model.                        |
| `v`    | `string` or `boolean` | `false`  | Test the data within the `if` scope using a literal value or boolean. |
| `el`   | `string` | `false`  | Element to check if exists.                                        |
| `to`   | `string` | `false`  | Type check, check if `array`, `string`, `number`, etc for example. |
| `r`    | `boolean`| `false`  | Treat a quoted TSS `v` value as a bounded safe-subset regular expression. |

String values are literal substring checks. They are not regular expressions.
Regular expression matching is opt-in via `r: true` and only accepts a single quoted TSS
literal; model-derived or concatenated regex operands are rejected.
When `d` is omitted, a null current model is a false condition rather than a compound
binding expression.

The host injects the bounded regex policy model before configuring the method:

```js
jTormIfMethod.regexPolicyModel = jTormRegexPolicyModel;
```

### Regular-expression subset

`r: true` is a small validation-pattern language, not a general JavaScript-regex
sanitizer. `@jtorm/regex-policy-model` owns validation and bounded native execution. A pattern
is limited to 256 UTF-16 code units and may contain:

- ASCII letters/digits and the literal characters `-`, `:`, and `/`; `.` is the
  wildcard, while literal dot/slash may be written as `\.` and `\/`;
- the exact classes `[0-9]`, `[a-z]`, `[A-Z]`, `[.]`, and the shipped line-break
  class `[\x0A\x0D\u2028\u2029]`;
- branch-boundary `^`/`$`, alternation, and capturing groups nested at most two deep;
- `?` on an atom or a finite group with no inner quantifier, at most twice per pattern;
- `+` on `.`, `[.]`, `[0-9]`, `[a-z]`, or `[A-Z]` in a start-anchored branch, at
  most once per pattern and with no top-level alternation; the line-break class
  cannot be quantified. The shipped fixed-delimiter form
  `^([0-9]+x[0-9]+)|(any)$` is the sole two-`+`/top-level-alternation exception;
- the exact fixed-width negative lookahead `(?!ListItem$)`, only immediately after a
  branch-start `^`.

Everything else—including `*`, `{m,n}`, shorthand classes, backreferences, other
lookarounds, repeated groups, and non-capturing groups—is rejected before compilation.
Each matched subject is limited to 1,024 UTF-16 code units and is rejected before
matching when oversized. Rejections throw `Unsafe regex pattern` or `Unsafe regex input`.
Missing or malformed host injection throws `Regex policy model not configured` before
any pattern is compiled.


## Example

```js
body->append {
  ->if {
    d: component;
    
    ->ui {
      component: component;
    }
    
    ->else {
      ->ui {
        component: "list.default";
      }
    }
  }
}
```
