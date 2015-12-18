var _       = require('lodash');
var Promise = require('bluebird');
var exec    = require('child_process').exec;
var semver  = require('semver');
var join    = require('path').join;
var version;
function versionCommand(path, oldCommand) {
  var cmd = join(path, 'bin', 'elasticsearch');
  cmd += (oldCommand) ? ' -v' : ' --version';
  return cmd;
}

function parseStdOut(stdout) {
  var matches = stdout.match(/Version: ([^,]+)/);
  if (matches) {
    return matches[1];
  }
}

module.exports = function (path) {
  if (version) return Promise.resolve(version);
  return new Promise(function (resolve, reject) {
    exec(versionCommand(path), function (err, stdout) {
      if (!err) return resolve(parseStdOut(stdout));
      exec(versionCommand(path, true), function (err, stdout) {
        if (err) reject(new Error("Unable to get actual version"));
        version = parseStdOut(stdout);
        resolve(version);
      });
    });
  });
}
