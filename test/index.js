require('should');
const Limiter = require('..');
const async = require('async');

// Uncomment the following line if you want to see
// debug logs from the node-redis module.
//redis.debug_mode = true;

['redis', 'ioredis'].forEach((redisModuleName) => {
  const redisModule = require(redisModuleName);
  const db = require(redisModuleName).createClient();

  describe('Limiter with ' + redisModuleName, () => {
    beforeEach((done) => {
      db.keys('limit:*', (err, keys) => {
        if (err) return done(err);
        if (!keys.length) return done();
        const args = keys.concat(done);
        db.del.apply(db, args);
      });
    });

    describe('.total', () => {
      it('should represent the total limit per reset period', async function() {
        const limit = new Limiter({
          max: 5,
          id: 'something',
          db: db
        });

        const res = await limit.get();
        res.total.should.equal(5);
      });
    });

    describe('.remaining', () => {
      it('should represent the number of requests remaining in the reset period', async function() {
        const limit = new Limiter({
          max: 5,
          duration: 100000,
          id: 'something',
          db: db
        });

        let res = await limit.get();
        res.remaining.should.equal(5);

        res = await limit.get();
        res.remaining.should.equal(4);

        res = await limit.get();
        res.remaining.should.equal(3);
      });
    });

    describe('.reset', () => {
      it('should represent the next reset time in UTC epoch seconds', async function() {
        const limit = new Limiter({
          max: 5,
          duration: 60000,
          id: 'something',
          db: db
        });

        const res = await limit.get();
        const left = res.reset - (Date.now() / 1000);
        left.should.be.below(60).and.be.greaterThan(0);
      });
    });

    describe('when the limit is exceeded', () => {
      it('should retain .remaining at 0', async function() {
        const limit = new Limiter({
          max: 2,
          id: 'something',
          db: db
        });

        let res = await limit.get();
        res.remaining.should.equal(2);

        res = await limit.get();
        res.remaining.should.equal(1);

        res = await limit.get();
        res.remaining.should.equal(0);
      });
    });

    describe('when the duration is exceeded', () => {
      it('should reset', async function() {
        this.timeout = 5000;

        const limit = new Limiter({
          duration: 2000,
          max: 2,
          id: 'something',
          db: db
        });

        let res = await limit.get();
        res.remaining.should.equal(2);

        setTimeout(() => {
          res = limit.get();
          const left = res.reset - (Date.now() / 1000);
          left.should.be.below(2);
          res.remaining.should.equal(2);
        }, 3000);
      });
    });

    describe('when multiple successive calls are made', () => {
      it('the next calls should not create again the limiter in Redis', async function() {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });

        let res = await limit.get();
        res.remaining.should.equal(2);

        res = await limit.get();
        res.remaining.should.equal(1);
      });

      it('updating the count should keep all TTLs in sync', async function() {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });

        await limit.get();

        db.multi()
          .pttl(['limit:something:count'])
          .pttl(['limit:something:limit'])
          .pttl(['limit:something:reset'])
          .exec((err, res) => {
            if (err) {
              throw err;
            }

            const ttlCount = (typeof res[0] === 'number') ? res[0] : res[0][1];
            const ttlLimit = (typeof res[1] === 'number') ? res[1] : res[1][1];
            const ttlReset = (typeof res[2] === 'number') ? res[2] : res[2][1];
            ttlLimit.should.equal(ttlCount);
            ttlReset.should.equal(ttlCount);
          });
      });
    });

    describe('when trying to decrease before setting value', () => {
      it('should create with ttl when trying to decrease', async function() {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });

        db.setex('limit:something:count', -1, 1, async function() {
          let res = await limit.get();
          res.remaining.should.equal(2);

          res = await limit.get();
          res.remaining.should.equal(1);

          res = await limit.get();
          res.remaining.should.equal(0);
        });
      });
    });

    describe('when multiple concurrent clients modify the limit', async function() {
      let clientsCount = 7,
        max = 5,
        left = max,
        limits = [];

      for (let i = 0; i < clientsCount; ++i) {
        limits.push(new Limiter({
          duration: 10000,
          max: max,
          id: 'something',
          db: redisModule.createClient()
        }));
      }

      it('should prevent race condition and properly set the expected value', async function() {
        let responses = [];
        let res = await limits[0].get()

        limits.forEach(async(limit) => {
          responses.push(await limit.get());

          if (responses.length == clientsCount) {
            responses.sort((r1, r2) => (r1.remaining < r2.remaining));
            responses.forEach(res => {
              res.remaining.should.equal(left < 0 ? 0 : left);
              left--;
            });

            for (let i = max - 1; i < clientsCount; ++i) {
              responses[i].remaining.should.equal(0);
            }
          }
        });
      });
    });

    describe('when limiter is called in parallel by multiple clients', async function() {
      let max = 6;
      let limiter = new Limiter({
        duration: 10000,
        max: max,
        id: 'asyncsomething',
        db: redisModule.createClient()
      });

      it('should set the count properly without race conditions', async function() {
        Promise
          .all([limiter.get(), limiter.get(), limiter.get(), limiter.get(), limiter.get()])
          .then(limits => {
            limits.forEach(l => l.remaining.should.equal(max--));
          });
      });
    })
  });
});

process.on('unhandledRejection', up => { throw up })