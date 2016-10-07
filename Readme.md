# node-ratelimiter

  Rate limiter for Node.js.

[![Build Status](https://travis-ci.org/tj/node-ratelimiter.svg)](https://travis-ci.org/tj/node-ratelimiter)

## Release Notes
v3.1.0 - [#7](https://github.com/marmelab/node-ratelimiter/pull/7) - Fix memory adapter & [#8](https://github.com/marmelab/node-ratelimiter/pull/8) new id retrieval method (no breaking change)

[v3.0.0](https://github.com/marmelab/node-ratelimiter/tree/v3.0.0) - Add multiple adapters support (redis, memory, null)

[v2.1.2](https://github.com/tj/node-ratelimiter/tree/v2.1.2) - [#17](/../../pull/17) by [@waleedsamy](https://github.com/waleedsamy) - Add Travis CI support

[v2.1.1](https://github.com/tj/node-ratelimiter/tree/v2.1.1) - [#13](/../../pull/13) by [@kwizzn](https://github.com/kwizzn) - Fixes out-of-sync TTLs after running decr()

[v2.1.0](https://github.com/tj/node-ratelimiter/tree/v2.1.0) - [#12](/../../pull/12) by [@luin](https://github.com/luin) - Adding support for ioredis

[v2.0.1](https://github.com/tj/node-ratelimiter/tree/v2.0.1) - [#9](/../../pull/9) by [@ruimarinho](https://github.com/ruimarinho) - Update redis commands to use array notation.

[v2.0.0](https://github.com/tj/node-ratelimiter/tree/v2.0.0) - **API CHANGE** - Change `remaining` to include current call instead of decreasing it. Decreasing caused an off-by-one problem and caller could not distinguish between last legit call and a rejected call.

## Requirements

- Redis 2.6.12+.

## Installation

```
$ npm install node-ratelimiter
```

## Example

 Example Connect middleware implementation limiting against a `user._id`:

```js
var Limiter = require('node-ratelimiter');
var redisAdapter = Limiter.redisAdapter;

var limiter = new Limiter({ id: req.user._id }, redisAdapter(redis.createClient()));

limiter.newHit(function(err, limit){
  if (err) return next(err);

  res.set('X-RateLimit-Limit', limit.total);
  res.set('X-RateLimit-Remaining', limit.remaining - 1);
  res.set('X-RateLimit-Reset', limit.reset);

  // all good
  debug('remaining %s/%s %s', limit.remaining - 1, limit.total, id);
  if (limit.remaining) return next();

  // not good
  var delta = (limit.reset * 1000) - Date.now() | 0;
  var after = limit.reset - (Date.now() / 1000) | 0;
  res.set('Retry-After', after);
  res.send(429, 'Rate limit exceeded, retry in ' + ms(delta, { long: true }));
});
```

## Result Object
 - `total` - `max` value
 - `remaining` - number of calls left in current `duration` without decreasing current `get`
 - `reset` - time in milliseconds until the end of current `duration`

## Options

- `id` - the identifier to limit against (typically a user id)
 - `max [Number]` - max requests within `duration` [2500]
 - `duration [Number]` - of limit in milliseconds [3600000]

# Adapters

## RedisAdapter

Initialize a new adapter with:

```js
var redis = require('redis');
var Limiter = require('node-ratelimiter');
var redisAdapter = Limiter.redisAdapter;

var adapter = redisAdapter(redis.createClient());
```

## MemoryAdapter

This adapter is meant to be used in dev. **Do not use it in production**.

Initialize a new adapter with:

```js
var Limiter = require('node-ratelimiter');
var memoryAdapter = Limiter.memoryAdapter;

var adapter = memoryAdapter();
```

## NullAdapter

This adapter is meant to be used for tests only when you want to disable the rate limiting.

Initialize a new adapter with:

```js
var Limiter = require('node-ratelimiter');
var nullAdapter = Limiter.nullAdapter;

var adapter = nullAdapter();
```

## Custom adapter

The adapter passed to the `Limiter` constructor should be a function accepting the following parameters:
- `id [String]`: the identifier being limited (for example: an ip address)
- `max [Number]`: the number of calls accepted before being rate-limited
- `duration [Number]`: the duration after which the counter will be reset

The function should return an object with the following methods:
- `newHit()`: registers a new hit and returns the result object
  - `total` - `max` value
  - `remaining` - number of calls left in current `duration` without decreasing current `get`
  - `reset` - time in milliseconds until the end of current `duration`

- `get()`: returns the result object without increasing the hit counter
  - `total` - `max` value
  - `remaining` - number of calls left in current `duration` without decreasing current `get`
  - `reset` - time in milliseconds until the end of current `duration`

# License

  MIT
