
var time = Date.now() * 1e3;
var start = process.hrtime();

/**
 * Expose `now`.
 */

module.exports.now = function() {
  var diff = process.hrtime(start);

  return time + diff[0] * 1e6 + Math.round(diff[1] * 1e-3);
}
