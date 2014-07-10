var child_process = require('child_process');
var spawn = child_process.spawn;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Promises = require('bluebird');
var utils = require('./utils');
var join = require('path').join;
var semver = require('semver');
var moment = require('moment');

var Node = module.exports = function Node (options) {
  this.version = options.version;
  this.root = options.root;
  this.config = options.config;
};

Node.prototype = _.create(EventEmitter.prototype, { constructor: Node });

Node.prototype.start = function (cb) {
  var self = this;
  return new Promises(function (resolve, reject) {
    // we need to flatten the config into command line args
    var args = utils.flatten(self.config).map(function (arg) {
      var value = _.isString(arg.value) ? '"' + arg.value + '"' : arg.value;
      return '-Des.'+arg.name+'='+value;
    }).join(' ');

    // the path of the executable 
    var path = join(self.root, 'bin', 'elasticsearch')

    // if it's an older version of ES we need to run with -f
    if (semver.satisfies(self.version, '<1.0.0')) args.shift('-f');

    // run the process
    self.process = spawn(path, args)

    self.process.stderr.on('data', self.parseLog.bind(self));
    self.process.stdout.on('data', self.parseLog.bind(self));
    self.process.once('error', reject);
    self.once('start', resolve);
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
      this.emit('start', this)
      this.name = msgObj.node;
    };

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
}

Node.prototype.shutdown = function (cb) {
  var self = this;
  return new Promises(function (resolve, reject) {
    self.process.on('close', resolve);
    self.process.kill('SIGINT');
  }).nodeify(cb);
};
