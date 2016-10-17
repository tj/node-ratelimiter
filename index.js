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
 *
 * @param {Function} fn
 * @api public
 */

Limiter.prototype.get = function (fn) {
  var count = this.prefix + 'count';
  var duration = this.duration;
  var max = this.max;
  var db = this.db;

  function create() {
    db.multi()
      .set(count, max, 'PX', duration, 'NX')
      .exec(function (err, res) {
        if (err) return fn(err);

        // If the request has failed, it means the values already
        // exist in which case we need to get the latest values.
        if (isReplyNull(res)) return get();

        fn(null, {
          total: max,
          remaining: max,
          // Adding Date.now to ensure change is non-breaking. Can be removed for more accuracy
          // later. reset should also be in milliseconds (unlike now) for more accuracy
          reset: (duration + Date.now()) / 1000
        });
      });
  }

  function decr(res) {
    var n = ~~res;

    if (n <= 0) return done();

    function done() {
      db.pttl(count, function(err, data) {
        if(err) return fn(err);
        fn(null, {
          total: max,
          remaining: n < 0 ? 0 : n,
          // Adding Date.now to ensure change is non-breaking. Can be removed for more accuracy
          // later. reset should also be in milliseconds (unlike now) for more accuracy
          reset: (~~data + Date.now()) / 1000
        });
      });
    }

    db.multi()
      .decr(count)
      .exec(function (err, res) {
        if (err) return fn(err);
        if (isReplyNull(res)) return get();
        n = n - 1;
        done();
      });
  }

  function get() {
    db.watch([count], function (err) {
      if (err) return fn(err);
      db.get(count, function (err, res) {
        if (err) return fn(err);
        if (res === null) return create();

        decr(res);
      });
    });
  }
  
  get();
};

/**
 * Check whether the first item of multi reply is null,
 * works with ioredis and node_redis
 *
 * @param {Array} reply
 * @return {Boolean}
 * @api private
 */

function isReplyNull(reply) {
  if (!reply) {
    return true;
  }

  return Array.isArray(reply[0]) ?
    // ioredis
    !reply[0][1] :
    // node_redis
    !reply[0];
}
