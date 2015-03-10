var _ = require('lodash');
var utils = require('./utils');
var querystring = require('querystring');

/**
 * Fetches a page of tags from the GitHub tags endpoint
 * @param {object} opts The options object { page: 1, per_page: 100 }
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var fetchTags = function (queryString, cb) {
  querysString = _.defaults(queryString || {}, { page: 1, per_page: 100 });
  var options = {
    url: 'https://api.github.com/repos/elastic/elasticsearch/tags',
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

/**
 * Fetches all the tags from GitHub
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (cb) {
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
