var releases = module.exports;
var utils = require('./utils');
var request = require('request');
var cache = require('./cache');
var _ = require('lodash');
var querystring = require('querystring');
var join = require('path').join;
var semver = require('semver');
var tar = require('tar');
var zlib = require('zlib');
var Promises = require('bluebird');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = Promises.promisify(require('rimraf'));
Promises.promisifyAll(mkdirp);
Promises.promisifyAll(fs);

/**
 * Get an updated version of the latest tags from Github
 * @param {function} cb The node style callback 
 * @returns {Promise}
 */
var getLatestTags = releases.getLatestTags = function (cb) {
  return checkEtag().then(function (isFresh) {
    if (isFresh === false) {
      return fetchAllTags().then(function (tags) {
        return cache.set('tags', tags).then(function () {
          return tags;  
        });
      });
    }
    return cache.get('tags');
  });
};

/**
 * Download Elasticsearch
 * @param {object} options The options object 
 * @returns {Promise}
 */
 var download = releases.download = function (options, cb) {
   // Resolve the current version
   return resolveVersion(options).then(function (version) {
     return Promises.resolve(options.fresh && unlink(options, version))
       .then(function () {
         return downloadAndInstall(options, version);
       })
   }).nodeify(cb);
 };

 /**
  * Resolve the latest version
  * @param {string} version A semver string 
  * @param {function} cb The node style callback
  * @returns {Promise}
  */
var resolveVersion = releases.resolveVersion = function (options, cb) {
  return getLatestTags().then(function (tags) {
    tags = _.sortBy(tags, 'name').reverse();
    var length = tags.length;
    for (var i = 0; i<length; i++) {
      var matches = tags[i].name.match(/^v(\d+\.\d+\.\d+)(\.(.+))?/);
      var name = matches[1];
      if (matches[3]) name += '-' + matches[3];
        if (semver.satisfies(name, options.version)) {
          return tags[i].name.replace('v', '');
        };
    }

    throw new Error('A suitable version was not found.');
  });
};

/**
 * Unlink the current version (if it exists)
 * @param {string} version The version to unlink
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var unlink = releases.unlink = function (options, version, cb) {
  var path = join(options.directory, version);
  return rimraf(path);
};

/**
 * Download and install a version of Elasticsearch
 * @param {string} version The version to install
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var downloadAndInstall = releases.downloadAndInstall = function (options, version, cb) {
  var path = join(options.directory, version);
  return mkdirp.mkdirpAsync(options.directory).then(function (arg) {
    return fs.statAsync(path); 
  })
    .catch(function (err) {
      if (err.cause.code === 'ENOENT')  {
        return new Promises(function (resolve, reject) {
          var gunzip = zlib.createGunzip();
          var url = 'https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-' + version + '.tar.gz';
            var out = tar.Extract({ path: path, strip: 1 });
          out.on('close', function () {
            resolve(path); 
          }).on('error', reject);
          request.get(url)
          .pipe(gunzip)
          .pipe(out);
        });
      } 
    });
};

/**
 * Installs elasticsearch plugins
 * @param {string} version The version to install
 * @param {array} plugins The plugins to install
 * @returns {Promises}
 */
var installPlugins = releases.installPlugins = function (options, version, cb) {
  // wipe out the plugin directory then install fresh copies.
  rimraf(join(options.directory, version, 'plugins')).then(function () {
    
  });
};

/**
 * Fetches all the tags from GitHub
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var fetchAllTags = releases.fetchAllTags = function (cb) {
  var results = [];
  var perPage = 100;
  var page = 1;
  var processResp = function (tags) {

    // Add the tags to the results
    results = results.concat(tags);

    // If the returned length is not equal to the number of tags per page then
    // return the results;
    if (tags.length !== perPage) return results;

    // Increment the page and create another requests
    var opts = { page: ++page, per_page: perPage };
    return fetchTags(opts).then(processResp);
  };

  // Kick off the fetches
  return fetchTags({ page: page, per_page: perPage }).then(processResp);
};

/**
 * Fetches a page of tags from the GitHub tags endpoint
 * @param {object} opts The options object { page: 1, per_page: 100 }
 * @param {function} cb The node style callback
 * @returns {Promise} 
 */
var fetchTags = releases.fetchTags = function (queryString, cb) {
  querysString = _.defaults(queryString || {}, { page: 1, per_page: 100 });
  var options = {
    url: 'https://api.github.com/repos/elasticsearch/elasticsearch/tags',
    json: true,
    headers: {
      'User-Agent': 'ccowan/elastic-loader',
      'Accept': '*/*'
    }
  };
  options.url += '?' + querystring.stringify(queryString);
  return utils.request(options).then(function (res) {
    return res[1]; 
  }).nodeify(cb);
};

var checkEtag = releases.fetchETag = function (cb) {
  return cache.get('etag').then(function (etag) {
    var options = {
      url: 'https://api.github.com/repos/elasticsearch/elasticsearch/tags',
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

