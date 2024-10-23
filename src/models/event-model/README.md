# jTorm Event Model

Manage events.

## Install
```js
npm install @jtorm/event-model
```


## How To

By default, there are three main events where you can add plugins to before and after execution.
With a weight you can set the order in which the plugins are processed.
The main events are iteration (handler-wrapper), method (handler) and view (can be added around execution).


### Example

In your plugin class, register it by setting the desired location with a weight like this:
```js
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },
```

And by naming the handler function accordingly, in this case `afterView`:
```js
        handlerName: {
            before: {
                iteration: 'beforeIteration',
                method: 'beforeMethod',
                view: 'beforeView'
            },
            after: {
                iteration: 'afterIteration',
                method: 'afterMethod',
                view: 'afterView'
            }
        },
```

You can view the `@jtorm/ui-cache-plugin` as an example.