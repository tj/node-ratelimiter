import 'babel-polyfill';
import memoryAdapterFactory from './adapters/memory';
import redisAdapterFactory from './adapters/redis';
import Limiter from './limiter';

export const memoryAdapter = memoryAdapterFactory;
export const redisAdapter = redisAdapterFactory;
export default Limiter;
