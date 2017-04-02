/**
 * Module dependencies.
 */

var assert = require('assert');
var microtime = require('./microtime');

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

Limiter.prototype.inspect = function() {
  return '<Limiter id=' +
    this.id + ', duration=' +
    this.duration + ', max=' +
    this.max + '>';
};

/**
 * Get values and header / status code and invoke `fn(err, info)`.
 *
 * redis is populated with the following keys
 * that expire after N milliseconds:
 *
 *  - limit:<id>
 *
 * @param {Function} fn
 * @api public
 */

Limiter.prototype.get = function (fn) {
  var db = this.db;
  var duration = this.duration;
  var key = this.key;
  var max = this.max;
  var now = microtime.now();
  var start = now - duration * 1000;

  db.multi()
    .zremrangebyscore([key, 0, start])
    .zcard([key])
    .zadd([key, now, now])
    .zrange([key, 0, 0])
    .pexpire([key, duration])
    .exec(function (err, res) {
      if (err) return fn(err);
      var count = parseInt(Array.isArray(res[0]) ? res[1][1] : res[1]);
      var oldest = parseInt(Array.isArray(res[0]) ? res[3][1] : res[3]);
      fn(null, {
        remaining: count < max ? max - count : 0,
        reset: Math.floor((oldest + duration * 1000) / 1000000),
        total: max
      });
    });
};

/**
 * reset rate limit
 *
 * @api public
 */
Limiter.prototype.reset = function(fn){
  
  var count = this.prefix + 'count';
  var limit = this.prefix + 'limit';
  var reset = this.prefix + 'reset';
  var duration = this.duration;
  var max = this.max;
  var db = this.db;
  
  function recreate() {
    var ex = (Date.now() + duration) / 1000 | 0;

	  db.multi()
      .set([count, max, 'PX', duration, 'NX'])
      .set([limit, max, 'PX', duration, 'NX'])
      .set([reset, ex, 'PX', duration, 'NX'])
      .exec(function (err, res) {
        if (err) return fn(err);

        fn(null, {
          total: max,
          remaining: max,
          reset: ex
        });
      });
  }
  
  recreate();
}

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
