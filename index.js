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

	  db.multi()
      .set(count, max - 1, 'PX', duration, 'NX')
      .set(limit, max, 'PX', duration, 'NX')
      .set(reset, ex, 'PX', duration, 'NX')
      .exec(function (err, res) {
        if (err) return fn(err);
			  // If the request has failed, it means the values already 
			  // exist in which case we need to get the latest values.
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

    db.multi()
      .set(count, n - 1, 'PX', ex * 1000 - Date.now(), 'XX')
      .exec(function (err, res) {
        if (err) return fn(err);
        if (!res || !res[0]) return mget();
        n = n - 1;
        done();
      });
  }

  function mget() {
	  db.watch(count, function (err) {
		  if (err) return fn(err);
		  db.mget(count, limit, reset, function (err, res) {
			  if (err) return fn(err);
			  if (!res[0] && res[0] !== 0) return create();

			  decr(res);
		  });
	  });
  }

  mget();
};
