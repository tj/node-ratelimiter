import should from 'should';
import Limiter from './limiter';

describe('Limiter', () => {
    it('should call the supplied adapter with correct parameters', (done) => {
            const callback = () => {};

            const adapter = (id, max, duration) => {
                id.should.equal('foo');
                max.should.equal(5);
                duration.should.equal(10000);
                done();

                return {
                    newHit: () => Promise.resolve(),
                };
            };

            const limiter = new Limiter({
                id: 'foo',
                max: 5,
                duration: 10000,
            }, adapter);

            limiter.newHit(callback);
        });

    describe('.newHit', () => {
        it('should call the supplied callback', (done) => {
            const result = 42;

            const callback = (err, res) => {
                should.not.exist(err);
                res.should.equal(result);
                done();
            };

            const adapter = () => {
                return {
                    newHit: () => Promise.resolve(result),
                };
            };

            const limiter = new Limiter({
                id: 'foo',
                max: 5,
                duration: 10000,
            }, adapter);

            limiter.newHit(callback);
        });

        it('should return a promise if not supplied a callback', (done) => {
            const result = 42;

            const adapter = () => {
                return {
                    newHit: () => Promise.resolve(result),
                };
            };

            const limiter = new Limiter({
                id: 'foo',
                max: 5,
                duration: 10000,
            }, adapter);

            limiter.newHit()
                .then(res => {
                    res.should.equal(42);
                })
                .then(done)
                .catch(done);
        });
    });

    describe('.get', () => {
        it('should call the supplied callback', (done) => {
            const result = 42;

            const callback = (err, res) => {
                should.not.exist(err);
                res.should.equal(result);
                done();
            };

            const adapter = () => {
                return {
                    get: () => Promise.resolve(result),
                };
            };

            const limiter = new Limiter({
                id: 'foo',
                max: 5,
                duration: 10000,
            }, adapter);

            limiter.get(callback);
        });

        it('should return a promise if not supplied a callback', (done) => {
            const result = 42;

            const adapter = () => {
                return {
                    get: () => Promise.resolve(result),
                };
            };

            const limiter = new Limiter({
                id: 'foo',
                max: 5,
                duration: 10000,
            }, adapter);

            limiter.get()
                .then(res => {
                    res.should.equal(42);
                })
                .then(done)
                .catch(done);
        });
    });
});
