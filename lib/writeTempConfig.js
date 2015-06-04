var temp = require('temp');
var fs = require('fs');
var writeFile = require('bluebird').promisify(fs.writeFile);

var trash = [];
process.on('exit', function () {
  trash.forEach(function (p) {
    fs.unlinkSync(p);
  });
});

module.exports = function (config) {
  var path = temp.path({ prefix: 'libesvm-', suffix: '.json' });
  trash.push(path);

  return writeFile(path, JSON.stringify(config), 'utf8').thenReturn(path);
};
