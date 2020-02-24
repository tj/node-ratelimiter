# ratelimiter

Rate limiter for Node.js backed by Redis.
  
> **NOTE**: Promise version available at [async-ratelimiter](https://github.com/microlinkhq/async-ratelimiter).

[![Build Status](https://travis-ci.org/tj/node-ratelimiter.svg)](https://travis-ci.org/tj/node-ratelimiter)

## Release Notes
[v3.4.1](https://github.com/tj/node-ratelimiter/tree/v3.4.1) - [#55](/../../issues/55) by [@barwin](https://github.com/barwin) - Remove splice operation.

[v3.3.1](https://github.com/tj/node-ratelimiter/tree/v3.3.1) - [#51](/../../issues/51) - Remove tidy option as it's always true.

[v3.3.0](https://github.com/tj/node-ratelimiter/tree/v3.3.0) - [#47](/../../pull/47) by [@penghap](https://github.com/penghap) - Add tidy option to clean old records upon saving new records. Drop support in node 4.

[v3.2.0](https://github.com/tj/node-ratelimiter/tree/v3.2.0) - [#44](/../../pull/44) by [@xdmnl](https://github.com/xdmnl) - Return accurate reset time for each limited call.

[v3.1.0](https://github.com/tj/node-ratelimiter/tree/v3.1.0) - [#40](/../../pull/40) by [@ronjouch](https://github.com/ronjouch) - Add reset milliseconds to the result object.

[v3.0.2](https://github.com/tj/node-ratelimiter/tree/v3.0.0) - [#33](/../../pull/33) by [@promag](https://github.com/promag) - Use sorted set to limit with moving window.

[v2.2.0](https://github.com/tj/node-ratelimiter/tree/v2.2.0) - [#30](/../../pull/30) by [@kp96](https://github.com/kp96) - Race condition when using `async.times`.

[v2.1.3](https://github.com/tj/node-ratelimiter/tree/v2.1.3) - [#22](/../../pull/22) by [@coderhaoxin](https://github.com/coderhaoxin) - Dev dependencies versions bump.

[v2.1.2](https://github.com/tj/node-ratelimiter/tree/v2.1.2) - [#17](/../../pull/17) by [@waleedsamy](https://github.com/waleedsamy) - Add Travis CI support.

[v2.1.1](https://github.com/tj/node-ratelimiter/tree/v2.1.1) - [#13](/../../pull/13) by [@kwizzn](https://github.com/kwizzn) - Fixes out-of-sync TTLs after running decr().

[v2.1.0](https://github.com/tj/node-ratelimiter/tree/v2.1.0) - [#12](/../../pull/12) by [@luin](https://github.com/luin) - Adding support for ioredis.

[v2.0.1](https://github.com/tj/node-ratelimiter/tree/v2.0.1) - [#9](/../../pull/9) by [@ruimarinho](https://github.com/ruimarinho) - Update redis commands to use array notation.

[v2.0.0](https://github.com/tj/node-ratelimiter/tree/v2.0.0) - **API CHANGE** - Change `remaining` to include current call instead of decreasing it. Decreasing caused an off-by-one problem and caller could not distinguish between last legit call and a rejected call.

## Requirements

- Redis 2.6.12+
- Node 6.0.0+

## Installation

```
$ npm install ratelimiter
```

## Example

 Example Connect middleware implementation limiting against a `user._id`:

```js
var id = req.user._id;
var limit = new Limiter({ id: id, db: db });
limit.get(function(err, limit){
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
 - `reset` - time since epoch in seconds at which the rate limiting period will end (or already ended)
 - `resetMs` - time since epoch in milliseconds at which the rate limiting period will end (or already ended)

## Options

 - `id` - the identifier to limit against (typically a user id)
 - `db` - redis connection instance
 - `max` - max requests within `duration` [2500]
 - `duration` - of limit in milliseconds [3600000]

# License

  MIT
