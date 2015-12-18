var _                     = require('lodash');
var Promises              = require('bluebird');
var exec                  = require('child_process').exec;
var semver                = require('semver');
var join                  = require('path').join;
var installSnapshotPlugin = require('./installSnapshotPlugin');

var ERR_UNKNOWN = 0;
var ERR_DOWNLOAD_FAILED = 1;
var ERR_ALREADY_EXISTS = 2;

function installCommand(path, plugin, oldCommand) {
    var cmd = join(path, 'bin', 'plugin');
    if (oldCommand) {
      cmd += ' --install ';
      if (_.isPlainObject(plugin)) {
        cmd += plugin.name;
        if (plugin.path) cmd += ' --url ' + plugin.path;
        if (plugin.staging) cmd += ' -Des.plugins.staging=true';
      } else {
        cmd += plugin;
      }
    } else {
      cmd += ' install ';
      if (_.isPlainObject(plugin)) {
        cmd += (plugin.path) ? plugin.path : plugin.name;
        if (plugin.staging) cmd += ' -Des.plugins.staging=true';
      } else {
        cmd += plugin;
      }
    }
    return cmd;
}

function getErrorCause(stdout) {
  if (stdout.match(new RegExp('failed to download', 'i'))) return ERR_DOWNLOAD_FAILED;
  if (stdout.match(new RegExp('already exists', 'i'))) return ERR_ALREADY_EXISTS;
  return ERR_UNKNOWN;
}

/**
 * Install a plugin
 * @param {object} options Options object
 * @param {string} options.path The path of the install
 * @param {mixed} options.plugin The plugin uri or an object with name and path to binary.
 * @param {function} [options.log] The logger
 * @returns {Promises}
 */
module.exports = function installPlugin(options, cb) {
  var log = options.log || _.noop;
  var path = options.path;
  var plugin = options.plugin;
  var pluginName = (_.isPlainObject(plugin) ? plugin.name : plugin);

  if (_.isPlainObject(plugin) && plugin.snapshot) return installSnapshotPlugin(options, installPlugin, cb);

  function handleInstallError(resolve, reject, stdout, fn) {
    var errorCause = getErrorCause(stdout);
    if (errorCause === ERR_DOWNLOAD_FAILED) {
      var msg = 'Failed to download plugin: ' + pluginName + '\n' + stdout;
      return reject(new Error(msg));
    }
    if (errorCause === ERR_ALREADY_EXISTS) return resolve(true);

    fn.call(fn);
  }

  log('INFO', 'Installing "'+ pluginName + '" plugin');
  return new Promises(function (resolve, reject) {
    exec(installCommand(path, plugin), function (err, stdout) {
      if (!err) return resolve(stdout);

      handleInstallError(resolve, reject, stdout, function () {
        exec(installCommand(path, plugin, true), function (err, stdout) {
          if (!err) return resolve (stdout);

          handleInstallError(resolve, reject, stdout, function () {
            // TODO: should probably handle other errors
            resolve(true);
          });
        });
      });
    });
  })
  .nodeify(cb);
};

