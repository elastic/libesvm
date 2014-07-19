var child_process = require('child_process');
var spawn = child_process.spawn;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Promises = require('bluebird');
var utils = require('./utils');
var join = require('path').join;
var semver = require('semver');
var moment = require('moment');
var writeTempConfig = require('./writeTempConfig');

var Node = module.exports = function Node (options) {
  this.version = options.version;
  this.path = options.path;
  this.config = options.config;
};

Node.prototype = _.create(EventEmitter.prototype, { constructor: Node });

Node.prototype.start = function (cb) {
  var self = this;
  return writeTempConfig(self.config).then(function (configPath) {
    return new Promises(function (resolve, reject) {
      var args = ['-f', '-D', 'es.config='+configPath];

      // the path of the executable 
      var path = join(self.path, 'bin', 'elasticsearch');

      // run the process
      self.process = spawn(path, args);

      var parseLog = _.bindKey(self, 'parseLog');
      self.process.stderr.on('data', parseLog);
      self.process.stdout.on('data', parseLog);
      self.process.once('error', reject);
      self.once('start', resolve);
    });
  }).nodeify(cb);
};

Node.prototype.parseLog = function (data) {
  var message = data.toString('utf8');
  var matches = message.match(/^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\s*\[([^\]]+)\](.+)/);
  if (matches) {
    var msgObj = {
      timestamp: moment(matches[1].trim(), 'YYYY-MM-DD HH:mm:ss,SSS').toDate(),
      level: matches[2].trim(),
      type: matches[3].trim(),
      node: matches[4].trim(),
      message: matches[5].trim()
    };

    if (msgObj.type === 'node' && msgObj.message === 'started') {
      this.emit('start', this);
      this.name = msgObj.node;
    }

    if (msgObj.type === 'http' && /bound_address/.test(msgObj.message)) {
      this.parsePort(msgObj.message);
    }

    this.emit('log', msgObj);

  }
};

Node.prototype.parsePort = function (message) {
  var matches = message.match(/publish_address\s*\{inet\[[^\/]*\/(\d+\.\d+\.\d+\.\d+):(\d+)\]\}/);
  if (matches) {
    this.address = matches[1];
    this.port = matches[2];
  }
};

Node.prototype.shutdown = function (cb) {
  var self = this;
  return new Promises(function (resolve, reject) {
    self.process.on('close', resolve);
    self.process.kill('SIGINT');
  }).nodeify(cb);
};
