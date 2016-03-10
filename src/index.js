import 'babel-polyfill';
import nullAdapterFactory from './adapters/null';
import memoryAdapterFactory from './adapters/memory';
import redisAdapterFactory from './adapters/redis';
import Limiter from './limiter';

export const nullAdapter = nullAdapterFactory;
export const memoryAdapter = memoryAdapterFactory;
export const redisAdapter = redisAdapterFactory;
export default Limiter;
