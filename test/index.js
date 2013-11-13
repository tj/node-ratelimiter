
var Limiter = require('..');
var redis = require('redis');

var db = redis.createClient();

describe('Limiter', function(){
  beforeEach(function(done){
    db.keys('limit:*', function(err, keys){
      if (err) return done(err);
      if (!keys.length) return done();
      var args = keys.concat(done);
      db.del.apply(db, args);
    });
  })

  describe('.total', function(){
    it('should represent the total limit per reset period', function(done){
      var limit = new Limiter({ max: 5, id: 'something', db: db });
      limit.get(function(err, res){
        res.total.should.equal(5);
        done();
      })
    })
  })

  describe('.remaining', function(){
    it('should represent the number of requests remaining in the reset period', function(done){
      var limit = new Limiter({ max: 5, id: 'something', db: db });
      limit.get(function(err, res){
        res.remaining.should.equal(4);
        limit.get(function(err, res){
          res.remaining.should.equal(3);
          limit.get(function(err, res){
            res.remaining.should.equal(2);
            done();
          })
        })
      })
    })
  })

  describe('.reset', function(){
    it('should represent the next reset time in UTC epoch seconds', function(done){
      var limit = new Limiter({ max: 5, duration: 60000, id: 'something', db: db });
      limit.get(function(err, res){
        var left = res.reset - (Date.now() / 1000);
        left.should.be.below(60);
        done();
      })
    })
  })

  describe('when the limit is exceeded', function(){
    it('should retain .remaining at 0', function(done){
      var limit = new Limiter({ max: 2, id: 'something', db: db });
      limit.get(function(err, res){
        res.remaining.should.equal(1);
        limit.get(function(err, res){
          res.remaining.should.equal(0);
          limit.get(function(err, res){
            res.remaining.should.equal(0);
            done();
          })
        })
      })
    })
  })

  describe('when the duration is exceeded', function(){
    it('should reset', function(done){
      var limit = new Limiter({ duration: 2000, max: 2, id: 'something', db: db });
      limit.get(function(err, res){
        res.remaining.should.equal(1);
        limit.get(function(err, res){
          res.remaining.should.equal(0);
          setTimeout(function(){
            limit.get(function(err, res){
              var left = res.reset - (Date.now() / 1000);
              left.should.be.below(2);
              res.remaining.should.equal(1);
              done();
            });
          }, 3000);
        })
      })
    })
  })
})