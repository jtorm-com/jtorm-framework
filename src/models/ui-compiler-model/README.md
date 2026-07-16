# jTorm UI Compiler Model

Compiles resolved UI mapper descriptors into TSS `get`, nested `ui`, and parent-target nodes.

## Install

```js
npm install @jtorm/ui-compiler-model
```

The host injects the handler, compatibility method registry, and view model:

```js
jTormUiCompilerModel.handler = jTormHandler;
jTormUiCompilerModel.methods = methods;
jTormUiCompilerModel.viewModel = jTormViewModel;
```

Compilation preserves mapper `h/t/d` artifacts, nested `ui`, parent-target `pT`, and conditional `di` behavior without mutating the supplied descriptor. Conditional methods execute through `handler.dispatch()` with prepared data, so aliases, validation, gates, and method events match normal rendering.
