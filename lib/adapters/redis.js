'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

var getOrCall = function getOrCall(x, ctx) {
    return typeof x === 'function' ? x(ctx) : x;
};

exports.default = function (db) {
    (0, _assert2.default)(db, 'db required');

    return function (id, max, duration) {
        var ctx = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        var countField = 'limit:' + getOrCall(id, ctx) + ':count';
        var limitField = 'limit:' + getOrCall(id, ctx) + ':limit';
        var resetField = 'limit:' + getOrCall(id, ctx) + ':reset';

        var get = function get(res) {
            if (!res[0] && res[0] !== 0) return null;

            return {
                remaining: ~~res[0],
                reset: ~~res[2],
                total: ~~res[1]
            };
        };

        var create = function create() {
            return new Promise(function (resolve, reject) {
                var ex = (Date.now() + duration) / 1000 | 0;

                db.multi().set([countField, max, 'PX', duration, 'NX']).set([limitField, max, 'PX', duration, 'NX']).set([resetField, ex, 'PX', duration, 'NX']).exec(function (err, res) {
                    if (err) return reject(err);

                    // If the request has failed, it means the values already
                    // exist in which case we need to get the latest values.
                    if (isFirstReplyNull(res)) return mget(true).then(resolve).catch(reject); // eslint-disable-line no-use-before-define

                    resolve({
                        total: max,
                        remaining: max,
                        reset: ex
                    });
                });
            });
        };

        var decr = function decr(_ref) {
            var remaining = _ref.remaining;
            var reset = _ref.reset;
            var total = _ref.total;
            return new Promise(function (resolve, reject) {
                var dateNow = Date.now();
                var n = remaining;
                var done = function done() {
                    resolve({
                        total: total,
                        remaining: n < 0 ? 0 : n,
                        reset: reset
                    });
                };

                if (n <= 0) return done();

                db.multi().set([countField, n - 1, 'PX', reset * 1000 - dateNow, 'XX']).pexpire([limitField, reset * 1000 - dateNow]).pexpire([resetField, reset * 1000 - dateNow]).exec(function (err, resp) {
                    if (err) return reject(err);
                    if (isFirstReplyNull(resp)) return mget(true).then(resolve).catch(reject); // eslint-disable-line no-use-before-define
                    n = n - 1;
                    done();
                });
            });
        };

        var mget = function mget(write) {
            return new Promise(function (resolve, reject) {
                db.watch([countField], function (err) {
                    if (err) return reject(err);

                    db.mget([countField, limitField, resetField], function (err2, res) {
                        if (err2) return reject(err2);
                        var data = get(res);

                        if (!data) return create().then(resolve).catch(reject);

                        if (write) return decr(data).then(resolve).catch(reject);

                        return resolve(data);
                    });
                });
            });
        };

        return {
            newHit: function newHit() {
                return mget(true);
            },

            get: function get() {
                return mget(false);
            }
        };
    };
};