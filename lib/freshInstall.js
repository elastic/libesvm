var purge = require('./purge');
var cache = require('./cache');
var Promises = require('bluebird');
/**
 * Install a fresh copy?
 * @param {boolean} fresh Install a fresh copy or not
 * @param {stirng} dest description
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (fresh, dest, cb) {
  return Promises
    .attempt(function () {
      if (!fresh) {
        return;
      }

      return purge(dest)
        .then(function () {
          return cache.clear()
        })
    })
    .then(function () {
      return dest;
    })
    .nodeify(cb);
};
