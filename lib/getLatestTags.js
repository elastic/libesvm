var cache = require('./cache');
var checkEtag = require('./checkEtag');
var fetchAllTags = require('./fetchAllTags');

/**
 * Get an updated version of the latest tags from Github
 * @param {function} cb The node style callback 
 * @returns {Promise}
 */
module.exports = function (cb) {
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

