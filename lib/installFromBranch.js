var downloadAndInstall = require('./downloadAndInstall');
var _ = require('lodash');
var pp = require('properties-parser');
var fs = require('fs');
var Promise = require('bluebird');
var readFileAsync = Promise.promisify(fs.readFile);
var join = require('path').join;

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
  // Grab the url from the properties file
  return readFileAsync(join(__dirname, 'client_tests_urls.properties')).then(function (buffer) {
    var urls = pp.parse(buffer.toString('utf8'));
    var key = 'URL_' + branch.replace(/[^\dx]+/g, ''); // version numbers are 0-9 and x
    // We only allow installing of branches available in the properties file
    if (!urls[key]) throw new Error('Branch ' + branch + ' is not available for install.');
    // Change from zip to tgz since zip files are a pain to handle in node.js
    var url = urls[key].replace(/\.zip$/, '.tar.gz');
    log('INFO', 'Downloading & installing from "' + options.branch + '" branch.');
    return downloadAndInstall(url, options.dest, log).nodeify(cb);
  });
};
