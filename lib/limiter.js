'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Module dependencies.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _memory = require('./adapters/memory');

var _memory2 = _interopRequireDefault(_memory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
  * Expose `Limiter`.
  */
var Limiter = function () {
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
    function Limiter(opts) {
        var adapterFactory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0, _memory2.default)();
        var ctx = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        _classCallCheck(this, Limiter);

        this.id = opts.id;
        (0, _assert2.default)(this.id, '.id required');
        this.max = opts.max || 2500;
        this.duration = opts.duration || 3600000;
        this.adapter = adapterFactory(this.id, this.max, this.duration, ctx);
    }

    _createClass(Limiter, [{
        key: 'inspect',
        value: function inspect() {
            return '<Limiter id=\'' + this.id + '\', duration=\'' + this.duration + '\', max=\'' + this.max + '\'>';
        }

        /**
        * Get values and header / status code and invoke `fn(err, info)`.
        *
        * @param {Function} fn - optional callback function.
        * @returns {Promise} If fn is not specified.
        * @api public
        */

    }, {
        key: 'get',
        value: function get(fn) {
            if (fn) {
                this.adapter.get().then(function (res) {
                    return fn(null, res);
                }).catch(fn);
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

    }, {
        key: 'newHit',
        value: function newHit(fn) {
            if (fn) {
                this.adapter.newHit().then(function (res) {
                    return fn(null, res);
                }).catch(fn);
            }

            return this.adapter.newHit();
        }
    }]);

    return Limiter;
}();

exports.default = Limiter;