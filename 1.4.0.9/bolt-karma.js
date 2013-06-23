(function (scope) {
var ephox = scope.ephox = scope.ephox || {};
var bolt = ephox.bolt = ephox.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
(function (scope) {
var ephox = scope.ephox = scope.ephox || {};
var bolt = ephox.bolt = ephox.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
var kernel = bolt.kernel = bolt.kernel || {};
kernel.api = kernel.api || {};
kernel.async = kernel.api || {};
kernel.fp = kernel.fp || {};
kernel.modulator = kernel.modulator || {};
kernel.module = kernel.module || {};
kernel.util = kernel.util || {};
kernel.fp.array = def(
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
kernel.fp.object = def(
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
kernel.fp.functions = def(
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
);kernel.util.globals = def(
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
kernel.async.map = def(
  [
    kernel.fp.array
  ],

  function (ar) {
    var amap = function (data, f, oncomplete) {
      var total = data.length;
      var count = 0;
      var results = [];

      ar.each(data, function (datum, i) {
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
kernel.async.piggybacker = def(
  [
    kernel.fp.array,
    kernel.fp.functions
  ],

  function (ar, fn) {
    var create = function () {
      var queue = {};  // key -> [actions]

      var process = function (key) {
        var actions = queue[key];
        delete queue[key];
        ar.each(actions, fn.apply);
      };

      var piggyback = function (key, f, action) {
        if (queue[key] === undefined) {
          queue[key] = [ action ];
          f(fn.curry(process, key));
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
kernel.modulator.globalator = def(
  [
    kernel.util.globals
  ],

  function (globals) {
    var create = function () {
      var can = function (id) {
        return id.indexOf('global!') === 0;
      };

      var get = function (id, define, require) {
        var name = id.substring('global!'.length);

        var load = function (onsuccess, onfailure) {
          var instance = globals.resolve(name);
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
kernel.modulator.bolt = def(
  [
    kernel.fp.functions
  ],

  function (fn) {
    var create = function (loader, pather, namespace, path, idTransformer) {
      var can = function (id) {
        return id === namespace || id.indexOf(namespace + '.') === 0;
      };

      var get = function (id) {
        var url = pather(path) + "/" + idTransformer(id) + '.js';
        var load = fn.curry(loader.load, url);

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
kernel.module.stratifier = def(
  [
    kernel.fp.array
  ],

  function (ar) {
    var stratify = function (specs) {
      var parallels = ar.filter(specs, function (spec) {
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
kernel.module.analyser = def(
  [
    kernel.fp.array
  ],

  function (array) {
    var collect = function (path, name) {
      var i = array.indexof(path, name);
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
        array.each(modules[name], attempt);
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
        if (array.contains(path, name))
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

      array.each(roots, attempt);

      return cycle ? { cycle: cycle } : { load: missing };
    };

    return {
      analyse: analyse
    };
  }
);
kernel.module.fetcher = def(
  [
    kernel.fp.array,
    kernel.fp.functions,
    kernel.async.map,
    kernel.async.piggybacker,
    kernel.module.stratifier
  ],

  function (ar, fn, map, piggybacker, stratifier) {
    var create = function (regulator, validator, onerror, define, require, demand) {
      var piggyback = piggybacker.create();

      var validate = function (onsuccess, results) {
        var failed = ar.filter(results, fn.not(validator));
        if (failed.length > 0)
          onerror('Fetcher error: modules were not defined: ' + failed.join(', '));
        else
          onsuccess();
      };

      var mapper = function (spec, onresult) {
        var action = fn.curry(onresult, spec.id);
        var load = function (callback) {
          spec.load(callback, onerror);
        };
        piggyback.piggyback(spec.url, load, action);
      };

      var asyncfetch = function (specs, onsuccess) {
        var oncomplete = fn.curry(validate, onsuccess);
        var strata = stratifier.stratify(specs);
        map.amap(strata, mapper, oncomplete);
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
kernel.module.loader = def(
  [
    kernel.module.analyser
  ],

  function (analyser) {
    var load = function (roots, deps, fetcher, oncontinue, onsuccess, onerror) {
      var result = analyser.analyse(roots, deps);

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
kernel.module.manager = def(
  [
    kernel.fp.array,
    kernel.fp.object,
    kernel.module.loader,
    kernel.module.fetcher
  ],

  function (ar, obj, loader, fetcher) {
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
          var instances = ar.map(ids, demand);
          callback.apply(null, instances);
        };

        var oncontinue = function () {
          var deps = obj.map(blueprints, function (k, v) {
            return v.dependencies;
          });
          loader.load(ids, deps, fetch, oncontinue, onsuccess, onerror);
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
        var args = ar.map(blueprint.dependencies, demand);  // Instantiate dependencies
        return blueprint.definition.apply(null, args);  // Instantiate self
      };

      var validator = function (id) { return blueprints[id] !== undefined; };
      var fetch = fetcher.create(regulator, validator, onerror, define, require, demand);

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
kernel.api.sources = def(
  [
    kernel.fp.array,
    kernel.fp.object,
    kernel.modulator.globalator
  ],

  function (ar, obj, globalator) {
    var create = function (builtins, configuration) {
      var data = {
        'global': { instance: globalator }
      };
      obj.each(builtins, function (key, value) {
        data[key] = { instance: value };
      });
      ar.each(configuration.types, function (spec) {
        data[spec.type] = { id: spec.modulator };
      });
      var sourcespecs = configuration.sources.slice(0);
      var sources = [ globalator.create() ];

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
        ar.each(sourcespecs, function (spec) {
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
kernel.api.regulator = def(
  [
    kernel.fp.array,
    kernel.fp.functions
  ],

  function (ar, fn) {
    var create = function (sources) {
      /*
       * 1. Resolve configuration as much as possible
       * 2. Check for unresolved modulator types that are required to continue.
       *   a) Go ahead and resolve, if we have everything we need.
       *   b) Delay, requiring the modulators, then retry.
       */
      var regulate = function (ids, define, require, demand, onsuccess, onerror) {
        sources.crank();
        var required = ar.map(ids, determinetype);
        var unresolved = ar.filter(required, fn.not(sources.isResolved));
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
        var modulatorids = ar.map(types, sources.idOf);
        require(modulatorids, function (/* modulators */) {
          var modulators = arguments;
          ar.each(types, function (type, i) {
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
kernel.api.config = def(
  [
    kernel.module.manager,
    kernel.api.regulator,
    kernel.api.sources
  ],

  function (manager, regulator, sources) {
    var configure = function (configuration, builtins, onerror) {
      var s = sources.create(builtins, configuration);
      var r = regulator.create(s);
      var engine = manager.create(r, onerror);

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
var ephox = scope.ephox = scope.ephox || {};
var bolt = ephox.bolt = ephox.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
var loader = bolt.loader = bolt.loader || {};
loader.executor = loader.executor || {};
loader.api = loader.api || {};
loader.transporter = loader.transporter || {};
loader.tag = loader.tag || {};
loader.tag.script = def(
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
loader.transporter.commonjs = def(
  [
  ],

  function () {
    var read = function (url, success, error) {
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

    return {
      read: read
    };
  }
);
loader.transporter.xhr = def(
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
loader.executor.evaller = def(
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
loader.executor.injector = def(
  [
    loader.tag.script
  ],

  function (script) {
    var execute = function (data, onsuccess, onfailure) {
      var inject = function (tag) {
        tag.text = data;
      };

      var noop = function () {};

      // Injection does not fire events, but execution happens synchronously,
      // so we just make an explicit callback
      script.insert(inject, noop);
      onsuccess(); 
    };

    return {
      execute: execute
    };
  }
);
loader.api.commonjsevaller = def(
  [
    loader.transporter.commonjs,
    loader.executor.evaller
  ],

  function (commonjs, evaller) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        evaller.execute(data, onsuccess, onfailure);
      };

      commonjs.read(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
loader.api.scripttag = def(
  [
    loader.tag.script
  ],

  function (script) {
    var load = function (url, onsuccess, onfailure) {
      var sourcer = function (tag) {
        tag.src = url;
      };

      script.insert(sourcer, onsuccess);
    };

    return {
      load: load
    };
  }
);
loader.api.xhrevaller = def(
  [
    loader.transporter.xhr,
    loader.executor.evaller
  ],

  function (xhr, evaller) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        evaller.execute(data, onsuccess, onfailure);
      };

      xhr.request(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
loader.api.xhrinjector = def(
  [
    loader.transporter.xhr,
    loader.executor.injector
  ],

  function (xhr, injector) {
    var load = function (url, onsuccess, onfailure) {
      var inject = function (data) {
        injector.execute(data, onsuccess);
      };

      xhr.request(url, inject, onfailure);
    };

    return {
      load: load
    };
  }
);
})(Function('return this')());
(function (scope) {
var ephox = scope.ephox = scope.ephox || {};
var bolt = ephox.bolt = ephox.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
var module = bolt.module = bolt.module || {};
module.bootstrap = module.bootstrap || {};
module.config = module.config || {};
module.error = module.error || {};
module.modulator = module.modulator || {};
module.reader = module.reader || {};
module.runtime = module.runtime || {};
module.util = module.util || {};
module.error.error = def(
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
module.config.mapper = def(
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
module.api = def(
  [
    module.runtime
  ],

  function (runtime) {
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
      load: delegate('load'),
      loadscript: delegate('loadscript')
    };
  }
);
module.util.path = def(
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
module.util.locator = def(
  [
  ],

  function () {
    var browser = function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1].src;
    };

    var runtime = module.runtime.locate;

    var locate = function () {
      var f = runtime || browser;
      return f();
    };

    return {
      locate: locate
    };
  }
);
module.util.pather = def(
  [
    module.util.path
  ],

  function (path) {
    var create = function (relativeto) {
      var base = path.dirname(relativeto);
      return function (path) {
        return base + '/' + path;
      };
    };

    return {
      create: create
    };
  }
);module.modulator.library = def(
  [
    ephox.bolt.kernel.fp.array,
    ephox.bolt.kernel.fp.functions,
    ephox.bolt.kernel.util.globals,
    ephox.bolt.module.util.path
  ],

  function (ar, fn, globals, path) {
    var create = function (loader, pather, namespace, ref, initialization) {
      var exports = function (name) {
        var obj = globals.resolve(name);
        if (initialization.cleanup === true)
          globals.remove(name);
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
            ar.each(initialization.exportsAll, function(name) {
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
        var url = path.isAbsolute(ref) ? ref + '.js' : pather(ref) + '.js';

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
module.modulator.modulators = def(
  [
    ephox.bolt.kernel.fp.functions,
    ephox.bolt.kernel.modulator.bolt,
    ephox.bolt.module.modulator.library,
    ephox.bolt.loader.api.commonjsevaller,
    ephox.bolt.loader.api.scripttag,
    ephox.bolt.loader.api.xhrevaller,
    ephox.bolt.loader.api.xhrinjector
  ],

  function (fn, bolt, library, commonjsevaller, scripttag, xhrevaller, xhrinjector) {
    var wrap = function (modulator, loader) {
      var create = fn.curry(modulator.create, loader);

      return {
        create: create
      }
    };

    return {
      boltcommonjs: wrap(bolt, commonjsevaller),
      boltscripttag: wrap(bolt, scripttag),
      boltxhreval: wrap(bolt, xhrevaller),
      boltxhrinjector: wrap(bolt, xhrinjector),
      libcommonjs: wrap(library, commonjsevaller),
      libscripttag: wrap(library, scripttag),
      libxhreval: wrap(library, xhrevaller),
      libxhrinjector: wrap(library, xhrinjector)
    };
  }
);
module.config.builtins = def(
  [
    ephox.bolt.module.modulator.modulators.boltscripttag,
    ephox.bolt.module.modulator.modulators.boltcommonjs,
    ephox.bolt.module.modulator.modulators.libscripttag,
    ephox.bolt.module.modulator.modulators.libcommonjs
  ],

  function (boltscripttag, boltcommonjs, libscripttag, libcommonjs) {
    return {
      // 'amd' is maintained for backwards compatibility, will be removed at some point.
      browser: { bolt: boltscripttag, amd: boltscripttag, lib: libscripttag },
      commonjs: { bolt: boltcommonjs, amd: boltcommonjs, lib: libcommonjs }
    };
  }
);
module.config.specs = def(
  [
    module.util.pather
  ],

  function (pather) {
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
          args: [ pather.create(relativeto) ].concat(Array.prototype.slice.call(arguments, 1))
        };
      }
    };

    return {
      type: type,
      source: source
    };
  }
);
module.reader.bouncing = def(
  [
    ephox.bolt.kernel.fp.array,
    module.error.error,
    module.config.specs
  ],

  function (ar, error, specs) {
    var bounce = function (done, read, acc) {
      var next = acc.configs.shift();
      read(next.relativeto, next.config, done, acc);
    };

    var tick = function (file, cfg, done, read, acc) {
      var munged = ar.map(cfg.configs || [], function (config) {
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
      var mapper = module.config.mapper;
      var type = specs.type;
      var source = specs.source(file);
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
module.reader.browser = def(
  [
    module.error.error,
    module.reader.bouncing,
    module.util.path,
    ephox.bolt.loader.transporter.xhr
  ],

  function (error, bouncing, path, xhr) {
    var read = function (relativeto, file, done, acc) {
      var accumulated = acc || { sources: [], types: [],  configs: [] };
      var base = path.dirname(relativeto);
      var absolute = base + '/' + file;
      xhr.request(absolute, function (payload) {
        bouncing.evaluate(absolute, payload, done, read, accumulated);
      }, error.die);
    };

    return {
      read: read
    };
  }
);
module.reader.node = def(
  [
    module.reader.bouncing
  ],

  function (bouncing, path, fs) {
    var read = function (relativeto, file, done, acc) {
      var fs = require('fs');
      var path = require('path');
      var accumulated = acc || { sources: [], types: [],  configs: [] };
      var base = path.dirname(relativeto);
      var absolute = path.resolve(base, file);
      var payload = fs.readFileSync(absolute, 'UTF-8');
      bouncing.evaluate(absolute, payload, done, read, accumulated);
    };

    return {
      read: read
    };
  }
);
module.reader.direct = def(
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
module.bootstrap.configloader = def(
  [
    module.util.locator,
    module.reader.browser,
    module.reader.direct
  ],

  function (locator, browser, direct) {
    var script = function (file) {
      var src = locator.locate();
      return function (done) {
        browser.read(src, file, done);
      };
    };

    var page = function (file) {
      return function (done) {
        browser.read('./', file, done);
      };
    };

    var empty = direct.create({});

    return {
      script: script,
      page: page,
      empty: empty
    };
  }
);
module.bootstrap.deferred = def(
  [
    ephox.bolt.kernel.fp.array
  ],

  function (ar) {
    var deferred = [];

    var require = function (ids, fn) {
      var r = function (real) {
        real(ids, fn);
      };
      deferred.push(r);
    };

    var configured = function (require) {
      ar.each(deferred, function (action) {
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
module.bootstrap.main = def(
  [
    ephox.bolt.kernel.api.config,
    module.bootstrap.deferred,
    module.runtime
  ],

  function (config, deferred, runtime) {
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
module.bootstrap.install = def(
  [
    ephox.bolt.kernel.api.config,
    module.bootstrap.deferred,
    module.bootstrap.main,
    module.runtime,
    module.error.error
  ],

  function (config, deferred, main, runtime, error) {
    var notready = function () { throw 'bolt not initialised, can not call define or demand, did you mean to use require or main?'; };

    var install = function (reader, builtins, load, loadscript) {
      runtime.define = notready;
      runtime.demand = notready;
      runtime.require = deferred.require;
      runtime.main = main.main;
      runtime.load = load;
      runtime.loadscript = loadscript;

      reader(function (configuration) {
        var bolt = config.configure(configuration, builtins, error.die);
        runtime.define = bolt.define;
        runtime.require = bolt.require;
        runtime.demand = bolt.demand;

        deferred.configured(runtime.require);
      });
    };

    return {
      install: install
    };
  }
);

})(Function('return this')());
(function (scope) {
var ephox = scope.ephox = scope.ephox || {};
var bolt = ephox.bolt = ephox.bolt || {};

var def = function (deps, factory) {
    return factory.apply(null, deps);
};
var test = bolt.test = bolt.test || {};
test.report = test.report || {};
test.run = test.run || {};
test.assert = test.assert || {};
test.report.timer = def(
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
test.report.namer = def(
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
test.report.errors = def(
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
        return line.indexOf('at') !== -1 &&
          !(line.indexOf('/kernel.js') !== -1 ||
            line.indexOf('/test.js') !== -1);
      });
      return '\n' + lines.join('\n');
    };

    return {
      clean: clean
    };
  }
);
test.report.logger = def(
  [
    test.report.errors,
    test.report.timer,
    test.report.namer
  ],

  function (errors, timer, namer) {
    var create = function (verbose) {
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

      var test = function (testcase, name) {
        var starttime = new Date();
        vlog('[' + name + ']');

        var pass = function () {
          ++passed;
          vlog('+ [passed] in ' + timer.elapsed(starttime))
        };

        var fail = function (error) {
          ++failed;
          log('- [failed] : ' + namer.format(testcase, name) + '');
          log('    ' + errors.clean(error).replace(/\n/g, '\n    '));
          log();
        };

        return {
          pass: pass,
          fail: fail
        };
      };

      var done = function () {
        log('Ran ' + (passed + failed) + ' tests in ' + timer.elapsed(initial) + ', ' + passed + ' passed, ' + failed + ' failed.');
        process.exit(failed === 0 ? 0 : 1);
      };

      return {
        test: test,
        done: done
      };
    };

    return {
      create: create
    }
  }
);
test.assert.compare = def(
  [
    ephox.bolt.kernel.fp.array,
    ephox.bolt.kernel.fp.object
  ],

  function (arr, obj) {
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
      return arr.contains([ 'undefined', 'boolean', 'number', 'string', 'function', 'xml', 'null' ], x);
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
      return sortArray(obj.keys(o));
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
test.assert.assert = def(
  [
    test.assert.compare
  ],

  function (compare) {
    var eq = function (expected, actual, message) {
      var result = compare.compare(expected, actual);
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
test.run.accumulator = def(
  [
    Function('return this;')(),
    ephox.bolt.kernel.fp.functions
  ],

  function (global, fn) {
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
        runtest.apply(null, [ fn.curry(drain, runtest, done) ].concat(take()));
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
test.run.wrapper = def(
  [
    Function('return this;')(),
    test.assert.assert
  ],

  function (global, assert) {
    global.assert = assert;

    var sync = function (reporter, testfile, name, f, next) {
      global.define = ephox.bolt.module.api.define;
      global.require = ephox.bolt.module.api.require;
      global.demand = ephox.bolt.module.api.demand;

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

    var async = function (reporter, testfile, name, f, next) {
      global.define = ephox.bolt.module.api.define;
      global.require = ephox.bolt.module.api.require;
      global.demand = ephox.bolt.module.api.demand;

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
test.run.config = def(
  [
    ephox.bolt.kernel.fp.object,
    ephox.bolt.module.config.mapper,
    ephox.bolt.module.config.specs,
    ephox.bolt.module.util.path
  ],

  function (obj, mapper, specs, path) {
    var sources = function (testfile, replacements) {
      var r = [];
      var testpath = path.dirname(testfile);
      var sourcer = specs.source(testpath);
      obj.each(replacements, function (i, o) {
        var name = path.basename(o);
        var source = sourcer('bolt', i, path.dirname(o), mapper.constant(name));
        r.push(source);
      });

      return r;
    };

    var enricher = function (reader, testfile, replacements) {
      var extra = sources(testfile, replacements);
      return function (done) {
        reader(function (configuration) {
          done({
            types: configuration.types,
            sources: extra.concat(configuration.sources)
          });
        });
      };
    };

    return {
      enricher: enricher
    };
  }
);
test.run.test = def(
  [
    ephox.bolt.module.bootstrap.install,
    ephox.bolt.test.run.config
  ],

  function (install, config) {
    var create = function (builtins, load, loadscript, reporter, reader) {
      
      return function (next, wrapper, testfile, name, replacements, deps, fn) {
        var enriched = config.enricher(reader, testfile, replacements);
        install.install(enriched, builtins, load, loadscript);
        var wrapped = wrapper(reporter, testfile, name, fn, next);
        ephox.bolt.module.api.require(deps, wrapped);
      };
    };

    return {
      create: create
    };
  }
);
test.run.runner = def(
  [
    test.run.accumulator,
    test.run.test,
    test.run.wrapper,
    ephox.bolt.module.config.builtins.commonjs,
    ephox.bolt.loader.transporter.commonjs.read,
    ephox.bolt.loader.api.commonjsevaller.load
  ],

  function (accumulator, test, wrapper, builtins, load, loadscript) {
    var run = function (reporter, reader, tests) {
      var runtest = test.create(builtins, load, loadscript, reporter, reader);

      var path = require('path');

      tests.forEach(function (testfile) {
        var testcase = path.resolve(testfile);
        accumulator.register(testfile, wrapper.sync, wrapper.async);
        require(testcase);
      });

      accumulator.drain(runtest, reporter.done);
    };

    return {
      run: run
    };
  }
);
})(Function('return this')());
__karma__.loaded = function() {};

var tests = Object.keys(__karma__.files).filter(function (file) {
      return /Test\.js$/.test(file);
});

var install = ephox.bolt.module.bootstrap.install;
var load = ephox.bolt.loader.transporter.xhr.request;
var loadscript = ephox.bolt.loader.api.scripttag.load;
var builtins = ephox.bolt.module.config.builtins.browser;
var browser = ephox.bolt.module.reader.browser;
var timer = ephox.bolt.test.report.timer;
var accumulator = ephox.bolt.test.run.accumulator;
var test = ephox.bolt.test.run.test;
var wrapper = ephox.bolt.test.run.wrapper;
var errors = ephox.bolt.test.report.errors;
var source = ephox.bolt.module.config.specs.source('/base/');
var mapper = ephox.bolt.module.config.mapper;
var fn = ephox.bolt.kernel.fp.functions;
var reader = fn.curry(browser.read, '/base/', './config/bolt/test.js');
var karma = __karma__;

var reporter = (function () {
  var test = function (testcase, name) {
    var start = new Date().getTime();

    var pass = function () {
      var result = {
        id: testcase + "#" + name,
        description: testcase + "#" + name,
        suite: [],
        success: true,
        skipped: 0,
        time: new Date().getTime() - start,
        log: []
      };
      karma.result(result);
    };

    var fail = function () {
      var result = {
        id: testcase + "#" + name,
        description: testcase + "#" + name,
        suite: [],
        success: false,
        skipped: 0,
        time: new Date().getTime() - start,
        log: []
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
    karma.start();
  };

  return {
    test: test,
    done: done
  };
})();

var runtest = test.create(builtins, load, loadscript, reporter, reader);

var bomb = function () {
  console.log("bad");
  karma.start();
};

var loop = function () {
  if (tests.length > 0) {
    var testfile = tests.shift();
    accumulator.register(testfile, wrapper.sync, wrapper.async);
    loadscript(testfile, loop, bomb);
  } else
    accumulator.drain(runtest, reporter.done);
};

karma.info({total: tests.length})
loop();
})(Function('return this')());
