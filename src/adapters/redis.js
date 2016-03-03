import assert from 'assert';

/**
 * Check whether the first item of multi replies is null,
 * works with ioredis and node_redis
 *
 * @param {Array} replies
 * @return {Boolean}
 * @api private
 */

function isFirstReplyNull(replies) {
    if (!replies) {
        return true;
    }

    return Array.isArray(replies[0]) ?
        // ioredis
        !replies[0][1] :
        // node_redis
        !replies[0];
}

export default db => {
    assert(db, 'db required');

    return (id, max, duration) => {
        const countField = `limit:${id}:count`;
        const limitField = `limit:${id}:limit`;
        const resetField = `limit:${id}:reset`;

        const get = res => {
            if (!res[0] && res[0] !== 0) return null;

            return {
                remaining: ~~res[0],
                reset: ~~res[2],
                total: ~~res[1],
            };
        };

        const create = () => new Promise((resolve, reject) => {
            const ex = (Date.now() + duration) / 1000 | 0;

            db.multi()
            .set([countField, max, 'PX', duration, 'NX'])
            .set([limitField, max, 'PX', duration, 'NX'])
            .set([resetField, ex, 'PX', duration, 'NX'])
            .exec((err, res) => {
                if (err) return reject(err);

                // If the request has failed, it means the values already
                // exist in which case we need to get the latest values.
                if (isFirstReplyNull(res)) return mget(true).then(resolve).catch(reject); // eslint-disable-line no-use-before-define

                resolve({
                    total: max,
                    remaining: max,
                    reset: ex,
                });
            });
        });

        const decr = ({remaining, reset, total}) => new Promise((resolve, reject) => {
            const dateNow = Date.now();
            let n = remaining;
            const done = () => {
                resolve({
                    total,
                    remaining: n < 0 ? 0 : n,
                    reset,
                });
            };

            if (n <= 0) return done();

            db.multi()
                .set([countField, n - 1, 'PX', reset * 1000 - dateNow, 'XX'])
                .pexpire([limitField, reset * 1000 - dateNow])
                .pexpire([resetField, reset * 1000 - dateNow])
                .exec((err, resp) => {
                    if (err) return reject(err);
                    if (isFirstReplyNull(resp)) return mget(true).then(resolve).catch(reject); // eslint-disable-line no-use-before-define
                    n = n - 1;
                    done();
                });
        });

        const mget = write => new Promise((resolve, reject) => {
            db.watch([countField], err => {
                if (err) return reject(err);

                db.mget([countField, limitField, resetField], (err2, res) => {
                    if (err2) return reject(err2);
                    const data = get(res);

                    if (!data) return create().then(resolve).catch(reject);

                    if (write) return decr(data).then(resolve).catch(reject);

                    return resolve(data);
                });
            });
        });

        return {
            newHit: () => mget(true),

            get: () => mget(false),
        };
    };
};
