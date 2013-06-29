(function (scope) {
var bolt = scope.bolt = scope.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
(function (scope) {
var bolt = scope.bolt = scope.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
bolt.kernel = {};
bolt.kernel.api = {};
bolt.kernel.async = {};
bolt.kernel.fp = {};
bolt.kernel.modulator = {};
bolt.kernel.module = {};
bolt.kernel.util = {};
bolt.kernel.fp.Arr = def(
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
bolt.kernel.fp.Obj = def(
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
bolt.kernel.fp.Func = def(
  [
  ],

  function () {
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
      curry: curry,
      not: not,
      apply: apply
    };
  }
);
bolt.kernel.util.Path = def(
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
bolt.kernel.util.Globals = def(
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
bolt.kernel.async.Map = def(
  [
    bolt.kernel.fp.Arr
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
bolt.kernel.async.Piggybacker = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.fp.Func
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
bolt.kernel.modulator.Globalator = def(
  [
    bolt.kernel.util.Globals
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
bolt.kernel.modulator.Bolt = def(
  [
    bolt.kernel.fp.Func,
    bolt.kernel.util.Path
  ],

  function (Func, Path) {
    var create = function (loader, pather, namespace, ref, idTransformer) {
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

    return {
      create: create
    };
  }
);
bolt.kernel.module.Stratifier = def(
  [
    bolt.kernel.fp.Arr
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
bolt.kernel.module.Analyser = def(
  [
    bolt.kernel.fp.Arr
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
bolt.kernel.module.Fetcher = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.fp.Func,
    bolt.kernel.async.Map,
    bolt.kernel.async.Piggybacker,
    bolt.kernel.module.Stratifier
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
bolt.kernel.module.Loader = def(
  [
    bolt.kernel.module.Analyser
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
bolt.kernel.module.Manager = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.fp.Obj,
    bolt.kernel.module.Loader,
    bolt.kernel.module.Fetcher
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
bolt.kernel.api.Sources = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.fp.Obj,
    bolt.kernel.modulator.Globalator
  ],

  function (Arr, Obj, Globalator) {
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
            var source = instance.create.apply(null, spec.args);
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
bolt.kernel.api.Regulator = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.fp.Func
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
bolt.kernel.api.Config = def(
  [
    bolt.kernel.module.Manager,
    bolt.kernel.api.Regulator,
    bolt.kernel.api.Sources
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
})(Function('return this')());
(function (scope) {
var bolt = scope.bolt = scope.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
bolt.loader = {};
bolt.loader.executor = {};
bolt.loader.api = {};
bolt.loader.transporter = {};
bolt.loader.tag = {};
bolt.loader.tag.Script = def(
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
bolt.loader.transporter.Commonjs = def(
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
bolt.loader.transporter.Xhr = def(
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
bolt.loader.executor.Evaller = def(
  [
  ],

  function () {
    var execute = function (data, onsuccess, onfailure) {

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
bolt.loader.executor.Injector = def(
  [
    bolt.loader.tag.Script
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
bolt.loader.api.CommonjsEvaller = def(
  [
    bolt.loader.transporter.Commonjs,
    bolt.loader.executor.Evaller
  ],

  function (Commonjs, Evaller) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        Evaller.execute(data, onsuccess, onfailure);
      };

      Commonjs.read(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
bolt.loader.api.ScriptTag = def(
  [
    bolt.loader.tag.Script
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
bolt.loader.api.XhrEvaller = def(
  [
    bolt.loader.transporter.Xhr,
    bolt.loader.executor.Evaller
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
bolt.loader.api.XhrInjector = def(
  [
    bolt.loader.transporter.Xhr,
    bolt.loader.executor.Injector
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
})(Function('return this')());
(function (scope) {
var bolt = scope.bolt = scope.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
bolt.module = {};
bolt.module.bootstrap = {};
bolt.module.config = {};
bolt.module.error = {};
bolt.module.modulator = {};
bolt.module.reader = {};
bolt.module.runtime = {};
bolt.module.util = {};
bolt.module.error.Error = def(
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
bolt.module.config.Mapper = def(
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
// This is currently right, need to do more to move api.
bolt.module.api = def(
  [

  ],

  function (runtime) {
    var delegate = function (method) {
      return function () {
        return bolt.module.runtime[method].apply(null, arguments);
      };
    };

    return {
      define: delegate('define'),
      require: delegate('require'),
      demand: delegate('demand'),
      main: delegate('main'),
      load: delegate('load'),
      loadscript: delegate('loadscript')
    };
  }
);
bolt.module.util.Locator = def(
  [
  ],

  function () {
    var browser = function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1].src;
    };

    // FIX This is shit. Should be passed around or handled like other node/browser switches.
    var runtime = bolt.module.runtime.locate;

    var locate = function () {
      var f = runtime || browser;
      return f();
    };

    return {
      locate: locate
    };
  }
);
bolt.module.util.Pather = def(
  [
    bolt.kernel.util.Path
  ],

  function (Path) {
    var create = function (relativeto) {
      var base = Path.dirname(relativeto);
      return function (path) {
        return base + '/' + path;
      };
    };

    return {
      create: create
    };
  }
);
bolt.module.modulator.Library = def(
  [
    bolt.kernel.fp.Arr,
    bolt.kernel.util.Globals,
    bolt.kernel.util.Path
  ],

  function (Arr, Globals, Path) {
    var create = function (loader, pather, namespace, ref, initialization) {
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

    return {
      create: create
    };
  }
);
bolt.module.modulator.Modulators = def(
  [
    bolt.kernel.fp.Func,
    bolt.kernel.modulator.Bolt,
    bolt.module.modulator.Library,
    bolt.loader.api.CommonjsEvaller,
    bolt.loader.api.ScriptTag,
    bolt.loader.api.XhrEvaller,
    bolt.loader.api.XhrInjector
  ],

  function (Func, Bolt, Library, CommonjsEvaller, ScriptTag, XhrEvaller, XhrInjector) {
    var wrap = function (modulator, loader) {
      var create = Func.curry(modulator.create, loader);

      return {
        create: create
      }
    };

    return {
      boltcommonjs: wrap(Bolt, CommonjsEvaller),
      boltscripttag: wrap(Bolt, ScriptTag),
      boltxhreval: wrap(Bolt, XhrEvaller),
      boltxhrinjector: wrap(Bolt, XhrInjector),
      libcommonjs: wrap(Library, CommonjsEvaller),
      libscripttag: wrap(Library, ScriptTag),
      libxhreval: wrap(Library, XhrEvaller),
      libxhrinjector: wrap(Library, XhrInjector)
    };
  }
);
bolt.module.config.Builtins = def(
  [
    bolt.module.modulator.Modulators
  ],

  function (Modulators) {
    return {
      // 'amd' is maintained for backwards compatibility, will be removed at some point.
      browser: {
        bolt: Modulators.boltscripttag,
        amd: Modulators.boltscripttag,
        lib: Modulators.libscripttag
      },
      commonjs: {
        bolt: Modulators.boltcommonjs,
        amd: Modulators.boltcommonjs,
        lib: Modulators.libcommonjs
      }
    };
  }
);
bolt.module.config.Specs = def(
  [
    bolt.module.util.Pather
  ],

  function (Pather) {
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
          args: [ Pather.create(relativeto) ].concat(Array.prototype.slice.call(arguments, 1))
        };
      }
    };

    return {
      type: type,
      source: source
    };
  }
);
bolt.module.reader.Bouncing = def(
  [
    bolt.kernel.fp.Arr,
    bolt.module.error.Error,
    bolt.module.config.Specs
  ],

  function (Arr, Error, Specs) {
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
      var mapper = bolt.module.config.Mapper;
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
bolt.module.reader.Browser = def(
  [
    bolt.module.error.Error,
    bolt.module.reader.Bouncing,
    bolt.kernel.util.Path,
    bolt.loader.transporter.Xhr
  ],

  function (Error, Bouncing, Path, Xhr) {
    var read = function (relativeto, file, done, acc) {
      var accumulated = acc || { sources: [], types: [],  configs: [] };
      var base = Path.dirname(relativeto);
      var absolute = base + '/' + file;
      Xhr.request(absolute, function (payload) {
        Bouncing.evaluate(absolute, payload, done, read, accumulated);
      }, Error.die);
    };

    return {
      read: read
    };
  }
);
bolt.module.reader.Node = def(
  [
    bolt.module.reader.Bouncing
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
bolt.module.reader.Direct = def(
  [
  ],

  function () {
    var create = function (configuration) {
      return function (done) {
        done({
          sources: configuration.sources || [],
          types: configuration.types || [],
          configs: configuration.configs || []
        });
      };
    };

    return {
      create: create
    };
  }
);
bolt.module.bootstrap.Configloader = def(
  [
    bolt.module.util.Locator,
    bolt.module.reader.Browser,
    bolt.module.reader.Direct
  ],

  function (Locator, Browser, Direct) {
    var script = function (file) {
      var src = Locator.locate();
      return function (done) {
        Browser.read(src, file, done);
      };
    };

    var page = function (file) {
      return function (done) {
        Browser.read('./', file, done);
      };
    };

    var empty = Direct.create({});

    return {
      script: script,
      page: page,
      empty: empty
    };
  }
);
bolt.module.bootstrap.Deferred = def(
  [
    bolt.kernel.fp.Arr
  ],

  function (Arr) {
    var deferred = [];

    var require = function (ids, fn) {
      var r = function (real) {
        real(ids, fn);
      };
      deferred.push(r);
    };

    var configured = function (require) {
      Arr.each(deferred, function (action) {
        action(require);
      });
      deferred = [];
    };

    return {
      require: require,
      configured: configured
    };
  }
);
bolt.module.bootstrap.Main = def(
  [
  ],

  function () {
    var runtime = bolt.module.runtime;

    var main = function (id, args, configids, callback) {
      runtime.require(configids || [], function () {
        callback && callback.apply(null, arguments);
        runtime.require([ id ], function (module) {
          module.apply(null, args || []);
        });
      });
    };

    return {
      main: main
    };
  }
);
bolt.module.bootstrap.Install = def(
  [
    bolt.kernel.api.Config,
    bolt.module.bootstrap.Deferred,
    bolt.module.bootstrap.Main,
    bolt.module.error.Error
  ],

  function (Config, Deferred, Main, Error) {
    var notready = function () { throw 'bolt not initialised, can not call define or demand, did you mean to use require or main?'; };

    var install = function (reader, builtins, load, loadscript) {
      var runtime = bolt.module.runtime;
      runtime.define = notready;
      runtime.demand = notready;
      runtime.require = Deferred.require;
      runtime.main = Main.main;
      runtime.load = load;
      runtime.loadscript = loadscript;

      reader(function (configuration) {
        var bolt = Config.configure(configuration, builtins, Error.die);
        runtime.define = bolt.define;
        runtime.require = bolt.require;
        runtime.demand = bolt.demand;

        Deferred.configured(runtime.require);
      });
    };

    return {
      install: install
    };
  }
);
})(Function('return this')());
(function () {
  var Obj = bolt.kernel.fp.Obj;
  var Install = bolt.module.bootstrap.Install;
  var Builtins = bolt.module.config.Builtins;
  var Xhr = bolt.loader.transporter.Xhr;
  var ScriptTag = bolt.loader.api.ScriptTag;
  var Configloader = bolt.module.bootstrap.Configloader;

  var withAttr = function (attr, f, otherwise) {
    var scripts = document.getElementsByTagName('script');
    var last = scripts[scripts.length - 1];
    return last && last.hasAttribute(attr) ?
      f(last.getAttribute(attr)) : otherwise();
  };

  var withConfig = function (f, otherwise) {
    return withAttr('data-bolt-config', f, otherwise);
  };

  var withMain = function (f, otherwise) {
    return withAttr('data-bolt-main', f, otherwise);
  };

  var withGlobals = function (f, otherwise) {
    return withAttr('data-bolt-globals', f, otherwise);
  };

  var reader = withConfig(function (path) {
    return Configloader.page(path);
  }, function () {
    return Configloader.empty;
  });

  Install.install(reader, Builtins.browser, Xhr.request, ScriptTag.load);

  withMain(function (main) {
    bolt.module.api.main(main);
  }, function () {})

  var register = withGlobals(function (globals) {
    return globals !== 'false';
  }, function () {
    return true;
  });

  if (register)
    Obj.merge(window, bolt.module.api);
})();
})(Function('return this')());
