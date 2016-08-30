export default () => {
    const dictionary = [];

    const getOrCall = (x, ctx) => typeof x === 'function' ? x(ctx) : x;

    return (id, max, duration, ctx = {}) => {
        const create = dateNow => {
            dictionary[getOrCall(id, ctx)] = {
                remaining: max,
                reset: (dateNow + duration) / 1000,
                total: max,
            };

            return dictionary[getOrCall(id, ctx)];
        };

        const reset = (data, dateNow) => {
            data.remaining = max;
            data.reset = (dateNow + duration) / 1000;

            return data;
        };

        return {
            newHit: () => new Promise(resolve => {
                const dateNow = Date.now();
                const data = dictionary[getOrCall(id, ctx)];

                if (!data) {
                    return resolve(create(dateNow));
                }

                if (data.reset && (dateNow / 1000) > data.reset) {
                    return resolve(reset(data, dateNow));
                }

                if (data.remaining <= 0) {
                    return resolve(data);
                }

                data.remaining--;
                resolve(data);
            }),

            get: () => new Promise(resolve => {
                const dateNow = Date.now();
                const data = dictionary[getOrCall(id, ctx)];

                if (!data) {
                    return resolve(create(dateNow));
                }

                if (data.reset && (dateNow / 1000) > data.reset) {
                    return resolve(reset(data, dateNow));
                }

                resolve(data);
            }),
        };
    };
};
