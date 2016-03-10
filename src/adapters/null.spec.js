import 'should';
import adapterFactory from './null';

describe('NullAdapter', () => {
    describe('.newHit', () => {
        it('should return a fixed result', done => {
            const adapter = adapterFactory()('foo', 5, 100000);
            adapter.newHit()
            .then(res => {
                res.remaining.should.equal(1000);
                res.total.should.equal(1000);
            })
            .then(done)
            .catch(done);
        });
    });
});
