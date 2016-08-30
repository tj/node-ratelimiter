export default () => {
    const dictionary = [];

    return (id, max, duration) => {
        const create = dateNow => {
            dictionary[id] = {
                remaining: max,
                reset: (dateNow + duration) / 1000 | 0,
                total: max,
            };

            return dictionary[id];
        };

        const reset = (data, dateNow) => {
            data.remaining = max;
            data.reset = (dateNow + duration) / 1000 | 0;

            return data;
        };

        return {
            newHit: () => new Promise(resolve => {
                const dateNow = Date.now();
                const data = dictionary[id];

                if (!data) {
                    return resolve(create(dateNow));
                }

                if (data.remaining <= 0) {
                    return resolve(data);
                }

                if (data.reset && (dateNow / 1000) > data.reset) {
                    return resolve(reset(data, dateNow));
                }

                data.remaining--;
                resolve(data);
            }),

            get: () => new Promise(resolve => {
                const dateNow = Date.now();
                const data = dictionary[id];

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
