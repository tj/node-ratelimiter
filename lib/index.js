'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.redisAdapter = exports.memoryAdapter = undefined;

require('babel-polyfill');

var _memory = require('./adapters/memory');

var _memory2 = _interopRequireDefault(_memory);

var _redis = require('./adapters/redis');

var _redis2 = _interopRequireDefault(_redis);

var _limiter = require('./limiter');

var _limiter2 = _interopRequireDefault(_limiter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var memoryAdapter = exports.memoryAdapter = _memory2.default;
var redisAdapter = exports.redisAdapter = _redis2.default;
exports.default = _limiter2.default;