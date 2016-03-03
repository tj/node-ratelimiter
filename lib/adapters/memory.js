"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {
    var dictionary = [];

    return function (id, max, duration) {
        var create = function create(dateNow) {
            dictionary[id] = {
                remaining: max,
                reset: (dateNow + duration) / 1000 | 0,
                total: max
            };

            return dictionary[id];
        };

        var reset = function reset(data, dateNow) {
            data.remaining = max;
            data.reset = data.reset * 1000 - dateNow;

            return data;
        };

        return {
            newHit: function newHit() {
                return new Promise(function (resolve) {
                    var dateNow = Date.now();
                    var data = dictionary[id];

                    if (!data) {
                        return resolve(create(dateNow));
                    }

                    if (data.remaining <= 0) {
                        return resolve(data);
                    }

                    if (data.reset && dateNow / 1000 > data.reset) {
                        return resolve(reset(data, dateNow));
                    }

                    data.remaining--;
                    resolve(data);
                });
            },

            get: function get() {
                return new Promise(function (resolve) {
                    var dateNow = Date.now();
                    var data = dictionary[id];

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