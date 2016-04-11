# ratelimiter

  Rate limiter for Node.js backed by Redis.

[![Build Status](https://travis-ci.org/tj/node-ratelimiter.svg)](https://travis-ci.org/tj/node-ratelimiter)

## Release Notes
[v2.1.3](https://github.com/tj/node-ratelimiter/tree/v2.1.3) - [#22](/../../pull/22) by [@coderhaoxin](https://github.com/coderhaoxin) - Dev dependencies versions bump

[v2.1.2](https://github.com/tj/node-ratelimiter/tree/v2.1.2) - [#17](/../../pull/17) by [@waleedsamy](https://github.com/waleedsamy) - Add Travis CI support

[v2.1.1](https://github.com/tj/node-ratelimiter/tree/v2.1.1) - [#13](/../../pull/13) by [@kwizzn](https://github.com/kwizzn) - Fixes out-of-sync TTLs after running decr()

[v2.1.0](https://github.com/tj/node-ratelimiter/tree/v2.1.0) - [#12](/../../pull/12) by [@luin](https://github.com/luin) - Adding support for ioredis

[v2.0.1](https://github.com/tj/node-ratelimiter/tree/v2.0.1) - [#9](/../../pull/9) by [@ruimarinho](https://github.com/ruimarinho) - Update redis commands to use array notation.

[v2.0.0](https://github.com/tj/node-ratelimiter/tree/v2.0.0) - **API CHANGE** - Change `remaining` to include current call instead of decreasing it. Decreasing caused an off-by-one problem and caller could not distinguish between last legit call and a rejected call.

## Requirements

- Redis 2.6.12+.

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
 - `reset` - time in milliseconds until the end of current `duration`

## Options

 - `id` - the identifier to limit against (typically a user id)
 - `db` - redis connection instance
 - `max` - max requests within `duration` [2500]
 - `duration` - of limit in milliseconds [3600000]

# License

  MIT
