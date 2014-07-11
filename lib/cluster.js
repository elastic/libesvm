var _ = require('lodash');
var join = require('path').join;
var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter;
var Promises = require('bluebird');
var download = require('./download');
var resolveVersion = require('./resolveVersion');
var purge = require('./purge');

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

Cluster.prototype.log = function (level, message) {
  // If level is a plain object then we should just bubble it on up.
  if (_.isPlainObject(level)) {
    return this.emit('log', level);
  } 

  // Otherwise log a new message object.
  this.emit('log', {
    timestamp: new Date(),
    type: 'cluster',
    level: level.toUpperCase(),
    node: null,
    message: message 
  });
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
    };
    var node = new Node(options); 
    node.on('log', self.log.bind(self));
    return node;
  });

  return this.nodes;
};

Cluster.prototype.start = function (cb) {
  var self = this;
  
  var startNodes = function () {
    var nodes = self.initalizeNodes();
    self.log('INFO', 'Starting ' + nodes.length + ' nodes');
    var promises = _.map(nodes, function (node) {
      return node.start(); 
    });
    return Promises.all(promises).nodeify(cb);
  };
  
  if (this.options.purge) {
    var path = join(this.options.directory, this.version, 'data');
    this.log('INFO', 'Purging ' + path);
    return purge(path).then(startNodes);
  }

  return startNodes();
};

Cluster.prototype.shutdown = function (cb) {
  this.log('INFO', 'Shutting down cluster');
  var promises = _.map(this.nodes, function (node) {
    return node.shutdown(); 
  });
  return Promises.all(promises).nodeify(cb);
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
  return resolveVersion(this.options).then(function (version) {
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
  this.log('INFO', 'Installing plugins');
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
  this.log('INFO', 'Installing "' + plugin + '" plugin');
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
  return download(this.log.bind(this), this.options, cb); 
};

