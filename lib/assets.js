var _ = require('lodash');
var HttpAsset = require('http-asset');
var pp = require('properties-parser');

var snapshotUrls = new HttpAsset('https://download.elasticsearch.org/esvm/snapshot_urls.prop');
snapshotUrls.get = _.wrap(snapshotUrls.get, function (get) {
  return get.call(this).then(function (rawProps) {
    var urls = pp.parse(rawProps);
    console.log(urls);
    return urls;
  });
});

var esTags = new HttpAsset('https://download.elasticsearch.org/esvm/elasticsearch.tags.json');
esTags.get = _.wrap(esTags.get, function (get) {
  return get.call(this).then(JSON.parse);
});

module.exports = {
  esTags: esTags,
  snapshotUrls: snapshotUrls
};