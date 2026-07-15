# jTorm - Javascript Template ORM

## Goal
We believe a general data model like [Schema.org](https://schema.org/) benefits different areas in the development of web applications.

We also believe there should be some consensus about generally known UI components, accordions, modals, tabs, etc., how it should look and function.

That combined, in feeding a template engine a schema markup that knows how to parse it based on its contents and desired UI framework, is what jTorm ultimately is trying to achieve.
But also having the freedom to do something different.

## UI closure manifests

Applications may precompile a trusted UI component closure with
`@jtorm/ui-manifest-compiler`, then prepare the content-addressed JSON through
`@jtorm/ui-manifest-model` before rendering. `@jtorm/get-method` uses the prepared root-local index
when injected and otherwise preserves the existing data/HTML/TSS waterfall.

The compiler follows the existing resolver and parsers, records dynamic model-bound edges instead
of executing them, and emits parsed model-free assets. Runtime loading is bounded, validates the
wire format and SHA-256 against a host-pinned expected hash, and continues to enforce the existing
request URL policy. See the package READMEs for the build and host wiring contracts.

## Credits
The idea is heavily inspired from [Transphporm](https://github.com/Level-2/Transphporm), all credits go to them in finding a different way to handle template rendering.

[Rinnert Deelstra](https://gitlab.com/rdeelstra) from [Webmakkers](www.webmakkers.com) initially built it, and hopefully in the near future others will join to discover its potential together.
