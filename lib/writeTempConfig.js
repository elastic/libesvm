var temp = require('temp');
var fs = require('fs');
var rimraf = require('rimraf');
var fsExtra = require('fs-extra');
var join = require('path').join;
var Promise = require('bluebird');

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

function getLogConfiguration(dir, configs) {
  if (configs.log4j2Flag) return []
  return [remove(join(dir, 'logging.yml')), writeFile(join(dir, 'logging.json'), JSON.stringify(configs.logging), 'utf8')]
}

module.exports = function (config, logLevel, esPath) {
  return mkdirTemp({prefix: 'libesvm-'}).then(function createConfig(dir) {
    return Promise.attempt(function () {
      return copy(join(esPath, 'config'), dir);
    })
    .then(function() {
      return getFeatures(esPath);
    })
    .then(function (features) {
      return Promise.props({
        es: configureLogging.enforceEsvmMinimumLevels(config, logLevel),
        logging: features.log4j2Flag ? null : configureLogging.readAndSetLevel(join(dir, 'logging.yml'), logLevel),
        log4j2Flag: features.log4j2Flag
      });
    })
    .then(function (configs) {
      return Promise.all([
        remove(join(dir, 'elasticsearch.yml')),
        writeFile(join(dir, 'elasticsearch.json'), JSON.stringify(configs.es), 'utf8'),
      ].concat(getLogConfiguration(dir, configs)));
    })
    .thenReturn(dir);
  });
};
