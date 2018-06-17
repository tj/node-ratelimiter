'use strict'

const assert = require('assert')
const microtime = require('./microtime')

module.exports = class Limiter {
  constructor ({id, db, max = 2500, duration = 3600000}) {
    this.id = id
    this.db = db
    assert(this.id, '.id required')
    assert(this.db, '.db required')
    this.max = max
    this.duration = duration
    this.key = 'limit:' + this.id
  }

  inspect () {
    return `<Limiter id=${this.id}, duration=${this.duration}, max=${this.max}>`
  }

  get (fn) {
    const db = this.db
    const duration = this.duration
    const key = this.key
    const max = this.max
    const now = microtime.now()
    const start = now - duration * 1000

    db.multi()
      .zrange([key, 0, start, 'WITHSCORES'])
      .zcard([key])
      .zadd([key, now, now])
      .zrange([key, 0, 0])
      .pexpire([key, duration])
      .exec(function (err, res) {
        if (err) return fn(err)
        const count = parseInt(Array.isArray(res[0]) ? res[1][1] : res[1])
        const oldest = parseInt(Array.isArray(res[0]) ? res[3][1] : res[3])
        return fn(null, {
          remaining: count < max ? max - count : 0,
          reset: Math.floor((oldest + duration * 1000) / 1000000),
          total: max
        })
      })
  }
}
