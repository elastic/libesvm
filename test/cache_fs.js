var fs = require('fs');
var expect = require('chai').expect;
var cache = require('../lib/cache');
var temp = require('temp').track();

describe('Cache', function() {
  describe('File operations', function() {
    after(function (done) {
      temp.cleanup(done);
    });

    it('should return an empty object when fetch is called and the cache is new', function (done) {
      temp.open('empty-test', function (err, filename) {
        cache.source = filename.path;
        cache.fetch().then(function (data) {
          expect(data).to.be.empty;
          done();
        })
        .catch(done);
      });
    });

    it('should save a new value', function (done) {
      temp.open('value-test', function (err, filename) {
        cache.source = filename.path;
        cache.set('myTest', 'test');
        cache.save(function (err) {
          if (err) return done(err);

          fs.readFile(filename.path, { encoding: 'utf8' }, function (err, contents) {
            if (err) return done(err);

            var data = JSON.parse(contents);
            expect(data).to.have.property('myTest', 'test');
            // console.log(contents, data);
            done();
          });
        });
      });
    });
  });
});
