/**
 * Module dependencies.
 */

import assert from 'assert';
import memoryAdapterFactory from './adapters/memory';

/**
  * Expose `Limiter`.
  */
export default class Limiter {
    /**
    * Initialize a new limiter with an adapter and `opts`:
    *
    *  - `id` identifier being limited
    *  - `max` maximum number of calls
    *  - `duration` the duration before reseting the number of calls
    *
    * @param {Object} opts
    * @param {Object} getFn: the function which will be called to get the rate limiting data
    * @api public
    */
    constructor(opts, adapterFactory = memoryAdapterFactory(), ctx = {}) {
        this.id = opts.id;
        assert(this.id, '.id required');
        this.max = opts.max || 2500;
        this.duration = opts.duration || 3600000;
        this.adapter = adapterFactory(this.id, this.max, this.duration, ctx);
    }

    inspect() {
        return `<Limiter id='${this.id}', duration='${this.duration}', max='${this.max}'>`;
    }

    /**
    * Get values and header / status code and invoke `fn(err, info)`.
    *
    * @param {Function} fn - optional callback function.
    * @returns {Promise} If fn is not specified.
    * @api public
    */
    get(fn) {
        if (fn) {
            this.adapter.get().then(res => fn(null, res)).catch(fn);
        }

        return this.adapter.get();
    }

    /**
    * Get values and header / status code and invoke `fn(err, info)`.
    *
    * @param {Function} fn - optional callback function.
    * @returns {Promise} If fn is not specified.
    * @api public
    */
    newHit(fn) {
        if (fn) {
            this.adapter.newHit().then(res => fn(null, res)).catch(fn);
        }

        return this.adapter.newHit();
    }
}
