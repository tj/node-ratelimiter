/**
 * Module dependencies.
 */

const assert = require('assert');
const microtime = require('./microtime');


/**
 * Initialize a new limiter with `opts`:
 *
 *  - `id` identifier being limited
 *  - `db` redis connection instance
 *
 * @param {Object} opts
 * @api public
 */
class Limiter {
  constructor(opts) {
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
  inspect() {
    return '<Limiter id=' +
      this.id + ', duration=' +
      this.duration + ', max=' +
      this.max + '>';
  }

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
  get() {
    const db = this.db;
    const duration = this.duration;
    const key = this.key;
    const max = this.max;
    const now = microtime.now();
    const start = now - duration * 1000;

    return new Promise((resolve, reject) => {
      db.multi()
        .zremrangebyscore([key, 0, start])
        .zcard([key])
        .zadd([key, now, now])
        .zrange([key, 0, 0])
        .pexpire([key, duration])
        .exec((err, res) => {
          if (err) return reject(err);

          const count = parseInt(Array.isArray(res[0]) ? res[1][1] : res[1]);
          const oldest = parseInt(Array.isArray(res[0]) ? res[3][1] : res[3]);

          resolve({
            remaining: count < max ? max - count : 0,
            reset: Math.floor((oldest + duration * 1000) / 1000000),
            total: max
          });
        });
    });
  }
}

/**
 * Expose `Limiter`.
 */

module.exports = Limiter;