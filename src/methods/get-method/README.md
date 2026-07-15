# jTorm Get Method

## Install
```js
npm install @jtorm/get-method
```

## Properties

| Option | Type     | Required | Description         |
|--------|----------|----------|---------------------|
| `h`    | `string` | `false`  | HTML template path. |
| `t`    | `string` | `false`  | TSS path.           |
| `d`    | `string` | `false`  | Data path.          |


## Example

```js
->get {
    t: 'path/to/global.tss';
}
```

## UI closure manifests

Hosts may inject `@jtorm/ui-manifest-model` as an optional lookup overlay:

```js
getMethod.models = { data: dataModel, html: htmlModel, tss: tssModel };
getMethod.manifest = manifestModel;
```

Prepare manifests on the root view context before the handler starts. A packed hit has the exact
same data, HTML, or parsed-TSS shape as the existing model. An unpacked optional namespace falls
through to the unchanged model; a missing asset owned by a required namespace fails loud. The
manifest model still runs the injected request URL policy for packed hits and required misses.

Hosts that do not inject `manifest` retain the existing request waterfall and behavior.
