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


## Example

```js
div->attr {
    n: 'class';
    v: 'row';
    m: 'a';
}
```
