# jTorm Bootstrap UI

Bootstrap `^5.3.8` presentation for the 15 canonical `@jtorm/components-ui` variants. The adapter keeps the canonical model, semantic HTML, safe text/URL binding, localization, and static-shell cache. It adds fixed Bootstrap classes afterward.

The package contains no Bootstrap CSS or JavaScript, runtime import, event handler, `data-bs-*` attribute, automatic Bootstrap asset request, model translation, or fragment-cache identity. Its trusted `@b/*.tss` presentation artifacts are acquired through the host's existing jTorm TSS/request path, just like the canonical `@c/*.tss` artifacts.

## Install

Install the canonical component package, this adapter, and optionally Bootstrap's npm package:

```sh
npm install @jtorm/components-ui @jtorm/bootstrap-ui bootstrap@^5.3.8
```

`bootstrap` is an optional peer because a host may self-host or otherwise provide a compatible Bootstrap `^5.3.8` stylesheet. The adapter is intentionally unstyled when that CSS is absent.

Register the singleton through the host's existing UI dependency-injection setup:

```js
const { jTormBootstrapUI } = require('@jtorm/bootstrap-ui');

jTormUiMethod.uis = [
    jTormSchemaUi,
    jTormComponentsUI,
    jTormBootstrapUI,
    jTormHtmlUi
];
jTormUiMethod.framework = 'bootstrap';
await jTormUiMethod.init();
```

`framework` is shared singleton configuration: set it during host initialization, not per request or concurrently. Use the per-call `f: 'bootstrap'` selector for mixed-framework rendering. Call `init()` after changing the registered UI packages or configured framework so the existing resolved-descriptor cache is rebuilt.

## Load Bootstrap CSS in the host

With a bundler:

```js
import 'bootstrap/dist/css/bootstrap.min.css';
```

Or link an exact, self-hosted build:

```html
<link rel="stylesheet" href="/assets/bootstrap-5.3.8.min.css">
```

The host owns the exact version, Content Security Policy, Subresource Integrity for third-party delivery, offline caching, global Reboot effects, color mode, theme overrides, and upgrade testing. This package does not load a CDN URL implicitly. Bootstrap JavaScript is not required or supported by this adapter.

## Usage and data

Canonical component calls and models do not change:

```tss
.checkout-action->ui {
    c: 'button.primary';
}
```

```js
{
    label: 'Continue to review',
    type: 'button',
    class: 'checkout-action'
}
```

Select Bootstrap for one call when it is not the host default:

```tss
.checkout-action->ui {
    c: 'button.primary';
    f: 'bootstrap';
}
```

The complete field and validation contract remains documented by `@jtorm/components-ui`. Do not add Bootstrap class names or `data-bs-*` values to the component model. The canonical `class` field is trusted host styling and is appended as-is; avoid intent-class conflicts unless an intentional host override has been tested.

## Mapping

| Canonical component | Bootstrap treatment |
|---|---|
| `button.default` | `btn btn-secondary` |
| `button.primary` | `btn btn-primary` |
| `button.secondary` | `btn btn-outline-secondary` |
| `button.destructive` | `btn btn-danger` |
| `badge.default` | `badge text-bg-secondary` |
| `alert.default` | `alert alert-secondary` |
| `alert.info` | `alert alert-info` |
| `alert.success` | `alert alert-success` |
| `alert.warning` | `alert alert-warning` |
| `alert.error` | `alert alert-danger` |
| `card.default` | `card` plus spacing/title/text/link classes |
| `accordion.group` | native disclosure root plus the `accordion` class |
| `accordion.default` | native disclosure root/items plus accordion/item/header/body classes and utilities |
| `accordion.item` | native disclosure item plus item/header/body classes and utilities |
| `loading.default` | inline-flex layout plus a small border spinner |

`badge` already comes from the canonical shell and is not duplicated by the overlay.

## Native accordion contract

