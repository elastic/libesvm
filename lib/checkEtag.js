var cache = require('./cache');
var utils = require('./utils');

/**
 * Check the cache for the etag and featches new ones if they are invalid
 * @param {function} cb The node callback
 * @returns {Promise}
 */
module.exports = function (cb) {
  return cache.get('etag').then(function (etag) {
    var options = {
      url: 'https://api.github.com/repos/elastic/elasticsearch/tags',
      headers: {
        'User-Agent': 'ccowan/elastic-loader',
        'Accept': '*/*'
      }
    };
    if (etag) options.headers['If-None-Match'] = etag;
    return utils.request(options).then(function (res) {
      var response = res[0];
      return cache.set('etag', response.headers.etag).then(function () {
        return (response.statusCode === 304);
      });
    });
  }).nodeify(cb);
};

