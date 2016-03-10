export default () => {
    return (id, max, duration) => {
        return {
            newHit: () => Promise.resolve({
                remaining: 1000,
                reset: (Date.now() + duration) / 1000,
                total: 1000,
            }),

            get: () => Promise.resolve({
                remaining: 1000,
                reset: (Date.now() + duration) / 1000,
                total: 1000,
            }),
        };
    };
};
