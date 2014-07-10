var releases = require('./lib/releases');
var loader = require('./index');
var Node = require('./lib/node');
var path = require('path');
var clc = require('cli-color');
var moment = require('moment');

var options = {
  version: '~1.2.0',
  directory: __dirname+'/releases',
  plugins: ['elasticsearch/marvel/latest'],
  purge: true, // Purge the data directory
  fresh: false, // Download a fresh copy
  nodes: 2,
  config: {
    cluster: {
      name: "My Test Cluster"
    }
  }
};
 
var cluster = loader.createCluster(options);

var levels = {
  INFO: clc.green,
  DEBUG: clc.cyan,
  WARN: clc.yellow,
  FATAL: clc.magentaBright,
  ERROR: clc.red
};

cluster.on('log', function (log) {
  var level = levels[log.level] || function (msg) { return msg; };
  var message = clc.blackBright(moment(log.timestamp).format('lll'));
  message += ' '+level(log.level);
  message += ' ' + clc.yellow(log.type);
  if (log.node) message += ' ' + clc.magenta(log.node) + ': ';
  message += log.message;
  console.log(message);
});

cluster.download().then(function () {
 return cluster.installPlugins();
}).then(function () {
 return cluster.start(); 
}).then(function () {
  process.on('SIGINT', function () {
    cluster.shutdown().then(function () {
      console.log(clc.white.bgGreen("Bye Bye!"));
      process.exit();
    });
  });
  process.stdin.read();
}).catch(function (err) {
 console.log('Oops', err.stack);
});

