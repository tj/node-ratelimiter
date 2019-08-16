require('should');
var Limiter = require('..'),
  async = require('async');

// Uncomment the following line if you want to see
// debug logs from the node-redis module.
//redis.debug_mode = true;

['redis', 'ioredis'].forEach(function(redisModuleName) {
  var redisModule = require(redisModuleName);
  var db = require(redisModuleName).createClient();
  describe('Limiter with ' + redisModuleName, function() {
    beforeEach(function(done) {
      db.keys('limit:*', function(err, keys) {
        if (err) return done(err);
        if (!keys.length) return done();
        var args = keys.concat(done);
        db.del.apply(db, args);
      });
    });

    describe('.total', function() {
      it('should represent the total limit per reset period', function(done) {
        var limit = new Limiter({
          max: 5,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          res.total.should.equal(5);
          done();
        });
      });
    });

    describe('.remaining', function() {
      it('should represent the number of requests remaining in the reset period', function(done) {
        var limit = new Limiter({
          max: 5,
          duration: 100000,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          res.remaining.should.equal(5);
          limit.get(function(err, res) {
            res.remaining.should.equal(4);
            limit.get(function(err, res) {
              res.remaining.should.equal(3);
              done();
            });
          });
        });
      });
    });

    describe('.reset', function() {
      it('should represent the next reset time in UTC epoch seconds', function(done) {
        var limit = new Limiter({
          max: 5,
          duration: 60000,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          var left = res.reset - (Date.now() / 1000);
          left.should.be.below(60).and.be.greaterThan(0);
          done();
        });
      });
    });

    describe('.resetMs', function() {
      it('should represent the next reset time in UTC epoch milliseconds', function(done) {
        var limit = new Limiter({
          max: 5,
          duration: 60000,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          var left = res.resetMs - Date.now();
          Number.isInteger(left).should.be.true;
          left.should.be.within(0, 60000);
          done();
        });
      });
    });

    describe('when the limit is exceeded', function() {
      var limit;

      beforeEach(function (done) {
        limit = new Limiter({
          max: 2,
          id: 'something',
          db: db
        });

        limit.get(function() {
          limit.get(function() {
            done();
          });
        });
      });

      it('should retain .remaining at 0', function(done) {
        limit.get(function(err, res) {
          // function caller should reject this call
          res.remaining.should.equal(0);
          done();
        });
      });

      it('should return an increasing reset time after each call', function (done) {
        setTimeout(function () {
          limit.get(function(err, res) {
            var originalResetMs = res.resetMs;

            setTimeout(function() {
              limit.get(function (err, res) {
                res.resetMs.should.be.greaterThan(originalResetMs);
                done();
              });
            }, 10);
          });
        }, 10);
      });
    });

    describe('when the duration is exceeded', function() {
      it('should reset', function(done) {
        this.timeout(5000);
        var limit = new Limiter({
          duration: 2000,
          max: 2,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          res.remaining.should.equal(2);
          limit.get(function(err, res) {
            res.remaining.should.equal(1);
            setTimeout(function() {
              limit.get(function(err, res) {
                var left = res.reset - (Date.now() / 1000);
                left.should.be.below(2);
                res.remaining.should.equal(2);
                done();
              });
            }, 3000);
          });
        });
      });
    });

    describe('when multiple successive calls are made', function() {
      it('the next calls should not create again the limiter in Redis', function(done) {
        var limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {
          res.remaining.should.equal(2);
        });

        limit.get(function(err, res) {
          res.remaining.should.equal(1);
          done();
        });
      });

      it('updating the count should keep all TTLs in sync', function(done) {
        var limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });
        limit.get(function(err, res) {}); // All good here.
        limit.get(function(err, res) {
          db.multi()
            .pttl(['limit:something:count'])
            .pttl(['limit:something:limit'])
            .pttl(['limit:something:reset'])
            .exec(function(err, res) {
              if (err) return done(err);
              var ttlCount = (typeof res[0] === 'number') ? res[0] : res[0][1];
              var ttlLimit = (typeof res[1] === 'number') ? res[1] : res[1][1];
              var ttlReset = (typeof res[2] === 'number') ? res[2] : res[2][1];
              ttlLimit.should.equal(ttlCount);
              ttlReset.should.equal(ttlCount);
              done();
            });
        });
      });
    });

    describe('when trying to decrease before setting value', function() {
      it('should create with ttl when trying to decrease', function(done) {
        var limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db: db
        });
        db.setex('limit:something:count', -1, 1, function() {
          limit.get(function(err, res) {
            res.remaining.should.equal(2);
            limit.get(function(err, res) {
              res.remaining.should.equal(1);
              limit.get(function(err, res) {
                res.remaining.should.equal(0);
                done();
              });
            });
          });
        });
      });
    });

    describe('when multiple concurrent clients modify the limit', function() {
      var clientsCount = 7,
        max = 5,
        left = max,
        limits = [];

      for (var i = 0; i < clientsCount; ++i) {
        limits.push(new Limiter({
          duration: 10000,
          max: max,
          id: 'something',
          db: redisModule.createClient()
        }));
      }

      it('should prevent race condition and properly set the expected value', function(done) {
        var responses = [];

        function complete() {
          responses.push(arguments);

          if (responses.length == clientsCount) {
            // If there were any errors, report.
            var err = responses.some(function(res) {
              return res[0];
            });

            if (err) {
              done(err);
            } else {
              responses.sort(function (r1, r2) { return r1[1].remaining < r2[1].remaining; });
              responses.forEach(function(res) {
                res[1].remaining.should.equal(left < 0 ? 0 : left);
                left--;
              });

              for (var i = max - 1; i < clientsCount; ++i) {
                responses[i][1].remaining.should.equal(0);
              }

              done();
            }
          }
        }

        // Warm up and prepare the data.
        limits[0].get(function(err, res) {
          if (err) {
            done(err);
          }
          else {
            res.remaining.should.equal(left--);

            // Simulate multiple concurrent requests.
            limits.forEach(function(limit) {
              limit.get(complete);
            });
          }
        });
      });
    });

    describe('when limiter is called in parallel by multiple clients', function() {
      var max = 6,
        limiter;

      limiter = new Limiter({
        duration: 10000,
        max: max,
        id: 'asyncsomething',
        db: redisModule.createClient()
      });

      it('should set the count properly without race conditions', function(done) {
        async.times(max, function(n, next) {
            limiter.get(next);
          },
          function(errs, limits) {

            limits.forEach(function(limit) {
              limit.remaining.should.equal(max--);
            });
            done();

          });
      });
    });
  });
});
