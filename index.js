/**
 * Module dependencies.
 */

const assert = require('assert')
const microtime = require('./microtime')

module.exports = class Limiter {
  constructor (opts) {
    this.id = opts.id
    this.db = opts.db
    assert(this.id, '.id required')
    assert(this.db, '.db required')
    this.max = opts.max || 2500
    this.duration = opts.duration || 3600000
    this.key = 'limit:' + this.id
  }

  inspect () {
    return `<Limiter id=${this.id}, duration=${this.duration}, max=${this.max}>`
  }

  get (fn) {
    var db = this.db
    var duration = this.duration
    var key = this.key
    var max = this.max
    var now = microtime.now()
    var start = now - duration * 1000

    db.multi()
      .zrange([key, 0, start, 'WITHSCORES'])
      .zcard([key])
      .zadd([key, now, now])
      .zrange([key, 0, 0])
      .pexpire([key, duration])
      .exec(function (err, res) {
        if (err) return fn(err)
        var count = parseInt(Array.isArray(res[0]) ? res[1][1] : res[1])
        var oldest = parseInt(Array.isArray(res[0]) ? res[3][1] : res[3])
        fn(null, {
          remaining: count < max ? max - count : 0,
          reset: Math.floor((oldest + duration * 1000) / 1000000),
          total: max
        })
      })
  }
}
