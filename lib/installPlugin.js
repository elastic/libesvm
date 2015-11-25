var child_process = require('child_process');
var _             = require('lodash');
var Promises      = require('bluebird');
var exec          = Promises.promisify(child_process.exec);
var semver        = require('semver');
var join          = require('path').join;
var commands = {
  '<2.0': function (path, plugin) {
      var cmd = join(path, 'bin', 'plugin');
      if (_.isPlainObject(plugin)) {
        cmd += ' --install ' + plugin.name + ' --url ' + plugin.path;
      } else {
        cmd += ' --install ' + plugin;
      }
      return cmd;
  },
  '>=2.0': function (path, plugin) {
      var cmd = join(path, 'bin', 'plugin');
      if (_.isPlainObject(plugin)) {
        cmd += ' install ' + plugin.name + ' --url ' + plugin.path;
      } else {
        cmd += ' install ' + plugin;
      }
      return cmd;
  }
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

  var createCmd = _.find(commands, function (fn, rule) {
    return semver.satisfies(options.version, rule);
  });

  var cmd = createCmd(path, plugin);
	log('INFO', 'Installing "'+ (_.isPlainObject(plugin) ? plugin.name : plugin) + '" plugin');
	return exec(cmd).catch(function (err) {
		// We need to ignore errors if the plugins already exist.
		return true;
	}).nodeify(cb);
};

