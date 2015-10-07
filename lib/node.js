var child_process = require('child_process');
var spawn = child_process.spawn;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var Promises = require('bluebird');
var utils = require('./utils');
var join = require('path').join;
var semver = require('semver');
var moment = require('moment');
var split = require('split');
var through2 = require('through2');
var writeTempConfig = require('./writeTempConfig');
var isWindows = /^win/.test(process.platform);

var Node = module.exports = function Node (options) {
  this.version = options.version;
  this.branch = options.branch;
  this.path = options.path;
  this.config = options.config;
  this.clusterNameOverride = options.clusterNameOverride;
};

Node.prototype = _.create(EventEmitter.prototype, { constructor: Node });

Node.prototype.start = function (cb) {
  var self = this;
  return writeTempConfig(self.config, self.path).then(function (configPath) {
    return new Promises(function (resolve, reject) {
      var args = ['-Des.path.conf='+configPath];

      // branch names aren't valid semver, just check the first number
      var majorVersion = (self.version || self.branch).split('.').shift();
      if (majorVersion === '0') {
        args.unshift('-f');
      }

      if (self.clusterNameOverride) {
        args.push('-Des.cluster.name='+self.clusterNameOverride);
      }

      // the path of the executable
      var file = 'elasticsearch' + (isWindows ? '.bat' : '');
      var path = join(self.path, 'bin', file);

      // run the process
      self.process = spawn(path, args);

      self.process.stdout
      .pipe(split())
      .pipe(self.logLineParser('stdout'));

      self.process.stderr
      .pipe(split())
      .pipe(self.logLineParser('stderr'));

      self.process.once('error', reject);
      self.once('start', resolve);
    });
  }).nodeify(cb);
};

Node.prototype.logLineParser = function (stream) {
  var self = this;
  return through2(function (line, enc, cb) {
    cb();

    var message = line.toString('utf8').trim();
    if (!message) return;
    self.parseLog(stream, message);
  });
};

Node.prototype.parseLog = function (stream, message) {
  var msgObj = this.parseLine(stream, message);

  if (!msgObj) {
    this.emit('log', 'malformed log message: ' + JSON.stringify(message));
    return;
  }

  if (msgObj.type.match(/(^|\.)node$/) && msgObj.message === 'started') {
    this.emit('start', this);
    this.name = msgObj.node;
  }

  if (msgObj.type.match(/(^|\.)http$/) && /publish_address/.test(msgObj.message)) {
    if (!this.parsePort(msgObj.message)) {
      this.emit('log', 'unable to parse node port from ' + msgObj.message);
      return;
    }
  }

  this.emit('log', msgObj);
};

Node.prototype.parseLine = function (stream, line) {
  var matches;

  if (matches = line.match(/^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\s*\[([^\]]+)\](.+)/)) {
    return {
      timestamp: moment(matches[1].trim(), 'YYYY-MM-DD HH:mm:ss,SSS').toDate(),
      level: matches[2].trim(),
      type: matches[3].trim(),
      node: matches[4].trim(),
      message: matches[5].trim()
    };
  }

  if (matches = line.match(/^log4j:([A-Z]+)([^\n]+)$/)) {
    return {
      timestamp: moment().toDate(),
      level: matches[1].trim(),
      type: 'log4j',
      node: '?',
      message: matches[2].trim()
    };
  }

  if (stream === 'stderr') return;

  return {
    timestamp: moment().toDate(),
    level: 'INFO',
    type: '?',
    node: '?',
    message: line
  };
};

Node.prototype.parsePort = function (message) {
  var matches = message.match(/publish_address\s*\{[^\}]*?(\d+\.\d+\.\d+\.\d+):(\d+)[^\}]*\}/i);
  if (matches) {
    this.address = matches[1];
    this.port = matches[2];
    return true;
  }
};

Node.prototype.shutdown = function (cb) {
  var self = this;
  return new Promises(function (resolve, reject) {
    self.process.on('close', resolve);
    if (isWindows) {
      spawn('taskkill', ['/pid', self.process.pid, '/F', '/T']);
    } else {
      self.process.kill('SIGINT');
    }
  }).nodeify(cb);
};
