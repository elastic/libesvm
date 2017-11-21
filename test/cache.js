var fs = require('fs');
var path = require('path');
var temp = require('temp').track();
var expect = require('chai').expect;
var cache = require('../lib/cache');

describe('Cache', function() {
  describe('Base functionality', function () {
    var fixture = {
      example: 'test',
      bar: 'foo',
      foo: 'bar',
    };

    // Create the cache fixture
    before(function (done) {
      temp.open('es-load-cache', function (err, filename) {
        if (err) return done(err);

        cache.source = filename.path;
        fs.writeFile(cache.source, JSON.stringify(fixture), done);
      });
    });

    // Clean up the cache file
    after(function (done) {
      temp.cleanup(done);
    });

    it('should return valid data', function() {
      return cache.get('bar').then(function (val) {
        expect(val).to.equal('foo');
      });
    });

    it('should return undefined for invalid data', function() {
      return cache.get('monkey').then(function (val) {
        expect(val).to.be.an('undefined');
      });
    });

    it('should set a new value', function() {
      return cache.set('name', 'test').then(function () {
        return cache.get('name');
      })
      .then(function (val) {
        expect(val).to.equal('test');
      });
    });

    it('should allow clearing the cache', function () {
      return cache.set('foo', 'bar')
        .then(function () {
          return cache.get('foo')
        })
        .then(function (value) {
          expect(value).to.equal('bar')
        })
        .then(function () {
          return cache.clear();
        })
        .then(function () {
          return cache.get('foo')
        })
        .then(function (value) {
          expect(value).to.equal(undefined)
        })
    })
  });
});
