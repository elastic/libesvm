const { resolve } = require('path');

const { expect } = require('chai');
const { try: attempt } = require('bluebird');
const del = require('del');
const mkdirp = require('mkdirp');
const Chance = require('chance');

const libesvm = require('../')

const SEED = Math.round(Math.random() * 10000000);
console.log('random seed:', SEED);
const chance = new Chance(SEED);

describe('basic startup (based on kibana `npm run elasticsearch` task)', function () {
  const DIR = resolve(__dirname, 'esvm-test-dir')
  this.timeout(120 * 1000)
  before(() => {
    del.sync(DIR);
    mkdirp.sync(DIR);
  })
  
  after(() => {
    del.sync(DIR);
  })
  
  it('works', () => {
    const HTTP_PORT = chance.integer({min: 9900, max: 9999})
    const NODE_NAME = chance.word();
    
    const cluster = libesvm.createCluster({
      directory: DIR,
      branch: 'master',
      quiet: false,
      config: {
        node: {
          name: NODE_NAME,
        },
        http: {
          port: HTTP_PORT,
        }
      }
    })
    
    cluster.on('log', function(log) {
      if (log.type === 'progress') return;
      
      const write = (msg) => {
        let line = `      cluster -- ${msg}`
        const width = process.stdout.columns
        
        if (line.length > width) {
          line = line.slice(0, width - 3) + '...'
        }
        
        console.log(line)
      }
      
      if (typeof log === 'string') {
        write(log);
      } else {
        write([
          `level(${log.level || ''})`,
          log.node || '',
          log.type || '',
          log.message || '',
        ].join(' - '));
      }
    });
    
    
    return (
      attempt(() => cluster.install())
      .then(() => cluster.installPlugins())
      .then(() => cluster.start())
      .finally(() => cluster.shutdown())
      .then(nodes => {
        expect(nodes).to.have.length(1);
        expect(nodes[0]).to.have.property('port', String(HTTP_PORT))
        expect(nodes[0]).to.have.property('name', NODE_NAME)
      })
    );
  })

})