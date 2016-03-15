var _       = require('lodash');
var Promise = require('bluebird');
var exec    = Promise.promisify(require('child_process').exec);
var join    = require('path').join;
var version;

function versionCommand(path) {
  var cmd = join(path, 'bin', 'elasticsearch');
  return exec(cmd + ' --help')
  .then(function (results) {
    var stdout = results[0];
    var stderr = results[1];
    if(/-v\s/g.test(stdout)){
      return cmd + ' -v';
    }
    return cmd + ' --version';
  });
}

function parseStdOut(results) {
  var stdout = results[0];
  var stderr = results[1];
  var matches = stdout.match(/Version: ([^,]+)/);
  if (matches) {
    version = matches[1];
    return version;
  }
}

module.exports = function (path) {
  if (version) return Promise.resolve(version);
  return versionCommand(path)
  .then(function (cmd) {
    return exec(cmd).then(parseStdOut);
  }).catch(function (err) {
    var message = ("Unable to get actual version:\n" + err.message).split('\n')
      .map(function (line) {
        return '  ' + line
      }).join('\n');
    throw new Error(message);
  });
}
