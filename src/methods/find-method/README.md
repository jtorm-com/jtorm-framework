# jTorm Find Method

Find an element based on a selector with variables in it for example.


## Config

| Option | Type   | Required | Description |
|--------|--------|----------|-------------|
| `e`    | `string` | `true`   | Element     |


## Example

Below an example when data component exists, use that, else use a default component (list.default).

```js
->config(n: current_url)
->find(e: 'a[href="' + current_url + '"]')
->attr {
    n: 'class';
    v: 'active';
    m: 'a';
}
```
