var Bluebird = require('bluebird');
var jsYaml = require('js-yaml');
var fs = require('fs');
var extname = require('path').extname;
var defaultsDeep = require('lodash.defaultsdeep');
var forOwn = require('lodash.forown');
var isPlainObject = require('lodash.isplainobject');
var set = require('lodash.set');
var propertiesParser = require('properties-parser');

var editPropertiesFile = Bluebird.promisify(propertiesParser.createEditor);
var readFile = Bluebird.promisify(fs.readFile);

/**
 * Convert a log level into a number, based on the table in the log4j docs
 * https://logging.apache.org/log4j/2.x/manual/customloglevels.html
 * @param  {string} level
 * @return {number}
 */
exports.levelToInt = function (level) {
  switch(level) {
    case 'OFF': return 0;
    case 'FATAL': return 100;
    case 'ERROR': return 200;
    case 'WARN': return 300;
    case 'INFO': return 400;
    case 'DEBUG': return 500;
    case 'TRACE': return 600;
    case 'ALL': return Number.MAX_SAFE_INTEGER;
    default:
      throw new TypeError('unkown logging level ' + level);
  }
};

/**
 * Recursively walk all properties of a config object and expand dot-notated paths
 *
 * @param  {object} abnormal - the object, potentially containing keys (at any level) that are actually
 *                             dot-notated paths
 * @return {object}          - the normalized object, containing all of the values from the abnormal
 *                             object but without any dot-notated keys
 */
exports.normalize = function (abnormal) {
  var normalized = {};
  forOwn(abnormal, function apply(val, key) {
    if (isPlainObject(val)) {
      forOwn(val, function (subVal, subKey) {
        apply(subVal, key + '.' + subKey);
      });
      return;
    }

    if (Array.isArray(val)) {
      set(normalized, key, []);
      val.forEach(function (subVal, i) {
        apply(subVal, key + '.' + i);
      });
      return;
    }

    set(normalized, key, val);
  });
  return normalized;
};

/**
 * Read a yaml config file from disk and normalize
 * @param  {string} path - location of the config file on disk
 * @return {Promise<object>} - promise of normalized config
 */
exports.read = Bluebird.method(function (path) {
  return readFile(path, 'utf8').then(function (yaml) {
    return exports.normalize(jsYaml.safeLoad(yaml));
  });
});

/**
 * Modify the level of the root logger in a parsed config file
 * @param {object} loggingConfig - parsed logging config file, should be normalized first
 * @param {string} level - the logging level to set
 */
exports.setLevel = function (loggingConfig, level) {
  exports.levelToInt(level); // verify logging level is valid

  return defaultsDeep({
    es: {
      logger: {
        level: level
      }
    }
  }, loggingConfig);
};

/**
 * Read a yaml config file from disk and set it's logging level
 * @param  {string} path - path to config on disk
 * @param  {string} level - desired logging level
 * @return {object} - the normalized config with the logging level set
 */
exports.readAndSetLevel = function (path, level) {
  if (extname(path) === '.properties') {
    // log4j2.properties file
    return editPropertiesFile(path).then(function (editor) {
      editor.set('logger.action.level', level.toLowerCase());
      editor.set('rootLogger.level', level.toLowerCase());
      return editor.toString();
    });
  }
  
  return exports.read(path).then(function (config) {
    return exports.setLevel(config, level);
  });
};

/**
 * Force an elasticsearch config to have the minimum logging level
 * set, necessary for esvm to function properly.
 * @param  {object} esConfig - an es config object
 * @param  {string} userLevel - the log level this user wants
 * @return {object} - a copy of esConfig with the mimimum log level enforced
 */
exports.enforceEsvmMinimumLevels = function (esConfig, userLevel) {
  var level = exports.levelToInt(userLevel) > exports.levelToInt('INFO') ? userLevel : 'INFO';
  return defaultsDeep({
    logger: {
      node: level,
      http: level
    }
  }, esConfig);
};
