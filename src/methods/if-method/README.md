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
| `v`    | `string` or `boolean` | `false`  | Test the data within the `if` scope using a literal value or boolean. |
| `el`   | `string` | `false`  | Element to check if exists.                                        |
| `to`   | `string` | `false`  | Type check, check if `array`, `string`, `number`, etc for example. |
| `r`    | `boolean`| `false`  | Treat a quoted TSS `v` value as a trusted regular expression.      |

String values are literal substring checks. They are not regular expressions.
Regular expression matching is opt-in via `r: true` and only accepts quoted TSS
literals; model-derived regex operands are rejected.


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
