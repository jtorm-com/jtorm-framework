# jTorm UI Resolver Model

Resolves custom and registered UI mapper components, aliases, framework fallbacks, cache entries, and asset URLs.

## Install

```js
npm install @jtorm/ui-resolver-model
```

Configure `ui` (the optional trusted host mapper), `uis`, and `framework`, then call `init()`. Implicit lookup uses the custom mapper first; explicit framework lookup bypasses it. `init()` rebuilds alias regexes and clears resolved-component cache state.
