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

Iteration dispatch accepts an opaque extra lifecycle token. The event tree and before/after
buckets are unchanged. `complete(v, 'iteration', token)` walks the existing `after.iteration`
bucket and calls optional `completeIteration(v, token)` hooks only after the ordinary after chain
succeeds. One completion hook may return a deferred commit function; it runs only after every
completion hook succeeds, and competing commits fail before either runs. This lets the UI cache
publish after other lifecycle participants can no longer reject the iteration.
`abort(v, 'iteration', token, error)` calls optional `abortIteration` hooks for cleanup; every hook
is attempted and cleanup failures are suppressed so they cannot replace the original render
failure. Existing plugins may ignore the extra argument and need no new event registration block.
