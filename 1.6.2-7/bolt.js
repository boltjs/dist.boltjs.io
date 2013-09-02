(function () {
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
  'bolt.kernel.async.Map',

  [
    'bolt.base.fp.Arr'
  ],

  function (Arr) {
    var amap = function (data, f, oncomplete) {
      var total = data.length;
      var count = 0;
      var results = [];

      Arr.each(data, function (datum, i) {
        f(datum, function (result) {
          ++count;
          results[i] = result;
          if (count === total)
            oncomplete(results);
        });
      });
    };

    return {
      amap: amap
    };
  }
);
/**
 * This module has a dual responsibility:
 *  1. Ensures that asynchronous function calls, 'f', that share the same
 *     'key' are not executed in parallel.
 *  2. In the case where an attempt to call in parallel is prevented,
 *     the 'action' callbacks are executed when the asynchronous call is
 *     completed.
 *
 * Example:
 *  When we async-map to remotely fetch module definition, it is
 *  important that only a single define is evaluated, but the
 *  notification that the definition has completed is propagated
 *  to all interested parties.
 *
 *    1. we require dependencies 'x' and 'y'
 *
 *    2. both x and y are defined in the same file  (i.e. compiled together), 'a.js'.
 *
 *    3. we resolve x and y, to their load spec using a modulator
 *        x_spec = {load: function () { -- load a.js -- }, url: a.js, serial: false};
 *        y_spec = {load: function () { -- load a.js -- }, url: a.js, serial: false};
 *
 *    4. we make the piggyback call for x:
 *        piggybacker.piggyback(x_spec.url, x_spec.load, xdone);
 *
 *       this will register the 'xdone' action, and actually
 *       trigger the load call, with a synthetic callback
 *       responsible for triggering all registered actions.
 *
 *    5. we make the piggyback call for y:
 *        piggybacker.piggyback(y_spec.url, y_spec.load, ydone);
 *
 *       this will register the 'ydone' action, but NOT trigger
 *       the load call.
 *
 *    6. the load call completes, and calls the synthetic callback,
 *       which is responsible for triggering both 'xdone' and 'ydone'.
 *
 *    7. something else happens that means we have to load 'a.js' again,
 *       the piggybacker DOES NOT prevent this call, and will follow
 *       the above process.
 */
define(
  'bolt.kernel.async.Piggybacker',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Func'
  ],

  function (Arr, Func) {
    var create = function () {
      var queue = {};  // key -> [actions]

      var process = function (key) {
        var actions = queue[key];
        delete queue[key];
        Arr.each(actions, Func.apply);
      };

      var piggyback = function (key, f, action) {
        if (queue[key] === undefined) {
          queue[key] = [ action ];
          f(Func.curry(process, key));
        } else {
          queue[key].push(action);
        }
      };

      return {
        piggyback: piggyback
      };
    };

    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.modulator.Globalator',

  [
    'bolt.base.util.Globals'
  ],

  function (Globals) {
    var create = function () {
      var can = function (id) {
        return id.indexOf('global!') === 0;
      };

      var get = function (id, define, require) {
        var name = id.substring('global!'.length);

        var load = function (onsuccess, onfailure) {
          var instance = Globals.resolve(name);
          if (instance !== undefined) {
            define(id, [], function () { return instance; });
            onsuccess();
          } else {
            onfailure('Modulator error: could not resolve global [' + name + ']');
          }
        };

        return {
          url: id, // this just needs to be unique, no download required.
          load: load,
          serial: true
        };
      };

      return {
        can: can,
        get: get
      }
    };
    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.module.Stratifier',

  [
    'bolt.base.fp.Arr'
  ],

  function (Arr) {
    var stratify = function (specs) {
      var parallels = Arr.filter(specs, function (spec) {
        return !spec.serial;
      });
      return parallels.length > 0 ? parallels : specs.slice(0, 1);
    };

    return {
      stratify: stratify
    };
  }
);
/**
 * This module performs dependency analysis of strings that depend on sets of
 * strings.
 *
 * The input is an array of root strings to start analysis from, and an object
 * that contains a mapping of each string to the strings it depends on.
 *
 * Performing an analysis results in either:
 *   1. an empty array, indicating that all dependencies are satisfied,
 *   2. an array of strings that are, at the minimum, still needed in order to
 *      satisfy the given dependency trees, or
 *   3. an array of strings that form a dependency cycle.
 */
define(
  'bolt.kernel.module.Analyser',

  [
    'bolt.base.fp.Arr'
  ],

  function (Arr) {
    var collect = function (path, name) {
      var i = Arr.indexof(path, name);
      var p = path.slice(i);
      return p.concat([name]);
    };

    /**
     * @param {array} roots Contains a list of root ids
     * @param {object} modules Contains dependency information in format: { id: [ 'id1', 'id2' ] }
     */
    var analyse = function (roots, modules) {
      var done = {};
      var path = [];
      var missing = [];
      var cycle;

      var children = function (name) {
        Arr.each(modules[name], attempt);
      };

      var examine = function (name) {
        if (modules[name])
          children(name);
        else
          missing.push(name);
      };

      var descend = function (name) {
        path.push(name);
        examine(name);
        path.pop();
      };

      var decycle = function (name) {
        if (Arr.contains(path, name))
          cycle = collect(path, name);
        else
          descend(name);
      };

      var attempt = function (name) {
        if (!done[name]) {
          decycle(name);
          done[name] = true;
        }
      };

      Arr.each(roots, attempt);

      return cycle ? { cycle: cycle } : { load: missing };
    };

    return {
      analyse: analyse
    };
  }
);
define(
  'bolt.kernel.module.Fetcher',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Func',
    'bolt.kernel.async.Map',
    'bolt.kernel.async.Piggybacker',
    'bolt.kernel.module.Stratifier'
  ],

  function (Arr, Func, Map, Piggybacker, Stratifier) {
    var create = function (regulator, validator, onerror, define, require, demand) {
      var piggyback = Piggybacker.create();

      var validate = function (onsuccess, results) {
        var failed = Arr.filter(results, Func.not(validator));
        if (failed.length > 0)
          onerror('Fetcher error: modules were not defined: ' + failed.join(', '));
        else
          onsuccess();
      };

      var mapper = function (spec, onresult) {
        var action = Func.curry(onresult, spec.id);
        var load = function (callback) {
          spec.load(callback, onerror);
        };
        piggyback.piggyback(spec.url, load, action);
      };

      var asyncfetch = function (specs, onsuccess) {
        var oncomplete = Func.curry(validate, onsuccess);
        var strata = Stratifier.stratify(specs);
        Map.amap(strata, mapper, oncomplete);
      };

      var fetch = function (ids, onsuccess) {
        regulator.regulate(ids, define, require, demand, function (specs) {
          asyncfetch(specs, onsuccess);
        }, onerror);
      };

      return {
        fetch: fetch
      };
    };

    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.module.Loader',

  [
    'bolt.kernel.module.Analyser'
  ],

  function (Analyser) {
    var load = function (roots, deps, fetcher, oncontinue, onsuccess, onerror) {
      var result = Analyser.analyse(roots, deps);
      if (result.cycle)
        onerror('Dependency error: a circular module dependency exists from ' + result.cycle.join(' ~> '));
      else if (result.load.length === 0)
        onsuccess();
      else
        fetcher.fetch(result.load, oncontinue);
    };

    return {
      load: load
    };
  }
);
define(
  'bolt.kernel.module.Manager',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Obj',
    'bolt.kernel.module.Loader',
    'bolt.kernel.module.Fetcher'
  ],

  function (Arr, Obj, Loader, Fetcher) {
    var create = function (regulator, onerror) {
      var blueprints = {};  // id -> { id: string, dependencies: [ string ], definition: function }
      var modules = {};     // id -> module

      // Adds a module to the system.
      var define = function (id, dependencies, definition) {
        if (id === undefined)
          onerror("Define error: module id can not be undefined");
        else if (blueprints[id] !== undefined)
          onerror("Define error: module '" + id + "' is already defined");
        else
          blueprints[id] = { id: id, dependencies: dependencies, definition: definition };
      };

      // Loads a set of modules asynchronously.
      var require = function (ids, callback) {
        var onsuccess = function () {
          var instances = Arr.map(ids, demand);
          callback.apply(null, instances);
        };

        var oncontinue = function () {
          var deps = Obj.map(blueprints, function (k, v) {
            return v.dependencies;
          });
          Loader.load(ids, deps, fetch, oncontinue, onsuccess, onerror);
        };

        oncontinue();
      };

      // Instantiates a module and all of its dependencies.
      var demand = function (id) {
        if (modules[id] !== undefined)
          return modules[id];
        if (blueprints[id] === undefined)
          throw "module '" + id + "' is not defined";
        var result = instantiate(id);
        if (result === undefined)
          throw "module '" + id + "' returned undefined from definition function";
        modules[id] = result;
        return result;
      };

      var instantiate = function (id) {
        var blueprint = blueprints[id];
        var args = Arr.map(blueprint.dependencies, demand);  // Instantiate dependencies
        return blueprint.definition.apply(null, args);  // Instantiate self
      };

      var validator = function (id) { return blueprints[id] !== undefined; };
      var fetch = Fetcher.create(regulator, validator, onerror, define, require, demand);

      return {
        define: define,
        require: require,
        demand: demand
      };
    };

    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.api.Sources',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Obj',
    'bolt.base.util.Pather',
    'bolt.kernel.modulator.Globalator'
  ],

  function (Arr, Obj, Pather, Globalator) {
    var create = function (builtins, configuration) {
      var data = {
        'global': { instance: Globalator }
      };
      Obj.each(builtins, function (key, value) {
        data[key] = { instance: value };
      });
      Arr.each(configuration.types, function (spec) {
        data[spec.type] = { id: spec.modulator };
      });
      var sourcespecs = configuration.sources.slice(0);
      var sources = [ Globalator.create() ];

      var guard = function (type) {
        if (data[type] === undefined)
          throw 'Unknown modulator type [' + type + '].';
      };

      var isResolved = function (type) {
        guard(type);
        return data[type].instance !== undefined;
      };

      var idOf = function (type) {
        guard(type);
        return data[type].id;
      };

      var instanceOf = function (type) {
        guard(type);
        return data[type].instance;
      };

      var register = function (type, instance) {
        guard(type);
        data[type].instance = instance;
      };

      var find = function (id) {
        for (var i = 0; i < sources.length; ++i)
          if (sources[i].can(id))
            return { found: sources[i] };
        return { notfound: true };
      };

      var crank = function () {
        var left = [];
        Arr.each(sourcespecs, function (spec) {
          if (isResolved(spec.type)) {
            var instance = instanceOf(spec.type);
            var source = instance.apply(null, [ Pather(spec.relativeto) ].concat(spec.args));
            sources.push(source);
          } else
            left.push(spec);
        });
        sourcespecs = left;
      };

      return {
        isResolved: isResolved,
        idOf: idOf,
        instanceOf: instanceOf,
        register: register,
        find: find,
        crank: crank
      };
    };

    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.api.Regulator',

  [
    'bolt.base.fp.Arr',
    'bolt.base.fp.Func'
  ],

  function (Arr, Func) {
    var create = function (sources) {
      /*
       * 1. Resolve configuration as much as possible
       * 2. Check for unresolved modulator types that are required to continue.
       *   a) Go ahead and resolve, if we have everything we need.
       *   b) Delay, requiring the modulators, then retry.
       */
      var regulate = function (ids, define, require, demand, onsuccess, onerror) {
        sources.crank();
        var required = Arr.map(ids, determinetype);
        var unresolved = Arr.filter(required, Func.not(sources.isResolved));
        if (unresolved.length === 0)
          resolve(ids,  define, require, demand, onsuccess, onerror);
        else
          delay(unresolved, ids, define, require, demand, onsuccess, onerror);
      };

      var resolve = function (ids,  define, require, demand, onsuccess, onerror) {
        var r = [];
        for (var i = 0; i < ids.length; ++i) {
          var id = ids[i];

          var source = sources.find(id);
          if (source.notfound) {
            onerror('Could not find source for module [' +  id + ']');
            return;
          }
          var spec = source.found.get(id, define, require, demand);
          r[i] = build(id, spec);
        }
        onsuccess(r);
      };

      var build = function (id, spec) {
        return {
          id: id,
          url: spec.url,
          load: spec.load,
          serial: spec.serial
        };
      };

      var delay = function (types, ids, define, require, demand, onsuccess, onerror) {
        var modulatorids = Arr.map(types, sources.idOf);
        require(modulatorids, function (/* modulators */) {
          var modulators = arguments;
          Arr.each(types, function (type, i) {
             sources.register(type, modulators[i]);
          });
          regulate(ids, define, require, demand, onsuccess, onerror);
        });
      };

      var determinetype = function (id) {
        var index = id.indexOf('!');
        return index === -1 ? 'bolt' : id.substring(0, index);
      };

      return {
        regulate: regulate
      };
    };

    return {
      create: create
    };
  }
);
define(
  'bolt.kernel.api.Config',

  [
    'bolt.kernel.module.Manager',
    'bolt.kernel.api.Regulator',
    'bolt.kernel.api.Sources'
  ],

  function (Manager, Regulator, Sources) {
    var configure = function (configuration, builtins, onerror) {
      var s = Sources.create(builtins, configuration);
      var r = Regulator.create(s);
      var engine = Manager.create(r, onerror);

      return {
        define: engine.define,
        require: engine.require,
        demand: engine.demand
      };
    };

    return {
      configure: configure
    };
  }
);
define(
  'bolt.loader.tag.Script',

  [
  ],

  function () {
    var guard = function (callback) {
      return function (evt) {
        if (evt.srcElement.readyState === "loaded" || evt.srcElement.readyState === "complete")
          callback();
      };
    };

    var ie = function (el) {
      return el.attachEvent && !window.opera;
    };

    var onload = function (el, callback) {
      if (ie(el))
        el.attachEvent("onreadystatechange", guard(callback));
      else
        el.addEventListener("load", callback, false);
    };

    var createtag = function (callback) {
      var el = document.createElement("script");
      el.type = "text/javascript";
      onload(el, callback);
      return el;
    };

    var insert = function (decorator, callback) {
      var el = createtag(callback);
      decorator(el);
      var head = document.getElementsByTagName("head")[0];
      head.appendChild(el);
    };

    return {
      insert: insert
    };
  }
);
define(
  'bolt.loader.transporter.Node',

  [
  ],

  function () {
    var startsWith = function (str, prefix) {
      return str.indexOf(prefix) === 0;
    };

    var fromFile = function (url, success, error) {
      var fs = require('fs');
      fs.exists(url, function (exists) {
        if (exists)
          fs.readFile(url, 'UTF-8', function (err, data) {
            if (err)
              error('Error reading file [' + url + '], error [' + err + ']');
            else
              success(data);
          });
        else
          error('File does not exist [' + url + ']');
      });
    };

    var fromUrl = function (http, url, success, error) {
      http.get(url, function (res) {
        var body = '';
        res.on('data', function (chunk) {
          body += chunk.toString();
        });
        res.on('end', function () {
          success(body);
        });
        res.on('error', function (e) {
          error(e.message);
        });
      });
    };

    var read = function (url, success, error) {
      if (startsWith(url, '//'))
        fromUrl(require('http'), 'http:' + url, success, error);
      else if (startsWith(url, 'http://'))
        fromUrl(require('http'), url, success, error);
      else if (startsWith(url, 'https://'))
        fromUrl(require('https'), url, success, error);
      else
        fromFile(url, success, error);
    };

    return {
      read: read
    };
  }
);
define(
  'bolt.loader.transporter.Xhr',

  [
  ],

  function () {
    var requestObject = function () {
      // Correct way to use XMLHttpRequest in IE:
      // http://blogs.msdn.com/b/ie/archive/2006/01/23/516393.aspx
      var factories = [
        function () { return new XMLHttpRequest() },
        function () { return new ActiveXObject("Microsoft.XMLHTTP") }
      ];

      return fallback(factories);
    };

    var fallback = function (items) {
      for (var i = 0; i < items.length; ++i) {
        try {
          return items[i]();
        } catch (e) {
        }
      }
    };

    var handler = function (req, url, success, error) {
      return function () {
        if (req.readyState === 4)
          done(req, url, success, error);
      };
    };

    var done = function (req, url, success, error) {
      if (req.status === 200 || req.status === 304)
        success(req.responseText);
      else
        error('Transport error: ' + req.status + ' ' + req.statusText + ' for resource: "' + url + '"');
    };

    var getUrl = function (req, url, success, error) {
      req.open('GET', url, true);
      req.onreadystatechange = handler(req, url, success, error);
      req.send();
    };

    var request = function (url, success, error) {
      var req = requestObject();
      if (req)
        getUrl(req, url, success, error);
      else
        error('Transport error: browser does not support XMLHttpRequest.');
    };

    return {
      request: request
    };
  }
);
define(
  'bolt.loader.executor.Evaller',

  [
  ],

  function () {
    var execute = function (data, onsuccess, onfailure) {
      var define = Function('return this;')().define;
      try {
        eval(data);
      } catch(e) {
        onfailure(e);
        return;
      }

      onsuccess();
    };

    return {
      execute: execute
    };
  }
);
define(
  'bolt.loader.executor.Injector',

  [
    'bolt.loader.tag.Script'
  ],

  function (Script) {
    var execute = function (data, onsuccess, onfailure) {
      var inject = function (tag) {
        tag.text = data;
      };

      var noop = function () {};

      // Injection does not fire events, but execution happens synchronously,
      // so we just make an explicit callback
      Script.insert(inject, noop);
      onsuccess();
    };

    return {
      execute: execute
    };
  }
);
define(
  'bolt.loader.api.NodeEvaller',

  [
    'bolt.loader.transporter.Node',
    'bolt.loader.executor.Evaller'
  ],

  function (Node, Evaller) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        Evaller.execute(data, onsuccess, onfailure);
      };

      Node.read(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
define(
  'bolt.loader.api.ScriptTag',

  [
    'bolt.loader.tag.Script'
  ],

  function (Script) {
    var load = function (url, onsuccess, onfailure) {
      var sourcer = function (tag) {
        tag.src = url;
      };

      Script.insert(sourcer, onsuccess);
    };

    return {
      load: load
    };
  }
);
define(
  'bolt.loader.api.XhrEvaller',

  [
    'bolt.loader.transporter.Xhr',
    'bolt.loader.executor.Evaller'
  ],

  function (Xhr, Evaller) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        Evaller.execute(data, onsuccess, onfailure);
      };

      Xhr.request(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
define(
  'bolt.loader.api.XhrInjector',

  [
    'bolt.loader.transporter.Xhr',
    'bolt.loader.executor.Injector'
  ],

  function (Xhr, Injector) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        Injector.execute(data, onsuccess);
      };

      Xhr.request(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
define(
  'bolt.runtime.error.Error',

  [
  ],

  function () {
    var die = function (msg) {
      throw msg;
    };

    return {
      die: die
    };
  }
);
define(
  'bolt.runtime.config.Mapper',

  [
  ],

  function () {
    var flat = function (id) {
      return id;
    };

    var hierarchical = function (id) {
      return id.replace(/\./g, '/');
    };

    var namespace = function (name) {
      var idx = name.lastIndexOf('.');
      return idx !== -1 ? name.slice(0, idx) + '/' + name.slice(idx + 1) : name;
    };

    var constant = function (name) {
      return function () {
        return name;
      };
    };

    return {
      flat: flat,
      hierarchical: hierarchical,
      namespace: namespace,
      constant: constant
    };
  }
);
define(
  'bolt.runtime.api.Bolt',

  [

  ],

  function () {
    return function (runtime) {
      var delegate = function (method) {
        return function () {
          return runtime[method].apply(null, arguments);
        };
      };

      return {
        define: delegate('define'),
        require: delegate('require'),
        demand: delegate('demand'),
        main: delegate('main'),
        configure: delegate('configure'),
        reconfigure: delegate('reconfigure'),
        loadfile: delegate('loadfile'),
        loadscript: delegate('loadscript')
      };
    };
  }
);
define(
  'bolt.runtime.api.DeferredBolt',

  [
    'bolt.base.fp.Arr',
    'bolt.kernel.api.Config',
    'bolt.runtime.error.Error'
  ],

  function (Arr, Config, Error) {
    var notready = function () { throw 'bolt not initialised, can not call demand, did you mean to use require or main?'; };
    var alreadyconfigured = function () { throw 'bolt has already been configured, if you are sure you want to do this, you need to call reconfigure.'; };

    return function (configure, profile) {
      var runtime = {};
      var deferred = [];

      var delaydefine = function (id, dependencies, definition) {
        deferred.push(function (bolt) {
          bolt.define(id, dependencies, definition);
        });
      };

      var delayrequire = function (dependencies, f) {
        deferred.push(function (bolt) {
          bolt.require(dependencies, f);
        });
      };

      var main = function (id, args, configids, callback) {
        runtime.require(configids || [], function () {
          callback && callback.apply(null, arguments);
          runtime.require([ id ], function (module) {
            module.apply(null, args || []);
          });
        });
      };

      var configured = function (configuration) {
        var bolt = Config.configure(configuration, profile.builtins, Error.die);

        runtime.define = bolt.define;
        runtime.require = bolt.require;
        runtime.demand = bolt.demand;
        runtime.configure = alreadyconfigured;
        runtime.configured = alreadyconfigured;

        Arr.each(deferred, function (d) {
          return d(runtime);
        });

        deferred = [];
      };

      var reconfigure = function (configuration) {
        defer();
        configure(configuration);
      };

      var defer = function () {
        runtime.define = delaydefine;
        runtime.require = delayrequire;
        runtime.main = main;
        runtime.demand = notready;
        runtime.loadfile = profile.loadfile;
        runtime.loadscript = profile.loadscript;
        runtime.configure = configure;
        runtime.configured = configured;
        runtime.reconfigure = reconfigure;
      };

      defer();

      return runtime;
    };
  }
);
define(
  'bolt.kernel.modulator.Bolt',

  [
    'bolt.base.fp.Func',
    'bolt.base.util.Path'
  ],

  function (Func, Path) {
    return function (loader, pather, namespace, ref, idTransformer) {

      var can = function (id) {
        return id === namespace || id.indexOf(namespace + '.') === 0;
      };

      var get = function (id) {
        var path = Path.isAbsolute(ref) ? ref : pather(ref);
        var url = path + "/" + idTransformer(id) + '.js';
        var load = Func.curry(loader.load, url);

        return {
          url: url,
          load: load,
          serial: false
        };
      };

      return {
        can: can,
        get: get
      };
    };
  }
);
define(
  'bolt.runtime.modulator.Library',

  [
    'bolt.base.fp.Arr',
    'bolt.base.util.Globals',
    'bolt.base.util.Path'
  ],

  function (Arr, Globals, Path) {
    return function (loader, pather, namespace, ref, initialization) {
      var exports = function (name) {
        var obj = Globals.resolve(name);
        if (initialization.cleanup === true)
          Globals.remove(name);
        return obj;
      };

      var definition = function () {
        if (initialization.define)
          return initialization.define;
        if (initialization.exports)
          return function () {
            return exports(initialization.exports);
          };
        if (initialization.exportsAll)
          return function () {
            var obj = {};
            Arr.each(initialization.exportsAll, function (name) {
              obj[name] = exports(name);
            });
            return obj;
          };
        return function () { return null; };
      };

      var wrapdefine = function (id, onsuccess, define) {
        return function () {
          define(id, [], definition());
          onsuccess();
        };
      };

      var can = function (id) {
        return id === namespace;
      };

      var get = function (id, define, require) {
        var url = Path.isAbsolute(ref) ? ref + '.js' : pather(ref) + '.js';

        var load = function (onsuccess, onfailure) {
          var wrapped = wrapdefine(id, onsuccess, define);
          require(initialization.depends || [], function () {
            loader.load(url, wrapped, onfailure);
          });
        };

        return {
          url: url,
          load: load,
          serial: false
        };
      };

      return {
        can: can,
        get: get
      };
    };
  }
);
define(
  'bolt.runtime.profile.BrowserProfile',

  [
    'bolt.base.fp.Func',
    'bolt.kernel.modulator.Bolt',
    'bolt.loader.api.ScriptTag',
    'bolt.loader.transporter.Xhr',
    'bolt.runtime.modulator.Library',
  ],

  function (Func, Bolt, ScriptTag, Xhr, Library) {
    return {
      loadfile: Xhr.request,
      loadscript: ScriptTag.load,
      builtins: {
        bolt: Func.curry(Bolt, ScriptTag),
        amd: Func.curry(Bolt, ScriptTag),
        lib: Func.curry(Library, ScriptTag)
      }
    };
  }
);
define(
  'bolt.runtime.profile.NodeProfile',

  [
    'bolt.base.fp.Func',
    'bolt.kernel.modulator.Bolt',
    'bolt.loader.api.NodeEvaller',
    'bolt.loader.transporter.Node',
    'bolt.runtime.modulator.Library',
  ],

  function (Func, Bolt, NodeEvaller, Node, Library) {
    return {
      loadfile: Node.request,
      loadscript: NodeEvaller.load,
      builtins: {
        bolt: Func.curry(Bolt, NodeEvaller),
        amd: Func.curry(Bolt, NodeEvaller),
        lib: Func.curry(Library, NodeEvaller)
      }
    };
  }
);
define(
  'bolt.runtime.config.Specs',

  [
  ],

  function () {
    var type = function (type, implementation) {
      return {
        type: type,
        implementation: implementation,
        modulator: implementation + '.Modulator',
        compiler: implementation + '.Compiler'
      };
    };

    var source = function (relativeto) {
      return function (type /*, args */) {
        return {
          type: type,
          relativeto: relativeto,
          args: Array.prototype.slice.call(arguments, 1)
        };
      }
    };

    return {
      type: type,
      source: source
    };
  }
);
define(
  'bolt.runtime.reader.Bouncing',

  [
    'bolt.base.fp.Arr',
    'bolt.runtime.error.Error',
    'bolt.runtime.config.Specs',
    'bolt.runtime.config.Mapper'
  ],

  function (Arr, Error, Specs, Mapper) {
    var bounce = function (done, read, acc) {
      var next = acc.configs.shift();
      read(next.relativeto, next.config, done, acc);
    };

    var tick = function (file, cfg, done, read, acc) {
      var munged = Arr.map(cfg.configs || [], function (config) {
        return { relativeto: file, config: config };
      });
      var accumulated = {
        sources: acc.sources.concat(cfg.sources || []),
        types: acc.types.concat(cfg.types || []),
        configs: munged.concat(acc.configs)
      };

      if (accumulated.configs.length > 0)
        bounce(done, read, accumulated);
      else
        done({ sources: accumulated.sources, types: accumulated.types });
    };

    /*
     * All precedence is depth-first, pre-order. Example:
     *
     *        A
     *       /-\
     *      B   C
     *     /|   |\
     *    D E   F G
     *
     * Configs are read in A, B, D, E, C, F, G.
     *
     * If configs mixed delegation and sources, the
     * sources would be ordered the same: A, B, D, E, C, F, G.
     */

    var evaluate = function (file, payload, done, read, acc) {
      var result = {};
      /* eval scope */
      var mapper = Mapper;
      var type = Specs.type;
      var source = Specs.source(file);
      var configure = function (configuration) {
        result = configuration;
      };

      try {
        eval(payload);
      } catch (e) {
        throw 'Could not load configuration [' + file + '], with: ' + e;
      }
      tick(file, result, done, read, acc);
    };

    return {
      evaluate: evaluate
    };
  }
);
define(
  'bolt.runtime.reader.BrowserReader',

  [
    'bolt.runtime.error.Error',
    'bolt.runtime.reader.Bouncing',
    'bolt.base.util.Path',
    'bolt.loader.transporter.Xhr'
  ],

  function (Error, Bouncing, Path, Xhr) {
    var read = function (relativeto, file, done, acc) {
      var accumulated = acc || { sources: [], types: [],  configs: [] };
      var absolute = Path.startsWith(file, '/') ? file : Path.dirname(relativeto) + '/' + file;
      Xhr.request(absolute, function (payload) {
        Bouncing.evaluate(absolute, payload, done, read, accumulated);
      }, Error.die);
    };

    return {
      read: read
    };
  }
);
define(
  'bolt.runtime.reader.NodeReader',

  [
    'bolt.runtime.reader.Bouncing'
  ],

  function (Bouncing) {
    var read = function (relativeto, file, done, acc) {
      var fs = require('fs');
      var path = require('path');
      var accumulated = acc || { sources: [], types: [],  configs: [] };
      var base = path.dirname(relativeto);
      var absolute = path.resolve(base, file);
      var payload = fs.readFileSync(absolute, 'UTF-8');
      Bouncing.evaluate(absolute, payload, done, read, accumulated);
    };

    return {
      read: read
    };
  }
);
define(
  'bolt.runtime.reader.Reader',

  [
    'bolt.runtime.reader.BrowserReader',
    'bolt.runtime.reader.NodeReader'
  ],

  function (BrowserReader, NodeReader) {
    var browser = function (configuration, done) {
      configure(BrowserReader.read, configuration, done);
    };

    var node = function (configuration, done) {
      configure(NodeReader.read, configuration, done);
    };

    var configure = function (reader, configuration, done) {
      if (configuration.configs && configuration.configs.length > 0)
        reader('./.', configuration.configs.shift(), done, {
          sources: configuration.sources || [],
          types: configuration.types || [],
          configs: configuration.configs
        });
      else
        done({
          sources: configuration.sources || [],
          types: configuration.types || []
        });
    };

    return {
      browser: browser,
      node: node
    };
  }
);
define(
  'bolt.runtime.entry.BrowserConfig',

  [
    'bolt.base.fp.Func'
  ],

  function (Func) {
    var withAttr = function (attr, f, otherwise) {
      var scripts = document.getElementsByTagName('script');
      var last = scripts[scripts.length - 1];
      return last && last.hasAttribute(attr) ?
        f(last.getAttribute(attr)) : otherwise();
    };

    var getAttr = function (attr, dfault) {
      return withAttr(attr, Func.identity, Func.constant(dfault));
    };

    var probe = function () {
      return {
        config: getAttr('data-bolt-config'),
        main: getAttr('data-bolt-main'),
        globals: getAttr('data-bolt-globals')
      };
    };

    return {
      probe: probe,
      withAttr: withAttr,
      getAttr: getAttr
    };
  }
);
define(
  'bolt.runtime.entry.NodeMain',

  [
    'bolt.runtime.api.Bolt',
    'bolt.runtime.api.DeferredBolt',
    'bolt.runtime.profile.NodeProfile',
    'bolt.runtime.reader.Reader'
  ],

  function (Bolt, DeferredBolt, NodeProfile, Reader) {
    return function () {
      var configure = function (configuration) {
        Reader.node(configuration, deferred.configured);
      };

      var deferred = DeferredBolt(configure, NodeProfile);
      var bolt = Bolt(deferred);

      module.exports = bolt;
    };
  }
);
define(
  'bolt.runtime.entry.BrowserMain',

  [
    'bolt.base.fp.Obj',
    'bolt.base.util.Globals',
    'bolt.runtime.api.Bolt',
    'bolt.runtime.api.DeferredBolt',
    'bolt.runtime.entry.BrowserConfig',
    'bolt.runtime.profile.BrowserProfile',
    'bolt.runtime.reader.Reader'
  ],

  function (Obj, Globals, Bolt, DeferredBolt, BrowserConfig, BrowserProfile, Reader) {
    return function () {
      var data = BrowserConfig.probe();
      var globals = data.globals !== 'false';
      var main = data.main !== undefined;
      var config = data.config !== undefined;

      var configure = function (configuration) {
        Reader.browser(configuration, deferred.configured);
      };

      var deferred = DeferredBolt(configure, BrowserProfile);
      var bolt = Bolt(deferred);
      Globals.global.bolt = bolt;

      if (globals) {
        window.define = bolt.define;
        window.require = bolt.require;
      }

      if (main)
        bolt.main(data.main);

      if (config)
        bolt.configure({ configs: [ data.config ]});
    };
  }
);
define(
  'bolt.runtime.entry.Main',

  [
    'bolt.base.platform.Platform',
    'bolt.runtime.entry.BrowserMain',
    'bolt.runtime.entry.NodeMain'
  ],

  function (Platform, BrowserMain, NodeMain) {
    return Platform.get(NodeMain, BrowserMain);
  }
);
  demand('bolt.runtime.entry.Main')();
})();
