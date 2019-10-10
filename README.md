EQUEUE
======

EQUEUE is execution queue, management task execution timing.

Examples
--------

### series execution when state is ready

In some cases, we want to start an ordered task when a global state is ready, such as sending a series of instructions when the socket is ready.

The recommended implementation of equeue is to share a `queue.Series` instance, then use series.exec() to send the instruction, and call the series.start at the socket ready time.

code example:

``` {.javascript}
const equeue = require('./');

(async() => {
    let ret = [];
    let series = new equeue.Series();
    let instructions = [1, 2, 3];
    instructions.forEach(async item => {
        ret.push(await series.exec(() => item));
    }); // Send instructions may be scattered in different locations of the system

    console.log(ret); // []
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(ret); // []

    series.start(); // maybe called after socket ready
    await new Promise(resolve => setTimeout(resolve, 10));
    console.log(ret); // [1, 2, 3]
})();
```

### delay execution

In some cases, we want to delay the execution of the code, just like calling `setTimeout`. But `setTimeout` can't be executed after the process restarts. So `equeue` provides a deferred execution of the queue mode, and save task in `Redis`, the task will notbe lost after the restart.

code example:

``` {.javascript}
const BB = require('bluebird');
const redis = require('redis');

BB.promisifyAll(redis.RedisClient.prototype);
BB.promisifyAll(redis.Multi.prototype);

const equeue = require('equeue');

(async() => {
    let client = await new Promise(resolve => {
        let client = redis.createClient();

        client.on('ready', () => resolve(client));
    });

    let delay = new equeue.Delay({}, client);

    delay.on('error', err => {
        console.error(err);
    });
    delay.listen(async task => {
        // if there throw error
        // the task will be emit again and again 
        // until there is no error or reach task ttl limit

        console.log(task); // { foo: 'foo', bar: 'bar' }
    });

    let task = {
        foo: 'foo',
        bar: 'bar'
    };
    delay.push(task, 3600 * 24); // the task will be emit after 24 hours later
})();
```

> Currently `equeue.Delay` depends a redis client instance, in the future, the same purpose may be achieved by passing the redis configuration.

ref: [redis](https://github.com/NodeRedis/node_redis)
