var _ = require('lodash');
var join = require('path').join;
var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter;
var Promises = require('bluebird');
var releases = require('./releases');
var exec = Promises.promisify(child_process.exec);
var rimraf = Promises.promisify(require('rimraf'));
var Node = require('./node');

/**
 * The Cluster initializer
 * @param {object} options The options object
 * @param {string} version The known version
 * @returns {object}
 */
var Cluster = module.exports = function Cluster (options, version) {
  options = _.defaults(options || {}, {
     version: '*',
     directory: '~/.esvn',
     purge: false,
     fresh: false,
     directory: join(__dirname, '..', '.releases'),
     nodes: 1,
     config: {}
  });
  this.options = options;
  this.version = version; 
  this.nodes = [];
};

Cluster.prototype = _.create(EventEmitter.prototype, { constructor: Cluster });

Cluster.prototype.start = function (cb) {
  var self = this;
  return this.download().then(function () {
    return self.installPlugins();
  }).then(function () {
    return self.startNodes(); 
  }).nodeify(cb); 
};

Cluster.prototype.initalizeNodes = function () {
  var self = this;
  var nodes = [];
  if (_.isFinite(this.options.nodes)) {
    _.times(this.options.nodes, function (index) {
      nodes.push(_.cloneDeep(self.options.config));   
    });
  } else {
    nodes = this.options.nodes;
  }

  this.nodes = _.map(nodes, function (config) {
    var options = {
      config: config,
      version: this.version,
      root: join(self.options.directory, self.version)
    }
    return new Node(options); 
  });
};

Cluster.prototype.startNodes = function (cb) {
  this.initalizeNodes();
  var nodes = _.map(this.nodes, function (node) {
    return node.start(); 
  });
  return Promises.all(nodes).nodeify(cb);
};


/**
 * Resolve the version based on the semver set in this.options
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
Cluster.prototype.resolveVersion = function (cb) {
  var self = this;
  // If we have the version then we should resolve with that
  if (this.version) {
    return Promises.resolve(this.version).nodeify(cb);
  }
  // Since we don't have the versino we will need to resolve it and
  // set the current version.
  return releases.resolveVersion(this.options).then(function (version) {
    self.version = version;
  }).nodeify(cb);
};

/**
 * Install all the plugins listed in the this.options.plugins
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
Cluster.prototype.installPlugins = function (cb) {
  var self = this;
  return this.resolveVersion().then(function () {
    var path = join(self.options.directory, self.version, 'plugins');
    return Promises.resolve(self.options.plugins).each(function (plugin) {
      return self.installPlugin(plugin); 
    });
  }).nodeify(cb);
};

/**
 * Install a plugin
 * @param {string} plugin The plugin to install
 * @returns {Promises}
 */
Cluster.prototype.installPlugin = function (plugin, cb) {
  var self = this;
  // TODO need to find a way to check to see if the plugin is installed or not.
  return this.resolveVersion().then(function () {
    var baseCmd = join(self.options.directory, self.version, 'bin', 'plugin');
    return exec(baseCmd + ' -i ' + plugin)
      // We need to ignore errors because plugins already exist.
      .catch(function () {
        return true; 
      });
  }).nodeify(cb);  
};

/**
 * Downloads the current version 
 * @param {function} cb The node style callback 
 * @returns {Promise}
 */
Cluster.prototype.download = function (cb) {
  return releases.download(this.options, cb); 
};

