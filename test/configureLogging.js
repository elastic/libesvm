var sinon = require('sinon');
var expect = require('chai').expect;
var chai = require('chai').use(require('chai-as-promised'));

var configureLogging = require('../lib/configureLogging');
var levelToInt = require('../lib/configureLogging').levelToInt;
var normalize = require('../lib/configureLogging').normalize;
var read = require('../lib/configureLogging').read;
var setLevel = require('../lib/configureLogging').setLevel;
var readAndSetLevel = require('../lib/configureLogging').readAndSetLevel;
var enforceEsvmMinimumLevels = require('../lib/configureLogging').enforceEsvmMinimumLevels;

var fixture = require('path').resolve.bind(null, __dirname, 'fixtures');

describe('configureLogging module', function () {
  describe('levelToInt()', function () {
    it('converts log leves to their number equivilents', function () {
      expect(levelToInt('OFF')).to.be.below(levelToInt('FATAL'));
      expect(levelToInt('ALL')).to.be.above(levelToInt('DEBUG'));
    });

    it('throws a TypeError for invalid levels', function () {
      expect(function () {
        levelToInt('not a real level');
      }).to.throw(TypeError);
    });
  });

  describe('normalize()', function () {
    it('copies the input', function () {
      var input = {
        a: 1,
        b: {
          c: 2
        }
      };
      var output = normalize(input);

      expect(output).to.not.equal(input);
      expect(output.b).to.not.equal(input.b);
      expect(output).to.eql(input);
    });

    it('expands complex keys', function () {
      var input = {
        a: 1,
        'b.c': 2
      };

      expect(normalize(input)).to.eql({
        a: 1,
        b: {
          c: 2
        }
      });
    });

    it('expands complex keys in arrays', function () {
      var input = {
        a: 1,
        'b.c': [
          { 'name.first': 'foo', 'name.last': 'bar' }
        ]
      };

      expect(normalize(input)).to.eql({
        a: 1,
        b: {
          c: [
            { name: { first: 'foo', last: 'bar' } }
          ]
        }
      });
    });
  });

  describe('read()', function () {
    it('reads, parses, and normalizes a yaml config file on disk', function () {
      expect(read(fixture('someYamlConfig.yml'))).to.eventually.eql({
        a: 1,
        b: {
          c: 2
        }
      });
    });
  });

  describe('setLevel()', function () {
    it('sets the es.logger.level of an object to the specific level', function () {
      expect(setLevel({}, 'ERROR')).to.eql({
        es: {
          logger: {
            level: 'ERROR'
          }
        }
      });
    });

    it('Throws an error if the error is missing', function () {
      expect(setLevel).to.throw(TypeError);
    });

    it('Throws an error if the error is invalid', function () {
      expect(function () {
        setLevel('not a real level');
      }).to.throw(TypeError);
    });
  });

  describe('readAndSetLevel()', function () {
    beforeEach(function () {
      sinon.spy(configureLogging, 'read');
      sinon.spy(configureLogging, 'setLevel');
    });

    it('combines the read() and setLevel() functions', function () {
      var path = fixture('someYamlConfig.yml');
      var level = 'ERROR';

      var promise = readAndSetLevel(path, level);
      sinon.assert.calledOnce(configureLogging.read);
      sinon.assert.calledWithExactly(configureLogging.read, path);

      return promise.then(function (returnVal) {
        sinon.assert.calledOnce(configureLogging.setLevel);
        expect(configureLogging.setLevel.firstCall.args[1]).to.equal(level);
      });
    });
  });

  describe('enforceEsvmMinimumLevels()', function () {
    it('sets the node and http loggers to INFO level if user level is below', function () {
      expect(enforceEsvmMinimumLevels({}, 'ERROR')).to.eql({
        logger: {
          node: 'INFO',
          http: 'INFO',
        },
      });
    });

    it('sets the user level if it is greater than INFO', function () {
      expect(enforceEsvmMinimumLevels({}, 'DEBUG')).to.eql({
        logger: {
          node: 'DEBUG',
          http: 'DEBUG',
        },
      });
    });
  });
});
