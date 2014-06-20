var expect = require('chai').expect;
var releases = require('../lib/releases');

describe('Releases', function() {
  describe('fetchAllTags', function() {

    it('should request a url', function (done) {
      releases.fetchAllTags().then(function (resp) {
        expect(resp[1]).to.be.instanceOf(Array);
        done();
      });
    });

  });
});

