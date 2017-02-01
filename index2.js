const redis = require('ioredis');
const sleep = require('sleep-promise');

const db1 = redis.createClient();
const db2 = redis.createClient();

(async () => {

  for (let n=0; n < 100; n++) {
    console.log('-------------')
    console.log(await db1.set(['a', 10, 'PX', 1, 'NX']));
    // await sleep(1)
    console.log(await db1.get(['a']));
  }
  db1.quit();
  db2.quit();
})();

