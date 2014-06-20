var releases = require('./lib/releases');
var loader = require('./index');
var Node = require('./lib/node');
var path = require('path');

var options = {
  version: '~1.2.0',
  directory: __dirname+'/releases',
  plugins: ['elasticsearch/marvel/latest'],
  purge: true, // Purge the data directory
  fresh: false, // Download a fresh copy
  nodes: 1,
  config: {
    cluster: {
      name: "My Test Cluster"
    }
  }
};
 
 // var cluster = loader.createCluster(options);
 // cluster.start()
 //   .then(function (args) {
 //     console.log('done', args);
 //   })
 //   .catch(function (err) {
 //     console.log('Oops', err.stack);
 //   });

var root = path.join(options.directory, '1.2.1');
var node = new Node({
  root: root,
  version: '1.2.1',
  config: options.config
});

node.on('log', function (msg) {
  // console.log(msg);
});  

node.start().then(function () {
  console.log('[Elasticsearch '+node.version+']', '"'+node.name+'"', 'started on', 'http://'+node.address+':'+node.port);
}).catch(function (err) {
  console.log('Oops', err.stack);
});
