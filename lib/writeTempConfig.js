var temp = require('temp');
var fs = require('fs');
var rimraf = require('rimraf');
var fsExtra = require('fs-extra');
var join = require('path').join;
var Promise = require('bluebird');
var noop = require('lodash').noop
var jsYaml = require('js-yaml');

var configureLogging = require('./configureLogging');
var getFeatures = require('./featureDetection').getFeatures;

var writeFile = Promise.promisify(fs.writeFile);
var mkdirTemp = Promise.promisify(temp.mkdir);
var copy = Promise.promisify(fsExtra.copy);
var remove = Promise.promisify(fsExtra.remove);

var tempConfigFolder;
process.on('exit', function () {
  if (tempConfigFolder) {
    rimraf.sync(tempConfigFolder);
  }
});

function writeLogConfiguration(dir, configs, log) {
  if (configs.usesLoggingYaml) {
    return Promise.all([
      remove(join(dir, 'logging.yml')),
      writeFile(join(dir, 'logging.json'), JSON.stringify(configs.logging), 'utf8')
    ]);
  }
  
  return writeFile(join(dir, 'log4j2.properties'), configs.logging, 'utf8')
}

module.exports = function (options) {
  var logLevel = options.logLevel;
  var esPath = options.esPath;
  var config = options.config;
  var log = options.log || noop;
  var features = options.features;

  return mkdirTemp({prefix: 'libesvm-'}).then(function createConfig(dir) {
    return Promise.attempt(function () {
      return copy(join(esPath, 'config'), dir);
    })
    .then(function () {
      return Promise.props({
        es: configureLogging.enforceEsvmMinimumLevels(config, logLevel),
        logging: configureLogging.readAndSetLevel(
          features.usesLoggingYaml
            ? join(dir, 'logging.yml')
            : join(dir, 'log4j2.properties'),
          logLevel
        ),
        usesLoggingYaml: features.usesLoggingYaml
      });
    })
    .then(function (configs) {
      return writeFile(
        join(dir, 'elasticsearch.yml'),
        jsYaml.safeDump(configs.es),
        'utf8'
      )
      .then(function () {
        return writeLogConfiguration(dir, configs, log)
      });
    })
    .thenReturn(dir);
  });
};
