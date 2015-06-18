var YaCache = require('ya-cache');
var join = require('path').join;
var os = require('os');

module.exports = new YaCache(join(os.tmpdir(), 'libesvm.cache.json'));