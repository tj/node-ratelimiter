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
  this.key = 'limit:' + this.id;
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
 * redis is populated with the following key
 * that expire after N seconds:
 *
 *  - limit:<id> (count, limit, reset)
 *
 * @param {Function} fn
 * @api public
 */

Limiter.prototype.get = function (fn) {
  var key = this.key;
  var duration = this.duration;
  var max = this.max;
  var db = this.db;

  function create() {
    var ex = (Date.now() + duration) / 1000 | 0;

    db.multi()
      .hsetnx([key, 'count', max])
      .hsetnx([key, 'limit', max])
      .hsetnx([key, 'reset', ex])
      .pexpire([key, duration])
      .exec(function (err, res) {
        if (err) return fn(err);

        // If the request has failed, it means the values already
        // exist in which case we need to get the latest values.
        if (isFirstReplyNull(res)) return mget();

        fn(null, {
          total: max,
          remaining: max,
          reset: ex
        });
      });
  }

  function decr(res) {
    var n = parseInt(res.count);
    var max = parseInt(res.limit);
    var ex = parseInt(res.reset);

    if (n === 0) return done(0);

    function done(n) {
      fn(null, {
        total: max,
        remaining: n,
        reset: ex
      });
    }

    // setTimeout(function() {
    db.multi()
      .hincrby([key, 'count', -1])
      .pexpire([key, ex * 1000 - Date.now()])
      .exec(function (err, res) {
        if (err) return fn(err);
        if (isFirstReplyNull(res)) return mget();
        done(n - 1);
      });
    // }, 1000)
  }

  function mget() {
    db.watch([key], function (err) {
      if (err) return fn(err);
      db.persist([key], function (err, res) {
        if (err) return fn(err);
        if (res === 0) return create();
        db.hgetall([key], function (err, res) {
          if (err) return fn(err);
          decr(res);
        });
      })
    });
  }

  mget();
};

/**
 * Check whether the first item of multi replies is null,
 * works with ioredis and node_redis
 *
 * @param {Array} replies
 * @return {Boolean}
 * @api private
 */

function isFirstReplyNull(replies) {
  if (!replies) {
    return true;
  }

  return Array.isArray(replies[0]) ?
    // ioredis
    !replies[0][1] :
    // node_redis
    !replies[0];
}