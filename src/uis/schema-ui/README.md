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
Numeric `price: 0` is preserved. Official `ItemAvailability` values receive
human-readable labels; unknown values remain escaped text. Every field is
optional, and all data-bound text uses the framework's escaped text path.
