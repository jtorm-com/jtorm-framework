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

## FAQPage accordion

Version 0.2.0 adds the opt-in `FAQPage.accordion` variant. `FAQPage.default`
and `FAQPage.link` remain unchanged, and the package does not publish broad
`Question` or `Answer` defaults.

The supported projection is deliberately narrow:

```js
{
    '@type': 'FAQPage',
    mainEntity: [{
        '@type': 'Question',
        name: 'How does this work?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'With native details and summary elements.'
        }
    }]
}
```

All three `@type` values must be exact primitive strings. `mainEntity` must
be an array, each supported question must have a truthy string `name`, and
`acceptedAnswer` must be one non-array `Answer` object with a truthy string
`text`. Malformed entries are skipped independently. A valid empty or
all-invalid array renders one empty canonical group; an invalid root renders
nothing. Iteration reads only own canonical array indices. Hosts must bound
attacker-influenced collection sizes and string lengths before rendering.
Ordinary schema data paths retain the framework's JavaScript property-lookup
contract, so inherited supported values can qualify; hosts must pass plain
content objects with validated own properties. Hosts must also reject
whitespace-only question names before rendering because a truthy whitespace
string does not provide a useful disclosure name.

The adapter passes only derived `{summary, content}` models into
`@jtorm/components-ui`; unrelated schema fields cannot become attributes,
markup, behavior, or cached data. Question and answer copy uses the canonical
escaped-text path and the caller model is not mutated.

Configure the host's global UI framework as `bootstrap` to receive the
optional `@jtorm/bootstrap-ui` presentation. An explicit outer framework that
falls back to schema is not inherited by nested component calls. The projection
keeps native independent `details` disclosures and requires no Bootstrap
JavaScript.

The existing JSON-LD plugin independently serializes the original eligible
root; the projection does not rewrite or normalize structured data. Hosts own
visible/structured-data parity, content policy, and search-engine eligibility.
No rich-result eligibility is claimed by this package.

## WebPage loading cache

Version 0.1.2 removes WebPage.default's historical whole-component `loading`
fragment cache. The canonical loading component now binds every render's current
label and root fields outside any parent cache while its private, literal-only
shell remains reusable through `@jtorm/components-ui`.

## Compatibility and rollback

`@jtorm/schema-ui@0.2.0` depends on `@jtorm/components-ui@^0.2.0`. Its
published singleton intentionally retains the legacy
`jtorm/schema-ui-0.0.4/src` asset namespace so existing schema artifact URLs
remain stable.

To roll back, stop selecting `FAQPage.accordion`, pin the coherent
`@jtorm/schema-ui@0.1.2`, `@jtorm/components-ui@0.1.0`, and
`@jtorm/bootstrap-ui@0.1.0` set, restore or regenerate manifests with those
identities, and reinitialize the resolver before rendering new roots. No caller
data or schema is migrated; 0.2 canonical cache entries are static, data-free,
and isolated by their versioned IDs.