Accordion items remain native `details` and `summary` elements. The adapter does not emit Bootstrap Collapse's `accordion-button`, `accordion-collapse`, `collapse`, `collapsed`, or `show` state classes and does not synthesize `aria-expanded`. Multiple disclosures may be open, native keyboard behavior remains available without JavaScript, and an explicit outer `f: 'bootstrap'` styles nested items even when the host's global framework is different.

This is a Bootstrap-themed native accordion, not stock Bootstrap Collapse markup. If a future design requires structurally identical Collapse behavior, it needs a separate reviewed interaction/state owner rather than adding hidden JavaScript coupling here.

Schema-owned projections resolve their nested canonical calls through the globally configured framework. Configure `framework = 'bootstrap'` for `FAQPage.accordion` presentation. An explicit outer `f: 'bootstrap'` that misses this mapper and falls back to schema does not propagate into nested calls when the global framework is different; this adapter does not change resolver context semantics.

## Rendering and cache layers

Each descriptor runs in a fixed order:

1. the canonical `@c` artifact restores/builds a trusted static shell and binds the current model;
2. the `@b` overlay appends literal Bootstrap classes to that fresh result.

Both are required TSS artifacts served through the host's existing request policy and optional UI-manifest path. If an `@b` artifact is unavailable or denied, the existing request/get failure remains loud; the adapter does not silently return a partially styled success. Hosts therefore own reliable same-origin/package serving or manifest preparation for both aliases.

The adapter creates no shell and no `cid`. Existing `jtorm/components-ui-0.2.0/*-shell` entries therefore stay framework-neutral and contain neither caller data nor Bootstrap classes. Warm and persisted cache hits restore canonical structure, bind current caller/localized data, and then receive presentation classes again.

If a future adapter version changes HTML structure, it must use Bootstrap-owned versioned shell IDs; it must not write adapter structure into canonical component cache entries.

## Accessibility and progressive enhancement

The adapter preserves canonical native elements, visible names, roles, URL safety, escaped text, loading status semantics, and disclosure state. The supported components remain meaningful if CSS fails and functional if JavaScript never loads.

The host must validate its deployed Bootstrap build and theme for:

- WCAG 2.2 AA contrast and visible focus;
- keyboard and touch use;
- 200%/400% zoom and reflow;
- RTL and localized long copy;
- forced colors and light/dark modes;
- reduced motion if host overrides introduce animation.

Bootstrap classes are not by themselves a conformance claim.

## Security and ethical UX

The adapter reads no caller value into a Bootstrap class, asset path, raw-HTML sink, or behavior attribute. Invalid canonical models emit no new component and cannot restyle a pre-existing canonical hook. Card URLs continue through the canonical unsafe-scheme guard.

Visual intent is presentation only. The host still owns authorization, destructive confirmation, action execution, error recovery, audit, and undo. Keep the default button neutral, make destructive actions clear, and do not use badges/alerts for fabricated popularity, urgency, scarcity, authority, consent, or status.

## Compatibility, upgrade, and rollback

Version 0.2.0 adds the root-only `accordion.group` overlay and targets the canonical `@jtorm/components-ui` 0.2 contract. Existing 0.1 overlays retain their strict gates and output. Bootstrap `^5.3.8` remains the optional peer. Test Bootstrap upgrades and custom Sass/variable builds in the host before deployment because CSS behavior is outside this package's bytes.

To roll back the coordinated feature, stop selecting `FAQPage.accordion`, pin `@jtorm/bootstrap-ui@0.1.0` with `@jtorm/components-ui@0.1.0` and `@jtorm/schema-ui@0.1.2`, restore matching manifests, and call the resolver initialization path. Alternatively remove `jTormBootstrapUI` from the injected `uis`, restore the previous `framework`, and remove the Bootstrap stylesheet only if no other UI uses it. No data migration or Bootstrap-owned fragment-cache purge is required because this adapter creates no stored data or cache entry.
