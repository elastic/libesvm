var fs = require('fs');
var expect = require('chai').expect;
var cache = require('../lib/cache');
var crypto = require('crypto');

/**
 * A utility to create a temp file name
 * @param {string} prefix The prefix for the cache file
 * @param {function} cb The node style callback
 * @returns {null}
 */
var tmpfile = function (prefix, cb) {
  prefix = prefix && prefix + '-' || '';
  crypto.randomBytes(32, function (err, buf) {
    if (err) return cb(err);
    var filename = crypto.createHash('sha1')
      .update(buf)
      .digest('hex');
    cb(null, '/tmp/' + prefix + filename);
  });
};

describe('Cache', function() {
  describe('File opperations', function() {

    it('should return an empty object when fetch is called and the cache is new', function (done) {
      tmpfile('empty-test', function (err, filename) {
        var source = cache.source;
        cache.source = filename;
        cache.fetch().then(function (data) {
          cache.source = source;
          expect(data).to.be.empty;
          done();
        })
        .catch(done);
      });
    });

    it('should save a new value', function (done) {
      tmpfile('test', function (err, filename) {
        var source = cache.source;
        cache.source = filename;
        cache.set('myTest', 'test');
        cache.save(function (err) {
          cache.source = source;
          if (err) return done(err);
            fs.readFile(filename, function (err, buf) {
              if (err) return done(err);    
                var data = JSON.parse(buf.toString('utf8'));
              expect(data).to.have.property('myTest', 'test');
              fs.unlink(filename, done);
            });
        });

      });
    });
  });
});
