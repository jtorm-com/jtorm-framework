# jTorm Components UI

Framework-neutral, dependency-free UI components for jTorm. The package maps stable component intents to semantic HTML fallback templates and TSS. It adds no runtime JavaScript, CSS, framework dependency, event behavior, network request, storage, or analytics.

The fallback is intentionally unstyled. It owns safe text insertion, native semantics, documented attributes, and accessibility structure. Hosts and future framework adapters own visual design, focus appearance, contrast, motion, layout, and pointer target size.

## Install

```sh
npm install @jtorm/components-ui
```

Register the exported singleton through the host's existing UI dependency-injection setup:

```js
const { jTormComponentsUI } = require('@jtorm/components-ui');
```

## Canonical catalog

| Component | Required data | Optional data | Native fallback |
|-----------|---------------|---------------|-----------------|
| button.default | label | type, disabled, form, name, value, root fields | neutral button |
| button.primary | label | same as default | primary-intent button |
| button.secondary | label | same as default | secondary-intent button |
| button.destructive | label | same as default | destructive-intent button |
| badge.default | label or count | root fields | non-interactive span |
| alert.default | heading, message | root fields | named region |
| alert.info | heading, message | root fields | named region |
| alert.success | heading, message | root fields | named status |
| alert.warning | heading, message | root fields | named region |
| alert.error | heading, message | root fields | named alert |
| card.default | heading | summary, action, root fields | named article |
| accordion.default | items | root fields | disclosure group |
| accordion.item | summary, content | open, root fields | details/summary |
| loading.default | none | label, root fields | visible status |

Canonical variants are intent names, not framework names. Later adapters may replace templates and class hooks without changing these names or data contracts.

## Usage

A host invokes a canonical component through the existing ui verb:

```tss
.checkout-action->ui {
    c: 'button.primary';
}
```

```js
{
    label: 'Continue to review',
    type: 'button',
    id: 'continue',
    class: 'checkout-action'
}
```

A card action is an explicit normal link:

```js
{
    heading: 'Delivery options',
    summary: 'Compare available delivery times.',
    action: {
        href: '/delivery',
        label: 'View delivery options'
    }
}
```

An accordion is an ordered array of independent native disclosures. Multiple items may be open:

```js
{
    items: [
        { summary: 'Shipping', content: 'Ships in two business days.', open: true },
        { summary: 'Returns', content: 'Returns are accepted for 30 days.' }
    ]
}
```

## Rendering and cache layers

Canonical fallbacks render in two phases:

1. A private `*-shell.tss` artifact builds only invariant semantic structure and literal fallback hooks. Its parent binding artifact invokes that shell inside a child-bearing append with a versioned `cid`, so the existing UI fragment cache may reuse the resulting bytes.
2. The binding artifact validates the canonical object model, then reads documented fields directly from `source` after the shell is present. It does not create a mirrored `->data` namespace: the current model stays per-render, while labels, IDs, classes, state, URLs, and other caller fields never execute inside the cached shell iteration.

This is separate from the UI resolver cache, which stores resolved descriptors rather than rendered HTML. With the UI-cache plugin disabled, or without a valid scoped cache discriminator, the same layers render cold and retain identical output. A cache hit restores a fresh detached shell before binding, so concurrent or later renders cannot reuse a prior caller's values.

Composition owners must not wrap the completed binding artifact in another `cid` iteration: that outer cache would snapshot caller-bound output even though the component's inner shell is safe. Invoke the canonical component on the ordinary render path and let its private shell own fragment reuse. `@jtorm/schema-ui` 0.1.2 removes the historical whole-component cache around `WebPage.default`'s loading fallback for this reason.

Fallback cache IDs use `jtorm/components-ui-<package-version>/<shell>` with the `default` structural variant. The source ratchet requires every ID to match the package version and requires shell parameters to remain literal. A release that changes shell structure must therefore bump the package and its IDs together. A host that changes its resolver/native-template configuration independently must purge these fragment IDs or isolate the new configuration in another UI-cache namespace before serving it. Future framework adapters own distinct versioned shell IDs; they must not share fallback cache entries unless their structure is byte-compatible.

## Data contract

### Shared root fields

The following optional fields apply only to a component root:

| Field | Shape | Behavior |
|-------|-------|----------|
| id | string | Caller-owned; never synthesized |
| class | string | Appended to jtorm fallback hooks |
| lang | string | Inherited naturally by descendants |
| dir | string: ltr, rtl, or auto | Non-string or invalid values are omitted |

Unknown fields are not copied to the root or descendants. In particular, title, style, tabindex, hidden, event attributes, arbitrary data attributes, and arbitrary ARIA attributes are not accepted by this foundation.
Each canonical component accepts one object model. Top-level arrays, scalars, functions, and null emit no component; `accordion.items` is the only collection field in this foundation and the host must bound attacker-influenced item counts.
Accordion iteration reads only canonical own enumerable array indices. Inherited properties and named array properties are ignored.

The documented model is the binding contract. Canonical TSS reads only its approved fields directly; unknown fields are inert because no selector or sink consumes them. `->data` is reserved for an actually derived value, such as badge label/count normalization, or an internal alias handoff that avoids mutating accordion items. Pure member copies rooted at `source`, including whole-model and renamed-field copies, are rejected by the source contract.


Button additionally accepts string form, name, and value fields. disabled and accordion open are enabled only by the boolean value true.

### Required copy

Required visible copy must be a truthy primitive string. The current bounded TSS grammar cannot distinguish Unicode whitespace-only strings safely, so hosts and adapters must reject whitespace-only accessible names before rendering.

All caller copy must already be localized. The package translates only the built-in Loading fallback through the existing language model. A truthy primitive-string loading label wins; missing, empty, or non-string values retain the localized fallback.

