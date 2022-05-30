# jTorm Session Method

## Install

```js
npm install @jtorm/session-method
```

## Config

| Option | Type  | Required | Description |
|--------|-------|----------|-------------|
| `k`    | `any` | `true`   | Key |
| `v`    | `any` | `false`  | Value it has to match |


## Example

Below an example when data component exists, use that, else use a default component (list.default).

```js
.mdc-drawer__content->append {
  ->if {
    data: component;
    ->ui {
      component: component;
    }
    ->else {
      ->ui {
        component: "list.default";
      }
    }
  }
}
```