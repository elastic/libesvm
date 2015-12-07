var child_process = require('child_process');
var _             = require('lodash');
var Promises      = require('bluebird');
var exec          = Promises.promisify(child_process.exec);
var semver        = require('semver');
var join          = require('path').join;

var ERR_UNKNOWN_COMMAND = 64;
var ERR_INVALID_PLUGIN = 74;

function installCommand(path, plugin, oldCommand) {
    var cmd = join(path, 'bin', 'plugin');
    cmd += (oldCommand === true) ? ' --install ' : ' install ';
    cmd += (_.isPlainObject(plugin)) ? plugin.name + ' --url ' + plugin.path : plugin;
    return cmd;
}

/**
 * Install a plugin
 * @param {object} options Options object
 * @param {string} options.path The path of the install
 * @param {mixed} options.plugin The plugin uri or an object with name and path to binary.
 * @param {function} [options.log] The logger
 * @returns {Promises}
 */
module.exports = function (options, cb) {
  // TODO need to find a way to check to see if the plugin is installed or not.
  var log = options.log || _.noop;
  var path = options.path;
  var plugin = options.plugin;
  var pluginName = (_.isPlainObject(plugin) ? plugin.name : plugin);

  log('INFO', 'Installing "'+ pluginName + '" plugin');
  return exec(installCommand(path, plugin))
  .catch(function (err) {
    if (err.cause.code !== ERR_INVALID_PLUGIN) throw new Error('Invalid plugin: ' + pluginName);

    return exec(installCommand(path, plugin, true))
    .catch(function (err) {
      if (err.cause.code !== ERR_INVALID_PLUGIN) throw new Error('Invalid plugin: ' + pluginName);

      // We need to ignore errors if the plugins already exist.
      return true;
    });
  })
  .nodeify(cb);
};

