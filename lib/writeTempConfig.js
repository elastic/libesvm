var temp = require('temp');
var fs = require('fs');
var Promises = require('bluebird');
temp.track();

module.exports = function (config, cb) {
  return new Promises(function (resolve, reject) {
    var options = { prefix: 'libesvm-', suffix: '.json' };
    temp.open(options, function (err, info) {
      fs.write(info.fd, JSON.stringify(config));
      fs.close(info.fd, function (err) {
        if (err) reject(err);
        resolve(info.path);
      });
    });
  }).nodeify(cb);
};
