var _ = require('lodash');
var bcrypt = require('bcryptjs');
var glob = require('glob');
var path = require('path');
var Promise = require('bluebird');
var fsExtra = require('fs-extra');
var fs = require('fs');
var copy = Promise.promisify(fsExtra.copy);
var mkdirs = Promise.promisify(fsExtra.mkdirs);
var stat = Promise.promisify(fs.stat);
var readFile = Promise.promisify(fs.readFile);
var outputFile = Promise.promisify(fsExtra.outputFile);
var hash = Promise.promisify(bcrypt.hash);
var yaml = require('js-yaml');

function copyShieldFiles(basePath, configPath) {
  return new Promise(function (resolve, reject) {
    glob(path.join(basePath, 'config', 'shield', '*'), function (err, files) {
      if (err) return reject(err);
      mkdirs(path.join(configPath, 'shield'))
      .then(function () {
        return Promise.each(files, function (file) {
          var src = file;
          var dest = path.join(configPath, 'shield', path.basename(file));
          return copy(src, dest);
        });
      }).then(resolve, reject);
    });
  });
}

function createUsersAndRoles(configPath, users) {
  return function () {
    var userHash = {};
    var roleHash = {};
    return Promise.each(users, function (user) {
      return Promise.fromNode(function (cb) {
        bcrypt.hash(user.password, bcrypt.genSaltSync(10), cb);
      })
      .then(function (hash) {
        userHash[user.username] = hash;
        if (user.roles) {
          user.roles.forEach(function (role) {
            if (!roleHash[role]) roleHash[role] = [];
            roleHash[role].push(user.username);
          });
        }
      });
    })
    .then(function () {
      var data = [];
      _.each(userHash, function (hash, username) {
        data.push(username + ':' + hash);
      })
      return outputFile(path.join(configPath, 'shield', 'users'), data.join("\n"));
    })
    .then(function () {
      var data = [];
      _.each(roleHash, function (users, role) {
        data.push(role + ':' + users.join(','));
      })
      return outputFile(path.join(configPath, 'shield', 'users_roles'), data.join("\n"));
    });
  };
}

function createRoles(configPath, roles) {
  var rolesYml = path.join(configPath, 'shield', 'roles.yml');
  return stat(rolesYml).then(function (arg) {
    return readFile(rolesYml, 'utf8').then(function (data) {
      var rolesConfig = yaml.safeLoad(data);
      _.assign(rolesConfig, roles);
      return outputFile(rolesYml, yaml.safeDump(rolesConfig));
    });
  })
  .catch(function () {
    return Promise.resolve();
  });
}

module.exports = function writeShieldConfig(options) {
  return function (configPath) {
    if (!options.shield || !options.shield.users) return Promise.resolve(configPath);

    return Promise.try(createUsersAndRoles(configPath, options.shield.users))
    .then(function (result) {
      if (options.shield.roles) {
        return createRoles(configPath, options.shield.roles);
      } else {
        return result;
      }
    })
    .thenReturn(configPath);
  }
}

