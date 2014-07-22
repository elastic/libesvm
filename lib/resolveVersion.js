var _ = require('lodash');
var getLatestTags = require('./getLatestTags');
var semver = require('semver');

/**
 * Resolve the latest version
 * @param {string} version A semver string 
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (options, cb) {
  return getLatestTags().then(function (tags) {
    tags = _.sortBy(tags, 'name').reverse();
    var length = tags.length;
    for (var i = 0; i<length; i++) {
      var matches = tags[i].name.match(/^v(\d+\.\d+\.\d+)(\.(.+))?/);
      var name = matches[1];
      if (matches[3]) name += '-' + matches[3];
      if (semver.satisfies(name, options.version)) {
        return tags[i].name.replace('v', '');
      }
    }

    throw new Error('A suitable version was not found.');
  });
};
