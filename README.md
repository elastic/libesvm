libesvm
==============

## !!!! DO NOT USE THIS IN PRODUCTION !!!!

This is a library for managing Elasticsearch instances for testing and development environments. It's not intended to be used in production (just don't).

```javascript
var esvm = require('libesvm');
var cluster = libesvm.createCluster(options);

var options = {
  version: '~1.2.0',
  directory: process.env.HOME+'/.esvm',
  plugins: ['elasticsearch/marvel/latest'],
  purge: true, // Purge the data directory
  fresh: false, // Download a fresh copy
  nodes: 2,
  config: {
    cluster: {
      name: 'My Test Cluster'
    }
  }
};

cluster.download().then(function () {
  return cluster.installPlugins();
}).then(function () {
  return cluster.start(); 
}).then(function () {
  process.on('SIGINT', function () {
    cluster.shutdown().then(function () {
      console.log(clc.black.bgWhite("Bye Bye!"));
      process.exit();
    });
  });
  process.stdin.read();
}).catch(function (err) {
 console.log('Oops', err.stack);
});
```

## Installation

```
npm install libesvm
```
