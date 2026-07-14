# jTorm Attribute Method

Manipulate an attribute with help of the [getAttribute method](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute).

## Install

```js
npm install @jtorm/attr-method
```


## Properties

| Option | Type     | Required | Description                                             |
|--------|----------|----------|---------------------------------------------------------|
| `n`    | `string` | `true`   | Attribute name.                                         |
| `v`    | `string` | `true`   | Attribute value (not required when method=remove).      |
| `m`    | `string` | `false`  | Method a:append, p:prepend, r:remove, (empty):replace.  |
| `ns`   | `boolean`| `false`  | Add no white space between existing attribute value(s). |
| `a`    | `string` | `false`  | Append to value.                                        |
| `p`    | `string` | `false`  | Prepend to value.                                       |

Remove mode with `v` removes the exact whitespace-delimited attribute token after trimming surrounding value whitespace.
The value is treated as literal text, not regular expression syntax.


## Safety

Event-handler attribute names (`on*`) are rejected. `srcdoc` requires a sandbox
without `allow-scripts`; sandbox cannot be removed or changed to `allow-scripts`
while `srcdoc` is present. URL-bearing attributes (`cite`, `href`, `longdesc`,
`src`, `srcset`, `action`, `formaction`, `poster`, `data`, `xlink:href`) reject
`javascript:`, `data:`, and `vbscript:` schemes.

`style` is an allowlisted color micro-grammar, not a general CSS sanitizer. It
accepts only `color` and `background-color` declarations whose values are a
3/4/6/8-digit hexadecimal color, `transparent`, or `currentColor`. Multiple
semicolon-separated declarations and an optional trailing semicolon are allowed;
functions, at-rules, comments, escapes, custom properties, `!important`, and all
other properties and values are rejected.

Every URL in a space-separated `ping` value must resolve to the actual HTTP(S)
document origin. Relative values resolve against the document base first, so an
external `<base>` does not widen the allowed origin. Invalid URLs, non-HTTP(S)
schemes, and cross-origin URLs are rejected. Detached render fragments use the
document wrapper's live root document, so they retain the eventual page URL/base
contract before insertion. Accepted tokens are written as absolute URLs so a later
base change cannot retarget them. This checks the URL written to the attribute, not
later server redirects; allowed origins must not expose an open redirect to
untrusted destinations and must enforce normal request controls.


## Example

```js
div->attr {
    n: 'class';
    v: 'row';
    m: 'a';
}
```
