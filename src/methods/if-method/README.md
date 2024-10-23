# jTorm If Method

If / Else method.


## Install

```js
npm install @jtorm/if-method
```


## Properties

| Option | Type     | Required | Description                                                        |
|--------|----------|----------|--------------------------------------------------------------------|
| `d`    | `data`   | `true`   | Data.                                                              |
| `v`    | `regex`  | `false`  | Test the data within the `if` scope using a regexp or boolean.     |
| `el`   | `string` | `false`  | Element to check if exists.                                        |
| `to`   | `string` | `false`  | Type check, check if `array`, `string`, `number`, etc for example. |


## Example

```js
body->append {
  ->if {
    d: component;
    
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
