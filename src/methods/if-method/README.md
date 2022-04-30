# jTorm If Method

Todo klopt niks meer van die parameters
## Config

| Option | Type     | Required | Description |
|--------|----------|----------|-------------|
| `d`    | `data`   | `true`   | Data |
| `v`    | `regex`  | `false`  | Test the data within the `if` scope using a regexp |
| `u`    | `string` | `false`  | Use Data within `if` scope |
| `else` | `method` | `false`  | When no data, it looks for an element with method "else". If it exists, then the TSS children will be used as an alternative. |
| `eu`   | `string` | `false`  | Use Data within `else` scope |
| `to`   | 'string' | `false`  | type check, check if `array`, `string`, `number`, etc for example |

## Example

Below an example when data component exists, use that, else use a default component (list.default).

```js
.mdc-drawer__content->append {
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

Another example with data scopes.

```js
var html = '<h1></h1>',
    tss = `
h1 {
  ->if {
    d: doHeader;
    u: header;
    ->replace {
      h: heading;
    }
    ->else {
      eu: header2;
      ->replace {
        h: heading;
      }
    }
  }
}
`,
    data = {
      doHeader: true,
      header: {
        heading: "If Heading"
      },
      header2: {
        heading: "Else Heading"
      }
    };

result = await jTorm.handle(html, tss, JSON.parse(JSON.stringify(data)));
// <h1>If Heading</h1>

data.doHeader = false;
result = await jTorm.handle(html, tss, JSON.parse(JSON.stringify(data)));
// <h1>Else Heading</h1>
```