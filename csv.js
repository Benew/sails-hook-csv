/**
 * Adds support for csv blueprint and binds :model/csv route for each RESTful model.
 */

'use strict';

var _ = require('lodash');

var _sailsLibHooksBlueprintsActionUtil = require('sails/lib/hooks/blueprints/actionUtil');

var pluralize = require('pluralize');

var defaultCSVBlueprint = function defaultCSVBlueprint(req, res) {
  var json2csv = require('json2csv');
  var moment = require('moment');
  var Model = _sailsLibHooksBlueprintsActionUtil.parseModel(req);

  // Lookup for records that match the specified criteria
  var query = Model.find()
  .where( _sailsLibHooksBlueprintsActionUtil.parseCriteria(req) )
  .limit( _sailsLibHooksBlueprintsActionUtil.parseLimit(req) )
  .skip( _sailsLibHooksBlueprintsActionUtil.parseSkip(req) )
  .sort( _sailsLibHooksBlueprintsActionUtil.parseSort(req) );
  // TODO: .populateEach(req.options);
  query = _sailsLibHooksBlueprintsActionUtil.populateEach(query, req);

  query.exec(function(err, recs){
    if(err) return res.error(err);
    var config = {
      fields : _.keys(Model._attributes),
      data: recs,
      del: ";"
    };
    json2csv(config, function(err, csv){
      if(err) return res.error(err);
      var filename = pluralize(Model.adapter.collection) + "-" + moment().format("YYYY-MM-DD") + ".csv";
      res.attachment(filename);
      res.end(csv, 'UTF-8');
    });
  });
};

module.exports = function (sails) {
  return {
    initialize: function initialize(cb) {
      var config = sails.config.blueprints;
      var csvFn = _.get(sails.middleware, 'blueprints.csv') || defaultCSVBlueprint;

      sails.on('router:before', function () {
        _.forEach(sails.models, function (model) {
          var controller = sails.middleware.controllers[model.identity];

          if (!controller) return;

          var baseRoute = [config.prefix, model.identity].join('/');

          if (config.pluralize && _.get(controller, '_config.pluralize', true)) {
            baseRoute = (0, pluralize)(baseRoute);
          }

          var route = baseRoute + '/csv';

          sails.router.bind(route, csvFn, null, { controller: model.identity });
        });
      });

      cb();
    }
  };
};
