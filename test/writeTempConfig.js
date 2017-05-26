var expect = require('chai').expect;
var _ = require('lodash');
var writeTempConfig = require('../lib/writeTempConfig');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var temp = Promise.promisifyAll(require('temp'));
var join = require('path').join;

temp.track();

function writeMockConfig(done) {
  return temp.mkdirAsync('mockFiles')
  .then(function(dir) {
    return fs.mkdirAsync(join(dir, 'config'))
    .then(function() {
      var tempFiles = ['elasticsearch.yml', 'logging.yml'];
      return Promise.map(tempFiles, function(file) {
        return fs.writeFileAsync(join(dir, 'config', file), '');
      });
    })
    .thenReturn(dir);
  });
}

function removeMockConfig() {
  return temp.cleanupAsync();
}

describe('write temp config', function () {
  var mockConfigFolder;
  beforeEach(function() {
    return writeMockConfig()
    .then(function (dir) {
      mockConfigFolder = dir;
    });
  });

  it('should create a temp folder with configs', function() {
    return writeTempConfig({
      config: {foo: 'bar'},
      logLevel: 'INFO',
      esPath: mockConfigFolder,
      features: {
        usesLoggingYaml: true
      }
    })
    .then(function(path) {
      return fs.readdirAsync(path);
    })
    .then(function(files) {
      expect(files).to.contain('elasticsearch.yml');
      expect(files).to.contain('logging.json');
      expect(files).to.not.contain('logging.yml');
    });
  });

  afterEach(function() {
    return removeMockConfig()
    .then(function () {
      return fs.readdirAsync(mockConfigFolder);
    })
    .then(function(files) {
      throw new Error('mock config should be cleaned up');
    }, function(err) {
      expect(err.cause.code).to.equal('ENOENT');
    });
  });
});
