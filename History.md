# ratelimiter Change Log.

## 2.0.0 / 2016-03-01
* rewritten using es6 with babel
* added eslint airbnb configuration
* introduced adapters (redis and memory)

## 1.0.3 / 2014-06-06
==================

* Fixes #6: In concurrent environment, the race condition occurs.

## v1.0.2 / 2014-06-06

* fix race condition when expiration happens between get and decr

## v1.0.1 / 2014-03-14

* fix race condition resetting the keys
