var resolveVersion = require('./resolveVersion');
var _ = require('lodash');
var downloadAndInstall = require('./downloadAndInstall');

/**
 * Download Elasticsearch
 * @param {object} options The options object 
 * @param {string} options.dest The destination of the install
 * @param {string} options.version The version to install
 * @param {function} [options.log] The logger
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var log = options.log || _.noop;
  // Resolve the current version
  return resolveVersion(options).then(function (version) {
    var url = 'https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-' + version + '.tar.gz';
    log('INFO', 'Downloading & Installing ' + version);
    return downloadAndInstall(url, options.dest, log);
  }).nodeify(cb);
};

