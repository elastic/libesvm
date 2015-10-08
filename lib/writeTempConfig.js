var temp = require('temp');
var fs = require('fs');
var rimraf = require('rimraf');
var fsExtra = require('fs-extra');
var path = require('path');
var Promise = require('bluebird');

var writeFile = Promise.promisify(fs.writeFile);
var mkdirTemp = Promise.promisify(temp.mkdir);
var copy = Promise.promisify(fsExtra.copy);

var tempConfigFolder;
process.on('exit', function () {
  if (tempConfigFolder) {
    rimraf.sync(tempConfigFolder);
  }
});

module.exports = function (config, esPath) {
  return mkdirTemp({prefix: 'libesvm-'}).then(function createConfig(dir) {
    tempConfigFolder = dir;

    var configFileDestination = path.join(dir, 'elasticsearch.json');
    var loggingFileDestination = path.join(dir, 'logging.yml');
    var loggingFileSource = path.join(esPath, 'config/logging.yml');

    return Promise.all([
        writeFile(configFileDestination, JSON.stringify(config), 'utf8'),
        copy(loggingFileSource, loggingFileDestination)
      ]).thenReturn(dir);
  });
};
