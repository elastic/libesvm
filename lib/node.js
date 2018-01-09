var child_process = require('child_process');
var spawn = child_process.spawn;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var snakeCase = require('lodash.snakecase')
var Bluebird = require('bluebird');
var utils = require('./utils');
var join = require('path').join;
var semver = require('semver');
var moment = require('moment');
var split = require('split');
var through2 = require('through2');
var writeTempConfig = require('./writeTempConfig');
var writeShieldConfig = require('./writeShieldConfig');
var isWindows = /^win/.test(process.platform);
var getActualVersion = require('./getActualVersion');
var uuid = require('uuid');
var getFeatures = require('./featureDetection').getFeatures;

var startOfStackTraceRE = /^Exception in thread /;
var continueOfStackTraceRE = /^\s*(at |Refer to the log for complete error details)/;

var Node = module.exports = function Node (options) {
  this.version = options.version;
  this.branch = options.branch;
  this.path = options.path;
  this.config = options.config;
  this.logLevel = options.logLevel;
  this.options = options;
  this.clusterNameOverride = options.clusterNameOverride;
  this.id = uuid.v4();
};

Node.prototype = _.create(EventEmitter.prototype, { constructor: Node });

Node.prototype.start = function (cb) {
  var self = this;
  return Bluebird.all([
    getActualVersion(self.path),
    getFeatures(self.path),
  ])
  .spread(function (version, features) {
    return writeTempConfig({
      config: self.config,
      logLevel: self.logLevel,
      esPath: self.path,
      log: _.bindKey(self, 'emit', 'log'),
      features: features
    })
    .then(writeShieldConfig(self.options, version))
    .then(function (configPath) {
      return new Bluebird(function (resolve, reject) {
        self.configPath = configPath;
        var env = Object.assign({}, process.env);
        var args = [];

        if (features.confDirEnvVar) {
          env[features.confDirEnvVar] = configPath
        } else {
          args.push(features.pathConfigFlag + '='+ configPath)
        }

        // branch names aren't valid semver, just check the first number
        var majorVersion = version.split('.').shift();
        if (majorVersion === '0') {
          args.unshift('-f');
        }

        if (self.clusterNameOverride) {
          args.push(features.configVarFlag + 'cluster.name='+self.clusterNameOverride);
        }

        // the path of the executable
        var file = 'elasticsearch' + (isWindows ? '.bat' : '');
        var path = join(self.path, 'bin', file);

        // run the process
        self.process = spawn(path, args, {
          env: env,
        });

        self.process.stdout
        .pipe(split())
        .pipe(self.logLineParser('stdout'));

        self.process.stderr
        .pipe(split())
        .pipe(self.logLineParser('stderr'));

        function checkForBadExit (code) {
          if (code === 0) return;
          var error = new Error('Server exitted with the non-zero exit code ' + code);
          reject(error);
          self.emit('error', error);
        }

        self.process.once('exit', checkForBadExit);
        self.process.once('error', reject);
        self.once('start', function (result) {
          self.process.removeListener('error', reject);
          self.process.removeListener('exit', checkForBadExit);
          resolve(result);
        });
      });
    });
  }).nodeify(cb);
};

Node.prototype.logLineParser = function (stream) {
  var self = this;
  var stack = null;

  return through2(function (line, enc, cb) {
    cb();
    line = line.toString('utf8');

    if (stack) {
      if (continueOfStackTraceRE.test(line)) {
        stack.push('  ' + line.trim());
        return;
      } else {
        self.onLogMessage(stream, stack.join('\n'));
        stack = null;
      }
    }

    if (startOfStackTraceRE.test(line)) {
      stack = [line];
      return;
    }

    var message = line.trim();
    if (!message) return;
    self.onLogMessage(stream, message);
  }, function () {
    if (stack) {
      self.onLogMessage(stream, stack.join('\n'));
      stack = null;
    }
  });
};

Node.prototype.onLogMessage = function (stream, message) {
  var msgObj = this.parseLine(stream, message);

  if (!msgObj) {
    this.emit('log', 'error', 'malformed log message: ' + JSON.stringify(message));
    return;
  }

  if (msgObj.type === 'node' && msgObj.message === 'started') {
    this.emit('start', this);
    this.name = msgObj.node;
  }

  var typeHttp = ['http', 'http_server', 'netty_4_http_server_transport'].indexOf(msgObj.type) > -1
  var httpAddressPublished = typeHttp && /publish_address/.test(msgObj.message)
  if (httpAddressPublished) {
    var port = this.parsePublishAddress(msgObj.message);
    if (!port) {
      this.emit('log', 'error', 'unable to parse node port from ' + msgObj.message);
      return;
    } else {
      this.address = port.address;
      this.port = port.port;
    }
  }

  this.emit('log', msgObj);
};

Node.prototype.parseLine = function (stream, line) {
  var matches;

  if (matches = line.match(startOfStackTraceRE)) {
    return {
      timestamp: moment().toDate(),
      level: 'warning',
      type: 'stack',
      node: '-',
      message: line
    };
  }

  if (matches = line.match(/^\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]\s*\[([^\]]+)\](.+)/)) {
    var type = matches[3].trim()

    if (/^(\w\.)+\w{2,}/.test(type)) {
      // 5.x-ish version log the type as a class name with short-dot style prefixes
      // ie: o.e.n.Node, o.e.t.TransportService
      // so we trim those down to just the class name
      const relevantParts = type.split('.')
      while (relevantParts.length && relevantParts[0].length <= 1) relevantParts.shift()
      type = relevantParts.join('.')
    }

    return {
      timestamp: moment(matches[1].trim(), 'YYYY-MM-DD HH:mm:ss,SSS').toDate(),
      level: matches[2].trim(),
      type: snakeCase(type),
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

Node.prototype.parsePublishAddress = function (message) {
  var matches = message.match(/publish_address\s*\{[^\}]*?(\d+\.\d+\.\d+\.\d+):(\d+)[^\}]*\}/i);
  if (matches) {
    return {
      address: matches[1],
      port: matches[2]
    }
  }
};

Node.prototype.shutdown = function (cb) {
  var self = this;
  return new Bluebird(function (resolve, reject) {
    if (!self.process) return;
    self.process.on('close', resolve);
    if (isWindows) {
      spawn('taskkill', ['/pid', self.process.pid, '/F', '/T']);
    } else {
      self.process.kill('SIGINT');
    }
  }).nodeify(cb);
};
