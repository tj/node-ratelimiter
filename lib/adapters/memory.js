'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {
    var dictionary = [];

    var getOrCall = function getOrCall(x, ctx) {
        return typeof x === 'function' ? x(ctx) : x;
    };

    return function (id, max, duration) {
        var ctx = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        var create = function create(dateNow) {
            dictionary[getOrCall(id, ctx)] = {
                remaining: max,
                reset: (dateNow + duration) / 1000,
                total: max
            };

            return dictionary[getOrCall(id, ctx)];
        };

        var reset = function reset(data, dateNow) {
            data.remaining = max;
            data.reset = (dateNow + duration) / 1000;

            return data;
        };

        return {
            newHit: function newHit() {
                return new Promise(function (resolve) {
                    var dateNow = Date.now();
                    var data = dictionary[getOrCall(id, ctx)];

                    if (!data) {
                        return resolve(create(dateNow));
                    }

                    if (data.reset && dateNow / 1000 > data.reset) {
                        return resolve(reset(data, dateNow));
                    }

                    if (data.remaining <= 0) {
                        return resolve(data);
                    }

                    data.remaining--;
                    resolve(data);
                });
            },

            get: function get() {
                return new Promise(function (resolve) {
                    var dateNow = Date.now();
                    var data = dictionary[getOrCall(id, ctx)];

                    if (!data) {
                        return resolve(create(dateNow));
                    }

                    if (data.reset && dateNow / 1000 > data.reset) {
                        return resolve(reset(data, dateNow));
                    }

                    resolve(data);
                });
            }
        };
    };
};