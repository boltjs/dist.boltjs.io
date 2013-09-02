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
define(
  'bolt.test.report.Timer',

  [
  ],

  function () {
    var elapsed = function (since) {
      var end = new Date();
      var millis = end - since;
      var seconds = Math.floor(millis / 1000);
      var point = Math.floor(millis - (seconds * 1000) / 100);
      var printable =
        point < 10 ? '00' + point :
              point < 100 ? '0' + point :
                            '' + point;
      return seconds + '.' + printable + 's';
    };

    return {
      elapsed: elapsed
    };
  }
);
define(
  'bolt.test.report.Namer',

  [
  ],

  function () {
    var format = function (testcase, name) {
      var path = require('path');
      var pretty = path.relative(process.cwd(), testcase);
      return pretty + '#' + name;
    };

    return {
      format: format
    };
  }
);
define(
  'bolt.test.report.Errors',

  [
  ],

  function (timer, namer) {
    var clean = function (e) {
      if (typeof e === 'string')
        return e;
      var s = stack(e);
      if (e.name === 'AssertionError')
        return 'Assertion error' + (e.message ? ' [' + e.message + ']' : '') + ': [' + JSON.stringify(e.expected) + '] ' + e.operator + ' [' + JSON.stringify(e.actual) + ']' + s;
      if (e.name && e.message)
        return s.indexOf(e.name + ': ' + e.message) === 0 ? s : e.name + ': ' + e.message + s;
      if (e.toString)
        return s.indexOf(e.toString()) === 0 ? s : e.toString() + s;
      return JSON.stringify(e) + s;
    };

    var stack = function (e) {
      if (!e.stack)
        return '';
      var lines = e.stack.split('\n').filter(function (line) {
        return line.indexOf('at') !== -1 && line.indexOf('/bolt.js') === -1;
      });
      return '\n' + lines.join('\n');
    };

    return {
      clean: clean
    };
  }
);
define(
  'bolt.test.report.ConsoleReporter',

  [
    'bolt.test.report.Errors',
    'bolt.test.report.Timer',
    'bolt.test.report.Namer'
  ],

  function (Errors, Timer, Namer) {
    return function (verbose) {
      var initial = new Date();
      var times = {};
      var passed = 0;
      var failed = 0;
      var starttime = 0;

      var log = console.log;

      var vlog = function () {
        if (verbose)
          log.apply(null, arguments);
      };

      var summary = function (total) {
        vlog('== Running ' + total + ' test' + (total !== 1 ? 's' : '') + ' ==');
      };

      var test = function (testcase, name) {
        var starttime = new Date();
        vlog('[' + name + ']');

        var pass = function () {
          ++passed;
          vlog('+ [passed] in ' + Timer.elapsed(starttime))
        };

        var fail = function (error) {
          ++failed;
          log('- [failed] : ' + Namer.format(testcase, name) + '');
          log('    ' + Errors.clean(error).replace(/\n/g, '\n    '));
          log();
        };

        return {
          pass: pass,
          fail: fail
        };
      };

      var done = function () {
        log('Ran ' + (passed + failed) + ' tests in ' + Timer.elapsed(initial) + ', ' + passed + ' passed, ' + failed + ' failed.');
        process.exit(failed === 0 ? 0 : 1);
      };

      return {
        test: test,
        done: done
      };
    };
  }
);
define(
  'bolt.test.assert.Compare',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Obj'
  ],

  function (Arr, Obj) {
    var trueType = function (x) {
      var t = typeof x;
      if (t === 'object' && Array.prototype.isPrototypeOf(x))
        return 'array';
      if (x === null)
        return 'null';
      return t;
    };

    var pass = function () {
      return { eq: true };
    };

    var fail = function (why) {
      return { eq: false, why: why };
    };

    var failCompare = function (x, y, prefix) {
      var prefix_ = prefix || 'Values were different';
      return fail(prefix_ + ': [' + String(x) + '] vs [' + String(y) + ']');
    };

    var isEquatableType = function (x) {
      return Arr.contains([ 'undefined', 'boolean', 'number', 'string', 'function', 'xml', 'null' ], x);
    };

    var compareArrays = function (x, y) {
      if (x.length !== y.length)
        return failCompare(x.length, y.length, 'Array lengths were different');

      for (var i = 0; i < x.length; i++) {
        var result = doCompare(x[i], y[i]);
        if (!result.eq)
          return fail('Array elements ' + i + ' were different: ' + result.why);
      }
      return pass();
    };

    var sortArray = function (x) {
      var y = x.slice();
      y.sort();
      return y;
    };

    var sortedKeys = function (o) {
      return sortArray(Obj.keys(o));
    };

    var compareObjects = function (x, y) {
      var constructorX = x.constructor;
      var constructorY = y.constructor;
      if (constructorX !== constructorY)
        return failCompare(constructorX, constructorY, 'Constructors were different');

      var keysX = sortedKeys(x);
      var keysY = sortedKeys(y);

      var keysResult = compareArrays(keysX, keysY);
      if (!keysResult.eq)
        return failCompare(JSON.stringify(keysX), JSON.stringify(keysY), 'Object keys were different');

      for (var i in x) {
        if (x.hasOwnProperty(i)) {
          var xValue = x[i];
          var yValue = y[i];
          var valueResult = doCompare(xValue, yValue);
          if (!valueResult.eq)
            return fail('Objects were different for key: [' + i + ']: ' + valueResult.why);
        }
      }
      return pass();
    };

    var doCompare = function (x, y) {
      var typeX = trueType(x);
      var typeY = trueType(y);

      if (typeX !== typeY) return failCompare(typeX, typeY, 'Types were different');

      if (isEquatableType(typeX)) {
        if (x !== y) return failCompare(x, y);

      } else if (x == null) {
        if (y !== null) return failCompare(x, y);

      } else if (typeX === 'array') {
        var arrayResult = compareArrays(x, y);
        if (!arrayResult.eq) return arrayResult;

      } else if (typeX === 'object') {
        var objectResult = compareObjects(x, y);
        if (!objectResult.eq) return objectResult;
      }
      return pass();
    };

    var compare = function (x, y) {
      var result = doCompare(x, y);
      var bar = '-----------------------------------------------------------------------';

      return {
        eq: result.eq,
        why: result.why + '\n' + bar + '\n' + JSON.stringify(x) + '\n' + bar + '\n' + JSON.stringify(y) + '\n' + bar + '\n'
      };
    };

    return {
      compare: compare
    };
  }
);
define(
  'bolt.test.assert.Assert',

  [
    'bolt.test.assert.Compare'
  ],

  function (Compare) {
    var eq = function (expected, actual, message) {
      var result = Compare.compare(expected, actual);
      if (!result.eq) {
        if (message !== undefined)
          throw new Error(message);
        else
          throw new Error(result.why);
      }
    };

    var throws = function (f, expected, message) {
      var token = {};

      try {
        f();
        throw token;
      } catch (e) {
        if (e === token)
          throw new Error(message);
        if (expected !== undefined)
          eq(expected, e, message);
      }
    };

    var succeeds = function (f, message) {
      try {
        f();
      } catch (e) {
        throw new Error(message);
      }
    };

    var fail = function (message) {
      if (message !== undefined)
        throw new Error(message);
      else
        throw new Error('Test failed.');
    };

    return {
      eq: eq,
      throws: throws,
      succeeds: succeeds,
      fail: fail
    };
  }
);
define(
  'bolt.test.run.Accumulator',

  [
    'bolt.base.fp.Func'
  ],

  function (Func) {
    var global = Function('return this;')();

    var tests = [];

    var push = function (wrapper, testfile, name, replacements, deps, fn) {
      if (typeof deps === 'function' && fn === undefined) {
        fn = deps;
        deps = replacements;
        replacements = {};
      }

      var args = [ wrapper, testfile, name, replacements, deps, fn ];
      tests.push(args);
    };

    var more = function () {
      return tests.length > 0;
    };

    var take = function () {
      if (tests.length > 0)
        return tests.shift();
      throw 'No more, call more() before take().';
    };

    var drain = function (runtest, done) {
      if (more())
        runtest.apply(null, [ Func.curry(drain, runtest, done) ].concat(take()));
      else
        done();
    };

    var register = function (testfile, syncwrapper, asyncwrapper) {

      global.test = function (name, replacements, deps, fn) {
        push(syncwrapper, testfile, name, replacements, deps, fn);
      };

      global.asynctest = function (name, replacements, deps, fn) {
        push(asyncwrapper, testfile, name, replacements, deps, fn);
      };
    };

    return {
      more: more,
      take: take,
      drain: drain,
      register: register
    };
  }
);
define(
  'bolt.test.run.Wrapper',

  [
    'bolt.test.assert.Assert'
  ],

  function (Assert) {
    var global = Function('return this;')();

    global.assert = Assert;

    var sync = function (bolt, reporter, testfile, name, f, next) {
      global.define = bolt.define;
      global.require = bolt.require;
      global.demand = bolt.demand;

      return function (/* arguments */) {
        var testcase = reporter.test(testfile, name);
        try {
          f.apply(null, arguments);
          testcase.pass();
        } catch (e) {
          testcase.fail(e);
        } finally {
          global.define = undefined;
          global.require = undefined;
          global.demand = undefined;
          next();
        }
      };
    };

    var async = function (bolt, reporter, testfile, name, f, next) {
      global.define = bolt.define;
      global.require = bolt.require;
      global.demand = bolt.demand;

      return function (/* arguments */) {
        var testcase = reporter.test(testfile, name);

        var oncomplete = function (f) {
          return function () {
            f.apply(null, arguments);
            global.define = undefined;
            global.require = undefined;
            global.demand = undefined;
            next();
          };
        };

        var onsuccess = oncomplete(testcase.pass);
        var onfailure = oncomplete(testcase.fail);

        var args = Array.prototype.slice.call(arguments, 0);

        try {
          f.apply(null, args.concat([ onsuccess, onfailure ]));
        } catch (e) {
          onfailure(e);
        }
      };
    };

    return {
      sync: sync,
      async: async
    };
  }
);
define(
  'bolt.test.run.Config',

  [
    'bolt.base.fp.Func',
    'bolt.base.fp.Obj',
    'bolt.base.util.Path'
  ],

  function (Func, Obj, Path, Mapper, Specs) {
    var sources = function (testfile, replacements) {
      var r = [];
      Obj.each(replacements, function (i, o) {
        var name = Path.basename(o);
        var source = {
          type: 'bolt',
          relativeto: testfile,
          args: [ i, Path.dirname(o), Func.constant(name) ]
        }
        r.push(source);
      });
      return r;
    };

    return {
      sources: sources
    };
  }
);
define(
  'bolt.test.run.Test',

  [
    'bolt.test.run.Config'
  ],

  function (Config) {
    return function (bolt, reporter, config) {
      return function (next, wrapper, testfile, name, replacements, deps, fn) {
        bolt.reconfigure({
          configs: [
            config
          ],
          sources: Config.sources(testfile, replacements)
        });
        Function('return this;')().define = bolt.define;
        var wrapped = wrapper(bolt, reporter, testfile, name, fn, next);
        bolt.require(deps, wrapped);
      };
    };
  }
);
define(
  'bolt.test.run.BrowserRunner',

  [
    'bolt.test.run.Accumulator',
    'bolt.test.run.Test',
    'bolt.test.run.Wrapper'
  ],

  function (Accumulator, Test, Wrapper) {
    return function (config, tests, reporter) {
      var runtest = Test(bolt, reporter, config);

      var bomb = function (message) {
        throw 'Error loading test script: ' + message;
      };

      var loop = function () {
        if (tests.length > 0) {
          var testfile = tests.shift();
          Accumulator.register(testfile, Wrapper.sync, Wrapper.async);
          bolt.loadscript(testfile, loop, bomb);
        } else
          Accumulator.drain(runtest, reporter.done);
      };

      reporter.summary(tests.length);

      loop();
    };
  }
);
define(
  'bolt.test.run.NodeRunner',

  [
    'bolt.test.run.Accumulator',
    'bolt.test.run.Test',
    'bolt.test.run.Wrapper'
  ],

  function (Accumulator, Test, Wrapper) {
    return function (config, tests, reporter) {
      var bolt = require('./bolt');
      var path = require('path');

      var run = Test(bolt, reporter, config);

      tests.forEach(function (testfile) {
        var testcase = path.resolve(testfile);
        Accumulator.register(testfile, Wrapper.sync, Wrapper.async);
        require(testcase);
      });

      Accumulator.drain(run, reporter.done);
    };
  }
);
define(
  'bolt.test.run.Runner',

  [
    'bolt.base.platform.Platform',
    'bolt.test.run.BrowserRunner',
    'bolt.test.run.NodeRunner'

  ],

  function (Platform, BrowserRunner, NodeRunner) {
    return Platform.get(NodeRunner, BrowserRunner)
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
          log: [bolt.test.report.Errors.clean(error)]
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
