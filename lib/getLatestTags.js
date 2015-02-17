var cache = require('./cache');
var checkEtag = require('./checkEtag');
var fetchAllTags = require('./fetchAllTags');
var Promises = require('bluebird');

// We only need to check the eTag once per opperation
var eTagFetched = false;

/**
 * Get an updated version of the latest tags from Github
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (cb) {
	// return the tags if we have a fresh etag
	if (eTagFetched) return cache.get('tags');
  return checkEtag().then(function (isFresh) {
		eTagFetched = true;
    return cache.get('tags').then(function (currentTags) {
      if (isFresh === false || !currentTags) {
        return fetchAllTags().then(function (tags) {
          return cache.set('tags', tags).then(function () {
            return tags;
          });
        });
      }
      return currentTags;
    });
  });
};

