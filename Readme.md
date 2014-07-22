# ratelimiter

  Rate limiter for Node.js backed by Redis.

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
  res.set('X-RateLimit-Remaining', limit.remaining);
  res.set('X-RateLimit-Reset', limit.reset);

  // all good
  debug('remaining %s/%s %s', limit.remaining, limit.total, id);
  if (limit.remaining) return next();

  // not good
  var delta = (limit.reset * 1000) - Date.now() | 0;
  var after = limit.reset - (Date.now() / 1000) | 0;
  res.set('Retry-After', after);
  res.send(429, 'Rate limit exceeded, retry in ' + ms(delta, { long: true }));
});
```

## Options

 - `id` the identifier to limit against (typically a user id)
 - `db` redis connection instance
 - `max` max requests within `duration` [2500]
 - `duration` of limit in milliseconds [3600000]

# License

  MIT