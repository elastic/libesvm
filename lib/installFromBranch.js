var downloadAndInstall = require('./downloadAndInstall');
var getSnapshotUrls = require('./getSnapshotUrls');
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
  return getSnapshotUrls(options)
  .then(function (urls) {
    var key = 'URL_' + branch.replace(/[\._]+/g, '').toUpperCase(); // version numbers are 0-9, 0-9X, or MASTER
    // We only allow installing of branches available in the properties file
    if (!urls[key]) throw new Error('Branch ' + branch + ' is not available for install. (' + key + ')');
    // Change from zip to tgz since zip files are a pain to handle in node.js
    var url = urls[key].replace(/\.zip$/, '.tar.gz');
    log('INFO', 'Downloading & installing from "' + options.branch + '" branch.');
    return downloadAndInstall(url, options.dest, log).nodeify(cb);
  });
};