Badge count is contractually a string or number. label wins when both label and count are present, and numeric zero is preserved. Hosts validate other count types.

### Button type

Canonical buttons always receive type="button" first. Only the exact primitive strings button, reset, and submit may override it. Non-string, invalid, or missing values retain type="button"; values beyond the existing regex-policy input bound abort through that policy rather than bypass validation.

### Card action

action has this shape:

```js
{ href: '/path', label: 'Visible link text' }
```

The link renders only when both fields are truthy strings. href passes through the existing guarded attribute sink; unsafe javascript, data, or vbscript schemes abort the render with the established Unsafe attribute href error.

## Security boundary

Caller-visible values use the escaped insert t: path. Canonical artifacts expose no caller-bound raw h: slot and accept no arbitrary attributes. The html-ui packages provide trusted native templates with their automatic global transforms disabled; components then set only the documented attributes.

The existing fragment cache can retain only trusted, data-free shell markup for these canonical components. Caller and localized values are applied afterward and are absent from both live and persisted shell entries. Cache scoping, TTL, persistence access control, and administrative invalidation remain owned by the host and `@jtorm/ui-cache-model`.

These components are presentation only. A button intent does not authorize or execute an action. The host must own:

- authorization on every action;
- destructive confirmation where appropriate;
- execution and error recovery;
- audit logging;
- undo or compensating actions;
- collection-size limits for attacker-influenced accordion data.

Do not pass secrets as visible labels, messages, summaries, or content. Visible component data is intentionally serialized into the DOM.

## Accessibility ownership

The fallback provides:

- native button behavior and safe non-submit default;
- native details/summary disclosure behavior;
- visible accessible names;
- named article and alert containers;
- reviewed alert role mapping;
- visible loading status without a permanently busy live region;
- an aria-hidden decorative loading indicator;
- no redundant explicit aria-live attributes;
- no synthesized global IDs.

Use alert.error and alert.success for newly inserted, time-sensitive feedback. Use alert.default or alert.info for static informational content so initial page rendering does not create unnecessary announcements.
When a host updates a separate region asynchronously, it owns `aria-busy` on that actual region and must clear the state when the update completes. The static loading status does not claim or manage that lifecycle.


Alert and card heading fields are visible title copy rendered with emphasis. The foundation does not impose a document heading level; the host owns the surrounding page hierarchy.

A visual adapter must additionally verify WCAG 2.2 AA contrast, visible focus, zoom/reflow, reduced motion, pointer target size, spacing, and responsive layout. The base's class hooks alone are not a visual-conformance claim.

## Ethical persuasion

Use intent to clarify a real choice:

- keep button.default neutral;
- choose primary only for the user's expected next step;
- make destructive actions visibly distinct in the adapter;
- use explicit action wording;
- present consent choices with balanced prominence;
- show truthful badge counts and status messages;
- keep material terms outside collapsed content when users need them to decide.

Do not use these components for fabricated popularity, false urgency, disguised advertising, hidden fees or terms, preselected consent, obstructive cancellation, confirm-shaming, or treating a visual variant as proof of authority.

## Adapter invariants

A future framework adapter may change HTML templates where it provides accessibility-equivalent behavior, class names, and asset URLs. It must preserve:

- all canonical component and variant names;
- required and optional data shapes;
- label/count precedence and numeric zero;
- native behavior or an accessibility-equivalent implementation;
- type="button" for missing or invalid canonical button types;
- neutral, primary, secondary, and destructive intent;
- visible destructive treatment;
- alert role mapping and accessible names;
- escaped caller copy and guarded URLs;
- visible loading status without permanent busy state;
- root-only attribute isolation;
- one disclosure per valid canonical own `accordion.items` index;
- data-free shell caching followed by per-render binding of caller and localized values;
- a distinct versioned cache identity for adapter-specific structure;
- no hidden data collection or fabricated persuasive signals;
- host ownership of authorization and action execution.

The jtorm-* classes are unstyled fallback hooks. They are not adapter input fields or a promise that every adapter emits the same classes.

## Compatibility and migration

Version 0.1.0 adds the canonical foundation without removing any published key or export. The legacy recipes remain available with their existing behavior:

- button.primaryButton
- button.secondaryButton
- button.primaryAnchor
- button.secondaryAnchor

New code should use canonical label-based button variants. The legacy recipes retain their historical html field behavior for compatibility and are not the canonical safe-copy contract.

badge.default keeps the historical badge class and adds jtorm-badge. Its mapper no longer pre-injects an empty span; missing data now emits nothing, label takes precedence, and zero renders.

loading.default intentionally changes structure: it removes the synthesized id="loading", adds status semantics and jtorm hooks, exposes a localized visible fallback, accepts a caller-owned id, and leaves transient `aria-busy` lifecycle to the host. Update selectors that depended on the historical nested wrapper or implicit ID.

When composing loading.default through WebPage.default, use `@jtorm/schema-ui` 0.1.2 or newer. Earlier schema-ui releases cached the completed loading subtree under `cid: 'loading'`; 0.1.2 removes that parent cache so each render binds its current label and root fields while the private loading shell remains reusable.

No framework adapter, CSS, runtime JavaScript, or resolver/compiler change is included.

## Rollback

Before publishing, revert the feature commit. After publishing, consumers can pin @jtorm/components-ui@0.0.6 and restore the previous UI registration/manifest while a corrective 0.1.1 is prepared. Published versions are not deleted. There is no database or caller-data migration to roll back.

If UI-cache persistence is enabled, evict the seven `jtorm/components-ui-0.1.0/*-shell` IDs for each relevant scoped `null` language/`default` variant (or clear the isolated UI-cache namespace) during rollback. Older code does not request those versioned IDs, so leaving them until TTL/eviction is safe for rendering but may retain unused static bytes.
