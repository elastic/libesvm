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

  var fixture = {
    example: 'test',
    bar: 'foo',
    foo: 'bar',
  };

  // Create the cache fixture
  before(function (done) {
    tmpfile('es-load-cache', function (err, filename) {
      if (err) return done(err);
      cache.source = filename;
      fs.writeFile(cache.source, JSON.stringify(fixture), done);
    });
  });
  
  // Clean up the cache file
  after(function (done) {
    fs.unlink(cache.source, done);
  });

  it('should return valid data', function(done) {
    cache.get('bar').then(function (val) {
      expect(val).to.equal('foo');
      done();
    });
  });

  it('should return undefined for invalid data', function(done) {
    cache.get('monkey').then(function (val) {
      expect(val).to.be.an('undefined');
      done();
    });
  });

  it('should set a new value', function() {
    cache.set('name', 'test').then(function () {
      return cache.get('name');
    })
    .then(function (val) {
      expect(val).to.equal('test');
    });
  });

});
