(function (karma) {
var bootstrap = (function () {
  var modules = {};

  var args = function (id, dependencies) {
    var args = [];
    for (var i = 0; i < dependencies.length; ++i)
      if (modules[dependencies[i]] !== undefined)
        args.push(modules[dependencies[i]]);
      else
        throw 'required module [' + id + '] could not be defined (missing dependency [' + dependencies[i] + '])';
    return args;
  };

  var instantiate = function (id, dependencies, definition) {
    var instance = definition.apply(null, args(id, dependencies));
    if (instance === undefined)
      throw 'required module [' + id + '] could not be defined (definition function returned undefined)';
    return instance;
  };

  var define = function (id, dependencies, definition) {
    if (typeof id !== 'string')
      throw 'invalid module definition, module id must be defined and be a string';
    if (dependencies === undefined)
      throw 'invalid module definition, dependencies must be specified';
    if (definition === undefined)
      throw 'invalid module definition, definition function must be specified';
    modules[id] = instantiate(id, dependencies, definition);
  };

  var demand = function (id) {
    if (modules[id] === undefined)
      throw 'requested module [' + id + '] is not defined';
    return modules[id];
  };

  return {
    demand: demand,
    define: define
  };
})();

var define = bootstrap.define;
var demand = bootstrap.demand;

if (typeof module !== 'undefined' && module.exports)
  module.exports = bootstrap;
define(
  'bolt.base.fp.Arr',

  [
  ],

  function () {
    var equals = function (a1, a2) {
      if (a1.length !== a2.length)
        return false;
      for (var i = 0; i < a1.length; ++i)
        if (a1[i] !== a2[i])
          return false;
      return true;
    };

    var forall = function (a, f) {
      var fn = f || function (x) {
        return x === true;
      };
      for (var i = 0; i < a.length; ++i)
        if (fn(a[i]) !== true)
          return false;
      return true;
    };

    var map = function (a, f) {
      var r = [];
      for (var i = 0; i < a.length; ++i)
        r.push(f(a[i], i));
      return r;
    };

    var flatten = function (a) {
      var r = [];
      for (var i = 0; i < a.length; ++i)
        r = r.concat(a[i]);
      return r;
    };

    var flatmap = function (a, f) {
      return flatten(map(a, f));
    };

    var filter = function (a, f) {
      var r = [];
      for (var i = 0; i < a.length; ++i)
        if (f(a[i]))
          r.push(a[i]);
      return r;
    };

    var each = map;

    var contains = function (a, x) {
      return !forall(a, function (v) {
        return v !== x;
      });
    };

    var indexof = function (a, x) {
      for (var i = 0; i < a.length; ++i)
        if (a[i] === x)
          return i;
      return -1;
    };

    return {
      equals: equals,
      forall: forall,
      map: map,
      flatten: flatten,
      flatmap: flatmap,
      filter: filter,
      each: each,
      contains: contains,
      indexof: indexof
    };
  }
);
define(
  'bolt.base.fp.Obj',

  [
  ],

  function () {
    var map = function (o, f) {
      var r = {};
      for (var i in o)
        if (o.hasOwnProperty(i))
          r[i] = f(i, o[i]);
      return r;
    };

    var each = map;

    var merge = function (d, s) {
      each(s, function (k, v) {
        d[k] = v;
      });
    };

    var keys = function (o) {
      var r = [];
      each(o, function (k) {
        r.push(k);
      });
      return r;
    };

    return {
      each: each,
      keys: keys,
      map: map,
      merge: merge
    };
  }
);
define(
  'bolt.base.fp.Func',

  [
  ],

  function () {
    var constant = function (v) {
      return function () {
        return v;
      };
    };

    var identity = function (v) {
      return v;
    };

    var curry = function (f) {
      var slice = Array.prototype.slice;
      var args = slice.call(arguments, 1);
      return function () {
        var all = args.concat(slice.call(arguments, 0));
        return f.apply(null, all);
      };
    };

    var not = function (z) {
      return function () {
        var slice = Array.prototype.slice;
        return !z.apply(null, slice.call(arguments, 0));
      };
    };

    var apply = function (f) {
      var slice = Array.prototype.slice;
      return f.apply(null, slice.call(arguments, 0));
    };

    return {
      constant: constant,
      identity: identity,
      curry: curry,
      not: not,
      apply: apply
    };
  }
);
define(
  'bolt.base.util.Path',

  [
  ],

  function () {
    var dirname = function (file) {
      var normalized = file.replace(/\\/g, '/');
      var end = normalized.lastIndexOf('/');
      return normalized.substring(0, end);
    };

    var basename = function (file) {
      var normalized = file.replace(/\\/g, '/');
      var end = normalized.lastIndexOf('/');
      return normalized.substring(end + 1);
    };

    var startsWith = function (str, prefix) {
      return str.indexOf(prefix) === 0;
    };

    var isAbsolute = function (path) {
      return startsWith(path, "//") ||
        startsWith(path, "http://") ||
        startsWith(path, "https://");
    };

    return {
      basename: basename,
      dirname: dirname,
      startsWith: startsWith,
      isAbsolute: isAbsolute
    };
  }
);
define(
  'bolt.base.util.Pather',

  [
    'bolt.base.util.Path'
  ],

  function (Path) {
    return function (relativeto) {
      var base = Path.dirname(relativeto);
      return function (path) {
        return base + '/' + path;
      };
    };
  }
);
define(
  'bolt.base.util.Globals',

  [
  ],

  function () {
    var global = Function('return this')();

    var get = function (parts, scope) {
      var r = scope;
      for (var i = 0; i < parts.length && r !== undefined; ++i)
        r = r[parts[i]];
      return r;
    };

    var resolve = function (name, scope) {
      var parts = name.split('.');
      return get(parts, scope || global);
    };

    var remove = function (name, scope) {
      var parts = name.split('.');
      var parent = get(parts.slice(0, -1), scope || global);
      delete parent[parts[parts.length - 1]];
    };

    return {
      global: global,
      resolve: resolve,
      remove: remove
    };
  }
);
define(
  'bolt.base.platform.Platform',

  [
    'bolt.base.fp.Func',
    'bolt.base.util.Globals'
  ],

  function (Func, Globals) {
    var isNode = function () {
      return typeof module !== 'undefined' && module.exports;
    };

    var isBrowser = Func.not(isNode);

    var run = function (node, browser) {
      return get(node, browser)();
    };

    var get = function (node, browser) {
      return isNode() ? node : browser;
    };

    return {
      isNode: isNode,
      isBrowser: isBrowser,
      run: run,
      get: get
    };
  }
);
  karma.loaded = function() {};

  var reporter = (function () {
    var summary = function (total) {
      karma.info({total: total})
    };

    var test = function (testcase, name) {
      var start = new Date().getTime();

      var pass = function () {
        var result = {
          id: testcase + "#" + name,
          description: testcase + "#" + name,
          suite: [testcase + "#" + name],
          success: true,
          skipped: 0,
          time: new Date().getTime() - start,
          log: []
        };
        karma.result(result);
      };

      var fail = function (error) {
        var result = {
          id: testcase + "#" + name,
          description: testcase + "#" + name,
          suite: [testcase + "#" + name],
          success: false,
          skipped: 0,
          time: new Date().getTime() - start,
          log: [errors.clean(error)]
        };
        karma.result(result);
      };

      return {
        pass: pass,
        fail: fail
      };
    };

    var done = function () {
      karma.complete({
        coverage: window.__coverage__
      });
      // start does not exist in debug mode
      karma.start && karma.start();
    };

    return {
      summary: summary,
      test: test,
      done: done
    };
  })();

  var tests = Object.keys(karma.files).filter(function (file) {
    return /Test\.js$/.test(file);
  });

  bolt.test.run('/base/config/bolt/test.js', tests, reporter);
})(__karma__);
