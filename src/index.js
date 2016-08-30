// import 'babel-polyfill';
import nullAdapterFactory from './adapters/null';
import memoryAdapterFactory from './adapters/memory';
import redisAdapterFactory from './adapters/redis';
import Limiter from './limiter';

Limiter.nullAdapter = nullAdapterFactory;
Limiter.memoryAdapter = memoryAdapterFactory;
Limiter.redisAdapter = redisAdapterFactory;

// Uses module.exports for non es6 users allowing them to avoid:
// require('node-ratelimiter').default
// See https://medium.com/@kentcdodds/misunderstanding-es6-modules-upgrading-babel-tears-and-a-solution-ad2d5ab93ce0#.q1k6lx7i5
module.exports = Limiter;
