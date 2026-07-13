# jTorm UI Method

Orchestrates the `ui` TSS verb. Registry resolution lives in `@jtorm/ui-resolver-model`; descriptor compilation lives in `@jtorm/ui-compiler-model`.

## Install
```js
npm install @jtorm/ui-method
```

## Host wiring

```js
jTormUiMethod.resolverModel = jTormUiResolverModel;
jTormUiMethod.compilerModel = jTormUiCompilerModel;
jTormUiMethod.dataParser = jTormDataParser;
jTormUiCompilerModel.methods = methods;
jTormUiCompilerModel.viewModel = jTormViewModel;
```

Inject the models before assigning `jTormUiMethod.uis`, `ui`, or `framework`. The existing state and helper names remain forwarding facade entries; new consumers should use the dedicated models directly.

An implicit component resolves through the trusted host custom mapper, the configured framework, then registered frameworks in order. An explicit `f` skips the custom mapper.


## Properties

| Option | Type      | Required | Description                                                                                     |
|--------|-----------|----------|-------------------------------------------------------------------------------------------------|
| `c`    | `string`  | `true`   | Component registered by an UI package.                                                          |
| `f`    | `string`  | `false`  | Registered framework, fallback `default` if set, else first key/value in object.                |
| `t`    | `boolean` | `false`  | Use component TSS.                                                                              |
| `h`    | `boolean` | `false`  | Use component HTML.                                                                             |
| `m`    | `boolean` | `false`  | Use mediatarget check if suffixes exists registered by it e.g. defaultDesktopL, defaultTabletS. |


Use mediatarget does not work for the fallback to default, you have to explicit define it, e.g. WPHeader > WPHeader.default.


## Example

```js
body->append->ui {
    c: '@e.header';
}
```
