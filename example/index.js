var redis = require('redis');
var Limiter = require('./');
//var Limiter = nodeRateLimiter.default;
var redisAdapter = Limiter.redisAdapter;

var limiter = new Limiter({
    id: 'foo',
    max: 5,
    duration: 10000,
}, redisAdapter(redis.createClient()));

// with callback
limiter.newHit(function(err, rateLimit) {
    if (err) {
        return console.log('Error while rate limiting', err);
    }

    console.log('Remaining hits', rateLimit.remaining);
    console.log('Limit will reset at', rateLimit.reset);
    console.log('Total allowed hits', rateLimit.total);
});

// with promises
limiter
    .newHit()
    .then(function(rateLimit) {
        console.log('Remaining hits', rateLimit.remaining);
        console.log('Limit will reset at', rateLimit.reset);
        console.log('Total allowed hits', rateLimit.total);
    })
    .catch(function(err) {
        console.log('Error while rate limiting', err);
    });
