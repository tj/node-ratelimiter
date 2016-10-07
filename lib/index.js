'use strict';

require('babel-polyfill');

var _null = require('./adapters/null');

var _null2 = _interopRequireDefault(_null);

var _memory = require('./adapters/memory');

var _memory2 = _interopRequireDefault(_memory);

var _redis = require('./adapters/redis');

var _redis2 = _interopRequireDefault(_redis);

var _limiter = require('./limiter');

var _limiter2 = _interopRequireDefault(_limiter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_limiter2.default.nullAdapter = _null2.default;
_limiter2.default.memoryAdapter = _memory2.default;
_limiter2.default.redisAdapter = _redis2.default;

// Uses module.exports for non es6 users allowing them to avoid:
// require('node-ratelimiter').default
// See https://medium.com/@kentcdodds/misunderstanding-es6-modules-upgrading-babel-tears-and-a-solution-ad2d5ab93ce0#.q1k6lx7i5
module.exports = _limiter2.default;