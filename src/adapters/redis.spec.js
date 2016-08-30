import 'should';
import sinon from 'sinon';
import adapterFactory from './redis';

// Uncomment the following line if you want to see
// debug logs from the node-redis module.
//redis.debug_mode = true;

['redis', 'ioredis'].forEach(redisModuleName => {
    const redisModule = require(redisModuleName);
    const db = redisModule.createClient();

    describe('RedisAdapter with ' + redisModuleName, () => {
        let sandbox;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        beforeEach(done => {
            db.keys('limit:something:*', (err, keys) => {
                if (err) return done(err);
                if (!keys.length) return done();
                const args = keys.concat(done);
                db.del.apply(db, args);
            });
        });

        it('should create a new entry executing id (if a function)', done => {
            const idSpy = sandbox.spy();
            adapterFactory(db)(idSpy, 5, 2000).get();

            idSpy.called.should.be.true();
            done();
        });

        describe('.newHit', () => {
            describe('.total', () => {
                it('should represent the total limit per reset period', done => {
                    const adapter = adapterFactory(db)('something', 5, 3600000);
                    adapter.newHit()
                        .then(res => {
                            res.total.should.equal(5);
                        })
                        .then(done)
                        .catch(done);
                });
            });

            describe('.remaining', () => {
                it('should represent the number of requests remaining in the reset period', done => {
                    const adapter = adapterFactory(db)('something', 5, 10000);
                    adapter.newHit()
                    .then(res => {
                        res.remaining.should.equal(5);
                    })
                    .then(adapter.newHit)
                    .then(res => {
                        res.remaining.should.equal(4);
                    })
                    .then(adapter.newHit)
                    .then(res => {
                        res.remaining.should.equal(3);
                    })
                    .then(done)
                    .catch(done);
                });
            });

            describe('.reset', () => {
                it('should represent the next reset time in UTC epoch seconds', done => {
                    const adapter = adapterFactory(db)('something', 5, 60000);
                    adapter.newHit()
                    .then(res => {
                        const left = res.reset - (Date.now() / 1000);
                        left.should.be.below(60);
                    })
                    .then(done)
                    .catch(done);
                });
            });

            describe('when the limit is exceeded', () => {
                it('should retain .remaining at 0', done => {
                    const adapter = adapterFactory(db)('something', 2, 3600000);
                    adapter.newHit()
                    .then(res => {
                        res.remaining.should.equal(2);
                    })
                    .then(adapter.newHit)
                    .then(res => {
                        res.remaining.should.equal(1);
                    })
                    .then(adapter.newHit)
                    .then(res => {
                        // function caller should reject this call
                        res.remaining.should.equal(0);
                    })
                    .then(done)
                    .catch(done);
                });
            });

            describe('when the duration is exceeded', function() {
                it('should reset', done => {
                    this.timeout(5000);
                    const adapter = adapterFactory(db)('something', 2, 2000);

                    adapter.newHit()
                    .then(res => {
                        res.remaining.should.equal(2);
                    })
                    .then(adapter.newHit)
                    .then(res => {
                        res.remaining.should.equal(1);
                        setTimeout(() => {
                            adapter.newHit().then(res2 => {
                                const left = res2.reset - (Date.now() / 1000);
                                left.should.be.below(2);
                                res2.remaining.should.equal(2);
                            })
                            .then(done)
                            .catch(done);
                        }, 3000);
                    })
                    .catch(done);
                });
            });

            describe('when multiple successive calls are made', () => {
                it('the next calls should not create again the limiter in Redis', done => {
                    const adapter = adapterFactory(db)('something', 2, 10000);

                    adapter.newHit()
                    .then(res => {
                        res.remaining.should.equal(2);
                    });

                    adapter.newHit()
                    .then(res => {
                        res.remaining.should.equal(1);
                    })
                    .then(done)
                    .catch(done);
                });

                it('updating the count should keep all TTLs in sync', done => {
                    const adapter = adapterFactory(db)('something', 2, 10000);
                    adapter.newHit(); // All good here.
                    adapter.newHit().then(() => {
                        db.multi()
                            .pttl(['limit:something:count'])
                            .pttl(['limit:something:limit'])
                            .pttl(['limit:something:reset'])
                            .exec((err, res) => {
                                if (err) return done(err);
                                const ttlCount = (typeof res[0] === 'number') ? res[0] : res[0][1];
                                const ttlLimit = (typeof res[1] === 'number') ? res[1] : res[1][1];
                                const ttlReset = (typeof res[2] === 'number') ? res[2] : res[2][1];
                                ttlLimit.should.equal(ttlCount);
                                ttlReset.should.equal(ttlCount);
                                done();
                            });
                    });
                });
            });

            describe('when trying to decrease before setting value', () => {
                it('should create with ttl when trying to decrease', done => {
                    const adapter = adapterFactory(db)('something', 2, 10000);
                    db.setex('limit:something:count', -1, 1, () => {
                        adapter.newHit()
                        .then(res => {
                            res.remaining.should.equal(2);
                        })
                        .then(adapter.newHit)
                        .then(res => {
                            res.remaining.should.equal(1);
                        })
                        .then(adapter.newHit)
                        .then(res => {
                            res.remaining.should.equal(0);
                        })
                        .then(done)
                        .catch(done);
                    });
                });
            });

            describe('when multiple concurrent clients modify the limit', () => {
                const clientsCount = 7;
                const max = 5;
                let left = max;
                const adapters = [];

                for (let i = 0; i < clientsCount; ++i) {
                    adapters.push(adapterFactory(redisModule.createClient())('something', max, 10000));
                }

                it('should prevent race condition and properly set the expected value', done => {
                    const responses = [];

                    function complete(res) {
                        responses.push(res);

                        if (responses.length === clientsCount) {
                            responses.forEach(iRes => {
                                iRes.remaining.should.equal(left < 0 ? 0 : left);
                                left--;
                            });

                            for (let i = max - 1; i < clientsCount; ++i) {
                                responses[i].remaining.should.equal(0);
                            }

                            done();
                        }
                    }

                    // Warm up and prepare the data.
                    adapters[0].newHit()
                    .then(res => {
                        res.remaining.should.equal(left--);

                        // Simulate multiple concurrent requests.
                        adapters.forEach(adapter => adapter.newHit().then(complete).catch(done));
                    });
                });
            });
        });

        afterEach(() => {
            if (sandbox) {
                sandbox.restore();
            }
        });
    });
});
