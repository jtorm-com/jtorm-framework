# jTorm Schema UI

## Install

```js
npm install @jtorm/schema-ui
```

## Product and Offer

`Product.default` renders product detail and `Product.item` adds the item/card
variant. Both reuse `Thing` for `name`, `description`, `image`, and `url`, then
add `sku`, `gtin`, `brand`, and nested `offers`. `image` uses the existing
structured `ImageObject` path. This first slice accepts one schema.org `Brand`
or `Organization` object with `name` and optional `url`; brand arrays are not
yet rendered. `Product.offers` accepts either one `Offer` object or an array of
`Offer` objects through the same guarded composition.

`Offer.default` renders `price`, `priceCurrency`, `availability`, and `url`.
Numeric `price: 0` is preserved. Canonical HTTP(S) schema.org
`ItemAvailability` IRIs receive human-readable labels; all other values remain
escaped text. Rendering does not mutate caller-owned `Product` or `Offer`
objects. Every field is optional, and all data-bound text uses the framework's
escaped text path.

## WebPage loading cache

Version 0.1.2 removes WebPage.default's historical whole-component `loading`
fragment cache. The canonical loading component now binds every render's current
label and root fields outside any parent cache while its private, literal-only
shell remains reusable through `@jtorm/components-ui`.
