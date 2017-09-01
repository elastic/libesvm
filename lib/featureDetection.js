var Bluebird = require('bluebird');
var join = require('path').join;
var exec = Bluebird.promisify(require('child_process').exec);
var access = Bluebird.promisify(require('fs').access);
var readFileSync = require('fs').readFileSync;
var F_OK = require('fs').F_OK
var memoize = require('lodash').memoize;
var merge = require('lodash').merge;

function getVersionFlag(stdout) {
  // versions 5.0+
  if(/-V\b/g.test(stdout)){
    return '-V';
  }

  // versions <2.0
  if(/-v\b/g.test(stdout) || stdout.trim().split('\n').length === 1){
    return '-v';
  }

  // Some 2.0 version don't have --version in the help command so we can just
  // try to assume that it will work. All the 1.x have -v
  return '--version';
}

function getConfigVarFlag(stdout) {
  if (stdout.indexOf('-E <KeyValuePair>') > -1) {
    return '-E';
  }

  return '-Des.';
}

function getPathConfigFlag(stdout) {
  if (stdout.indexOf('--property=value') > -1) {
    return '--path.conf'
  }

  return '-Epath.conf'
}

function getConfDirEnvVar(scriptText) {
  if (/\bCONF_DIR\b/.test(scriptText)) {
    return 'CONF_DIR'
  }

  if (/\bES_PATH_CONF\b/.test(scriptText)) {
    return 'ES_PATH_CONF'
  }

  return null
}


function getFeaturesFromBin(path) {
  var cmd = join(path, 'bin', 'elasticsearch');
  var scriptText = readFileSync(cmd, 'utf8');

  return exec(cmd + ' -h')
  .then(function (results) {
    var stdout = results[0];
    var stderr = results[1];

    var confDirEnvVar = getConfDirEnvVar(scriptText);

    return {
      versionFlag: getVersionFlag(stdout, stderr),
      configVarFlag: getConfigVarFlag(stdout, stderr),
      confDirEnvVar: confDirEnvVar,
      pathConfigFlag: confDirEnvVar ? null : getPathConfigFlag(stdout, stderr),
    };
  });
}
function getFeaturesFromFile(path) {
  return access(join(path, 'config', 'logging.yml'), F_OK)
  .then(function () {
    return {
      usesLoggingYaml: true
    }
  })
  .catch(function () {
    return {
      usesLoggingYaml: false
    }
  })
}
exports.getFeatures = memoize(function featureDetect(path) {

  return Bluebird.join(getFeaturesFromBin(path), getFeaturesFromFile(path), function(featuresFromBin, featuresFromFile) {
    return merge(featuresFromBin, featuresFromFile);
  })

});
