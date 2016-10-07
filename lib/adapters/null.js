"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {
    return function (id, max, duration) {
        return {
            newHit: function newHit() {
                return Promise.resolve({
                    remaining: 1000,
                    reset: (Date.now() + duration) / 1000,
                    total: 1000
                });
            },

            get: function get() {
                return Promise.resolve({
                    remaining: 1000,
                    reset: (Date.now() + duration) / 1000,
                    total: 1000
                });
            }
        };
    };
};