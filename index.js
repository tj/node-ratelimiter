/**
 * Module dependencies.
 */

var assert = require('assert');

/**
 * Expose `Limiter`.
 */

module.exports = Limiter;

/**
 * Initialize a new limiter with `opts`:
 *
 *  - `id` identifier being limited
 *  - `db` redis connection instance
 *
 * @param {Object} opts
 * @api public
 */

function Limiter(opts) {
  this.id = opts.id;
  this.db = opts.db;
  assert(this.id, '.id required');
  assert(this.db, '.db required');
  this.max = opts.max || 2500;
  this.duration = opts.duration || 3600000;
  this.prefix = 'limit:' + this.id + ':';
}

/**
 * Inspect implementation.
 *
 * @api public
 */

Limiter.prototype.inspect = function () {
  return '<Limiter id='
    + this.id + ', duration='
    + this.duration + ', max='
    + this.max + '>';
};

/**
 * Get values and header / status code and invoke `fn(err, info)`.
 *
 * redis is populated with the following keys
 * that expire after N seconds:
 *
 *  - limit:<id>:count
 *  - limit:<id>:limit
 *  - limit:<id>:reset
 *
 * @param {Function} fn
 * @api public
 */

Limiter.prototype.get = function (fn) {
  var count = this.prefix + 'count';
  var limit = this.prefix + 'limit';
  var reset = this.prefix + 'reset';
  var duration = this.duration;
  var max = this.max;
  var db = this.db;

  function create() {
    var ex = (Date.now() + duration) / 1000 | 0;

	  // Run the command in a transaction because previously
	  // in the `mget` function we might have set a watch for
	  // changes on the `count` key.
	  // Thus, this transaction will fail in two cases:
	  // 1. When `count` has been changed by another client.
	  // 2. If `count` already exists (`NX` doesn't allow
	  // to set if the key already exists).
	  // In the first case, the response is `null`. In the
	  // second case the response is an array of three
	  // `null` values, one for each failed command.
	  db.multi()
		  // Refer to http://redis.io/commands/msetnx for syntax.
		  // `NX` - Set all keys only if none of them exists.
      .set(count, max - 1, 'PX', duration, 'NX')
      .set(limit, max, 'PX', duration, 'NX')
      .set(reset, ex, 'PX', duration, 'NX')
      .exec(function (err, res) {
        if (err) return fn(err);
			  // If the request has failed, it means the values
				// already exist in which case we need to get the
				// latest values.
        if (!res || !res[0]) return mget();

        fn(null, {
          total: max,
          remaining: max - 1,
          reset: ex
        });
      });
  }

  function decr(res) {
    var n = ~~res[0];
    var max = ~~res[1];
    var ex = ~~res[2];

    if (n <= 0) return done();

    function done() {
      fn(null, {
        total: max,
        remaining: n < 0 ? 0 : n,
        reset: ex
      });
    }

	  // Run the command in a transaction because previously
	  // in the `mget` function
	  // we have set a watch for changes on the `count` key.
	  // If in the meantime `count` has been updated by
	  // another client, this transaction will fail in which
	  // case we need to retry on the new values.
	  // Thus, this transaction will fail in two cases:
	  // 1. When `count` has been changed by another client.
	  // 2. If `count` has expired (`XX` doesn't allow
	  // to set if the key is missing).
	  // In both cases we retry this operation from the
	  // beginning. Note that we do not try to create the
	  // missing key because when the response is `null`
	  // we don't know whether it's because of the missing key
	  // or because the value has been changed by another
	  // client. The `mget` function will create if
	  // the key is missing when it retries.
	  // Once the `exec` command is issued, the watch is
	  // removed automatically by the server.
    db.multi()
	    // Refer to http://redis.io/commands/set for syntax.
	    // `PX milliseconds` - Set the specified expire time in milliseconds.
	    // `XX` - Only set the key if it already exists.
      .set(count, n - 1, 'PX', ex * 1000 - Date.now(), 'XX')
      .exec(function (err, res) {
        if (err) return fn(err);
        if (!res || !res[0]) return mget();
        n = n - 1;
        done();
      });
  }

  function mget() {
	  // Start watching the `count` key for changes to avoid racing
	  // condition. Imagine the following scenario:
	  // 1. two clients get the same value 10
	  // 2. both try to increment its value to 11.
	  // 3. both, one after another, set the value to 11 instead of
	  // the expected value of 12.
	  // To avoid such racing condition, the second client should
	  // fail if it notices that the first client has changed the
	  // value since it has last checked `count`.
	  db.watch(count, function (err) {
		  if (err) return fn(err);
		  // According to http://redis.io/commands/watch
		  // `WATCH` command always returns `OK` so no need to check
		  // `res`.
		  // We should not start `multi` just yet because it will
		  // reset the watch. The transaction should be started only
		  // in our `decr` which actually makes the changes to the
		  // key. Moreover, `mget` will return all values at once
		  // unlike `multi` which performs multiple TCP round trips
		  // for each command.
		  // At this moment, we aren't interested in the TTL value
		  // of the `count` key. We can derive it from the `reset`
		  // timestamp - current timestamp.
		  db.mget(count, limit, reset, function (err, res) {
			  if (err) return fn(err);
			  // `!res[0]` means that the key for `count` doesn't exist
			  // and Redis couldn't get its value. It returns `null` in
			  // such cases.
			  // Since `0` is also a falsy value in JavaScript, we should
			  // create a key only if the return value is not actually `0`.
			  // If it is `0` or any other value, we try to decrement
			  // its value. `0` is handled properly in `decr`, don't worry.
			  if (!res[0] && res[0] !== 0) return create();

			  decr(res);
		  });
	  });
  }

  mget();
};
