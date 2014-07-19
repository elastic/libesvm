var downloadAndInstall = require('./downloadAndInstall');
var _ = require('lodash');

/**
 * Install from a branch
 * @param {object} options The options object
 * @param {string} options.dest The destination directory
 * @param {string} options.branch The branch name
 * @param {function} [options.log] The logging function
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  var log = options.log || _.noop;
  var branch = options.branch;
  var jdk = /^(0.90|1.0|1.1)/.test(options.branch) ? 'JDK6' : 'JDK7';
  var url = 'http://s3-us-west-2.amazonaws.com/build.elasticsearch.org/origin/'+branch+'/nightly/'+jdk+'/elasticsearch-latest-SNAPSHOT.tar.gz';
  log('INFO', 'Downloading & installing from "' + options.branch + '" branch.');
  return downloadAndInstall(url, options.dest, log);
};
