'use strict';

exports.dataSourceRoute = dataSourceRoute;

var url = require('url');

var parseArgs = Object.freeze({
  jsonGraph: true,
  callPath: true,
  arguments: true,
  pathSuffixes: true,
  paths: true
});

function requestToContext(req) {
  var queryMap = req.method === 'POST' ? req.body : url.parse(req.url, true).query;
  var context = {};

  if (queryMap) {
    Object.keys(queryMap).forEach(function (key) {
      var arg = queryMap[key];
      if (parseArgs[key] && arg) {
        context[key] = JSON.parse(arg);
      } else {
        context[key] = arg;
      }
    });
  }
  return Object.freeze(context);
}

function dataSourceRoute(handler) {
  return function* (next) {
    var _this = this;

    var dataSource = yield handler.call(this, next);

    if (!dataSource) {
      return;
    }

    var ctx = requestToContext(this.request);

    if (Object.keys(ctx).length === 0) {
      this['throw']('Request not supported', 500);
    }
    if (!ctx.method || !ctx.method.length) {
      this['throw']('No query method provided', 500);
    }
    if (!dataSource[ctx.method]) {
      this['throw']('Data source does not implement method ' + ctx.method, 500);
    }

    var observable = ({
      'set': function set() {
        return dataSource[ctx.method](ctx.jsonGraph);
      },
      'call': function call() {
        return dataSource[ctx.method](ctx.callPath, ctx.arguments, ctx.pathSuffixes, ctx.paths);
      },
      'get': function get() {
        return dataSource[ctx.method]([].concat(ctx.paths || []));
      },
      'undefined': function undefined() {
        return _this['throw']('Unsupported method ' + ctx.method, 500);
      }
    })[ctx.method]();

    this.status = 200;

    // Note: toPromise could be removed in the future (https://github.com/Netflix/falcor/issues/464)
    this.body = yield observable.toPromise();
  };
}
