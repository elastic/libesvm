var join = require('path').join;
var zlib = require('zlib');
var mkdirp = require('mkdirp');
var Promises = require('bluebird');
var request = require('request');
var resolveVersion = require('./resolveVersion');
var fs = require('fs');
var tar = require('tar');
var purge = require('./purge');
Promises.promisifyAll(mkdirp);

/**
 * Download and install a version of Elasticsearch
 * @param {string} version The version to install
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var downloadAndInstall = function (log, options, version, cb) {
  var path = join(options.directory, version);
  var response = { path: path, version: version };
  return mkdirp.mkdirpAsync(options.directory).then(function (arg) {
    return fs.statAsync(path).then(function () {
      return response; 
    }); 
  })
  .catch(function (err) {
    if (err.cause && err.cause.code === 'ENOENT')  {
      return new Promises(function (resolve, reject) {
        log('INFO', 'Downloading & Installing ' + version);
        var gunzip = zlib.createGunzip();
        var url = 'https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-' + version + '.tar.gz';
          var out = tar.Extract({ path: path, strip: 1 });
        out.on('close', function () {
          resolve(response); 
        }).on('error', reject);
        request.get(url)
        .pipe(gunzip)
        .pipe(out);
      });
    } 
  });
};

/**
 * Download Elasticsearch
 * @param {object} options The options object 
 * @returns {Promise}
 */
module.exports = function (log, options, cb) {
  // Resolve the current version
  return resolveVersion(options).then(function (version) {
    var path = join(options.directory, version);
    if (options.fresh) log('INFO', 'Removing '+ path);
    return Promises.resolve(options.fresh && purge(path))
    .then(function () {
      return downloadAndInstall(log, options, version);
    });
  }).nodeify(cb);
};

