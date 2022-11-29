/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/ajv/lib/ajv.js":
/*!*************************************!*\
  !*** ./node_modules/ajv/lib/ajv.js ***!
  \*************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var compileSchema = __webpack_require__(/*! ./compile */ "./node_modules/ajv/lib/compile/index.js")
  , resolve = __webpack_require__(/*! ./compile/resolve */ "./node_modules/ajv/lib/compile/resolve.js")
  , Cache = __webpack_require__(/*! ./cache */ "./node_modules/ajv/lib/cache.js")
  , SchemaObject = __webpack_require__(/*! ./compile/schema_obj */ "./node_modules/ajv/lib/compile/schema_obj.js")
  , stableStringify = __webpack_require__(/*! fast-json-stable-stringify */ "./node_modules/fast-json-stable-stringify/index.js")
  , formats = __webpack_require__(/*! ./compile/formats */ "./node_modules/ajv/lib/compile/formats.js")
  , rules = __webpack_require__(/*! ./compile/rules */ "./node_modules/ajv/lib/compile/rules.js")
  , $dataMetaSchema = __webpack_require__(/*! ./data */ "./node_modules/ajv/lib/data.js")
  , util = __webpack_require__(/*! ./compile/util */ "./node_modules/ajv/lib/compile/util.js");

module.exports = Ajv;

Ajv.prototype.validate = validate;
Ajv.prototype.compile = compile;
Ajv.prototype.addSchema = addSchema;
Ajv.prototype.addMetaSchema = addMetaSchema;
Ajv.prototype.validateSchema = validateSchema;
Ajv.prototype.getSchema = getSchema;
Ajv.prototype.removeSchema = removeSchema;
Ajv.prototype.addFormat = addFormat;
Ajv.prototype.errorsText = errorsText;

Ajv.prototype._addSchema = _addSchema;
Ajv.prototype._compile = _compile;

Ajv.prototype.compileAsync = __webpack_require__(/*! ./compile/async */ "./node_modules/ajv/lib/compile/async.js");
var customKeyword = __webpack_require__(/*! ./keyword */ "./node_modules/ajv/lib/keyword.js");
Ajv.prototype.addKeyword = customKeyword.add;
Ajv.prototype.getKeyword = customKeyword.get;
Ajv.prototype.removeKeyword = customKeyword.remove;
Ajv.prototype.validateKeyword = customKeyword.validate;

var errorClasses = __webpack_require__(/*! ./compile/error_classes */ "./node_modules/ajv/lib/compile/error_classes.js");
Ajv.ValidationError = errorClasses.Validation;
Ajv.MissingRefError = errorClasses.MissingRef;
Ajv.$dataMetaSchema = $dataMetaSchema;

var META_SCHEMA_ID = 'http://json-schema.org/draft-07/schema';

var META_IGNORE_OPTIONS = [ 'removeAdditional', 'useDefaults', 'coerceTypes', 'strictDefaults' ];
var META_SUPPORT_DATA = ['/properties'];

/**
 * Creates validator instance.
 * Usage: `Ajv(opts)`
 * @param {Object} opts optional options
 * @return {Object} ajv instance
 */
function Ajv(opts) {
  if (!(this instanceof Ajv)) return new Ajv(opts);
  opts = this._opts = util.copy(opts) || {};
  setLogger(this);
  this._schemas = {};
  this._refs = {};
  this._fragments = {};
  this._formats = formats(opts.format);

  this._cache = opts.cache || new Cache;
  this._loadingSchemas = {};
  this._compilations = [];
  this.RULES = rules();
  this._getId = chooseGetId(opts);

  opts.loopRequired = opts.loopRequired || Infinity;
  if (opts.errorDataPath == 'property') opts._errorDataPathProperty = true;
  if (opts.serialize === undefined) opts.serialize = stableStringify;
  this._metaOpts = getMetaSchemaOptions(this);

  if (opts.formats) addInitialFormats(this);
  if (opts.keywords) addInitialKeywords(this);
  addDefaultMetaSchema(this);
  if (typeof opts.meta == 'object') this.addMetaSchema(opts.meta);
  if (opts.nullable) this.addKeyword('nullable', {metaSchema: {type: 'boolean'}});
  addInitialSchemas(this);
}



/**
 * Validate data using schema
 * Schema will be compiled and cached (using serialized JSON as key. [fast-json-stable-stringify](https://github.com/epoberezkin/fast-json-stable-stringify) is used to serialize.
 * @this   Ajv
 * @param  {String|Object} schemaKeyRef key, ref or schema object
 * @param  {Any} data to be validated
 * @return {Boolean} validation result. Errors from the last validation will be available in `ajv.errors` (and also in compiled schema: `schema.errors`).
 */
function validate(schemaKeyRef, data) {
  var v;
  if (typeof schemaKeyRef == 'string') {
    v = this.getSchema(schemaKeyRef);
    if (!v) throw new Error('no schema with key or ref "' + schemaKeyRef + '"');
  } else {
    var schemaObj = this._addSchema(schemaKeyRef);
    v = schemaObj.validate || this._compile(schemaObj);
  }

  var valid = v(data);
  if (v.$async !== true) this.errors = v.errors;
  return valid;
}


/**
 * Create validating function for passed schema.
 * @this   Ajv
 * @param  {Object} schema schema object
 * @param  {Boolean} _meta true if schema is a meta-schema. Used internally to compile meta schemas of custom keywords.
 * @return {Function} validating function
 */
function compile(schema, _meta) {
  var schemaObj = this._addSchema(schema, undefined, _meta);
  return schemaObj.validate || this._compile(schemaObj);
}


/**
 * Adds schema to the instance.
 * @this   Ajv
 * @param {Object|Array} schema schema or array of schemas. If array is passed, `key` and other parameters will be ignored.
 * @param {String} key Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
 * @param {Boolean} _skipValidation true to skip schema validation. Used internally, option validateSchema should be used instead.
 * @param {Boolean} _meta true if schema is a meta-schema. Used internally, addMetaSchema should be used instead.
 * @return {Ajv} this for method chaining
 */
function addSchema(schema, key, _skipValidation, _meta) {
  if (Array.isArray(schema)){
    for (var i=0; i<schema.length; i++) this.addSchema(schema[i], undefined, _skipValidation, _meta);
    return this;
  }
  var id = this._getId(schema);
  if (id !== undefined && typeof id != 'string')
    throw new Error('schema id must be string');
  key = resolve.normalizeId(key || id);
  checkUnique(this, key);
  this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true);
  return this;
}


/**
 * Add schema that will be used to validate other schemas
 * options in META_IGNORE_OPTIONS are alway set to false
 * @this   Ajv
 * @param {Object} schema schema object
 * @param {String} key optional schema key
 * @param {Boolean} skipValidation true to skip schema validation, can be used to override validateSchema option for meta-schema
 * @return {Ajv} this for method chaining
 */
function addMetaSchema(schema, key, skipValidation) {
  this.addSchema(schema, key, skipValidation, true);
  return this;
}


/**
 * Validate schema
 * @this   Ajv
 * @param {Object} schema schema to validate
 * @param {Boolean} throwOrLogError pass true to throw (or log) an error if invalid
 * @return {Boolean} true if schema is valid
 */
function validateSchema(schema, throwOrLogError) {
  var $schema = schema.$schema;
  if ($schema !== undefined && typeof $schema != 'string')
    throw new Error('$schema must be a string');
  $schema = $schema || this._opts.defaultMeta || defaultMeta(this);
  if (!$schema) {
    this.logger.warn('meta-schema not available');
    this.errors = null;
    return true;
  }
  var valid = this.validate($schema, schema);
  if (!valid && throwOrLogError) {
    var message = 'schema is invalid: ' + this.errorsText();
    if (this._opts.validateSchema == 'log') this.logger.error(message);
    else throw new Error(message);
  }
  return valid;
}


function defaultMeta(self) {
  var meta = self._opts.meta;
  self._opts.defaultMeta = typeof meta == 'object'
                            ? self._getId(meta) || meta
                            : self.getSchema(META_SCHEMA_ID)
                              ? META_SCHEMA_ID
                              : undefined;
  return self._opts.defaultMeta;
}


/**
 * Get compiled schema from the instance by `key` or `ref`.
 * @this   Ajv
 * @param  {String} keyRef `key` that was passed to `addSchema` or full schema reference (`schema.id` or resolved id).
 * @return {Function} schema validating function (with property `schema`).
 */
function getSchema(keyRef) {
  var schemaObj = _getSchemaObj(this, keyRef);
  switch (typeof schemaObj) {
    case 'object': return schemaObj.validate || this._compile(schemaObj);
    case 'string': return this.getSchema(schemaObj);
    case 'undefined': return _getSchemaFragment(this, keyRef);
  }
}


function _getSchemaFragment(self, ref) {
  var res = resolve.schema.call(self, { schema: {} }, ref);
  if (res) {
    var schema = res.schema
      , root = res.root
      , baseId = res.baseId;
    var v = compileSchema.call(self, schema, root, undefined, baseId);
    self._fragments[ref] = new SchemaObject({
      ref: ref,
      fragment: true,
      schema: schema,
      root: root,
      baseId: baseId,
      validate: v
    });
    return v;
  }
}


function _getSchemaObj(self, keyRef) {
  keyRef = resolve.normalizeId(keyRef);
  return self._schemas[keyRef] || self._refs[keyRef] || self._fragments[keyRef];
}


/**
 * Remove cached schema(s).
 * If no parameter is passed all schemas but meta-schemas are removed.
 * If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
 * Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
 * @this   Ajv
 * @param  {String|Object|RegExp} schemaKeyRef key, ref, pattern to match key/ref or schema object
 * @return {Ajv} this for method chaining
 */
function removeSchema(schemaKeyRef) {
  if (schemaKeyRef instanceof RegExp) {
    _removeAllSchemas(this, this._schemas, schemaKeyRef);
    _removeAllSchemas(this, this._refs, schemaKeyRef);
    return this;
  }
  switch (typeof schemaKeyRef) {
    case 'undefined':
      _removeAllSchemas(this, this._schemas);
      _removeAllSchemas(this, this._refs);
      this._cache.clear();
      return this;
    case 'string':
      var schemaObj = _getSchemaObj(this, schemaKeyRef);
      if (schemaObj) this._cache.del(schemaObj.cacheKey);
      delete this._schemas[schemaKeyRef];
      delete this._refs[schemaKeyRef];
      return this;
    case 'object':
      var serialize = this._opts.serialize;
      var cacheKey = serialize ? serialize(schemaKeyRef) : schemaKeyRef;
      this._cache.del(cacheKey);
      var id = this._getId(schemaKeyRef);
      if (id) {
        id = resolve.normalizeId(id);
        delete this._schemas[id];
        delete this._refs[id];
      }
  }
  return this;
}


function _removeAllSchemas(self, schemas, regex) {
  for (var keyRef in schemas) {
    var schemaObj = schemas[keyRef];
    if (!schemaObj.meta && (!regex || regex.test(keyRef))) {
      self._cache.del(schemaObj.cacheKey);
      delete schemas[keyRef];
    }
  }
}


/* @this   Ajv */
function _addSchema(schema, skipValidation, meta, shouldAddSchema) {
  if (typeof schema != 'object' && typeof schema != 'boolean')
    throw new Error('schema should be object or boolean');
  var serialize = this._opts.serialize;
  var cacheKey = serialize ? serialize(schema) : schema;
  var cached = this._cache.get(cacheKey);
  if (cached) return cached;

  shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false;

  var id = resolve.normalizeId(this._getId(schema));
  if (id && shouldAddSchema) checkUnique(this, id);

  var willValidate = this._opts.validateSchema !== false && !skipValidation;
  var recursiveMeta;
  if (willValidate && !(recursiveMeta = id && id == resolve.normalizeId(schema.$schema)))
    this.validateSchema(schema, true);

  var localRefs = resolve.ids.call(this, schema);

  var schemaObj = new SchemaObject({
    id: id,
    schema: schema,
    localRefs: localRefs,
    cacheKey: cacheKey,
    meta: meta
  });

  if (id[0] != '#' && shouldAddSchema) this._refs[id] = schemaObj;
  this._cache.put(cacheKey, schemaObj);

  if (willValidate && recursiveMeta) this.validateSchema(schema, true);

  return schemaObj;
}


/* @this   Ajv */
function _compile(schemaObj, root) {
  if (schemaObj.compiling) {
    schemaObj.validate = callValidate;
    callValidate.schema = schemaObj.schema;
    callValidate.errors = null;
    callValidate.root = root ? root : callValidate;
    if (schemaObj.schema.$async === true)
      callValidate.$async = true;
    return callValidate;
  }
  schemaObj.compiling = true;

  var currentOpts;
  if (schemaObj.meta) {
    currentOpts = this._opts;
    this._opts = this._metaOpts;
  }

  var v;
  try { v = compileSchema.call(this, schemaObj.schema, root, schemaObj.localRefs); }
  catch(e) {
    delete schemaObj.validate;
    throw e;
  }
  finally {
    schemaObj.compiling = false;
    if (schemaObj.meta) this._opts = currentOpts;
  }

  schemaObj.validate = v;
  schemaObj.refs = v.refs;
  schemaObj.refVal = v.refVal;
  schemaObj.root = v.root;
  return v;


  /* @this   {*} - custom context, see passContext option */
  function callValidate() {
    /* jshint validthis: true */
    var _validate = schemaObj.validate;
    var result = _validate.apply(this, arguments);
    callValidate.errors = _validate.errors;
    return result;
  }
}


function chooseGetId(opts) {
  switch (opts.schemaId) {
    case 'auto': return _get$IdOrId;
    case 'id': return _getId;
    default: return _get$Id;
  }
}

/* @this   Ajv */
function _getId(schema) {
  if (schema.$id) this.logger.warn('schema $id ignored', schema.$id);
  return schema.id;
}

/* @this   Ajv */
function _get$Id(schema) {
  if (schema.id) this.logger.warn('schema id ignored', schema.id);
  return schema.$id;
}


function _get$IdOrId(schema) {
  if (schema.$id && schema.id && schema.$id != schema.id)
    throw new Error('schema $id is different from id');
  return schema.$id || schema.id;
}


/**
 * Convert array of error message objects to string
 * @this   Ajv
 * @param  {Array<Object>} errors optional array of validation errors, if not passed errors from the instance are used.
 * @param  {Object} options optional options with properties `separator` and `dataVar`.
 * @return {String} human readable string with all errors descriptions
 */
function errorsText(errors, options) {
  errors = errors || this.errors;
  if (!errors) return 'No errors';
  options = options || {};
  var separator = options.separator === undefined ? ', ' : options.separator;
  var dataVar = options.dataVar === undefined ? 'data' : options.dataVar;

  var text = '';
  for (var i=0; i<errors.length; i++) {
    var e = errors[i];
    if (e) text += dataVar + e.dataPath + ' ' + e.message + separator;
  }
  return text.slice(0, -separator.length);
}


/**
 * Add custom format
 * @this   Ajv
 * @param {String} name format name
 * @param {String|RegExp|Function} format string is converted to RegExp; function should return boolean (true when valid)
 * @return {Ajv} this for method chaining
 */
function addFormat(name, format) {
  if (typeof format == 'string') format = new RegExp(format);
  this._formats[name] = format;
  return this;
}


function addDefaultMetaSchema(self) {
  var $dataSchema;
  if (self._opts.$data) {
    $dataSchema = __webpack_require__(/*! ./refs/data.json */ "./node_modules/ajv/lib/refs/data.json");
    self.addMetaSchema($dataSchema, $dataSchema.$id, true);
  }
  if (self._opts.meta === false) return;
  var metaSchema = __webpack_require__(/*! ./refs/json-schema-draft-07.json */ "./node_modules/ajv/lib/refs/json-schema-draft-07.json");
  if (self._opts.$data) metaSchema = $dataMetaSchema(metaSchema, META_SUPPORT_DATA);
  self.addMetaSchema(metaSchema, META_SCHEMA_ID, true);
  self._refs['http://json-schema.org/schema'] = META_SCHEMA_ID;
}


function addInitialSchemas(self) {
  var optsSchemas = self._opts.schemas;
  if (!optsSchemas) return;
  if (Array.isArray(optsSchemas)) self.addSchema(optsSchemas);
  else for (var key in optsSchemas) self.addSchema(optsSchemas[key], key);
}


function addInitialFormats(self) {
  for (var name in self._opts.formats) {
    var format = self._opts.formats[name];
    self.addFormat(name, format);
  }
}


function addInitialKeywords(self) {
  for (var name in self._opts.keywords) {
    var keyword = self._opts.keywords[name];
    self.addKeyword(name, keyword);
  }
}


function checkUnique(self, id) {
  if (self._schemas[id] || self._refs[id])
    throw new Error('schema with key or id "' + id + '" already exists');
}


function getMetaSchemaOptions(self) {
  var metaOpts = util.copy(self._opts);
  for (var i=0; i<META_IGNORE_OPTIONS.length; i++)
    delete metaOpts[META_IGNORE_OPTIONS[i]];
  return metaOpts;
}


function setLogger(self) {
  var logger = self._opts.logger;
  if (logger === false) {
    self.logger = {log: noop, warn: noop, error: noop};
  } else {
    if (logger === undefined) logger = console;
    if (!(typeof logger == 'object' && logger.log && logger.warn && logger.error))
      throw new Error('logger must implement log, warn and error methods');
    self.logger = logger;
  }
}


function noop() {}


/***/ }),

/***/ "./node_modules/ajv/lib/cache.js":
/*!***************************************!*\
  !*** ./node_modules/ajv/lib/cache.js ***!
  \***************************************/
/***/ ((module) => {

"use strict";



var Cache = module.exports = function Cache() {
  this._cache = {};
};


Cache.prototype.put = function Cache_put(key, value) {
  this._cache[key] = value;
};


Cache.prototype.get = function Cache_get(key) {
  return this._cache[key];
};


Cache.prototype.del = function Cache_del(key) {
  delete this._cache[key];
};


Cache.prototype.clear = function Cache_clear() {
  this._cache = {};
};


/***/ }),

/***/ "./node_modules/ajv/lib/compile/async.js":
/*!***********************************************!*\
  !*** ./node_modules/ajv/lib/compile/async.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var MissingRefError = (__webpack_require__(/*! ./error_classes */ "./node_modules/ajv/lib/compile/error_classes.js").MissingRef);

module.exports = compileAsync;


/**
 * Creates validating function for passed schema with asynchronous loading of missing schemas.
 * `loadSchema` option should be a function that accepts schema uri and returns promise that resolves with the schema.
 * @this  Ajv
 * @param {Object}   schema schema object
 * @param {Boolean}  meta optional true to compile meta-schema; this parameter can be skipped
 * @param {Function} callback an optional node-style callback, it is called with 2 parameters: error (or null) and validating function.
 * @return {Promise} promise that resolves with a validating function.
 */
function compileAsync(schema, meta, callback) {
  /* eslint no-shadow: 0 */
  /* global Promise */
  /* jshint validthis: true */
  var self = this;
  if (typeof this._opts.loadSchema != 'function')
    throw new Error('options.loadSchema should be a function');

  if (typeof meta == 'function') {
    callback = meta;
    meta = undefined;
  }

  var p = loadMetaSchemaOf(schema).then(function () {
    var schemaObj = self._addSchema(schema, undefined, meta);
    return schemaObj.validate || _compileAsync(schemaObj);
  });

  if (callback) {
    p.then(
      function(v) { callback(null, v); },
      callback
    );
  }

  return p;


  function loadMetaSchemaOf(sch) {
    var $schema = sch.$schema;
    return $schema && !self.getSchema($schema)
            ? compileAsync.call(self, { $ref: $schema }, true)
            : Promise.resolve();
  }


  function _compileAsync(schemaObj) {
    try { return self._compile(schemaObj); }
    catch(e) {
      if (e instanceof MissingRefError) return loadMissingSchema(e);
      throw e;
    }


    function loadMissingSchema(e) {
      var ref = e.missingSchema;
      if (added(ref)) throw new Error('Schema ' + ref + ' is loaded but ' + e.missingRef + ' cannot be resolved');

      var schemaPromise = self._loadingSchemas[ref];
      if (!schemaPromise) {
        schemaPromise = self._loadingSchemas[ref] = self._opts.loadSchema(ref);
        schemaPromise.then(removePromise, removePromise);
      }

      return schemaPromise.then(function (sch) {
        if (!added(ref)) {
          return loadMetaSchemaOf(sch).then(function () {
            if (!added(ref)) self.addSchema(sch, ref, undefined, meta);
          });
        }
      }).then(function() {
        return _compileAsync(schemaObj);
      });

      function removePromise() {
        delete self._loadingSchemas[ref];
      }

      function added(ref) {
        return self._refs[ref] || self._schemas[ref];
      }
    }
  }
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/error_classes.js":
/*!*******************************************************!*\
  !*** ./node_modules/ajv/lib/compile/error_classes.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var resolve = __webpack_require__(/*! ./resolve */ "./node_modules/ajv/lib/compile/resolve.js");

module.exports = {
  Validation: errorSubclass(ValidationError),
  MissingRef: errorSubclass(MissingRefError)
};


function ValidationError(errors) {
  this.message = 'validation failed';
  this.errors = errors;
  this.ajv = this.validation = true;
}


MissingRefError.message = function (baseId, ref) {
  return 'can\'t resolve reference ' + ref + ' from id ' + baseId;
};


function MissingRefError(baseId, ref, message) {
  this.message = message || MissingRefError.message(baseId, ref);
  this.missingRef = resolve.url(baseId, ref);
  this.missingSchema = resolve.normalizeId(resolve.fullPath(this.missingRef));
}


function errorSubclass(Subclass) {
  Subclass.prototype = Object.create(Error.prototype);
  Subclass.prototype.constructor = Subclass;
  return Subclass;
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/formats.js":
/*!*************************************************!*\
  !*** ./node_modules/ajv/lib/compile/formats.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var util = __webpack_require__(/*! ./util */ "./node_modules/ajv/lib/compile/util.js");

var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0,31,28,31,30,31,30,31,31,30,31,30,31];
var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
// uri-template: https://tools.ietf.org/html/rfc6570
var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
// For the source: https://gist.github.com/dperini/729294
// For test cases: https://mathiasbynens.be/demo/url-regex
// @todo Delete current URL in favour of the commented out URL rule when this issue is fixed https://github.com/eslint/eslint/issues/7983.
// var URL = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
var URL = /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i;
var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;


module.exports = formats;

function formats(mode) {
  mode = mode == 'full' ? 'full' : 'fast';
  return util.copy(formats[mode]);
}


formats.fast = {
  // date: http://tools.ietf.org/html/rfc3339#section-5.6
  date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
  // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
  time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
  'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
  // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
  uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
  'uri-reference': /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
  'uri-template': URITEMPLATE,
  url: URL,
  // email (sources from jsen validator):
  // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
  // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
  email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  hostname: HOSTNAME,
  // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex,
  // uuid: http://tools.ietf.org/html/rfc4122
  uuid: UUID,
  // JSON-pointer: https://tools.ietf.org/html/rfc6901
  // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
  'json-pointer': JSON_POINTER,
  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
  // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
  'relative-json-pointer': RELATIVE_JSON_POINTER
};


formats.full = {
  date: date,
  time: time,
  'date-time': date_time,
  uri: uri,
  'uri-reference': URIREF,
  'uri-template': URITEMPLATE,
  url: URL,
  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
  hostname: HOSTNAME,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex: regex,
  uuid: UUID,
  'json-pointer': JSON_POINTER,
  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
  'relative-json-pointer': RELATIVE_JSON_POINTER
};


function isLeapYear(year) {
  // https://tools.ietf.org/html/rfc3339#appendix-C
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}


function date(str) {
  // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
  var matches = str.match(DATE);
  if (!matches) return false;

  var year = +matches[1];
  var month = +matches[2];
  var day = +matches[3];

  return month >= 1 && month <= 12 && day >= 1 &&
          day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}


function time(str, full) {
  var matches = str.match(TIME);
  if (!matches) return false;

  var hour = matches[1];
  var minute = matches[2];
  var second = matches[3];
  var timeZone = matches[5];
  return ((hour <= 23 && minute <= 59 && second <= 59) ||
          (hour == 23 && minute == 59 && second == 60)) &&
         (!full || timeZone);
}


var DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
  // http://tools.ietf.org/html/rfc3339#section-5.6
  var dateTime = str.split(DATE_TIME_SEPARATOR);
  return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true);
}


var NOT_URI_FRAGMENT = /\/|:/;
function uri(str) {
  // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}


var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str)) return false;
  try {
    new RegExp(str);
    return true;
  } catch(e) {
    return false;
  }
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/index.js":
/*!***********************************************!*\
  !*** ./node_modules/ajv/lib/compile/index.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var resolve = __webpack_require__(/*! ./resolve */ "./node_modules/ajv/lib/compile/resolve.js")
  , util = __webpack_require__(/*! ./util */ "./node_modules/ajv/lib/compile/util.js")
  , errorClasses = __webpack_require__(/*! ./error_classes */ "./node_modules/ajv/lib/compile/error_classes.js")
  , stableStringify = __webpack_require__(/*! fast-json-stable-stringify */ "./node_modules/fast-json-stable-stringify/index.js");

var validateGenerator = __webpack_require__(/*! ../dotjs/validate */ "./node_modules/ajv/lib/dotjs/validate.js");

/**
 * Functions below are used inside compiled validations function
 */

var ucs2length = util.ucs2length;
var equal = __webpack_require__(/*! fast-deep-equal */ "./node_modules/fast-deep-equal/index.js");

// this error is thrown by async schemas to return validation errors via exception
var ValidationError = errorClasses.Validation;

module.exports = compile;


/**
 * Compiles schema to validation function
 * @this   Ajv
 * @param  {Object} schema schema object
 * @param  {Object} root object with information about the root schema for this schema
 * @param  {Object} localRefs the hash of local references inside the schema (created by resolve.id), used for inline resolution
 * @param  {String} baseId base ID for IDs in the schema
 * @return {Function} validation function
 */
function compile(schema, root, localRefs, baseId) {
  /* jshint validthis: true, evil: true */
  /* eslint no-shadow: 0 */
  var self = this
    , opts = this._opts
    , refVal = [ undefined ]
    , refs = {}
    , patterns = []
    , patternsHash = {}
    , defaults = []
    , defaultsHash = {}
    , customRules = [];

  root = root || { schema: schema, refVal: refVal, refs: refs };

  var c = checkCompiling.call(this, schema, root, baseId);
  var compilation = this._compilations[c.index];
  if (c.compiling) return (compilation.callValidate = callValidate);

  var formats = this._formats;
  var RULES = this.RULES;

  try {
    var v = localCompile(schema, root, localRefs, baseId);
    compilation.validate = v;
    var cv = compilation.callValidate;
    if (cv) {
      cv.schema = v.schema;
      cv.errors = null;
      cv.refs = v.refs;
      cv.refVal = v.refVal;
      cv.root = v.root;
      cv.$async = v.$async;
      if (opts.sourceCode) cv.source = v.source;
    }
    return v;
  } finally {
    endCompiling.call(this, schema, root, baseId);
  }

  /* @this   {*} - custom context, see passContext option */
  function callValidate() {
    /* jshint validthis: true */
    var validate = compilation.validate;
    var result = validate.apply(this, arguments);
    callValidate.errors = validate.errors;
    return result;
  }

  function localCompile(_schema, _root, localRefs, baseId) {
    var isRoot = !_root || (_root && _root.schema == _schema);
    if (_root.schema != root.schema)
      return compile.call(self, _schema, _root, localRefs, baseId);

    var $async = _schema.$async === true;

    var sourceCode = validateGenerator({
      isTop: true,
      schema: _schema,
      isRoot: isRoot,
      baseId: baseId,
      root: _root,
      schemaPath: '',
      errSchemaPath: '#',
      errorPath: '""',
      MissingRefError: errorClasses.MissingRef,
      RULES: RULES,
      validate: validateGenerator,
      util: util,
      resolve: resolve,
      resolveRef: resolveRef,
      usePattern: usePattern,
      useDefault: useDefault,
      useCustomRule: useCustomRule,
      opts: opts,
      formats: formats,
      logger: self.logger,
      self: self
    });

    sourceCode = vars(refVal, refValCode) + vars(patterns, patternCode)
                   + vars(defaults, defaultCode) + vars(customRules, customRuleCode)
                   + sourceCode;

    if (opts.processCode) sourceCode = opts.processCode(sourceCode, _schema);
    // console.log('\n\n\n *** \n', JSON.stringify(sourceCode));
    var validate;
    try {
      var makeValidate = new Function(
        'self',
        'RULES',
        'formats',
        'root',
        'refVal',
        'defaults',
        'customRules',
        'equal',
        'ucs2length',
        'ValidationError',
        sourceCode
      );

      validate = makeValidate(
        self,
        RULES,
        formats,
        root,
        refVal,
        defaults,
        customRules,
        equal,
        ucs2length,
        ValidationError
      );

      refVal[0] = validate;
    } catch(e) {
      self.logger.error('Error compiling schema, function code:', sourceCode);
      throw e;
    }

    validate.schema = _schema;
    validate.errors = null;
    validate.refs = refs;
    validate.refVal = refVal;
    validate.root = isRoot ? validate : _root;
    if ($async) validate.$async = true;
    if (opts.sourceCode === true) {
      validate.source = {
        code: sourceCode,
        patterns: patterns,
        defaults: defaults
      };
    }

    return validate;
  }

  function resolveRef(baseId, ref, isRoot) {
    ref = resolve.url(baseId, ref);
    var refIndex = refs[ref];
    var _refVal, refCode;
    if (refIndex !== undefined) {
      _refVal = refVal[refIndex];
      refCode = 'refVal[' + refIndex + ']';
      return resolvedRef(_refVal, refCode);
    }
    if (!isRoot && root.refs) {
      var rootRefId = root.refs[ref];
      if (rootRefId !== undefined) {
        _refVal = root.refVal[rootRefId];
        refCode = addLocalRef(ref, _refVal);
        return resolvedRef(_refVal, refCode);
      }
    }

    refCode = addLocalRef(ref);
    var v = resolve.call(self, localCompile, root, ref);
    if (v === undefined) {
      var localSchema = localRefs && localRefs[ref];
      if (localSchema) {
        v = resolve.inlineRef(localSchema, opts.inlineRefs)
            ? localSchema
            : compile.call(self, localSchema, root, localRefs, baseId);
      }
    }

    if (v === undefined) {
      removeLocalRef(ref);
    } else {
      replaceLocalRef(ref, v);
      return resolvedRef(v, refCode);
    }
  }

  function addLocalRef(ref, v) {
    var refId = refVal.length;
    refVal[refId] = v;
    refs[ref] = refId;
    return 'refVal' + refId;
  }

  function removeLocalRef(ref) {
    delete refs[ref];
  }

  function replaceLocalRef(ref, v) {
    var refId = refs[ref];
    refVal[refId] = v;
  }

  function resolvedRef(refVal, code) {
    return typeof refVal == 'object' || typeof refVal == 'boolean'
            ? { code: code, schema: refVal, inline: true }
            : { code: code, $async: refVal && !!refVal.$async };
  }

  function usePattern(regexStr) {
    var index = patternsHash[regexStr];
    if (index === undefined) {
      index = patternsHash[regexStr] = patterns.length;
      patterns[index] = regexStr;
    }
    return 'pattern' + index;
  }

  function useDefault(value) {
    switch (typeof value) {
      case 'boolean':
      case 'number':
        return '' + value;
      case 'string':
        return util.toQuotedString(value);
      case 'object':
        if (value === null) return 'null';
        var valueStr = stableStringify(value);
        var index = defaultsHash[valueStr];
        if (index === undefined) {
          index = defaultsHash[valueStr] = defaults.length;
          defaults[index] = value;
        }
        return 'default' + index;
    }
  }

  function useCustomRule(rule, schema, parentSchema, it) {
    if (self._opts.validateSchema !== false) {
      var deps = rule.definition.dependencies;
      if (deps && !deps.every(function(keyword) {
        return Object.prototype.hasOwnProperty.call(parentSchema, keyword);
      }))
        throw new Error('parent schema must have all required keywords: ' + deps.join(','));

      var validateSchema = rule.definition.validateSchema;
      if (validateSchema) {
        var valid = validateSchema(schema);
        if (!valid) {
          var message = 'keyword schema is invalid: ' + self.errorsText(validateSchema.errors);
          if (self._opts.validateSchema == 'log') self.logger.error(message);
          else throw new Error(message);
        }
      }
    }

    var compile = rule.definition.compile
      , inline = rule.definition.inline
      , macro = rule.definition.macro;

    var validate;
    if (compile) {
      validate = compile.call(self, schema, parentSchema, it);
    } else if (macro) {
      validate = macro.call(self, schema, parentSchema, it);
      if (opts.validateSchema !== false) self.validateSchema(validate, true);
    } else if (inline) {
      validate = inline.call(self, it, rule.keyword, schema, parentSchema);
    } else {
      validate = rule.definition.validate;
      if (!validate) return;
    }

    if (validate === undefined)
      throw new Error('custom keyword "' + rule.keyword + '"failed to compile');

    var index = customRules.length;
    customRules[index] = validate;

    return {
      code: 'customRule' + index,
      validate: validate
    };
  }
}


/**
 * Checks if the schema is currently compiled
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 * @return {Object} object with properties "index" (compilation index) and "compiling" (boolean)
 */
function checkCompiling(schema, root, baseId) {
  /* jshint validthis: true */
  var index = compIndex.call(this, schema, root, baseId);
  if (index >= 0) return { index: index, compiling: true };
  index = this._compilations.length;
  this._compilations[index] = {
    schema: schema,
    root: root,
    baseId: baseId
  };
  return { index: index, compiling: false };
}


/**
 * Removes the schema from the currently compiled list
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 */
function endCompiling(schema, root, baseId) {
  /* jshint validthis: true */
  var i = compIndex.call(this, schema, root, baseId);
  if (i >= 0) this._compilations.splice(i, 1);
}


/**
 * Index of schema compilation in the currently compiled list
 * @this   Ajv
 * @param  {Object} schema schema to compile
 * @param  {Object} root root object
 * @param  {String} baseId base schema ID
 * @return {Integer} compilation index
 */
function compIndex(schema, root, baseId) {
  /* jshint validthis: true */
  for (var i=0; i<this._compilations.length; i++) {
    var c = this._compilations[i];
    if (c.schema == schema && c.root == root && c.baseId == baseId) return i;
  }
  return -1;
}


function patternCode(i, patterns) {
  return 'var pattern' + i + ' = new RegExp(' + util.toQuotedString(patterns[i]) + ');';
}


function defaultCode(i) {
  return 'var default' + i + ' = defaults[' + i + '];';
}


function refValCode(i, refVal) {
  return refVal[i] === undefined ? '' : 'var refVal' + i + ' = refVal[' + i + '];';
}


function customRuleCode(i) {
  return 'var customRule' + i + ' = customRules[' + i + '];';
}


function vars(arr, statement) {
  if (!arr.length) return '';
  var code = '';
  for (var i=0; i<arr.length; i++)
    code += statement(i, arr);
  return code;
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/resolve.js":
/*!*************************************************!*\
  !*** ./node_modules/ajv/lib/compile/resolve.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var URI = __webpack_require__(/*! uri-js */ "./node_modules/uri-js/dist/es5/uri.all.js")
  , equal = __webpack_require__(/*! fast-deep-equal */ "./node_modules/fast-deep-equal/index.js")
  , util = __webpack_require__(/*! ./util */ "./node_modules/ajv/lib/compile/util.js")
  , SchemaObject = __webpack_require__(/*! ./schema_obj */ "./node_modules/ajv/lib/compile/schema_obj.js")
  , traverse = __webpack_require__(/*! json-schema-traverse */ "./node_modules/json-schema-traverse/index.js");

module.exports = resolve;

resolve.normalizeId = normalizeId;
resolve.fullPath = getFullPath;
resolve.url = resolveUrl;
resolve.ids = resolveIds;
resolve.inlineRef = inlineRef;
resolve.schema = resolveSchema;

/**
 * [resolve and compile the references ($ref)]
 * @this   Ajv
 * @param  {Function} compile reference to schema compilation funciton (localCompile)
 * @param  {Object} root object with information about the root schema for the current schema
 * @param  {String} ref reference to resolve
 * @return {Object|Function} schema object (if the schema can be inlined) or validation function
 */
function resolve(compile, root, ref) {
  /* jshint validthis: true */
  var refVal = this._refs[ref];
  if (typeof refVal == 'string') {
    if (this._refs[refVal]) refVal = this._refs[refVal];
    else return resolve.call(this, compile, root, refVal);
  }

  refVal = refVal || this._schemas[ref];
  if (refVal instanceof SchemaObject) {
    return inlineRef(refVal.schema, this._opts.inlineRefs)
            ? refVal.schema
            : refVal.validate || this._compile(refVal);
  }

  var res = resolveSchema.call(this, root, ref);
  var schema, v, baseId;
  if (res) {
    schema = res.schema;
    root = res.root;
    baseId = res.baseId;
  }

  if (schema instanceof SchemaObject) {
    v = schema.validate || compile.call(this, schema.schema, root, undefined, baseId);
  } else if (schema !== undefined) {
    v = inlineRef(schema, this._opts.inlineRefs)
        ? schema
        : compile.call(this, schema, root, undefined, baseId);
  }

  return v;
}


/**
 * Resolve schema, its root and baseId
 * @this Ajv
 * @param  {Object} root root object with properties schema, refVal, refs
 * @param  {String} ref  reference to resolve
 * @return {Object} object with properties schema, root, baseId
 */
function resolveSchema(root, ref) {
  /* jshint validthis: true */
  var p = URI.parse(ref)
    , refPath = _getFullPath(p)
    , baseId = getFullPath(this._getId(root.schema));
  if (Object.keys(root.schema).length === 0 || refPath !== baseId) {
    var id = normalizeId(refPath);
    var refVal = this._refs[id];
    if (typeof refVal == 'string') {
      return resolveRecursive.call(this, root, refVal, p);
    } else if (refVal instanceof SchemaObject) {
      if (!refVal.validate) this._compile(refVal);
      root = refVal;
    } else {
      refVal = this._schemas[id];
      if (refVal instanceof SchemaObject) {
        if (!refVal.validate) this._compile(refVal);
        if (id == normalizeId(ref))
          return { schema: refVal, root: root, baseId: baseId };
        root = refVal;
      } else {
        return;
      }
    }
    if (!root.schema) return;
    baseId = getFullPath(this._getId(root.schema));
  }
  return getJsonPointer.call(this, p, baseId, root.schema, root);
}


/* @this Ajv */
function resolveRecursive(root, ref, parsedRef) {
  /* jshint validthis: true */
  var res = resolveSchema.call(this, root, ref);
  if (res) {
    var schema = res.schema;
    var baseId = res.baseId;
    root = res.root;
    var id = this._getId(schema);
    if (id) baseId = resolveUrl(baseId, id);
    return getJsonPointer.call(this, parsedRef, baseId, schema, root);
  }
}


var PREVENT_SCOPE_CHANGE = util.toHash(['properties', 'patternProperties', 'enum', 'dependencies', 'definitions']);
/* @this Ajv */
function getJsonPointer(parsedRef, baseId, schema, root) {
  /* jshint validthis: true */
  parsedRef.fragment = parsedRef.fragment || '';
  if (parsedRef.fragment.slice(0,1) != '/') return;
  var parts = parsedRef.fragment.split('/');

  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    if (part) {
      part = util.unescapeFragment(part);
      schema = schema[part];
      if (schema === undefined) break;
      var id;
      if (!PREVENT_SCOPE_CHANGE[part]) {
        id = this._getId(schema);
        if (id) baseId = resolveUrl(baseId, id);
        if (schema.$ref) {
          var $ref = resolveUrl(baseId, schema.$ref);
          var res = resolveSchema.call(this, root, $ref);
          if (res) {
            schema = res.schema;
            root = res.root;
            baseId = res.baseId;
          }
        }
      }
    }
  }
  if (schema !== undefined && schema !== root.schema)
    return { schema: schema, root: root, baseId: baseId };
}


var SIMPLE_INLINED = util.toHash([
  'type', 'format', 'pattern',
  'maxLength', 'minLength',
  'maxProperties', 'minProperties',
  'maxItems', 'minItems',
  'maximum', 'minimum',
  'uniqueItems', 'multipleOf',
  'required', 'enum'
]);
function inlineRef(schema, limit) {
  if (limit === false) return false;
  if (limit === undefined || limit === true) return checkNoRef(schema);
  else if (limit) return countKeys(schema) <= limit;
}


function checkNoRef(schema) {
  var item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object' && !checkNoRef(item)) return false;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return false;
      item = schema[key];
      if (typeof item == 'object' && !checkNoRef(item)) return false;
    }
  }
  return true;
}


function countKeys(schema) {
  var count = 0, item;
  if (Array.isArray(schema)) {
    for (var i=0; i<schema.length; i++) {
      item = schema[i];
      if (typeof item == 'object') count += countKeys(item);
      if (count == Infinity) return Infinity;
    }
  } else {
    for (var key in schema) {
      if (key == '$ref') return Infinity;
      if (SIMPLE_INLINED[key]) {
        count++;
      } else {
        item = schema[key];
        if (typeof item == 'object') count += countKeys(item) + 1;
        if (count == Infinity) return Infinity;
      }
    }
  }
  return count;
}


function getFullPath(id, normalize) {
  if (normalize !== false) id = normalizeId(id);
  var p = URI.parse(id);
  return _getFullPath(p);
}


function _getFullPath(p) {
  return URI.serialize(p).split('#')[0] + '#';
}


var TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id) {
  return id ? id.replace(TRAILING_SLASH_HASH, '') : '';
}


function resolveUrl(baseId, id) {
  id = normalizeId(id);
  return URI.resolve(baseId, id);
}


/* @this Ajv */
function resolveIds(schema) {
  var schemaId = normalizeId(this._getId(schema));
  var baseIds = {'': schemaId};
  var fullPaths = {'': getFullPath(schemaId, false)};
  var localRefs = {};
  var self = this;

  traverse(schema, {allKeys: true}, function(sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (jsonPtr === '') return;
    var id = self._getId(sch);
    var baseId = baseIds[parentJsonPtr];
    var fullPath = fullPaths[parentJsonPtr] + '/' + parentKeyword;
    if (keyIndex !== undefined)
      fullPath += '/' + (typeof keyIndex == 'number' ? keyIndex : util.escapeFragment(keyIndex));

    if (typeof id == 'string') {
      id = baseId = normalizeId(baseId ? URI.resolve(baseId, id) : id);

      var refVal = self._refs[id];
      if (typeof refVal == 'string') refVal = self._refs[refVal];
      if (refVal && refVal.schema) {
        if (!equal(sch, refVal.schema))
          throw new Error('id "' + id + '" resolves to more than one schema');
      } else if (id != normalizeId(fullPath)) {
        if (id[0] == '#') {
          if (localRefs[id] && !equal(sch, localRefs[id]))
            throw new Error('id "' + id + '" resolves to more than one schema');
          localRefs[id] = sch;
        } else {
          self._refs[id] = fullPath;
        }
      }
    }
    baseIds[jsonPtr] = baseId;
    fullPaths[jsonPtr] = fullPath;
  });

  return localRefs;
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/rules.js":
/*!***********************************************!*\
  !*** ./node_modules/ajv/lib/compile/rules.js ***!
  \***********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var ruleModules = __webpack_require__(/*! ../dotjs */ "./node_modules/ajv/lib/dotjs/index.js")
  , toHash = (__webpack_require__(/*! ./util */ "./node_modules/ajv/lib/compile/util.js").toHash);

module.exports = function rules() {
  var RULES = [
    { type: 'number',
      rules: [ { 'maximum': ['exclusiveMaximum'] },
               { 'minimum': ['exclusiveMinimum'] }, 'multipleOf', 'format'] },
    { type: 'string',
      rules: [ 'maxLength', 'minLength', 'pattern', 'format' ] },
    { type: 'array',
      rules: [ 'maxItems', 'minItems', 'items', 'contains', 'uniqueItems' ] },
    { type: 'object',
      rules: [ 'maxProperties', 'minProperties', 'required', 'dependencies', 'propertyNames',
               { 'properties': ['additionalProperties', 'patternProperties'] } ] },
    { rules: [ '$ref', 'const', 'enum', 'not', 'anyOf', 'oneOf', 'allOf', 'if' ] }
  ];

  var ALL = [ 'type', '$comment' ];
  var KEYWORDS = [
    '$schema', '$id', 'id', '$data', '$async', 'title',
    'description', 'default', 'definitions',
    'examples', 'readOnly', 'writeOnly',
    'contentMediaType', 'contentEncoding',
    'additionalItems', 'then', 'else'
  ];
  var TYPES = [ 'number', 'integer', 'string', 'array', 'object', 'boolean', 'null' ];
  RULES.all = toHash(ALL);
  RULES.types = toHash(TYPES);

  RULES.forEach(function (group) {
    group.rules = group.rules.map(function (keyword) {
      var implKeywords;
      if (typeof keyword == 'object') {
        var key = Object.keys(keyword)[0];
        implKeywords = keyword[key];
        keyword = key;
        implKeywords.forEach(function (k) {
          ALL.push(k);
          RULES.all[k] = true;
        });
      }
      ALL.push(keyword);
      var rule = RULES.all[keyword] = {
        keyword: keyword,
        code: ruleModules[keyword],
        implements: implKeywords
      };
      return rule;
    });

    RULES.all.$comment = {
      keyword: '$comment',
      code: ruleModules.$comment
    };

    if (group.type) RULES.types[group.type] = group;
  });

  RULES.keywords = toHash(ALL.concat(KEYWORDS));
  RULES.custom = {};

  return RULES;
};


/***/ }),

/***/ "./node_modules/ajv/lib/compile/schema_obj.js":
/*!****************************************************!*\
  !*** ./node_modules/ajv/lib/compile/schema_obj.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var util = __webpack_require__(/*! ./util */ "./node_modules/ajv/lib/compile/util.js");

module.exports = SchemaObject;

function SchemaObject(obj) {
  util.copy(obj, this);
}


/***/ }),

/***/ "./node_modules/ajv/lib/compile/ucs2length.js":
/*!****************************************************!*\
  !*** ./node_modules/ajv/lib/compile/ucs2length.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";


// https://mathiasbynens.be/notes/javascript-encoding
// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
module.exports = function ucs2length(str) {
  var length = 0
    , len = str.length
    , pos = 0
    , value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
      // high surrogate, and there is a next character
      value = str.charCodeAt(pos);
      if ((value & 0xFC00) == 0xDC00) pos++; // low surrogate
    }
  }
  return length;
};


/***/ }),

/***/ "./node_modules/ajv/lib/compile/util.js":
/*!**********************************************!*\
  !*** ./node_modules/ajv/lib/compile/util.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";



module.exports = {
  copy: copy,
  checkDataType: checkDataType,
  checkDataTypes: checkDataTypes,
  coerceToTypes: coerceToTypes,
  toHash: toHash,
  getProperty: getProperty,
  escapeQuotes: escapeQuotes,
  equal: __webpack_require__(/*! fast-deep-equal */ "./node_modules/fast-deep-equal/index.js"),
  ucs2length: __webpack_require__(/*! ./ucs2length */ "./node_modules/ajv/lib/compile/ucs2length.js"),
  varOccurences: varOccurences,
  varReplace: varReplace,
  schemaHasRules: schemaHasRules,
  schemaHasRulesExcept: schemaHasRulesExcept,
  schemaUnknownRules: schemaUnknownRules,
  toQuotedString: toQuotedString,
  getPathExpr: getPathExpr,
  getPath: getPath,
  getData: getData,
  unescapeFragment: unescapeFragment,
  unescapeJsonPointer: unescapeJsonPointer,
  escapeFragment: escapeFragment,
  escapeJsonPointer: escapeJsonPointer
};


function copy(o, to) {
  to = to || {};
  for (var key in o) to[key] = o[key];
  return to;
}


function checkDataType(dataType, data, strictNumbers, negate) {
  var EQUAL = negate ? ' !== ' : ' === '
    , AND = negate ? ' || ' : ' && '
    , OK = negate ? '!' : ''
    , NOT = negate ? '' : '!';
  switch (dataType) {
    case 'null': return data + EQUAL + 'null';
    case 'array': return OK + 'Array.isArray(' + data + ')';
    case 'object': return '(' + OK + data + AND +
                          'typeof ' + data + EQUAL + '"object"' + AND +
                          NOT + 'Array.isArray(' + data + '))';
    case 'integer': return '(typeof ' + data + EQUAL + '"number"' + AND +
                           NOT + '(' + data + ' % 1)' +
                           AND + data + EQUAL + data +
                           (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
    case 'number': return '(typeof ' + data + EQUAL + '"' + dataType + '"' +
                          (strictNumbers ? (AND + OK + 'isFinite(' + data + ')') : '') + ')';
    default: return 'typeof ' + data + EQUAL + '"' + dataType + '"';
  }
}


function checkDataTypes(dataTypes, data, strictNumbers) {
  switch (dataTypes.length) {
    case 1: return checkDataType(dataTypes[0], data, strictNumbers, true);
    default:
      var code = '';
      var types = toHash(dataTypes);
      if (types.array && types.object) {
        code = types.null ? '(': '(!' + data + ' || ';
        code += 'typeof ' + data + ' !== "object")';
        delete types.null;
        delete types.array;
        delete types.object;
      }
      if (types.number) delete types.integer;
      for (var t in types)
        code += (code ? ' && ' : '' ) + checkDataType(t, data, strictNumbers, true);

      return code;
  }
}


var COERCE_TO_TYPES = toHash([ 'string', 'number', 'integer', 'boolean', 'null' ]);
function coerceToTypes(optionCoerceTypes, dataTypes) {
  if (Array.isArray(dataTypes)) {
    var types = [];
    for (var i=0; i<dataTypes.length; i++) {
      var t = dataTypes[i];
      if (COERCE_TO_TYPES[t]) types[types.length] = t;
      else if (optionCoerceTypes === 'array' && t === 'array') types[types.length] = t;
    }
    if (types.length) return types;
  } else if (COERCE_TO_TYPES[dataTypes]) {
    return [dataTypes];
  } else if (optionCoerceTypes === 'array' && dataTypes === 'array') {
    return ['array'];
  }
}


function toHash(arr) {
  var hash = {};
  for (var i=0; i<arr.length; i++) hash[arr[i]] = true;
  return hash;
}


var IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
var SINGLE_QUOTE = /'|\\/g;
function getProperty(key) {
  return typeof key == 'number'
          ? '[' + key + ']'
          : IDENTIFIER.test(key)
            ? '.' + key
            : "['" + escapeQuotes(key) + "']";
}


function escapeQuotes(str) {
  return str.replace(SINGLE_QUOTE, '\\$&')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\f/g, '\\f')
            .replace(/\t/g, '\\t');
}


function varOccurences(str, dataVar) {
  dataVar += '[^0-9]';
  var matches = str.match(new RegExp(dataVar, 'g'));
  return matches ? matches.length : 0;
}


function varReplace(str, dataVar, expr) {
  dataVar += '([^0-9])';
  expr = expr.replace(/\$/g, '$$$$');
  return str.replace(new RegExp(dataVar, 'g'), expr + '$1');
}


function schemaHasRules(schema, rules) {
  if (typeof schema == 'boolean') return !schema;
  for (var key in schema) if (rules[key]) return true;
}


function schemaHasRulesExcept(schema, rules, exceptKeyword) {
  if (typeof schema == 'boolean') return !schema && exceptKeyword != 'not';
  for (var key in schema) if (key != exceptKeyword && rules[key]) return true;
}


function schemaUnknownRules(schema, rules) {
  if (typeof schema == 'boolean') return;
  for (var key in schema) if (!rules[key]) return key;
}


function toQuotedString(str) {
  return '\'' + escapeQuotes(str) + '\'';
}


function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
  var path = jsonPointers // false by default
              ? '\'/\' + ' + expr + (isNumber ? '' : '.replace(/~/g, \'~0\').replace(/\\//g, \'~1\')')
              : (isNumber ? '\'[\' + ' + expr + ' + \']\'' : '\'[\\\'\' + ' + expr + ' + \'\\\']\'');
  return joinPaths(currentPath, path);
}


function getPath(currentPath, prop, jsonPointers) {
  var path = jsonPointers // false by default
              ? toQuotedString('/' + escapeJsonPointer(prop))
              : toQuotedString(getProperty(prop));
  return joinPaths(currentPath, path);
}


var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, lvl, paths) {
  var up, jsonPointer, data, matches;
  if ($data === '') return 'rootData';
  if ($data[0] == '/') {
    if (!JSON_POINTER.test($data)) throw new Error('Invalid JSON-pointer: ' + $data);
    jsonPointer = $data;
    data = 'rootData';
  } else {
    matches = $data.match(RELATIVE_JSON_POINTER);
    if (!matches) throw new Error('Invalid JSON-pointer: ' + $data);
    up = +matches[1];
    jsonPointer = matches[2];
    if (jsonPointer == '#') {
      if (up >= lvl) throw new Error('Cannot access property/index ' + up + ' levels up, current level is ' + lvl);
      return paths[lvl - up];
    }

    if (up > lvl) throw new Error('Cannot access data ' + up + ' levels up, current level is ' + lvl);
    data = 'data' + ((lvl - up) || '');
    if (!jsonPointer) return data;
  }

  var expr = data;
  var segments = jsonPointer.split('/');
  for (var i=0; i<segments.length; i++) {
    var segment = segments[i];
    if (segment) {
      data += getProperty(unescapeJsonPointer(segment));
      expr += ' && ' + data;
    }
  }
  return expr;
}


function joinPaths (a, b) {
  if (a == '""') return b;
  return (a + ' + ' + b).replace(/([^\\])' \+ '/g, '$1');
}


function unescapeFragment(str) {
  return unescapeJsonPointer(decodeURIComponent(str));
}


function escapeFragment(str) {
  return encodeURIComponent(escapeJsonPointer(str));
}


function escapeJsonPointer(str) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}


function unescapeJsonPointer(str) {
  return str.replace(/~1/g, '/').replace(/~0/g, '~');
}


/***/ }),

/***/ "./node_modules/ajv/lib/data.js":
/*!**************************************!*\
  !*** ./node_modules/ajv/lib/data.js ***!
  \**************************************/
/***/ ((module) => {

"use strict";


var KEYWORDS = [
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'additionalItems',
  'maxItems',
  'minItems',
  'uniqueItems',
  'maxProperties',
  'minProperties',
  'required',
  'additionalProperties',
  'enum',
  'format',
  'const'
];

module.exports = function (metaSchema, keywordsJsonPointers) {
  for (var i=0; i<keywordsJsonPointers.length; i++) {
    metaSchema = JSON.parse(JSON.stringify(metaSchema));
    var segments = keywordsJsonPointers[i].split('/');
    var keywords = metaSchema;
    var j;
    for (j=1; j<segments.length; j++)
      keywords = keywords[segments[j]];

    for (j=0; j<KEYWORDS.length; j++) {
      var key = KEYWORDS[j];
      var schema = keywords[key];
      if (schema) {
        keywords[key] = {
          anyOf: [
            schema,
            { $ref: 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
          ]
        };
      }
    }
  }

  return metaSchema;
};


/***/ }),

/***/ "./node_modules/ajv/lib/definition_schema.js":
/*!***************************************************!*\
  !*** ./node_modules/ajv/lib/definition_schema.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var metaSchema = __webpack_require__(/*! ./refs/json-schema-draft-07.json */ "./node_modules/ajv/lib/refs/json-schema-draft-07.json");

module.exports = {
  $id: 'https://github.com/ajv-validator/ajv/blob/master/lib/definition_schema.js',
  definitions: {
    simpleTypes: metaSchema.definitions.simpleTypes
  },
  type: 'object',
  dependencies: {
    schema: ['validate'],
    $data: ['validate'],
    statements: ['inline'],
    valid: {not: {required: ['macro']}}
  },
  properties: {
    type: metaSchema.properties.type,
    schema: {type: 'boolean'},
    statements: {type: 'boolean'},
    dependencies: {
      type: 'array',
      items: {type: 'string'}
    },
    metaSchema: {type: 'object'},
    modifying: {type: 'boolean'},
    valid: {type: 'boolean'},
    $data: {type: 'boolean'},
    async: {type: 'boolean'},
    errors: {
      anyOf: [
        {type: 'boolean'},
        {const: 'full'}
      ]
    }
  }
};


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/_limit.js":
/*!**********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/_limit.js ***!
  \**********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate__limit(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $isMax = $keyword == 'maximum',
    $exclusiveKeyword = $isMax ? 'exclusiveMaximum' : 'exclusiveMinimum',
    $schemaExcl = it.schema[$exclusiveKeyword],
    $isDataExcl = it.opts.$data && $schemaExcl && $schemaExcl.$data,
    $op = $isMax ? '<' : '>',
    $notOp = $isMax ? '>' : '<',
    $errorKeyword = undefined;
  if (!($isData || typeof $schema == 'number' || $schema === undefined)) {
    throw new Error($keyword + ' must be number');
  }
  if (!($isDataExcl || $schemaExcl === undefined || typeof $schemaExcl == 'number' || typeof $schemaExcl == 'boolean')) {
    throw new Error($exclusiveKeyword + ' must be number or boolean');
  }
  if ($isDataExcl) {
    var $schemaValueExcl = it.util.getData($schemaExcl.$data, $dataLvl, it.dataPathArr),
      $exclusive = 'exclusive' + $lvl,
      $exclType = 'exclType' + $lvl,
      $exclIsNumber = 'exclIsNumber' + $lvl,
      $opExpr = 'op' + $lvl,
      $opStr = '\' + ' + $opExpr + ' + \'';
    out += ' var schemaExcl' + ($lvl) + ' = ' + ($schemaValueExcl) + '; ';
    $schemaValueExcl = 'schemaExcl' + $lvl;
    out += ' var ' + ($exclusive) + '; var ' + ($exclType) + ' = typeof ' + ($schemaValueExcl) + '; if (' + ($exclType) + ' != \'boolean\' && ' + ($exclType) + ' != \'undefined\' && ' + ($exclType) + ' != \'number\') { ';
    var $errorKeyword = $exclusiveKeyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || '_exclusiveLimit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'' + ($exclusiveKeyword) + ' should be boolean\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else if ( ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
    }
    out += ' ' + ($exclType) + ' == \'number\' ? ( (' + ($exclusive) + ' = ' + ($schemaValue) + ' === undefined || ' + ($schemaValueExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ') ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValueExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) : ( (' + ($exclusive) + ' = ' + ($schemaValueExcl) + ' === true) ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaValue) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { var op' + ($lvl) + ' = ' + ($exclusive) + ' ? \'' + ($op) + '\' : \'' + ($op) + '=\'; ';
    if ($schema === undefined) {
      $errorKeyword = $exclusiveKeyword;
      $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
      $schemaValue = $schemaValueExcl;
      $isData = $isDataExcl;
    }
  } else {
    var $exclIsNumber = typeof $schemaExcl == 'number',
      $opStr = $op;
    if ($exclIsNumber && $isData) {
      var $opExpr = '\'' + $opStr + '\'';
      out += ' if ( ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
      }
      out += ' ( ' + ($schemaValue) + ' === undefined || ' + ($schemaExcl) + ' ' + ($op) + '= ' + ($schemaValue) + ' ? ' + ($data) + ' ' + ($notOp) + '= ' + ($schemaExcl) + ' : ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' ) || ' + ($data) + ' !== ' + ($data) + ') { ';
    } else {
      if ($exclIsNumber && $schema === undefined) {
        $exclusive = true;
        $errorKeyword = $exclusiveKeyword;
        $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
        $schemaValue = $schemaExcl;
        $notOp += '=';
      } else {
        if ($exclIsNumber) $schemaValue = Math[$isMax ? 'min' : 'max']($schemaExcl, $schema);
        if ($schemaExcl === ($exclIsNumber ? $schemaValue : true)) {
          $exclusive = true;
          $errorKeyword = $exclusiveKeyword;
          $errSchemaPath = it.errSchemaPath + '/' + $exclusiveKeyword;
          $notOp += '=';
        } else {
          $exclusive = false;
          $opStr += '=';
        }
      }
      var $opExpr = '\'' + $opStr + '\'';
      out += ' if ( ';
      if ($isData) {
        out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
      }
      out += ' ' + ($data) + ' ' + ($notOp) + ' ' + ($schemaValue) + ' || ' + ($data) + ' !== ' + ($data) + ') { ';
    }
  }
  $errorKeyword = $errorKeyword || $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limit') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { comparison: ' + ($opExpr) + ', limit: ' + ($schemaValue) + ', exclusive: ' + ($exclusive) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be ' + ($opStr) + ' ';
      if ($isData) {
        out += '\' + ' + ($schemaValue);
      } else {
        out += '' + ($schemaValue) + '\'';
      }
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/_limitItems.js":
/*!***************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/_limitItems.js ***!
  \***************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate__limitItems(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxItems' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  out += ' ' + ($data) + '.length ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have ';
      if ($keyword == 'maxItems') {
        out += 'more';
      } else {
        out += 'fewer';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' items\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/_limitLength.js":
/*!****************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/_limitLength.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate__limitLength(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxLength' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  if (it.opts.unicode === false) {
    out += ' ' + ($data) + '.length ';
  } else {
    out += ' ucs2length(' + ($data) + ') ';
  }
  out += ' ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitLength') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT be ';
      if ($keyword == 'maxLength') {
        out += 'longer';
      } else {
        out += 'shorter';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' characters\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/_limitProperties.js":
/*!********************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/_limitProperties.js ***!
  \********************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate__limitProperties(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  var $op = $keyword == 'maxProperties' ? '>' : '<';
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'number\') || ';
  }
  out += ' Object.keys(' + ($data) + ').length ' + ($op) + ' ' + ($schemaValue) + ') { ';
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ($errorKeyword || '_limitProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should NOT have ';
      if ($keyword == 'maxProperties') {
        out += 'more';
      } else {
        out += 'fewer';
      }
      out += ' than ';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + ($schema);
      }
      out += ' properties\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/allOf.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/allOf.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_allOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $currentBaseId = $it.baseId,
    $allSchemasEmpty = true;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
        $allSchemasEmpty = false;
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($breakOnError) {
    if ($allSchemasEmpty) {
      out += ' if (true) { ';
    } else {
      out += ' ' + ($closingBraces.slice(0, -1)) + ' ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/anyOf.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/anyOf.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_anyOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $noEmptySchema = $schema.every(function($sch) {
    return (it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all));
  });
  if ($noEmptySchema) {
    var $currentBaseId = $it.baseId;
    out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = false;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
        out += ' ' + ($valid) + ' = ' + ($valid) + ' || ' + ($nextValid) + '; if (!' + ($valid) + ') { ';
        $closingBraces += '}';
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($closingBraces) + ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('anyOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match some schema in anyOf\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/comment.js":
/*!***********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/comment.js ***!
  \***********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_comment(it, $keyword, $ruleType) {
  var out = ' ';
  var $schema = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $comment = it.util.toQuotedString($schema);
  if (it.opts.$comment === true) {
    out += ' console.log(' + ($comment) + ');';
  } else if (typeof it.opts.$comment == 'function') {
    out += ' self._opts.$comment(' + ($comment) + ', ' + (it.util.toQuotedString($errSchemaPath)) + ', validate.root.schema);';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/const.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/const.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_const(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!$isData) {
    out += ' var schema' + ($lvl) + ' = validate.schema' + ($schemaPath) + ';';
  }
  out += 'var ' + ($valid) + ' = equal(' + ($data) + ', schema' + ($lvl) + '); if (!' + ($valid) + ') {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('const') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValue: schema' + ($lvl) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to constant\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' }';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/contains.js":
/*!************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/contains.js ***!
  \************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_contains(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $idx = 'i' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $currentBaseId = it.baseId,
    $nonEmptySchema = (it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all));
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if ($nonEmptySchema) {
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($nextValid) + ' = false; for (var ' + ($idx) + ' = 0; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + '[' + $idx + ']';
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    out += ' if (' + ($nextValid) + ') break; }  ';
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($closingBraces) + ' if (!' + ($nextValid) + ') {';
  } else {
    out += ' if (' + ($data) + '.length == 0) {';
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('contains') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should contain a valid item\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } else { ';
  if ($nonEmptySchema) {
    out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
  }
  if (it.opts.allErrors) {
    out += ' } ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/custom.js":
/*!**********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/custom.js ***!
  \**********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_custom(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $rule = this,
    $definition = 'definition' + $lvl,
    $rDef = $rule.definition,
    $closingBraces = '';
  var $compile, $inline, $macro, $ruleValidate, $validateCode;
  if ($isData && $rDef.$data) {
    $validateCode = 'keywordValidate' + $lvl;
    var $validateSchema = $rDef.validateSchema;
    out += ' var ' + ($definition) + ' = RULES.custom[\'' + ($keyword) + '\'].definition; var ' + ($validateCode) + ' = ' + ($definition) + '.validate;';
  } else {
    $ruleValidate = it.useCustomRule($rule, $schema, it.schema, it);
    if (!$ruleValidate) return;
    $schemaValue = 'validate.schema' + $schemaPath;
    $validateCode = $ruleValidate.code;
    $compile = $rDef.compile;
    $inline = $rDef.inline;
    $macro = $rDef.macro;
  }
  var $ruleErrs = $validateCode + '.errors',
    $i = 'i' + $lvl,
    $ruleErr = 'ruleErr' + $lvl,
    $asyncKeyword = $rDef.async;
  if ($asyncKeyword && !it.async) throw new Error('async keyword in sync schema');
  if (!($inline || $macro)) {
    out += '' + ($ruleErrs) + ' = null;';
  }
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if ($isData && $rDef.$data) {
    $closingBraces += '}';
    out += ' if (' + ($schemaValue) + ' === undefined) { ' + ($valid) + ' = true; } else { ';
    if ($validateSchema) {
      $closingBraces += '}';
      out += ' ' + ($valid) + ' = ' + ($definition) + '.validateSchema(' + ($schemaValue) + '); if (' + ($valid) + ') { ';
    }
  }
  if ($inline) {
    if ($rDef.statements) {
      out += ' ' + ($ruleValidate.validate) + ' ';
    } else {
      out += ' ' + ($valid) + ' = ' + ($ruleValidate.validate) + '; ';
    }
  } else if ($macro) {
    var $it = it.util.copy(it);
    var $closingBraces = '';
    $it.level++;
    var $nextValid = 'valid' + $it.level;
    $it.schema = $ruleValidate.validate;
    $it.schemaPath = '';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it).replace(/validate\.schema/g, $validateCode);
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' ' + ($code);
  } else {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    out += '  ' + ($validateCode) + '.call( ';
    if (it.opts.passContext) {
      out += 'this';
    } else {
      out += 'self';
    }
    if ($compile || $rDef.schema === false) {
      out += ' , ' + ($data) + ' ';
    } else {
      out += ' , ' + ($schemaValue) + ' , ' + ($data) + ' , validate.schema' + (it.schemaPath) + ' ';
    }
    out += ' , (dataPath || \'\')';
    if (it.errorPath != '""') {
      out += ' + ' + (it.errorPath);
    }
    var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
      $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
    out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ' , rootData )  ';
    var def_callRuleValidate = out;
    out = $$outStack.pop();
    if ($rDef.errors === false) {
      out += ' ' + ($valid) + ' = ';
      if ($asyncKeyword) {
        out += 'await ';
      }
      out += '' + (def_callRuleValidate) + '; ';
    } else {
      if ($asyncKeyword) {
        $ruleErrs = 'customErrors' + $lvl;
        out += ' var ' + ($ruleErrs) + ' = null; try { ' + ($valid) + ' = await ' + (def_callRuleValidate) + '; } catch (e) { ' + ($valid) + ' = false; if (e instanceof ValidationError) ' + ($ruleErrs) + ' = e.errors; else throw e; } ';
      } else {
        out += ' ' + ($ruleErrs) + ' = null; ' + ($valid) + ' = ' + (def_callRuleValidate) + '; ';
      }
    }
  }
  if ($rDef.modifying) {
    out += ' if (' + ($parentData) + ') ' + ($data) + ' = ' + ($parentData) + '[' + ($parentDataProperty) + '];';
  }
  out += '' + ($closingBraces);
  if ($rDef.valid) {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  } else {
    out += ' if ( ';
    if ($rDef.valid === undefined) {
      out += ' !';
      if ($macro) {
        out += '' + ($nextValid);
      } else {
        out += '' + ($valid);
      }
    } else {
      out += ' ' + (!$rDef.valid) + ' ';
    }
    out += ') { ';
    $errorKeyword = $rule.keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    var def_customError = out;
    out = $$outStack.pop();
    if ($inline) {
      if ($rDef.errors) {
        if ($rDef.errors != 'full') {
          out += '  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
          if (it.opts.verbose) {
            out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
          }
          out += ' } ';
        }
      } else {
        if ($rDef.errors === false) {
          out += ' ' + (def_customError) + ' ';
        } else {
          out += ' if (' + ($errs) + ' == errors) { ' + (def_customError) + ' } else {  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + '; if (' + ($ruleErr) + '.schemaPath === undefined) { ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '"; } ';
          if (it.opts.verbose) {
            out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
          }
          out += ' } } ';
        }
      }
    } else if ($macro) {
      out += '   var err =   '; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || 'custom') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { keyword: \'' + ($rule.keyword) + '\' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should pass "' + ($rule.keyword) + '" keyword validation\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError(vErrors); ';
        } else {
          out += ' validate.errors = vErrors; return false; ';
        }
      }
    } else {
      if ($rDef.errors === false) {
        out += ' ' + (def_customError) + ' ';
      } else {
        out += ' if (Array.isArray(' + ($ruleErrs) + ')) { if (vErrors === null) vErrors = ' + ($ruleErrs) + '; else vErrors = vErrors.concat(' + ($ruleErrs) + '); errors = vErrors.length;  for (var ' + ($i) + '=' + ($errs) + '; ' + ($i) + '<errors; ' + ($i) + '++) { var ' + ($ruleErr) + ' = vErrors[' + ($i) + ']; if (' + ($ruleErr) + '.dataPath === undefined) ' + ($ruleErr) + '.dataPath = (dataPath || \'\') + ' + (it.errorPath) + ';  ' + ($ruleErr) + '.schemaPath = "' + ($errSchemaPath) + '";  ';
        if (it.opts.verbose) {
          out += ' ' + ($ruleErr) + '.schema = ' + ($schemaValue) + '; ' + ($ruleErr) + '.data = ' + ($data) + '; ';
        }
        out += ' } } else { ' + (def_customError) + ' } ';
      }
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/dependencies.js":
/*!****************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/dependencies.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_dependencies(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $schemaDeps = {},
    $propertyDeps = {},
    $ownProperties = it.opts.ownProperties;
  for ($property in $schema) {
    if ($property == '__proto__') continue;
    var $sch = $schema[$property];
    var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps;
    $deps[$property] = $sch;
  }
  out += 'var ' + ($errs) + ' = errors;';
  var $currentErrorPath = it.errorPath;
  out += 'var missing' + ($lvl) + ';';
  for (var $property in $propertyDeps) {
    $deps = $propertyDeps[$property];
    if ($deps.length) {
      out += ' if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
      if ($ownProperties) {
        out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
      }
      if ($breakOnError) {
        out += ' && ( ';
        var arr1 = $deps;
        if (arr1) {
          var $propertyKey, $i = -1,
            l1 = arr1.length - 1;
          while ($i < l1) {
            $propertyKey = arr1[$i += 1];
            if ($i) {
              out += ' || ';
            }
            var $prop = it.util.getProperty($propertyKey),
              $useData = $data + $prop;
            out += ' ( ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
          }
        }
        out += ')) {  ';
        var $propertyPath = 'missing' + $lvl,
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should have ';
            if ($deps.length == 1) {
              out += 'property ' + (it.util.escapeQuotes($deps[0]));
            } else {
              out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
            }
            out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
      } else {
        out += ' ) { ';
        var arr2 = $deps;
        if (arr2) {
          var $propertyKey, i2 = -1,
            l2 = arr2.length - 1;
          while (i2 < l2) {
            $propertyKey = arr2[i2 += 1];
            var $prop = it.util.getProperty($propertyKey),
              $missingProperty = it.util.escapeQuotes($propertyKey),
              $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += ' if ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') {  var err =   '; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('dependencies') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { property: \'' + (it.util.escapeQuotes($property)) + '\', missingProperty: \'' + ($missingProperty) + '\', depsCount: ' + ($deps.length) + ', deps: \'' + (it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", "))) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'should have ';
                if ($deps.length == 1) {
                  out += 'property ' + (it.util.escapeQuotes($deps[0]));
                } else {
                  out += 'properties ' + (it.util.escapeQuotes($deps.join(", ")));
                }
                out += ' when property ' + (it.util.escapeQuotes($property)) + ' is present\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
          }
        }
      }
      out += ' }   ';
      if ($breakOnError) {
        $closingBraces += '}';
        out += ' else { ';
      }
    }
  }
  it.errorPath = $currentErrorPath;
  var $currentBaseId = $it.baseId;
  for (var $property in $schemaDeps) {
    var $sch = $schemaDeps[$property];
    if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
      out += ' ' + ($nextValid) + ' = true; if ( ' + ($data) + (it.util.getProperty($property)) + ' !== undefined ';
      if ($ownProperties) {
        out += ' && Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($property)) + '\') ';
      }
      out += ') { ';
      $it.schema = $sch;
      $it.schemaPath = $schemaPath + it.util.getProperty($property);
      $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($property);
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' }  ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
        $closingBraces += '}';
      }
    }
  }
  if ($breakOnError) {
    out += '   ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/enum.js":
/*!********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/enum.js ***!
  \********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_enum(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $i = 'i' + $lvl,
    $vSchema = 'schema' + $lvl;
  if (!$isData) {
    out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + ';';
  }
  out += 'var ' + ($valid) + ';';
  if ($isData) {
    out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
  }
  out += '' + ($valid) + ' = false;for (var ' + ($i) + '=0; ' + ($i) + '<' + ($vSchema) + '.length; ' + ($i) + '++) if (equal(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + '])) { ' + ($valid) + ' = true; break; }';
  if ($isData) {
    out += '  }  ';
  }
  out += ' if (!' + ($valid) + ') {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('enum') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { allowedValues: schema' + ($lvl) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be equal to one of the allowed values\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' }';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/format.js":
/*!**********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/format.js ***!
  \**********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_format(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  if (it.opts.format === false) {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
    return out;
  }
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $unknownFormats = it.opts.unknownFormats,
    $allowUnknown = Array.isArray($unknownFormats);
  if ($isData) {
    var $format = 'format' + $lvl,
      $isObject = 'isObject' + $lvl,
      $formatType = 'formatType' + $lvl;
    out += ' var ' + ($format) + ' = formats[' + ($schemaValue) + ']; var ' + ($isObject) + ' = typeof ' + ($format) + ' == \'object\' && !(' + ($format) + ' instanceof RegExp) && ' + ($format) + '.validate; var ' + ($formatType) + ' = ' + ($isObject) + ' && ' + ($format) + '.type || \'string\'; if (' + ($isObject) + ') { ';
    if (it.async) {
      out += ' var async' + ($lvl) + ' = ' + ($format) + '.async; ';
    }
    out += ' ' + ($format) + ' = ' + ($format) + '.validate; } if (  ';
    if ($isData) {
      out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
    }
    out += ' (';
    if ($unknownFormats != 'ignore') {
      out += ' (' + ($schemaValue) + ' && !' + ($format) + ' ';
      if ($allowUnknown) {
        out += ' && self._opts.unknownFormats.indexOf(' + ($schemaValue) + ') == -1 ';
      }
      out += ') || ';
    }
    out += ' (' + ($format) + ' && ' + ($formatType) + ' == \'' + ($ruleType) + '\' && !(typeof ' + ($format) + ' == \'function\' ? ';
    if (it.async) {
      out += ' (async' + ($lvl) + ' ? await ' + ($format) + '(' + ($data) + ') : ' + ($format) + '(' + ($data) + ')) ';
    } else {
      out += ' ' + ($format) + '(' + ($data) + ') ';
    }
    out += ' : ' + ($format) + '.test(' + ($data) + '))))) {';
  } else {
    var $format = it.formats[$schema];
    if (!$format) {
      if ($unknownFormats == 'ignore') {
        it.logger.warn('unknown format "' + $schema + '" ignored in schema at path "' + it.errSchemaPath + '"');
        if ($breakOnError) {
          out += ' if (true) { ';
        }
        return out;
      } else if ($allowUnknown && $unknownFormats.indexOf($schema) >= 0) {
        if ($breakOnError) {
          out += ' if (true) { ';
        }
        return out;
      } else {
        throw new Error('unknown format "' + $schema + '" is used in schema at path "' + it.errSchemaPath + '"');
      }
    }
    var $isObject = typeof $format == 'object' && !($format instanceof RegExp) && $format.validate;
    var $formatType = $isObject && $format.type || 'string';
    if ($isObject) {
      var $async = $format.async === true;
      $format = $format.validate;
    }
    if ($formatType != $ruleType) {
      if ($breakOnError) {
        out += ' if (true) { ';
      }
      return out;
    }
    if ($async) {
      if (!it.async) throw new Error('async format in sync schema');
      var $formatRef = 'formats' + it.util.getProperty($schema) + '.validate';
      out += ' if (!(await ' + ($formatRef) + '(' + ($data) + '))) { ';
    } else {
      out += ' if (! ';
      var $formatRef = 'formats' + it.util.getProperty($schema);
      if ($isObject) $formatRef += '.validate';
      if (typeof $format == 'function') {
        out += ' ' + ($formatRef) + '(' + ($data) + ') ';
      } else {
        out += ' ' + ($formatRef) + '.test(' + ($data) + ') ';
      }
      out += ') { ';
    }
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('format') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { format:  ';
    if ($isData) {
      out += '' + ($schemaValue);
    } else {
      out += '' + (it.util.toQuotedString($schema));
    }
    out += '  } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match format "';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + (it.util.escapeQuotes($schema));
      }
      out += '"\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += ' } ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/if.js":
/*!******************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/if.js ***!
  \******************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_if(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $thenSch = it.schema['then'],
    $elseSch = it.schema['else'],
    $thenPresent = $thenSch !== undefined && (it.opts.strictKeywords ? (typeof $thenSch == 'object' && Object.keys($thenSch).length > 0) || $thenSch === false : it.util.schemaHasRules($thenSch, it.RULES.all)),
    $elsePresent = $elseSch !== undefined && (it.opts.strictKeywords ? (typeof $elseSch == 'object' && Object.keys($elseSch).length > 0) || $elseSch === false : it.util.schemaHasRules($elseSch, it.RULES.all)),
    $currentBaseId = $it.baseId;
  if ($thenPresent || $elsePresent) {
    var $ifClause;
    $it.createErrors = false;
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($errs) + ' = errors; var ' + ($valid) + ' = true;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    out += '  ' + (it.validate($it)) + ' ';
    $it.baseId = $currentBaseId;
    $it.createErrors = true;
    out += '  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }  ';
    it.compositeRule = $it.compositeRule = $wasComposite;
    if ($thenPresent) {
      out += ' if (' + ($nextValid) + ') {  ';
      $it.schema = it.schema['then'];
      $it.schemaPath = it.schemaPath + '.then';
      $it.errSchemaPath = it.errSchemaPath + '/then';
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
      if ($thenPresent && $elsePresent) {
        $ifClause = 'ifClause' + $lvl;
        out += ' var ' + ($ifClause) + ' = \'then\'; ';
      } else {
        $ifClause = '\'then\'';
      }
      out += ' } ';
      if ($elsePresent) {
        out += ' else { ';
      }
    } else {
      out += ' if (!' + ($nextValid) + ') { ';
    }
    if ($elsePresent) {
      $it.schema = it.schema['else'];
      $it.schemaPath = it.schemaPath + '.else';
      $it.errSchemaPath = it.errSchemaPath + '/else';
      out += '  ' + (it.validate($it)) + ' ';
      $it.baseId = $currentBaseId;
      out += ' ' + ($valid) + ' = ' + ($nextValid) + '; ';
      if ($thenPresent && $elsePresent) {
        $ifClause = 'ifClause' + $lvl;
        out += ' var ' + ($ifClause) + ' = \'else\'; ';
      } else {
        $ifClause = '\'else\'';
      }
      out += ' } ';
    }
    out += ' if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('if') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { failingKeyword: ' + ($ifClause) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should match "\' + ' + ($ifClause) + ' + \'" schema\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    out += ' }   ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/index.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


//all requires must be explicit because browserify won't work with dynamic requires
module.exports = {
  '$ref': __webpack_require__(/*! ./ref */ "./node_modules/ajv/lib/dotjs/ref.js"),
  allOf: __webpack_require__(/*! ./allOf */ "./node_modules/ajv/lib/dotjs/allOf.js"),
  anyOf: __webpack_require__(/*! ./anyOf */ "./node_modules/ajv/lib/dotjs/anyOf.js"),
  '$comment': __webpack_require__(/*! ./comment */ "./node_modules/ajv/lib/dotjs/comment.js"),
  const: __webpack_require__(/*! ./const */ "./node_modules/ajv/lib/dotjs/const.js"),
  contains: __webpack_require__(/*! ./contains */ "./node_modules/ajv/lib/dotjs/contains.js"),
  dependencies: __webpack_require__(/*! ./dependencies */ "./node_modules/ajv/lib/dotjs/dependencies.js"),
  'enum': __webpack_require__(/*! ./enum */ "./node_modules/ajv/lib/dotjs/enum.js"),
  format: __webpack_require__(/*! ./format */ "./node_modules/ajv/lib/dotjs/format.js"),
  'if': __webpack_require__(/*! ./if */ "./node_modules/ajv/lib/dotjs/if.js"),
  items: __webpack_require__(/*! ./items */ "./node_modules/ajv/lib/dotjs/items.js"),
  maximum: __webpack_require__(/*! ./_limit */ "./node_modules/ajv/lib/dotjs/_limit.js"),
  minimum: __webpack_require__(/*! ./_limit */ "./node_modules/ajv/lib/dotjs/_limit.js"),
  maxItems: __webpack_require__(/*! ./_limitItems */ "./node_modules/ajv/lib/dotjs/_limitItems.js"),
  minItems: __webpack_require__(/*! ./_limitItems */ "./node_modules/ajv/lib/dotjs/_limitItems.js"),
  maxLength: __webpack_require__(/*! ./_limitLength */ "./node_modules/ajv/lib/dotjs/_limitLength.js"),
  minLength: __webpack_require__(/*! ./_limitLength */ "./node_modules/ajv/lib/dotjs/_limitLength.js"),
  maxProperties: __webpack_require__(/*! ./_limitProperties */ "./node_modules/ajv/lib/dotjs/_limitProperties.js"),
  minProperties: __webpack_require__(/*! ./_limitProperties */ "./node_modules/ajv/lib/dotjs/_limitProperties.js"),
  multipleOf: __webpack_require__(/*! ./multipleOf */ "./node_modules/ajv/lib/dotjs/multipleOf.js"),
  not: __webpack_require__(/*! ./not */ "./node_modules/ajv/lib/dotjs/not.js"),
  oneOf: __webpack_require__(/*! ./oneOf */ "./node_modules/ajv/lib/dotjs/oneOf.js"),
  pattern: __webpack_require__(/*! ./pattern */ "./node_modules/ajv/lib/dotjs/pattern.js"),
  properties: __webpack_require__(/*! ./properties */ "./node_modules/ajv/lib/dotjs/properties.js"),
  propertyNames: __webpack_require__(/*! ./propertyNames */ "./node_modules/ajv/lib/dotjs/propertyNames.js"),
  required: __webpack_require__(/*! ./required */ "./node_modules/ajv/lib/dotjs/required.js"),
  uniqueItems: __webpack_require__(/*! ./uniqueItems */ "./node_modules/ajv/lib/dotjs/uniqueItems.js"),
  validate: __webpack_require__(/*! ./validate */ "./node_modules/ajv/lib/dotjs/validate.js")
};


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/items.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/items.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_items(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $idx = 'i' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $currentBaseId = it.baseId;
  out += 'var ' + ($errs) + ' = errors;var ' + ($valid) + ';';
  if (Array.isArray($schema)) {
    var $additionalItems = it.schema.additionalItems;
    if ($additionalItems === false) {
      out += ' ' + ($valid) + ' = ' + ($data) + '.length <= ' + ($schema.length) + '; ';
      var $currErrSchemaPath = $errSchemaPath;
      $errSchemaPath = it.errSchemaPath + '/additionalItems';
      out += '  if (!' + ($valid) + ') {   ';
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ('additionalItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { limit: ' + ($schema.length) + ' } ';
        if (it.opts.messages !== false) {
          out += ' , message: \'should NOT have more than ' + ($schema.length) + ' items\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
      out += ' } ';
      $errSchemaPath = $currErrSchemaPath;
      if ($breakOnError) {
        $closingBraces += '}';
        out += ' else { ';
      }
    }
    var arr1 = $schema;
    if (arr1) {
      var $sch, $i = -1,
        l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($i) + ') { ';
          var $passData = $data + '[' + $i + ']';
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + '[' + $i + ']';
          $it.errSchemaPath = $errSchemaPath + '/' + $i;
          $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true);
          $it.dataPathArr[$dataNxt] = $i;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' }  ';
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
    if (typeof $additionalItems == 'object' && (it.opts.strictKeywords ? (typeof $additionalItems == 'object' && Object.keys($additionalItems).length > 0) || $additionalItems === false : it.util.schemaHasRules($additionalItems, it.RULES.all))) {
      $it.schema = $additionalItems;
      $it.schemaPath = it.schemaPath + '.additionalItems';
      $it.errSchemaPath = it.errSchemaPath + '/additionalItems';
      out += ' ' + ($nextValid) + ' = true; if (' + ($data) + '.length > ' + ($schema.length) + ') {  for (var ' + ($idx) + ' = ' + ($schema.length) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
      var $passData = $data + '[' + $idx + ']';
      $it.dataPathArr[$dataNxt] = $idx;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
      } else {
        out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
      }
      if ($breakOnError) {
        out += ' if (!' + ($nextValid) + ') break; ';
      }
      out += ' } }  ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
        $closingBraces += '}';
      }
    }
  } else if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += '  for (var ' + ($idx) + ' = ' + (0) + '; ' + ($idx) + ' < ' + ($data) + '.length; ' + ($idx) + '++) { ';
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + '[' + $idx + ']';
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    if ($breakOnError) {
      out += ' if (!' + ($nextValid) + ') break; ';
    }
    out += ' }';
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/multipleOf.js":
/*!**************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/multipleOf.js ***!
  \**************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_multipleOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (!($isData || typeof $schema == 'number')) {
    throw new Error($keyword + ' must be number');
  }
  out += 'var division' + ($lvl) + ';if (';
  if ($isData) {
    out += ' ' + ($schemaValue) + ' !== undefined && ( typeof ' + ($schemaValue) + ' != \'number\' || ';
  }
  out += ' (division' + ($lvl) + ' = ' + ($data) + ' / ' + ($schemaValue) + ', ';
  if (it.opts.multipleOfPrecision) {
    out += ' Math.abs(Math.round(division' + ($lvl) + ') - division' + ($lvl) + ') > 1e-' + (it.opts.multipleOfPrecision) + ' ';
  } else {
    out += ' division' + ($lvl) + ' !== parseInt(division' + ($lvl) + ') ';
  }
  out += ' ) ';
  if ($isData) {
    out += '  )  ';
  }
  out += ' ) {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('multipleOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { multipleOf: ' + ($schemaValue) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should be multiple of ';
      if ($isData) {
        out += '\' + ' + ($schemaValue);
      } else {
        out += '' + ($schemaValue) + '\'';
      }
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + ($schema);
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/not.js":
/*!*******************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/not.js ***!
  \*******************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_not(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += ' var ' + ($errs) + ' = errors;  ';
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.createErrors = false;
    var $allErrorsOption;
    if ($it.opts.allErrors) {
      $allErrorsOption = $it.opts.allErrors;
      $it.opts.allErrors = false;
    }
    out += ' ' + (it.validate($it)) + ' ';
    $it.createErrors = true;
    if ($allErrorsOption) $it.opts.allErrors = $allErrorsOption;
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' if (' + ($nextValid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; } ';
    if (it.opts.allErrors) {
      out += ' } ';
    }
  } else {
    out += '  var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('not') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT be valid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if ($breakOnError) {
      out += ' if (false) { ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/oneOf.js":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/oneOf.js ***!
  \*********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_oneOf(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $currentBaseId = $it.baseId,
    $prevValid = 'prevValid' + $lvl,
    $passingSchemas = 'passingSchemas' + $lvl;
  out += 'var ' + ($errs) + ' = errors , ' + ($prevValid) + ' = false , ' + ($valid) + ' = false , ' + ($passingSchemas) + ' = null; ';
  var $wasComposite = it.compositeRule;
  it.compositeRule = $it.compositeRule = true;
  var arr1 = $schema;
  if (arr1) {
    var $sch, $i = -1,
      l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + '[' + $i + ']';
        $it.errSchemaPath = $errSchemaPath + '/' + $i;
        out += '  ' + (it.validate($it)) + ' ';
        $it.baseId = $currentBaseId;
      } else {
        out += ' var ' + ($nextValid) + ' = true; ';
      }
      if ($i) {
        out += ' if (' + ($nextValid) + ' && ' + ($prevValid) + ') { ' + ($valid) + ' = false; ' + ($passingSchemas) + ' = [' + ($passingSchemas) + ', ' + ($i) + ']; } else { ';
        $closingBraces += '}';
      }
      out += ' if (' + ($nextValid) + ') { ' + ($valid) + ' = ' + ($prevValid) + ' = true; ' + ($passingSchemas) + ' = ' + ($i) + '; }';
    }
  }
  it.compositeRule = $it.compositeRule = $wasComposite;
  out += '' + ($closingBraces) + 'if (!' + ($valid) + ') {   var err =   '; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('oneOf') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { passingSchemas: ' + ($passingSchemas) + ' } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match exactly one schema in oneOf\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError(vErrors); ';
    } else {
      out += ' validate.errors = vErrors; return false; ';
    }
  }
  out += '} else {  errors = ' + ($errs) + '; if (vErrors !== null) { if (' + ($errs) + ') vErrors.length = ' + ($errs) + '; else vErrors = null; }';
  if (it.opts.allErrors) {
    out += ' } ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/pattern.js":
/*!***********************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/pattern.js ***!
  \***********************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_pattern(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $regexp = $isData ? '(new RegExp(' + $schemaValue + '))' : it.usePattern($schema);
  out += 'if ( ';
  if ($isData) {
    out += ' (' + ($schemaValue) + ' !== undefined && typeof ' + ($schemaValue) + ' != \'string\') || ';
  }
  out += ' !' + ($regexp) + '.test(' + ($data) + ') ) {   ';
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = ''; /* istanbul ignore else */
  if (it.createErrors !== false) {
    out += ' { keyword: \'' + ('pattern') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { pattern:  ';
    if ($isData) {
      out += '' + ($schemaValue);
    } else {
      out += '' + (it.util.toQuotedString($schema));
    }
    out += '  } ';
    if (it.opts.messages !== false) {
      out += ' , message: \'should match pattern "';
      if ($isData) {
        out += '\' + ' + ($schemaValue) + ' + \'';
      } else {
        out += '' + (it.util.escapeQuotes($schema));
      }
      out += '"\' ';
    }
    if (it.opts.verbose) {
      out += ' , schema:  ';
      if ($isData) {
        out += 'validate.schema' + ($schemaPath);
      } else {
        out += '' + (it.util.toQuotedString($schema));
      }
      out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
    }
    out += ' } ';
  } else {
    out += ' {} ';
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    /* istanbul ignore if */
    if (it.async) {
      out += ' throw new ValidationError([' + (__err) + ']); ';
    } else {
      out += ' validate.errors = [' + (__err) + ']; return false; ';
    }
  } else {
    out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
  }
  out += '} ';
  if ($breakOnError) {
    out += ' else { ';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/properties.js":
/*!**************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/properties.js ***!
  \**************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_properties(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  var $key = 'key' + $lvl,
    $idx = 'idx' + $lvl,
    $dataNxt = $it.dataLevel = it.dataLevel + 1,
    $nextData = 'data' + $dataNxt,
    $dataProperties = 'dataProperties' + $lvl;
  var $schemaKeys = Object.keys($schema || {}).filter(notProto),
    $pProperties = it.schema.patternProperties || {},
    $pPropertyKeys = Object.keys($pProperties).filter(notProto),
    $aProperties = it.schema.additionalProperties,
    $someProperties = $schemaKeys.length || $pPropertyKeys.length,
    $noAdditional = $aProperties === false,
    $additionalIsSchema = typeof $aProperties == 'object' && Object.keys($aProperties).length,
    $removeAdditional = it.opts.removeAdditional,
    $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional,
    $ownProperties = it.opts.ownProperties,
    $currentBaseId = it.baseId;
  var $required = it.schema.required;
  if ($required && !(it.opts.$data && $required.$data) && $required.length < it.opts.loopRequired) {
    var $requiredHash = it.util.toHash($required);
  }

  function notProto(p) {
    return p !== '__proto__';
  }
  out += 'var ' + ($errs) + ' = errors;var ' + ($nextValid) + ' = true;';
  if ($ownProperties) {
    out += ' var ' + ($dataProperties) + ' = undefined;';
  }
  if ($checkAdditional) {
    if ($ownProperties) {
      out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
    } else {
      out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
    }
    if ($someProperties) {
      out += ' var isAdditional' + ($lvl) + ' = !(false ';
      if ($schemaKeys.length) {
        if ($schemaKeys.length > 8) {
          out += ' || validate.schema' + ($schemaPath) + '.hasOwnProperty(' + ($key) + ') ';
        } else {
          var arr1 = $schemaKeys;
          if (arr1) {
            var $propertyKey, i1 = -1,
              l1 = arr1.length - 1;
            while (i1 < l1) {
              $propertyKey = arr1[i1 += 1];
              out += ' || ' + ($key) + ' == ' + (it.util.toQuotedString($propertyKey)) + ' ';
            }
          }
        }
      }
      if ($pPropertyKeys.length) {
        var arr2 = $pPropertyKeys;
        if (arr2) {
          var $pProperty, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $pProperty = arr2[$i += 1];
            out += ' || ' + (it.usePattern($pProperty)) + '.test(' + ($key) + ') ';
          }
        }
      }
      out += ' ); if (isAdditional' + ($lvl) + ') { ';
    }
    if ($removeAdditional == 'all') {
      out += ' delete ' + ($data) + '[' + ($key) + ']; ';
    } else {
      var $currentErrorPath = it.errorPath;
      var $additionalProperty = '\' + ' + $key + ' + \'';
      if (it.opts._errorDataPathProperty) {
        it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
      }
      if ($noAdditional) {
        if ($removeAdditional) {
          out += ' delete ' + ($data) + '[' + ($key) + ']; ';
        } else {
          out += ' ' + ($nextValid) + ' = false; ';
          var $currErrSchemaPath = $errSchemaPath;
          $errSchemaPath = it.errSchemaPath + '/additionalProperties';
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = ''; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('additionalProperties') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { additionalProperty: \'' + ($additionalProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is an invalid additional property';
              } else {
                out += 'should NOT have additional properties';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            /* istanbul ignore if */
            if (it.async) {
              out += ' throw new ValidationError([' + (__err) + ']); ';
            } else {
              out += ' validate.errors = [' + (__err) + ']; return false; ';
            }
          } else {
            out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
          }
          $errSchemaPath = $currErrSchemaPath;
          if ($breakOnError) {
            out += ' break; ';
          }
        }
      } else if ($additionalIsSchema) {
        if ($removeAdditional == 'failing') {
          out += ' var ' + ($errs) + ' = errors;  ';
          var $wasComposite = it.compositeRule;
          it.compositeRule = $it.compositeRule = true;
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          out += ' if (!' + ($nextValid) + ') { errors = ' + ($errs) + '; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete ' + ($data) + '[' + ($key) + ']; }  ';
          it.compositeRule = $it.compositeRule = $wasComposite;
        } else {
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + '.additionalProperties';
          $it.errSchemaPath = it.errSchemaPath + '/additionalProperties';
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          if ($breakOnError) {
            out += ' if (!' + ($nextValid) + ') break; ';
          }
        }
      }
      it.errorPath = $currentErrorPath;
    }
    if ($someProperties) {
      out += ' } ';
    }
    out += ' }  ';
    if ($breakOnError) {
      out += ' if (' + ($nextValid) + ') { ';
      $closingBraces += '}';
    }
  }
  var $useDefaults = it.opts.useDefaults && !it.compositeRule;
  if ($schemaKeys.length) {
    var arr3 = $schemaKeys;
    if (arr3) {
      var $propertyKey, i3 = -1,
        l3 = arr3.length - 1;
      while (i3 < l3) {
        $propertyKey = arr3[i3 += 1];
        var $sch = $schema[$propertyKey];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          var $prop = it.util.getProperty($propertyKey),
            $passData = $data + $prop,
            $hasDefault = $useDefaults && $sch.default !== undefined;
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + $prop;
          $it.errSchemaPath = $errSchemaPath + '/' + it.util.escapeFragment($propertyKey);
          $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers);
          $it.dataPathArr[$dataNxt] = it.util.toQuotedString($propertyKey);
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            $code = it.util.varReplace($code, $nextData, $passData);
            var $useData = $passData;
          } else {
            var $useData = $nextData;
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ';
          }
          if ($hasDefault) {
            out += ' ' + ($code) + ' ';
          } else {
            if ($requiredHash && $requiredHash[$propertyKey]) {
              out += ' if ( ' + ($useData) + ' === undefined ';
              if ($ownProperties) {
                out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
              }
              out += ') { ' + ($nextValid) + ' = false; ';
              var $currentErrorPath = it.errorPath,
                $currErrSchemaPath = $errSchemaPath,
                $missingProperty = it.util.escapeQuotes($propertyKey);
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
              }
              $errSchemaPath = it.errSchemaPath + '/required';
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = ''; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'';
                  if (it.opts._errorDataPathProperty) {
                    out += 'is a required property';
                  } else {
                    out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                  }
                  out += '\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                /* istanbul ignore if */
                if (it.async) {
                  out += ' throw new ValidationError([' + (__err) + ']); ';
                } else {
                  out += ' validate.errors = [' + (__err) + ']; return false; ';
                }
              } else {
                out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
              }
              $errSchemaPath = $currErrSchemaPath;
              it.errorPath = $currentErrorPath;
              out += ' } else { ';
            } else {
              if ($breakOnError) {
                out += ' if ( ' + ($useData) + ' === undefined ';
                if ($ownProperties) {
                  out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                }
                out += ') { ' + ($nextValid) + ' = true; } else { ';
              } else {
                out += ' if (' + ($useData) + ' !== undefined ';
                if ($ownProperties) {
                  out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
                }
                out += ' ) { ';
              }
            }
            out += ' ' + ($code) + ' } ';
          }
        }
        if ($breakOnError) {
          out += ' if (' + ($nextValid) + ') { ';
          $closingBraces += '}';
        }
      }
    }
  }
  if ($pPropertyKeys.length) {
    var arr4 = $pPropertyKeys;
    if (arr4) {
      var $pProperty, i4 = -1,
        l4 = arr4.length - 1;
      while (i4 < l4) {
        $pProperty = arr4[i4 += 1];
        var $sch = $pProperties[$pProperty];
        if ((it.opts.strictKeywords ? (typeof $sch == 'object' && Object.keys($sch).length > 0) || $sch === false : it.util.schemaHasRules($sch, it.RULES.all))) {
          $it.schema = $sch;
          $it.schemaPath = it.schemaPath + '.patternProperties' + it.util.getProperty($pProperty);
          $it.errSchemaPath = it.errSchemaPath + '/patternProperties/' + it.util.escapeFragment($pProperty);
          if ($ownProperties) {
            out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
          } else {
            out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
          }
          out += ' if (' + (it.usePattern($pProperty)) + '.test(' + ($key) + ')) { ';
          $it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + '[' + $key + ']';
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
          } else {
            out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
          }
          if ($breakOnError) {
            out += ' if (!' + ($nextValid) + ') break; ';
          }
          out += ' } ';
          if ($breakOnError) {
            out += ' else ' + ($nextValid) + ' = true; ';
          }
          out += ' }  ';
          if ($breakOnError) {
            out += ' if (' + ($nextValid) + ') { ';
            $closingBraces += '}';
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/propertyNames.js":
/*!*****************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/propertyNames.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_propertyNames(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $errs = 'errs__' + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = '';
  $it.level++;
  var $nextValid = 'valid' + $it.level;
  out += 'var ' + ($errs) + ' = errors;';
  if ((it.opts.strictKeywords ? (typeof $schema == 'object' && Object.keys($schema).length > 0) || $schema === false : it.util.schemaHasRules($schema, it.RULES.all))) {
    $it.schema = $schema;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    var $key = 'key' + $lvl,
      $idx = 'idx' + $lvl,
      $i = 'i' + $lvl,
      $invalidName = '\' + ' + $key + ' + \'',
      $dataNxt = $it.dataLevel = it.dataLevel + 1,
      $nextData = 'data' + $dataNxt,
      $dataProperties = 'dataProperties' + $lvl,
      $ownProperties = it.opts.ownProperties,
      $currentBaseId = it.baseId;
    if ($ownProperties) {
      out += ' var ' + ($dataProperties) + ' = undefined; ';
    }
    if ($ownProperties) {
      out += ' ' + ($dataProperties) + ' = ' + ($dataProperties) + ' || Object.keys(' + ($data) + '); for (var ' + ($idx) + '=0; ' + ($idx) + '<' + ($dataProperties) + '.length; ' + ($idx) + '++) { var ' + ($key) + ' = ' + ($dataProperties) + '[' + ($idx) + ']; ';
    } else {
      out += ' for (var ' + ($key) + ' in ' + ($data) + ') { ';
    }
    out += ' var startErrs' + ($lvl) + ' = errors; ';
    var $passData = $key;
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += ' ' + (it.util.varReplace($code, $nextData, $passData)) + ' ';
    } else {
      out += ' var ' + ($nextData) + ' = ' + ($passData) + '; ' + ($code) + ' ';
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += ' if (!' + ($nextValid) + ') { for (var ' + ($i) + '=startErrs' + ($lvl) + '; ' + ($i) + '<errors; ' + ($i) + '++) { vErrors[' + ($i) + '].propertyName = ' + ($key) + '; }   var err =   '; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('propertyNames') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { propertyName: \'' + ($invalidName) + '\' } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'property name \\\'' + ($invalidName) + '\\\' is invalid\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError(vErrors); ';
      } else {
        out += ' validate.errors = vErrors; return false; ';
      }
    }
    if ($breakOnError) {
      out += ' break; ';
    }
    out += ' } }';
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces) + ' if (' + ($errs) + ' == errors) {';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/ref.js":
/*!*******************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/ref.js ***!
  \*******************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_ref(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $async, $refCode;
  if ($schema == '#' || $schema == '#/') {
    if (it.isRoot) {
      $async = it.async;
      $refCode = 'validate';
    } else {
      $async = it.root.schema.$async === true;
      $refCode = 'root.refVal[0]';
    }
  } else {
    var $refVal = it.resolveRef(it.baseId, $schema, it.isRoot);
    if ($refVal === undefined) {
      var $message = it.MissingRefError.message(it.baseId, $schema);
      if (it.opts.missingRefs == 'fail') {
        it.logger.error($message);
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('$ref') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { ref: \'' + (it.util.escapeQuotes($schema)) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'can\\\'t resolve reference ' + (it.util.escapeQuotes($schema)) + '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        if ($breakOnError) {
          out += ' if (false) { ';
        }
      } else if (it.opts.missingRefs == 'ignore') {
        it.logger.warn($message);
        if ($breakOnError) {
          out += ' if (true) { ';
        }
      } else {
        throw new it.MissingRefError(it.baseId, $schema, $message);
      }
    } else if ($refVal.inline) {
      var $it = it.util.copy(it);
      $it.level++;
      var $nextValid = 'valid' + $it.level;
      $it.schema = $refVal.schema;
      $it.schemaPath = '';
      $it.errSchemaPath = $schema;
      var $code = it.validate($it).replace(/validate\.schema/g, $refVal.code);
      out += ' ' + ($code) + ' ';
      if ($breakOnError) {
        out += ' if (' + ($nextValid) + ') { ';
      }
    } else {
      $async = $refVal.$async === true || (it.async && $refVal.$async !== false);
      $refCode = $refVal.code;
    }
  }
  if ($refCode) {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = '';
    if (it.opts.passContext) {
      out += ' ' + ($refCode) + '.call(this, ';
    } else {
      out += ' ' + ($refCode) + '( ';
    }
    out += ' ' + ($data) + ', (dataPath || \'\')';
    if (it.errorPath != '""') {
      out += ' + ' + (it.errorPath);
    }
    var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
      $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
    out += ' , ' + ($parentData) + ' , ' + ($parentDataProperty) + ', rootData)  ';
    var __callValidate = out;
    out = $$outStack.pop();
    if ($async) {
      if (!it.async) throw new Error('async schema referenced by sync schema');
      if ($breakOnError) {
        out += ' var ' + ($valid) + '; ';
      }
      out += ' try { await ' + (__callValidate) + '; ';
      if ($breakOnError) {
        out += ' ' + ($valid) + ' = true; ';
      }
      out += ' } catch (e) { if (!(e instanceof ValidationError)) throw e; if (vErrors === null) vErrors = e.errors; else vErrors = vErrors.concat(e.errors); errors = vErrors.length; ';
      if ($breakOnError) {
        out += ' ' + ($valid) + ' = false; ';
      }
      out += ' } ';
      if ($breakOnError) {
        out += ' if (' + ($valid) + ') { ';
      }
    } else {
      out += ' if (!' + (__callValidate) + ') { if (vErrors === null) vErrors = ' + ($refCode) + '.errors; else vErrors = vErrors.concat(' + ($refCode) + '.errors); errors = vErrors.length; } ';
      if ($breakOnError) {
        out += ' else { ';
      }
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/required.js":
/*!************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/required.js ***!
  \************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_required(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  var $vSchema = 'schema' + $lvl;
  if (!$isData) {
    if ($schema.length < it.opts.loopRequired && it.schema.properties && Object.keys(it.schema.properties).length) {
      var $required = [];
      var arr1 = $schema;
      if (arr1) {
        var $property, i1 = -1,
          l1 = arr1.length - 1;
        while (i1 < l1) {
          $property = arr1[i1 += 1];
          var $propertySch = it.schema.properties[$property];
          if (!($propertySch && (it.opts.strictKeywords ? (typeof $propertySch == 'object' && Object.keys($propertySch).length > 0) || $propertySch === false : it.util.schemaHasRules($propertySch, it.RULES.all)))) {
            $required[$required.length] = $property;
          }
        }
      }
    } else {
      var $required = $schema;
    }
  }
  if ($isData || $required.length) {
    var $currentErrorPath = it.errorPath,
      $loopRequired = $isData || $required.length >= it.opts.loopRequired,
      $ownProperties = it.opts.ownProperties;
    if ($breakOnError) {
      out += ' var missing' + ($lvl) + '; ';
      if ($loopRequired) {
        if (!$isData) {
          out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
        }
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        out += ' var ' + ($valid) + ' = true; ';
        if ($isData) {
          out += ' if (schema' + ($lvl) + ' === undefined) ' + ($valid) + ' = true; else if (!Array.isArray(schema' + ($lvl) + ')) ' + ($valid) + ' = false; else {';
        }
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { ' + ($valid) + ' = ' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] !== undefined ';
        if ($ownProperties) {
          out += ' &&   Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
        }
        out += '; if (!' + ($valid) + ') break; } ';
        if ($isData) {
          out += '  }  ';
        }
        out += '  if (!' + ($valid) + ') {   ';
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      } else {
        out += ' if ( ';
        var arr2 = $required;
        if (arr2) {
          var $propertyKey, $i = -1,
            l2 = arr2.length - 1;
          while ($i < l2) {
            $propertyKey = arr2[$i += 1];
            if ($i) {
              out += ' || ';
            }
            var $prop = it.util.getProperty($propertyKey),
              $useData = $data + $prop;
            out += ' ( ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') && (missing' + ($lvl) + ' = ' + (it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop)) + ') ) ';
          }
        }
        out += ') {  ';
        var $propertyPath = 'missing' + $lvl,
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + ' + ' + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } else { ';
      }
    } else {
      if ($loopRequired) {
        if (!$isData) {
          out += ' var ' + ($vSchema) + ' = validate.schema' + ($schemaPath) + '; ';
        }
        var $i = 'i' + $lvl,
          $propertyPath = 'schema' + $lvl + '[' + $i + ']',
          $missingProperty = '\' + ' + $propertyPath + ' + \'';
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        if ($isData) {
          out += ' if (' + ($vSchema) + ' && !Array.isArray(' + ($vSchema) + ')) {  var err =   '; /* istanbul ignore else */
          if (it.createErrors !== false) {
            out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
            if (it.opts.messages !== false) {
              out += ' , message: \'';
              if (it.opts._errorDataPathProperty) {
                out += 'is a required property';
              } else {
                out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
              }
              out += '\' ';
            }
            if (it.opts.verbose) {
              out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
            }
            out += ' } ';
          } else {
            out += ' {} ';
          }
          out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else if (' + ($vSchema) + ' !== undefined) { ';
        }
        out += ' for (var ' + ($i) + ' = 0; ' + ($i) + ' < ' + ($vSchema) + '.length; ' + ($i) + '++) { if (' + ($data) + '[' + ($vSchema) + '[' + ($i) + ']] === undefined ';
        if ($ownProperties) {
          out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', ' + ($vSchema) + '[' + ($i) + ']) ';
        }
        out += ') {  var err =   '; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'';
            if (it.opts._errorDataPathProperty) {
              out += 'is a required property';
            } else {
              out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } ';
        if ($isData) {
          out += '  }  ';
        }
      } else {
        var arr3 = $required;
        if (arr3) {
          var $propertyKey, i3 = -1,
            l3 = arr3.length - 1;
          while (i3 < l3) {
            $propertyKey = arr3[i3 += 1];
            var $prop = it.util.getProperty($propertyKey),
              $missingProperty = it.util.escapeQuotes($propertyKey),
              $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += ' if ( ' + ($useData) + ' === undefined ';
            if ($ownProperties) {
              out += ' || ! Object.prototype.hasOwnProperty.call(' + ($data) + ', \'' + (it.util.escapeQuotes($propertyKey)) + '\') ';
            }
            out += ') {  var err =   '; /* istanbul ignore else */
            if (it.createErrors !== false) {
              out += ' { keyword: \'' + ('required') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { missingProperty: \'' + ($missingProperty) + '\' } ';
              if (it.opts.messages !== false) {
                out += ' , message: \'';
                if (it.opts._errorDataPathProperty) {
                  out += 'is a required property';
                } else {
                  out += 'should have required property \\\'' + ($missingProperty) + '\\\'';
                }
                out += '\' ';
              }
              if (it.opts.verbose) {
                out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
              }
              out += ' } ';
            } else {
              out += ' {} ';
            }
            out += ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
          }
        }
      }
    }
    it.errorPath = $currentErrorPath;
  } else if ($breakOnError) {
    out += ' if (true) {';
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/uniqueItems.js":
/*!***************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/uniqueItems.js ***!
  \***************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_uniqueItems(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  var $valid = 'valid' + $lvl;
  var $isData = it.opts.$data && $schema && $schema.$data,
    $schemaValue;
  if ($isData) {
    out += ' var schema' + ($lvl) + ' = ' + (it.util.getData($schema.$data, $dataLvl, it.dataPathArr)) + '; ';
    $schemaValue = 'schema' + $lvl;
  } else {
    $schemaValue = $schema;
  }
  if (($schema || $isData) && it.opts.uniqueItems !== false) {
    if ($isData) {
      out += ' var ' + ($valid) + '; if (' + ($schemaValue) + ' === false || ' + ($schemaValue) + ' === undefined) ' + ($valid) + ' = true; else if (typeof ' + ($schemaValue) + ' != \'boolean\') ' + ($valid) + ' = false; else { ';
    }
    out += ' var i = ' + ($data) + '.length , ' + ($valid) + ' = true , j; if (i > 1) { ';
    var $itemType = it.schema.items && it.schema.items.type,
      $typeIsArray = Array.isArray($itemType);
    if (!$itemType || $itemType == 'object' || $itemType == 'array' || ($typeIsArray && ($itemType.indexOf('object') >= 0 || $itemType.indexOf('array') >= 0))) {
      out += ' outer: for (;i--;) { for (j = i; j--;) { if (equal(' + ($data) + '[i], ' + ($data) + '[j])) { ' + ($valid) + ' = false; break outer; } } } ';
    } else {
      out += ' var itemIndices = {}, item; for (;i--;) { var item = ' + ($data) + '[i]; ';
      var $method = 'checkDataType' + ($typeIsArray ? 's' : '');
      out += ' if (' + (it.util[$method]($itemType, 'item', it.opts.strictNumbers, true)) + ') continue; ';
      if ($typeIsArray) {
        out += ' if (typeof item == \'string\') item = \'"\' + item; ';
      }
      out += ' if (typeof itemIndices[item] == \'number\') { ' + ($valid) + ' = false; j = itemIndices[item]; break; } itemIndices[item] = i; } ';
    }
    out += ' } ';
    if ($isData) {
      out += '  }  ';
    }
    out += ' if (!' + ($valid) + ') {   ';
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = ''; /* istanbul ignore else */
    if (it.createErrors !== false) {
      out += ' { keyword: \'' + ('uniqueItems') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { i: i, j: j } ';
      if (it.opts.messages !== false) {
        out += ' , message: \'should NOT have duplicate items (items ## \' + j + \' and \' + i + \' are identical)\' ';
      }
      if (it.opts.verbose) {
        out += ' , schema:  ';
        if ($isData) {
          out += 'validate.schema' + ($schemaPath);
        } else {
          out += '' + ($schema);
        }
        out += '         , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' } ';
    } else {
      out += ' {} ';
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      /* istanbul ignore if */
      if (it.async) {
        out += ' throw new ValidationError([' + (__err) + ']); ';
      } else {
        out += ' validate.errors = [' + (__err) + ']; return false; ';
      }
    } else {
      out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
    }
    out += ' } ';
    if ($breakOnError) {
      out += ' else { ';
    }
  } else {
    if ($breakOnError) {
      out += ' if (true) { ';
    }
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/dotjs/validate.js":
/*!************************************************!*\
  !*** ./node_modules/ajv/lib/dotjs/validate.js ***!
  \************************************************/
/***/ ((module) => {

"use strict";

module.exports = function generate_validate(it, $keyword, $ruleType) {
  var out = '';
  var $async = it.schema.$async === true,
    $refKeywords = it.util.schemaHasRulesExcept(it.schema, it.RULES.all, '$ref'),
    $id = it.self._getId(it.schema);
  if (it.opts.strictKeywords) {
    var $unknownKwd = it.util.schemaUnknownRules(it.schema, it.RULES.keywords);
    if ($unknownKwd) {
      var $keywordsMsg = 'unknown keyword: ' + $unknownKwd;
      if (it.opts.strictKeywords === 'log') it.logger.warn($keywordsMsg);
      else throw new Error($keywordsMsg);
    }
  }
  if (it.isTop) {
    out += ' var validate = ';
    if ($async) {
      it.async = true;
      out += 'async ';
    }
    out += 'function(data, dataPath, parentData, parentDataProperty, rootData) { \'use strict\'; ';
    if ($id && (it.opts.sourceCode || it.opts.processCode)) {
      out += ' ' + ('/\*# sourceURL=' + $id + ' */') + ' ';
    }
  }
  if (typeof it.schema == 'boolean' || !($refKeywords || it.schema.$ref)) {
    var $keyword = 'false schema';
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = 'data' + ($dataLvl || '');
    var $valid = 'valid' + $lvl;
    if (it.schema === false) {
      if (it.isTop) {
        $breakOnError = true;
      } else {
        out += ' var ' + ($valid) + ' = false; ';
      }
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = ''; /* istanbul ignore else */
      if (it.createErrors !== false) {
        out += ' { keyword: \'' + ($errorKeyword || 'false schema') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: {} ';
        if (it.opts.messages !== false) {
          out += ' , message: \'boolean schema is false\' ';
        }
        if (it.opts.verbose) {
          out += ' , schema: false , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
        }
        out += ' } ';
      } else {
        out += ' {} ';
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        /* istanbul ignore if */
        if (it.async) {
          out += ' throw new ValidationError([' + (__err) + ']); ';
        } else {
          out += ' validate.errors = [' + (__err) + ']; return false; ';
        }
      } else {
        out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
      }
    } else {
      if (it.isTop) {
        if ($async) {
          out += ' return data; ';
        } else {
          out += ' validate.errors = null; return true; ';
        }
      } else {
        out += ' var ' + ($valid) + ' = true; ';
      }
    }
    if (it.isTop) {
      out += ' }; return validate; ';
    }
    return out;
  }
  if (it.isTop) {
    var $top = it.isTop,
      $lvl = it.level = 0,
      $dataLvl = it.dataLevel = 0,
      $data = 'data';
    it.rootId = it.resolve.fullPath(it.self._getId(it.root.schema));
    it.baseId = it.baseId || it.rootId;
    delete it.isTop;
    it.dataPathArr = [""];
    if (it.schema.default !== undefined && it.opts.useDefaults && it.opts.strictDefaults) {
      var $defaultMsg = 'default is ignored in the schema root';
      if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
      else throw new Error($defaultMsg);
    }
    out += ' var vErrors = null; ';
    out += ' var errors = 0;     ';
    out += ' if (rootData === undefined) rootData = data; ';
  } else {
    var $lvl = it.level,
      $dataLvl = it.dataLevel,
      $data = 'data' + ($dataLvl || '');
    if ($id) it.baseId = it.resolve.url(it.baseId, $id);
    if ($async && !it.async) throw new Error('async schema in sync schema');
    out += ' var errs_' + ($lvl) + ' = errors;';
  }
  var $valid = 'valid' + $lvl,
    $breakOnError = !it.opts.allErrors,
    $closingBraces1 = '',
    $closingBraces2 = '';
  var $errorKeyword;
  var $typeSchema = it.schema.type,
    $typeIsArray = Array.isArray($typeSchema);
  if ($typeSchema && it.opts.nullable && it.schema.nullable === true) {
    if ($typeIsArray) {
      if ($typeSchema.indexOf('null') == -1) $typeSchema = $typeSchema.concat('null');
    } else if ($typeSchema != 'null') {
      $typeSchema = [$typeSchema, 'null'];
      $typeIsArray = true;
    }
  }
  if ($typeIsArray && $typeSchema.length == 1) {
    $typeSchema = $typeSchema[0];
    $typeIsArray = false;
  }
  if (it.schema.$ref && $refKeywords) {
    if (it.opts.extendRefs == 'fail') {
      throw new Error('$ref: validation keywords used in schema at path "' + it.errSchemaPath + '" (see option extendRefs)');
    } else if (it.opts.extendRefs !== true) {
      $refKeywords = false;
      it.logger.warn('$ref: keywords ignored in schema at path "' + it.errSchemaPath + '"');
    }
  }
  if (it.schema.$comment && it.opts.$comment) {
    out += ' ' + (it.RULES.all.$comment.code(it, '$comment'));
  }
  if ($typeSchema) {
    if (it.opts.coerceTypes) {
      var $coerceToTypes = it.util.coerceToTypes(it.opts.coerceTypes, $typeSchema);
    }
    var $rulesGroup = it.RULES.types[$typeSchema];
    if ($coerceToTypes || $typeIsArray || $rulesGroup === true || ($rulesGroup && !$shouldUseGroup($rulesGroup))) {
      var $schemaPath = it.schemaPath + '.type',
        $errSchemaPath = it.errSchemaPath + '/type';
      var $schemaPath = it.schemaPath + '.type',
        $errSchemaPath = it.errSchemaPath + '/type',
        $method = $typeIsArray ? 'checkDataTypes' : 'checkDataType';
      out += ' if (' + (it.util[$method]($typeSchema, $data, it.opts.strictNumbers, true)) + ') { ';
      if ($coerceToTypes) {
        var $dataType = 'dataType' + $lvl,
          $coerced = 'coerced' + $lvl;
        out += ' var ' + ($dataType) + ' = typeof ' + ($data) + '; var ' + ($coerced) + ' = undefined; ';
        if (it.opts.coerceTypes == 'array') {
          out += ' if (' + ($dataType) + ' == \'object\' && Array.isArray(' + ($data) + ') && ' + ($data) + '.length == 1) { ' + ($data) + ' = ' + ($data) + '[0]; ' + ($dataType) + ' = typeof ' + ($data) + '; if (' + (it.util.checkDataType(it.schema.type, $data, it.opts.strictNumbers)) + ') ' + ($coerced) + ' = ' + ($data) + '; } ';
        }
        out += ' if (' + ($coerced) + ' !== undefined) ; ';
        var arr1 = $coerceToTypes;
        if (arr1) {
          var $type, $i = -1,
            l1 = arr1.length - 1;
          while ($i < l1) {
            $type = arr1[$i += 1];
            if ($type == 'string') {
              out += ' else if (' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\') ' + ($coerced) + ' = \'\' + ' + ($data) + '; else if (' + ($data) + ' === null) ' + ($coerced) + ' = \'\'; ';
            } else if ($type == 'number' || $type == 'integer') {
              out += ' else if (' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' === null || (' + ($dataType) + ' == \'string\' && ' + ($data) + ' && ' + ($data) + ' == +' + ($data) + ' ';
              if ($type == 'integer') {
                out += ' && !(' + ($data) + ' % 1)';
              }
              out += ')) ' + ($coerced) + ' = +' + ($data) + '; ';
            } else if ($type == 'boolean') {
              out += ' else if (' + ($data) + ' === \'false\' || ' + ($data) + ' === 0 || ' + ($data) + ' === null) ' + ($coerced) + ' = false; else if (' + ($data) + ' === \'true\' || ' + ($data) + ' === 1) ' + ($coerced) + ' = true; ';
            } else if ($type == 'null') {
              out += ' else if (' + ($data) + ' === \'\' || ' + ($data) + ' === 0 || ' + ($data) + ' === false) ' + ($coerced) + ' = null; ';
            } else if (it.opts.coerceTypes == 'array' && $type == 'array') {
              out += ' else if (' + ($dataType) + ' == \'string\' || ' + ($dataType) + ' == \'number\' || ' + ($dataType) + ' == \'boolean\' || ' + ($data) + ' == null) ' + ($coerced) + ' = [' + ($data) + ']; ';
            }
          }
        }
        out += ' else {   ';
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
          if ($typeIsArray) {
            out += '' + ($typeSchema.join(","));
          } else {
            out += '' + ($typeSchema);
          }
          out += '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should be ';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
        out += ' } if (' + ($coerced) + ' !== undefined) {  ';
        var $parentData = $dataLvl ? 'data' + (($dataLvl - 1) || '') : 'parentData',
          $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : 'parentDataProperty';
        out += ' ' + ($data) + ' = ' + ($coerced) + '; ';
        if (!$dataLvl) {
          out += 'if (' + ($parentData) + ' !== undefined)';
        }
        out += ' ' + ($parentData) + '[' + ($parentDataProperty) + '] = ' + ($coerced) + '; } ';
      } else {
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = ''; /* istanbul ignore else */
        if (it.createErrors !== false) {
          out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
          if ($typeIsArray) {
            out += '' + ($typeSchema.join(","));
          } else {
            out += '' + ($typeSchema);
          }
          out += '\' } ';
          if (it.opts.messages !== false) {
            out += ' , message: \'should be ';
            if ($typeIsArray) {
              out += '' + ($typeSchema.join(","));
            } else {
              out += '' + ($typeSchema);
            }
            out += '\' ';
          }
          if (it.opts.verbose) {
            out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
          }
          out += ' } ';
        } else {
          out += ' {} ';
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          /* istanbul ignore if */
          if (it.async) {
            out += ' throw new ValidationError([' + (__err) + ']); ';
          } else {
            out += ' validate.errors = [' + (__err) + ']; return false; ';
          }
        } else {
          out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
        }
      }
      out += ' } ';
    }
  }
  if (it.schema.$ref && !$refKeywords) {
    out += ' ' + (it.RULES.all.$ref.code(it, '$ref')) + ' ';
    if ($breakOnError) {
      out += ' } if (errors === ';
      if ($top) {
        out += '0';
      } else {
        out += 'errs_' + ($lvl);
      }
      out += ') { ';
      $closingBraces2 += '}';
    }
  } else {
    var arr2 = it.RULES;
    if (arr2) {
      var $rulesGroup, i2 = -1,
        l2 = arr2.length - 1;
      while (i2 < l2) {
        $rulesGroup = arr2[i2 += 1];
        if ($shouldUseGroup($rulesGroup)) {
          if ($rulesGroup.type) {
            out += ' if (' + (it.util.checkDataType($rulesGroup.type, $data, it.opts.strictNumbers)) + ') { ';
          }
          if (it.opts.useDefaults) {
            if ($rulesGroup.type == 'object' && it.schema.properties) {
              var $schema = it.schema.properties,
                $schemaKeys = Object.keys($schema);
              var arr3 = $schemaKeys;
              if (arr3) {
                var $propertyKey, i3 = -1,
                  l3 = arr3.length - 1;
                while (i3 < l3) {
                  $propertyKey = arr3[i3 += 1];
                  var $sch = $schema[$propertyKey];
                  if ($sch.default !== undefined) {
                    var $passData = $data + it.util.getProperty($propertyKey);
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = 'default is ignored for: ' + $passData;
                        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                        else throw new Error($defaultMsg);
                      }
                    } else {
                      out += ' if (' + ($passData) + ' === undefined ';
                      if (it.opts.useDefaults == 'empty') {
                        out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                      }
                      out += ' ) ' + ($passData) + ' = ';
                      if (it.opts.useDefaults == 'shared') {
                        out += ' ' + (it.useDefault($sch.default)) + ' ';
                      } else {
                        out += ' ' + (JSON.stringify($sch.default)) + ' ';
                      }
                      out += '; ';
                    }
                  }
                }
              }
            } else if ($rulesGroup.type == 'array' && Array.isArray(it.schema.items)) {
              var arr4 = it.schema.items;
              if (arr4) {
                var $sch, $i = -1,
                  l4 = arr4.length - 1;
                while ($i < l4) {
                  $sch = arr4[$i += 1];
                  if ($sch.default !== undefined) {
                    var $passData = $data + '[' + $i + ']';
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = 'default is ignored for: ' + $passData;
                        if (it.opts.strictDefaults === 'log') it.logger.warn($defaultMsg);
                        else throw new Error($defaultMsg);
                      }
                    } else {
                      out += ' if (' + ($passData) + ' === undefined ';
                      if (it.opts.useDefaults == 'empty') {
                        out += ' || ' + ($passData) + ' === null || ' + ($passData) + ' === \'\' ';
                      }
                      out += ' ) ' + ($passData) + ' = ';
                      if (it.opts.useDefaults == 'shared') {
                        out += ' ' + (it.useDefault($sch.default)) + ' ';
                      } else {
                        out += ' ' + (JSON.stringify($sch.default)) + ' ';
                      }
                      out += '; ';
                    }
                  }
                }
              }
            }
          }
          var arr5 = $rulesGroup.rules;
          if (arr5) {
            var $rule, i5 = -1,
              l5 = arr5.length - 1;
            while (i5 < l5) {
              $rule = arr5[i5 += 1];
              if ($shouldUseRule($rule)) {
                var $code = $rule.code(it, $rule.keyword, $rulesGroup.type);
                if ($code) {
                  out += ' ' + ($code) + ' ';
                  if ($breakOnError) {
                    $closingBraces1 += '}';
                  }
                }
              }
            }
          }
          if ($breakOnError) {
            out += ' ' + ($closingBraces1) + ' ';
            $closingBraces1 = '';
          }
          if ($rulesGroup.type) {
            out += ' } ';
            if ($typeSchema && $typeSchema === $rulesGroup.type && !$coerceToTypes) {
              out += ' else { ';
              var $schemaPath = it.schemaPath + '.type',
                $errSchemaPath = it.errSchemaPath + '/type';
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = ''; /* istanbul ignore else */
              if (it.createErrors !== false) {
                out += ' { keyword: \'' + ($errorKeyword || 'type') + '\' , dataPath: (dataPath || \'\') + ' + (it.errorPath) + ' , schemaPath: ' + (it.util.toQuotedString($errSchemaPath)) + ' , params: { type: \'';
                if ($typeIsArray) {
                  out += '' + ($typeSchema.join(","));
                } else {
                  out += '' + ($typeSchema);
                }
                out += '\' } ';
                if (it.opts.messages !== false) {
                  out += ' , message: \'should be ';
                  if ($typeIsArray) {
                    out += '' + ($typeSchema.join(","));
                  } else {
                    out += '' + ($typeSchema);
                  }
                  out += '\' ';
                }
                if (it.opts.verbose) {
                  out += ' , schema: validate.schema' + ($schemaPath) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
                }
                out += ' } ';
              } else {
                out += ' {} ';
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                /* istanbul ignore if */
                if (it.async) {
                  out += ' throw new ValidationError([' + (__err) + ']); ';
                } else {
                  out += ' validate.errors = [' + (__err) + ']; return false; ';
                }
              } else {
                out += ' var err = ' + (__err) + ';  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ';
              }
              out += ' } ';
            }
          }
          if ($breakOnError) {
            out += ' if (errors === ';
            if ($top) {
              out += '0';
            } else {
              out += 'errs_' + ($lvl);
            }
            out += ') { ';
            $closingBraces2 += '}';
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += ' ' + ($closingBraces2) + ' ';
  }
  if ($top) {
    if ($async) {
      out += ' if (errors === 0) return data;           ';
      out += ' else throw new ValidationError(vErrors); ';
    } else {
      out += ' validate.errors = vErrors; ';
      out += ' return errors === 0;       ';
    }
    out += ' }; return validate;';
  } else {
    out += ' var ' + ($valid) + ' = errors === errs_' + ($lvl) + ';';
  }

  function $shouldUseGroup($rulesGroup) {
    var rules = $rulesGroup.rules;
    for (var i = 0; i < rules.length; i++)
      if ($shouldUseRule(rules[i])) return true;
  }

  function $shouldUseRule($rule) {
    return it.schema[$rule.keyword] !== undefined || ($rule.implements && $ruleImplementsSomeKeyword($rule));
  }

  function $ruleImplementsSomeKeyword($rule) {
    var impl = $rule.implements;
    for (var i = 0; i < impl.length; i++)
      if (it.schema[impl[i]] !== undefined) return true;
  }
  return out;
}


/***/ }),

/***/ "./node_modules/ajv/lib/keyword.js":
/*!*****************************************!*\
  !*** ./node_modules/ajv/lib/keyword.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var IDENTIFIER = /^[a-z_$][a-z0-9_$-]*$/i;
var customRuleCode = __webpack_require__(/*! ./dotjs/custom */ "./node_modules/ajv/lib/dotjs/custom.js");
var definitionSchema = __webpack_require__(/*! ./definition_schema */ "./node_modules/ajv/lib/definition_schema.js");

module.exports = {
  add: addKeyword,
  get: getKeyword,
  remove: removeKeyword,
  validate: validateKeyword
};


/**
 * Define custom keyword
 * @this  Ajv
 * @param {String} keyword custom keyword, should be unique (including different from all standard, custom and macro keywords).
 * @param {Object} definition keyword definition object with properties `type` (type(s) which the keyword applies to), `validate` or `compile`.
 * @return {Ajv} this for method chaining
 */
function addKeyword(keyword, definition) {
  /* jshint validthis: true */
  /* eslint no-shadow: 0 */
  var RULES = this.RULES;
  if (RULES.keywords[keyword])
    throw new Error('Keyword ' + keyword + ' is already defined');

  if (!IDENTIFIER.test(keyword))
    throw new Error('Keyword ' + keyword + ' is not a valid identifier');

  if (definition) {
    this.validateKeyword(definition, true);

    var dataType = definition.type;
    if (Array.isArray(dataType)) {
      for (var i=0; i<dataType.length; i++)
        _addRule(keyword, dataType[i], definition);
    } else {
      _addRule(keyword, dataType, definition);
    }

    var metaSchema = definition.metaSchema;
    if (metaSchema) {
      if (definition.$data && this._opts.$data) {
        metaSchema = {
          anyOf: [
            metaSchema,
            { '$ref': 'https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#' }
          ]
        };
      }
      definition.validateSchema = this.compile(metaSchema, true);
    }
  }

  RULES.keywords[keyword] = RULES.all[keyword] = true;


  function _addRule(keyword, dataType, definition) {
    var ruleGroup;
    for (var i=0; i<RULES.length; i++) {
      var rg = RULES[i];
      if (rg.type == dataType) {
        ruleGroup = rg;
        break;
      }
    }

    if (!ruleGroup) {
      ruleGroup = { type: dataType, rules: [] };
      RULES.push(ruleGroup);
    }

    var rule = {
      keyword: keyword,
      definition: definition,
      custom: true,
      code: customRuleCode,
      implements: definition.implements
    };
    ruleGroup.rules.push(rule);
    RULES.custom[keyword] = rule;
  }

  return this;
}


/**
 * Get keyword
 * @this  Ajv
 * @param {String} keyword pre-defined or custom keyword.
 * @return {Object|Boolean} custom keyword definition, `true` if it is a predefined keyword, `false` otherwise.
 */
function getKeyword(keyword) {
  /* jshint validthis: true */
  var rule = this.RULES.custom[keyword];
  return rule ? rule.definition : this.RULES.keywords[keyword] || false;
}


/**
 * Remove keyword
 * @this  Ajv
 * @param {String} keyword pre-defined or custom keyword.
 * @return {Ajv} this for method chaining
 */
function removeKeyword(keyword) {
  /* jshint validthis: true */
  var RULES = this.RULES;
  delete RULES.keywords[keyword];
  delete RULES.all[keyword];
  delete RULES.custom[keyword];
  for (var i=0; i<RULES.length; i++) {
    var rules = RULES[i].rules;
    for (var j=0; j<rules.length; j++) {
      if (rules[j].keyword == keyword) {
        rules.splice(j, 1);
        break;
      }
    }
  }
  return this;
}


/**
 * Validate keyword definition
 * @this  Ajv
 * @param {Object} definition keyword definition object.
 * @param {Boolean} throwError true to throw exception if definition is invalid
 * @return {boolean} validation result
 */
function validateKeyword(definition, throwError) {
  validateKeyword.errors = null;
  var v = this._validateKeyword = this._validateKeyword
                                  || this.compile(definitionSchema, true);

  if (v(definition)) return true;
  validateKeyword.errors = v.errors;
  if (throwError)
    throw new Error('custom keyword definition is invalid: '  + this.errorsText(v.errors));
  else
    return false;
}


/***/ }),

/***/ "./node_modules/fast-deep-equal/index.js":
/*!***********************************************!*\
  !*** ./node_modules/fast-deep-equal/index.js ***!
  \***********************************************/
/***/ ((module) => {

"use strict";


// do not edit .js files directly - edit src/index.jst



module.exports = function equal(a, b) {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;)
        if (!equal(a[i], b[i])) return false;
      return true;
    }



    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;)
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

    for (i = length; i-- !== 0;) {
      var key = keys[i];

      if (!equal(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a!==a && b!==b;
};


/***/ }),

/***/ "./node_modules/fast-json-stable-stringify/index.js":
/*!**********************************************************!*\
  !*** ./node_modules/fast-json-stable-stringify/index.js ***!
  \**********************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (data, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (node) {
        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        if (node === undefined) return;
        if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
        if (typeof node !== 'object') return JSON.stringify(node);

        var i, out;
        if (Array.isArray(node)) {
            out = '[';
            for (i = 0; i < node.length; i++) {
                if (i) out += ',';
                out += stringify(node[i]) || 'null';
            }
            return out + ']';
        }

        if (node === null) return 'null';

        if (seen.indexOf(node) !== -1) {
            if (cycles) return JSON.stringify('__cycle__');
            throw new TypeError('Converting circular structure to JSON');
        }

        var seenIndex = seen.push(node) - 1;
        var keys = Object.keys(node).sort(cmp && cmp(node));
        out = '';
        for (i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = stringify(node[key]);

            if (!value) continue;
            if (out) out += ',';
            out += JSON.stringify(key) + ':' + value;
        }
        seen.splice(seenIndex, 1);
        return '{' + out + '}';
    })(data);
};


/***/ }),

/***/ "./node_modules/json-schema-traverse/index.js":
/*!****************************************************!*\
  !*** ./node_modules/json-schema-traverse/index.js ***!
  \****************************************************/
/***/ ((module) => {

"use strict";


var traverse = module.exports = function (schema, opts, cb) {
  // Legacy support for v0.3.1 and earlier.
  if (typeof opts == 'function') {
    cb = opts;
    opts = {};
  }

  cb = opts.cb || cb;
  var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
  var post = cb.post || function() {};

  _traverse(opts, pre, post, schema, '', schema);
};


traverse.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true
};

traverse.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};

traverse.propsKeywords = {
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};

traverse.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};


function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse.arrayKeywords) {
          for (var i=0; i<sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse.propsKeywords) {
        if (sch && typeof sch == 'object') {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
        _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}


function escapeJsonPtr(str) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}


/***/ }),

/***/ "./node_modules/json-tool/js/JsonTool.js":
/*!***********************************************!*\
  !*** ./node_modules/json-tool/js/JsonTool.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JsonTool = void 0;
class JsonTool {
    constructor(element, validator = null) {
        var _a, _b;
        this.containerElement = element;
        this.validator = validator !== null && validator !== void 0 ? validator : (() => { return { valid: true }; });
        this.schema = null;
        this.root = document.createElement("div");
        this.root.style.fontFamily = "monospace";
        this.root.style.marginLeft = "30px";
        this.root.classList.add("json-tool");
        this.rootObject = null;
        this.rootElement = null;
        this.errorMessages = document.createElement("div");
        this.errorMessages.classList.add("json-tool-errors");
        const iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.overflow = "scroll";
        iframe.style.border = "0";
        element.innerHTML = "";
        element.appendChild(iframe);
        this.iframeBody = (_b = (iframe.contentDocument || ((_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document))) === null || _b === void 0 ? void 0 : _b.querySelector("body");
        this.iframeBody.append(this.root);
        this.createCss(this.iframeBody);
        iframe.onload = () => {
            var _a, _b;
            this.iframeBody = (_b = (iframe.contentDocument || ((_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document))) === null || _b === void 0 ? void 0 : _b.querySelector("body");
            this.iframeBody.append(this.root);
            this.createCss(this.iframeBody);
            this.iframeBody.appendChild(this.errorMessages);
        };
    }
    load(schema, value, validator) {
        this.validator = validator !== null && validator !== void 0 ? validator : this.validator;
        this.schema = schema;
        this.root.innerHTML = "";
        if (schema.title) {
            const title = document.createElement("h3");
            title.textContent = schema.title;
            JsonElement.addDescription(title, schema.description, schema === null || schema === void 0 ? void 0 : schema.examples);
            this.root.appendChild(title);
        }
        this.rootObject = document.createElement("div");
        this.root.appendChild(this.rootObject);
        this.rootElement = new JsonElement(this.rootObject, schema, value, () => this.onUpdate(), () => this.validate());
        this.validate();
    }
    hide() {
        this.containerElement.innerHTML = "";
    }
    setValidator(validator) {
        this.validator = validator;
    }
    getValue() {
        var _a;
        return (_a = this.rootElement) === null || _a === void 0 ? void 0 : _a.getValue();
    }
    onUpdate() {
        var _a;
        if (!this.rootObject)
            return;
        let number = 1;
        (_a = this.rootObject) === null || _a === void 0 ? void 0 : _a.querySelectorAll(".line-number").forEach(e => {
            e.innerText = number.toString();
            number++;
        });
        this.validate();
    }
    validate() {
        window.setTimeout(() => {
            var _a;
            if (this.schema && this.errorMessages) {
                const valid = this.validator(this.getValue(), this.schema);
                this.errorMessages.innerHTML = "";
                if (!valid.valid) {
                    this.errorMessages.innerHTML = ((_a = valid.errors) !== null && _a !== void 0 ? _a : []).map(e => typeof e === "string" ? e : e.message).join("\n");
                }
            }
        }, 1);
    }
    createCss(parent) {
        const style = document.createElement("style");
        parent.appendChild(style);
        style.innerHTML =
            `
            .json-tool-btn
             {
                border: 1px black solid;
                cursor: pointer;
                display: block;
             }
              .json-tool-block > .json-tool-btn {
                margin-top: -17px;
                margin-left: -40px;
                position: absolute;
                opacity: 0;
              }
              .json-tool-block:hover > .json-tool-btn
              {
                opacity: 1;
              }
              .json-tool-value > .json-tool-btn {
                margin-left: 10px;
                display: inline-block;
                position: absolute;
                opacity :0;
              }
              .json-tool-value:hover > .json-tool-btn
              {
                opacity :1;
              }
              .json-tool-key > .json-tool-btns {
                margin-left: -32px;
                display: inline-block;
                position: absolute;
                width: 32px;
                text-align: right;
                opacity: 0;
              }
              .json-tool-key:hover > .json-tool-btns
              {
                opacity: 1;
              }

              .json-tool-key > .json-tool-btns > .json-tool-btn {
                display: inline-block;
                margin-right: 2px;
              }
              .json-tool-value > .json-tool-type
              {
                float:right;
                opacity: 0;
                padding:0;
                margin:0;
                border:0;
              }
              .json-tool-value.json-tool-object > .json-tool-type
              {
                float:none;
                position: absolute;
                margin-left: 15px;
              }
              .json-tool-value:hover > .json-tool-type
              {
                opacity: 1;
              }

              .json-tool-block.opened > .json-tool-key {display: block}
              .json-tool-block.closed > .json-tool-key {display: none}

              .line-number
              {
                position: absolute;
                left: 0;
                text-align: right;
                width: 20px;
              }
              .json-tool-value.json-tool-object > .line-number
              {
                margin-top: -15px;
              }
              .json-tool input, .json-tool select, .json-tool textarea
              {
                border: 0;
                background-color: #ece9e9;
                padding: 0;
                margin: 1px;
              }

                .json-tool-errors {
                    color: red;
                    white-space: pre;
                    font-family: monospace;
                    line-height: 2em;
                    font-weight: bold;
                    font-size: 1.2em;
                }
`;
    }
}
exports.JsonTool = JsonTool;
class JsonElement {
    constructor(element, schema, value, onUpdate, validate) {
        this.arrayElements = [];
        this.objectElements = {};
        this.element = element;
        this.setStyle();
        this.schema = schema;
        this.onUpdate = onUpdate;
        this.validate = validate;
        this.currentValues = {};
        this.types = schema ? JsonElement.getDefaultAvailableTypes(schema) : [];
        const actualType = JsonElement.getType(value);
        this.currentType = "";
        if (actualType !== "undefined") {
            this.currentType = actualType;
            this.types.push(actualType);
            this.setCurrentTypeValue(value);
        }
        else if (this.schema) {
            const def = JsonElement.getDefaultValue(this.schema);
            this.currentType = def.type;
            this.setCurrentTypeValue(def.value);
        }
        this.types = [...new Set(this.types)];
        this.updateElement();
    }
    setCurrentTypeValue(value) {
        this.currentValues[this.currentType] = typeof value !== "undefined" ? JSON.parse(JSON.stringify(value)) : undefined;
        if (this.validate)
            this.validate();
    }
    static addDescription(element, description, examples) {
        if (examples) {
            description = `${description ? `${description}\n` : ""}Examples:\n${examples.map(e => JSON.stringify(e)).join(",\n")}`;
        }
        if (description) {
            element.title = description;
            element.style.textDecoration = "underline dotted";
            element.style.cursor = "help";
        }
    }
    static getType(value) {
        if (typeof value === "undefined")
            return "undefined";
        if (Array.isArray(value)) {
            return "array";
        }
        else if (value === null) {
            return "null";
        }
        else {
            return typeof value;
        }
    }
    static isInteger(schema) {
        if (!schema)
            return false;
        const arr = Array.isArray(schema.type) ? schema.type : [schema.type];
        return arr.includes("integer") && !arr.includes("number");
    }
    static getDefaultAvailableTypes(schema) {
        let types = Array.isArray(schema.type) ? [...schema.type] : [schema.type];
        types = types.map(t => {
            if (t === "integer")
                return "number";
            return t;
        });
        return types;
    }
    static getDefaultValue(schema) {
        const availableTypes = this.getDefaultAvailableTypes(schema);
        if (typeof schema.default !== "undefined") {
            return { type: this.getType(schema.default), value: schema.default };
        }
        else if (schema.examples && schema.examples.length > 0) {
            return { type: this.getType(schema.examples[0]), value: schema.examples[0] };
        }
        else {
            return { type: availableTypes[0], value: this.getDefaultValueForType(schema, availableTypes[0]) };
        }
    }
    static getDefaultValueForType(schema, type) {
        var _a, _b, _c;
        if (type === "null") {
            return null;
        }
        else if (type === "number") {
            return this.isInteger(schema) ? Math.ceil((_a = schema === null || schema === void 0 ? void 0 : schema.minimum) !== null && _a !== void 0 ? _a : 0) : (_b = schema === null || schema === void 0 ? void 0 : schema.minimum) !== null && _b !== void 0 ? _b : 0;
        }
        else if (type === "string") {
            if (schema === null || schema === void 0 ? void 0 : schema.enum)
                return schema.enum[0];
            if ((schema === null || schema === void 0 ? void 0 : schema.format) === "color")
                return "#000000";
            if ((schema === null || schema === void 0 ? void 0 : schema.format) === "date")
                return new Date().toDateString();
            return "";
        }
        else if (type === "boolean") {
            return false;
        }
        else if (type === "array") {
            return [];
        }
        else if (type === "object") {
            const obj = {};
            if (schema === null || schema === void 0 ? void 0 : schema.properties) {
                for (const required of (_c = schema.required) !== null && _c !== void 0 ? _c : []) {
                    if (!schema.properties.hasOwnProperty(required))
                        continue;
                    const def = this.getDefaultValue(schema.properties[required]);
                    obj[required] = def.value;
                }
            }
            return obj;
        }
    }
    updateElement() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        this.objectElements = {};
        this.arrayElements = [];
        this.element.innerHTML = "";
        this.element.style.display = "inline-block";
        this.element.classList.remove("json-tool-object");
        this.element.append(this.createLineNumber());
        const type = this.currentType;
        const val = (_a = this.currentValues[type]) !== null && _a !== void 0 ? _a : (this.currentValues[type] = JsonElement.getDefaultValueForType(this.schema, type));
        if (this.types.length > 1) {
            const select = document.createElement("select");
            select.classList.add("json-tool-type");
            for (const t of this.types) {
                const option = document.createElement("option");
                option.innerText = t;
                option.value = t;
                select.append(option);
            }
            select.value = this.currentType;
            select.onchange = () => {
                this.changeType(select.value);
            };
            this.element.append(select);
        }
        if (type === "object") {
            this.element.append(this.createLineNumber(true));
            this.element.style.display = "block";
            this.element.classList.add("json-tool-object");
            this.element.append("{");
            const object = this.createBlock();
            this.element.append(object);
            this.element.append("}");
            this.element.append(this.createLineNumber());
            for (const key in val !== null && val !== void 0 ? val : {}) {
                const obj = this.createObjectKeyValuePair(key, ((_b = this.schema) === null || _b === void 0 ? void 0 : _b.properties) ? this.schema.properties[key] : null, val[key]);
                object.append(obj);
                const buttons = document.createElement("div");
                obj.prepend(buttons);
                buttons.classList.add("json-tool-btns");
                if (((_c = this.schema) === null || _c === void 0 ? void 0 : _c.properties) && !this.schema.properties.hasOwnProperty(key)) {
                    const remove = document.createElement("div");
                    remove.classList.add("json-tool-btn");
                    remove.innerText = "X";
                    remove.onclick = () => {
                        const val = this.getValue();
                        delete val[key];
                        this.setCurrentTypeValue(val);
                        this.updateElement();
                    };
                    buttons.append(remove);
                }
                else if (!((_e = (_d = this.schema) === null || _d === void 0 ? void 0 : _d.required) === null || _e === void 0 ? void 0 : _e.includes(key))) {
                    const remove = document.createElement("div");
                    remove.classList.add("json-tool-btn");
                    remove.innerText = "∽";
                    remove.onclick = () => {
                        const val = this.getValue();
                        delete val[key];
                        this.setCurrentTypeValue(val);
                        this.updateElement();
                    };
                    buttons.append(remove);
                }
            }
            if ((_f = this.schema) === null || _f === void 0 ? void 0 : _f.properties) {
                for (const key in this.schema.properties) {
                    if (val === null || val === void 0 ? void 0 : val.hasOwnProperty(key))
                        continue;
                    if ((_h = (_g = this.schema) === null || _g === void 0 ? void 0 : _g.required) === null || _h === void 0 ? void 0 : _h.includes(key)) {
                        const obj = this.createObjectKeyValuePair(key, this.schema.properties[key]);
                        object.append(obj);
                    }
                    else {
                        const obj = this.createObjectKeyValuePair(key, this.schema.properties[key], undefined, true);
                        object.append(obj);
                        obj.style.textDecoration = "line-through 2px";
                        const buttons = document.createElement("div");
                        obj.prepend(buttons);
                        buttons.classList.add("json-tool-btns");
                        const add = document.createElement("div");
                        add.classList.add("json-tool-btn");
                        add.innerText = "≁";
                        add.onclick = () => {
                            var _a;
                            if ((_a = this.schema) === null || _a === void 0 ? void 0 : _a.properties) {
                                const val = this.getValue();
                                val[key] = JsonElement.getDefaultValue(this.schema.properties[key]).value;
                                this.setCurrentTypeValue(val);
                                this.updateElement();
                            }
                        };
                        buttons.append(add);
                    }
                }
            }
        }
        else if (type === "array") {
            this.element.append(this.createLineNumber(true));
            this.element.style.display = "block";
            this.element.classList.add("json-tool-object");
            this.element.append("[");
            const array = this.createBlock();
            this.element.append(array);
            const add = document.createElement("div");
            add.classList.add("json-tool-btn");
            add.innerText = "+";
            this.element.append(add);
            add.onclick = () => {
                var _a, _b;
                const val = [...this.getValue()];
                if (val.length === ((_a = this.schema) === null || _a === void 0 ? void 0 : _a.maxItems))
                    return;
                if ((_b = this.schema) === null || _b === void 0 ? void 0 : _b.items) {
                    const defaultValue = JsonElement.getDefaultValue(this.schema.items).value;
                    val.push(defaultValue);
                    this.currentType = type;
                    this.setCurrentTypeValue(val);
                    this.updateElement();
                }
            };
            this.element.append("]");
            this.element.append(this.createLineNumber());
            const arr = val !== null && val !== void 0 ? val : [];
            for (let i = 0; i < arr.length; i++) {
                const idx = i;
                const obj = this.createObjectKeyValuePair(i, ((_j = this.schema) === null || _j === void 0 ? void 0 : _j.items) ? this.schema.items : null, val[i]);
                array.append(obj);
                const buttons = document.createElement("div");
                obj.prepend(buttons);
                buttons.classList.add("json-tool-btns");
                const remove = document.createElement("div");
                remove.classList.add("json-tool-btn");
                remove.innerText = "X";
                remove.onclick = () => {
                    var _a;
                    const arr = [...this.getValue()];
                    if (arr.length === ((_a = this.schema) === null || _a === void 0 ? void 0 : _a.minItems))
                        return;
                    arr.splice(idx, 1);
                    this.setCurrentTypeValue(arr);
                    this.updateElement();
                };
                buttons.append(remove);
                const up = document.createElement("div");
                up.classList.add("json-tool-btn");
                up.innerText = "ᐃ";
                up.onclick = () => {
                    let arr = [...this.getValue()];
                    const element = arr.splice(idx, 1);
                    arr = arr.slice(0, idx - 1).concat(element).concat(arr.slice(idx - 1));
                    this.setCurrentTypeValue(arr);
                    this.updateElement();
                };
                buttons.append(up);
                const down = document.createElement("div");
                down.classList.add("json-tool-btn");
                down.innerText = "ᐁ";
                down.onclick = () => {
                    let arr = [...this.getValue()];
                    const element = arr.splice(idx, 1);
                    arr = arr.slice(0, idx + 1).concat(element).concat(arr.slice(idx + 1));
                    this.setCurrentTypeValue(arr);
                    this.updateElement();
                };
                buttons.append(down);
            }
        }
        else if (type === "boolean") {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = val;
            checkbox.onchange = () => {
                this.setCurrentTypeValue(checkbox.checked);
            };
            this.element.append(checkbox);
        }
        else if (type === "string") {
            if ((_k = this.schema) === null || _k === void 0 ? void 0 : _k.enum) {
                const select = document.createElement("select");
                for (const value of [...new Set(this.schema.enum.concat(val))]) {
                    const option = document.createElement("option");
                    option.innerText = value;
                    option.value = value;
                    select.append(option);
                }
                select.value = val;
                select.onchange = () => {
                    this.setCurrentTypeValue(select.value);
                };
                this.element.append(select);
            }
            else if (((_l = this.schema) === null || _l === void 0 ? void 0 : _l.format) === "textarea") {
                const input = document.createElement("textarea");
                input.value = val;
                input.minLength = (_o = (_m = this.schema) === null || _m === void 0 ? void 0 : _m.minLength) !== null && _o !== void 0 ? _o : 0;
                input.maxLength = (_q = (_p = this.schema) === null || _p === void 0 ? void 0 : _p.maxLength) !== null && _q !== void 0 ? _q : 99999999999999;
                input.onchange = () => {
                    this.setCurrentTypeValue(input.value);
                };
                this.element.append(input);
            }
            else if (((_r = this.schema) === null || _r === void 0 ? void 0 : _r.format) === "date") {
                const input = document.createElement("input");
                input.type = "date";
                input.onchange = () => {
                    var _a, _b;
                    this.setCurrentTypeValue((_b = (_a = input.valueAsDate) === null || _a === void 0 ? void 0 : _a.toDateString()) !== null && _b !== void 0 ? _b : "");
                };
                this.element.append(input);
                input.valueAsDate = new Date(val);
            }
            else {
                const input = document.createElement("input");
                input.type = "text";
                if (((_s = this.schema) === null || _s === void 0 ? void 0 : _s.format) && ["password", "email", "color", "url"].includes(this.schema.format))
                    input.type = this.schema.format;
                input.value = val;
                input.minLength = (_u = (_t = this.schema) === null || _t === void 0 ? void 0 : _t.minLength) !== null && _u !== void 0 ? _u : 0;
                input.maxLength = (_w = (_v = this.schema) === null || _v === void 0 ? void 0 : _v.maxLength) !== null && _w !== void 0 ? _w : 99999999999999;
                input.onchange = () => {
                    this.setCurrentTypeValue(input.value);
                };
                this.element.append(input);
            }
        }
        else if (type === "null") {
            this.element.append("null");
        }
        else if (type === "number") {
            const input = document.createElement("input");
            input.type = "number";
            input.value = val.toString();
            input.min = (_z = (_y = (_x = this.schema) === null || _x === void 0 ? void 0 : _x.minimum) === null || _y === void 0 ? void 0 : _y.toString()) !== null && _z !== void 0 ? _z : "";
            input.max = (_2 = (_1 = (_0 = this.schema) === null || _0 === void 0 ? void 0 : _0.maximum) === null || _1 === void 0 ? void 0 : _1.toString()) !== null && _2 !== void 0 ? _2 : "";
            if (JsonElement.isInteger(this.schema))
                input.step = "1";
            input.onchange = () => {
                this.setCurrentTypeValue(parseFloat(input.value));
            };
            this.element.append(input);
        }
        else {
            this.element.append(`[${type}] : ${val}`);
        }
        if (this.onUpdate)
            this.onUpdate();
    }
    createLineNumber(overrideMargin = false) {
        const lineNumber = document.createElement("div");
        lineNumber.classList.add("line-number");
        if (overrideMargin)
            lineNumber.style.marginTop = "0";
        return lineNumber;
    }
    createBlock() {
        const block = document.createElement("div");
        block.classList.add("json-tool-block");
        block.style.paddingLeft = "25px";
        block.style.borderLeft = "1px dashed black";
        block.style.marginLeft = "3px";
        let opened = false;
        const collapse = document.createElement("div");
        block.append(collapse);
        collapse.classList.add("json-tool-btn");
        const toggle = () => {
            opened = !opened;
            collapse.innerText = opened ? "ᐯ" : "ᐳ";
            block.classList.remove("opened", "closed");
            block.classList.add(opened ? "opened" : "closed");
        };
        collapse.onclick = toggle;
        toggle();
        return block;
    }
    createObjectKeyValuePair(key, schema, value, noValue = false) {
        var _a;
        const parent = document.createElement("div");
        const originalKey = key;
        if (typeof key === "number") {
            key = (schema === null || schema === void 0 ? void 0 : schema.title) ? `${schema.title} ${key}` : key;
        }
        else {
            key = (_a = schema === null || schema === void 0 ? void 0 : schema.title) !== null && _a !== void 0 ? _a : key;
        }
        const title = document.createElement("span");
        title.innerText = key.toString();
        JsonElement.addDescription(title, schema === null || schema === void 0 ? void 0 : schema.description, schema === null || schema === void 0 ? void 0 : schema.examples);
        parent.append(title);
        parent.classList.add("json-tool-key");
        parent.append(": ");
        if (!noValue) {
            const valueElement = document.createElement("div");
            const element = new JsonElement(valueElement, schema, value, () => this.onUpdate && this.onUpdate(), () => this.validate && this.validate());
            if (this.currentType === "array")
                this.arrayElements.push(element);
            else if (this.currentType === "object")
                this.objectElements[originalKey] = element;
            parent.append(valueElement);
        }
        return parent;
    }
    changeType(type) {
        var _a;
        this.currentType = type;
        if (!this.currentValues.hasOwnProperty(type)) {
            if (typeof ((_a = this.schema) === null || _a === void 0 ? void 0 : _a.default) !== "undefined" && JsonElement.getType(this.schema.default) === type)
                this.setCurrentTypeValue(this.schema.default);
            else
                this.setCurrentTypeValue(JsonElement.getDefaultValueForType(this.schema, type));
        }
        this.updateElement();
    }
    setStyle() {
        this.element.style.whiteSpace = "pre";
        this.element.classList.add("json-tool-value");
    }
    getValue() {
        var _a;
        let val;
        if (this.currentType === "array") {
            val = this.arrayElements.map(e => e.getValue());
        }
        else if (this.currentType === "object") {
            const obj = {};
            for (const key in this.objectElements) {
                obj[key] = this.objectElements[key].getValue();
            }
            val = obj;
        }
        else {
            val = (_a = this.currentValues[this.currentType]) !== null && _a !== void 0 ? _a : JsonElement.getDefaultValueForType(this.schema, this.currentType);
        }
        this.currentValues[this.currentType] = val;
        return val;
    }
}
//# sourceMappingURL=JsonTool.js.map

/***/ }),

/***/ "./src/www/ApiUtils.ts":
/*!*****************************!*\
  !*** ./src/www/ApiUtils.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ApiUtils = void 0;
var ApiUtils = /** @class */ (function () {
    function ApiUtils() {
    }
    ApiUtils.run = function (url, json) {
        return __awaiter(this, void 0, void 0, function () {
            var rawResponse, body, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(json)
                        })];
                    case 1:
                        rawResponse = _a.sent();
                        return [4 /*yield*/, rawResponse.json()];
                    case 2:
                        body = _a.sent();
                        status = rawResponse.status;
                        return [2 /*return*/, { status: status, body: body }];
                }
            });
        });
    };
    return ApiUtils;
}());
exports.ApiUtils = ApiUtils;


/***/ }),

/***/ "./src/www/Schema.ts":
/*!***************************!*\
  !*** ./src/www/Schema.ts ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Schema = void 0;
var tsch_1 = __webpack_require__(/*! tsch */ "./node_modules/tsch/dist/index.js");
var ajv_1 = __importDefault(__webpack_require__(/*! ajv */ "./node_modules/ajv/lib/ajv.js"));
var Schema = /** @class */ (function () {
    function Schema(schemaFile, schemaContent, name, jsonSchema, tsch) {
        this.schemaFile = schemaFile;
        this.schemaContent = schemaContent;
        this.regex = Schema.getRegex(name);
        this.jsonSchema = jsonSchema;
        this.tsch = tsch;
    }
    Schema.prototype.getSchemaFile = function () {
        return this.schemaFile;
    };
    Schema.prototype.getSchemaContent = function () {
        return this.schemaContent;
    };
    Schema.prototype.getRegex = function () {
        return this.regex;
    };
    Schema.prototype.validate = function (value) {
        var _a;
        if (!!this.tsch)
            return this.tsch.validate(value);
        if (!!this.jsonSchema) {
            var ajv = new ajv_1.default();
            var validate = ajv.compile(this.jsonSchema);
            var valid = validate(value);
            var errors = valid ? [] : ((_a = validate.errors) !== null && _a !== void 0 ? _a : []).map(function (v) { var _a; return "".concat(v.dataPath, " ").concat((_a = v.message) !== null && _a !== void 0 ? _a : ""); });
            return { valid: !!valid, errors: errors };
        }
        return { valid: true, errors: [] };
    };
    Schema.prototype.getJsonSchema = function () {
        if (!!this.tsch)
            return this.tsch.getJsonSchemaProperty();
        return this.jsonSchema;
    };
    Schema.parseSchema = function (file, content, result) {
        if (!result)
            result = [];
        var addJsonSchema = function (name, jsonSchema) { return Schema.addJsonSchema(result !== null && result !== void 0 ? result : [], file, content, name, jsonSchema); };
        var addTsch = function (name, tsch) { return Schema.addTsch(result !== null && result !== void 0 ? result : [], file, content, name, tsch); };
        var tsch = tsch_1.tsch;
        try {
            "use strict";
            eval(content);
        }
        catch (e) {
            console.warn("Exception during ".concat(file), e);
        }
        return result;
    };
    Schema.getRegex = function (name) {
        return new RegExp("^" + name.split("*")
            .map(function (s) { return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); })
            .join(".*") + "$");
    };
    Schema.addJsonSchema = function (schemas, schemaFile, content, name, jsonSchema) {
        schemas.push(new Schema(schemaFile, content, name, jsonSchema));
    };
    Schema.addTsch = function (schemas, schemaFile, content, name, tsch) {
        schemas.push(new Schema(schemaFile, content, name, undefined, tsch));
    };
    return Schema;
}());
exports.Schema = Schema;


/***/ }),

/***/ "./src/www/ServerUtils.ts":
/*!********************************!*\
  !*** ./src/www/ServerUtils.ts ***!
  \********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ServerUtils = void 0;
var ApiUtils_1 = __webpack_require__(/*! ./ApiUtils */ "./src/www/ApiUtils.ts");
var Schema_1 = __webpack_require__(/*! ./Schema */ "./src/www/Schema.ts");
var ServerUtils = /** @class */ (function () {
    function ServerUtils() {
    }
    ServerUtils.list = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ApiUtils_1.ApiUtils.run("/api", {
                            command: "list"
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ServerUtils.load = function (schema, json) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ApiUtils_1.ApiUtils.run("/api", {
                            command: "load",
                            schema: schema,
                            json: json
                        })];
                    case 1:
                        result = _a.sent();
                        if (!result.body.schemaContent)
                            return [2 /*return*/, result];
                        result.body.schema = Schema_1.Schema.parseSchema(schema, result.body.schemaContent)[0];
                        return [2 /*return*/, result];
                }
            });
        });
    };
    ServerUtils.save = function (schema, json, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ApiUtils_1.ApiUtils.run("/api", {
                            command: "save",
                            schema: schema,
                            json: json,
                            value: value
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ServerUtils;
}());
exports.ServerUtils = ServerUtils;


/***/ }),

/***/ "./src/www/index.ts":
/*!**************************!*\
  !*** ./src/www/index.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Client = void 0;
var ServerUtils_1 = __webpack_require__(/*! ./ServerUtils */ "./src/www/ServerUtils.ts");
var JsonTool_1 = __webpack_require__(/*! json-tool/js/JsonTool */ "./node_modules/json-tool/js/JsonTool.js");
var Client = /** @class */ (function () {
    function Client() {
        var _this = this;
        this.schemas = {};
        this.schema = null;
        this.jsonTool = null;
        this.schemaFile = null;
        this.jsonFile = null;
        var menu = document.querySelector("#menu");
        this.jsonToolRoot = document.querySelector("#json-tool");
        this.select = document.createElement("select");
        menu.appendChild(this.select);
        this.select.onchange = function () { return _this.onFileChange(); };
        this.buttons = document.createElement("div");
        var save = document.createElement("button");
        save.innerText = "Save changes";
        save.onclick = function () { return _this.save(); };
        var close = document.createElement("button");
        close.innerText = "Discard changes";
        close.onclick = function () { return _this.close(); };
        this.buttons.appendChild(save);
        this.buttons.appendChild(close);
        menu.appendChild(this.buttons);
        this.setJsonToolVisible(false);
    }
    Client.prototype.close = function () {
        this.setJsonToolVisible(false);
    };
    Client.prototype.setJsonToolVisible = function (visible) {
        var _a;
        this.select.style.display = !visible ? "" : "none";
        this.buttons.style.display = visible ? "" : "none";
        if (!visible) {
            (_a = this.jsonTool) === null || _a === void 0 ? void 0 : _a.hide();
            this.loadFiles();
        }
    };
    Client.prototype.onFileChange = function () {
        return __awaiter(this, void 0, void 0, function () {
            var value, split, schema, json;
            return __generator(this, function (_a) {
                value = this.select.value;
                split = value.split("@");
                schema = split[0];
                json = split[1];
                this.loadFile(schema, json);
                return [2 /*return*/];
            });
        });
    };
    Client.prototype.loadFile = function (schema, json) {
        return __awaiter(this, void 0, void 0, function () {
            var result, jsonSchema;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ServerUtils_1.ServerUtils.load(schema, json)];
                    case 1:
                        result = _a.sent();
                        if (result.body.schema) {
                            this.schema = result.body.schema;
                            jsonSchema = result.body.schema.getJsonSchema();
                            if (jsonSchema) {
                                this.schemaFile = schema;
                                this.jsonFile = json;
                                this.setJsonToolVisible(true);
                                this.jsonTool = new JsonTool_1.JsonTool(this.jsonToolRoot);
                                this.jsonTool.load(jsonSchema, result.body.value, function (v) { return result.body.schema.validate(v); });
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Client.prototype.save = function () {
        return __awaiter(this, void 0, void 0, function () {
            var value, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.schema)
                            return [2 /*return*/];
                        if (!this.jsonTool)
                            return [2 /*return*/];
                        if (!this.jsonFile)
                            return [2 /*return*/];
                        if (!this.schemaFile)
                            return [2 /*return*/];
                        value = this.jsonTool.getValue();
                        if (!this.schema.validate(value).valid)
                            return [2 /*return*/, alert("Please fix all errors before saving!")];
                        return [4 /*yield*/, ServerUtils_1.ServerUtils.save(this.schemaFile, this.jsonFile, value)];
                    case 1:
                        result = _a.sent();
                        if (result.status === 200) {
                            this.setJsonToolVisible(false);
                        }
                        else {
                            alert("Failed to save: ".concat(result.body.msg));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Client.prototype.loadFiles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, defaultOption, schema, _i, _a, file, option;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, ServerUtils_1.ServerUtils.list()];
                    case 1:
                        result = _b.sent();
                        if (result.status !== 200)
                            return [2 /*return*/];
                        this.schemas = result.body.schemas;
                        this.select.innerHTML = "";
                        defaultOption = document.createElement("option");
                        defaultOption.disabled = true;
                        defaultOption.selected = true;
                        defaultOption.innerText = "==Choose file==";
                        this.select.appendChild(defaultOption);
                        for (schema in this.schemas) {
                            for (_i = 0, _a = this.schemas[schema]; _i < _a.length; _i++) {
                                file = _a[_i];
                                option = document.createElement("option");
                                option.value = "".concat(schema, "@").concat(file);
                                option.innerText = file;
                                this.select.appendChild(option);
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return Client;
}());
exports.Client = Client;
new Client();


/***/ }),

/***/ "./node_modules/tsch/dist/TschType.js":
/*!********************************************!*\
  !*** ./node_modules/tsch/dist/TschType.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TschArray = exports.TschObject = exports.TschUnion = exports.TschUndefined = exports.TschNull = exports.TschBoolean = exports.TschNumber = exports.TschString = exports.TschType = void 0;
class TschValidationError {
    constructor(path, message) {
        this.path = path;
        this.pathString = TschValidationError.formatPath(path);
        this.rawMessage = message;
        this.message = `${this.pathString}: ${message}`;
    }
    static formatPath(path) {
        if (path.length < 1)
            return "root";
        return path.join(".");
    }
}
class TschType {
    constructor(type) {
        this._ts = null; //_ts is only used by Typescript for type inference, and so actually doesn't need to be assigned
        this._type = type;
        this._title = null;
        this._description = null;
        this._default = null;
        this._examples = null;
    }
    union(other) {
        return new TschUnion(this, other);
    }
    optional() {
        return new TschUnion(this, new TschUndefined());
    }
    nullable() {
        return new TschUnion(this, new TschNull());
    }
    clone() {
        const clone = this.newInstance();
        clone._title = this._title;
        clone._description = this._description;
        clone._default = this._default;
        clone._examples = this._examples ? [...this._examples] : null;
        return clone;
    }
    title(title) {
        const clone = this.clone();
        clone._title = title;
        return clone;
    }
    description(descriptin) {
        const clone = this.clone();
        clone._description = descriptin;
        return clone;
    }
    default(defaultValue) {
        const clone = this.clone();
        clone._default = defaultValue;
        return clone;
    }
    examples(examples) {
        const clone = this.clone();
        clone._examples = [...examples];
        return clone;
    }
    getJsonSchemaProperty() {
        const schema = {
            "type": this._type
        };
        if (this._title)
            schema.title = this._title;
        if (this._description)
            schema.description = this._description;
        if (this._default)
            schema.default = this._default;
        if (this._examples)
            schema.examples = this._examples;
        return schema;
    }
    validate(input) {
        const errors = [];
        this.validateInternal([], input, errors);
        return { valid: errors.length == 0, errors };
    }
    validateInternal(path, input, errors) {
        if (!this.isCorrectType(input)) {
            errors.push(new TschValidationError(path, `Value has to be of type ${this.getTypeName()}`));
            return;
        }
        this.validateCorrectType(path, input, errors);
    }
    isOptional() { return false; }
    isNullable() { return false; }
}
exports.TschType = TschType;
class TschString extends TschType {
    constructor() {
        super("string");
        this._format = null;
        this._enum = null;
        this._minLength = null;
        this._maxLength = null;
    }
    newInstance() {
        return new TschString();
    }
    clone() {
        const clone = super.clone();
        clone._format = this._format;
        clone._enum = this._enum;
        clone._minLength = this._minLength;
        clone._maxLength = this._maxLength;
        return clone;
    }
    getJsonSchemaProperty() {
        const schema = super.getJsonSchemaProperty();
        if (this._format)
            schema.format = this._format;
        if (this._enum)
            schema.enum = this._enum;
        if (this._minLength)
            schema.minLength = this._minLength;
        if (this._maxLength)
            schema.maxLength = this._maxLength;
        return schema;
    }
    minLength(min) {
        const clone = this.clone();
        clone._minLength = min;
        return clone;
    }
    maxLength(max) {
        const clone = this.clone();
        clone._maxLength = max;
        return clone;
    }
    enumeration(enumeration) {
        const clone = this.clone();
        clone._enum = [...enumeration];
        return clone;
    }
    format(format) {
        const clone = this.clone();
        clone._format = format;
        return clone;
    }
    color() {
        return this.format("color");
    }
    date() {
        return this.format("date");
    }
    email() {
        return this.format("email");
    }
    password() {
        return this.format("password");
    }
    textarea() {
        return this.format("textarea");
    }
    url() {
        return this.format("url");
    }
    isCorrectType(input) {
        return typeof input === "string";
    }
    getTypeName() { return "string"; }
    validateCorrectType(path, input, errors) {
        if (!!this._enum && !this._enum.includes(input)) {
            errors.push(new TschValidationError(path, `Value has to be one of the following: ${this._enum.join(", ")}`));
        }
        if (typeof this._minLength === "number" && input.length < this._minLength) {
            errors.push(new TschValidationError(path, `Value must be longer than ${this._minLength} characters.`));
        }
        if (typeof this._maxLength === "number" && input.length > this._maxLength) {
            errors.push(new TschValidationError(path, `Value must be shorter than ${this._maxLength} characters.`));
        }
        if (this._format === "color" && !/^#?[0-9a-f]{3,6}$/i.test(input)) {
            errors.push(new TschValidationError(path, `Value must be a color hex code.`));
        }
        if (this._format === "date" && Number.isNaN(Date.parse(input))) {
            errors.push(new TschValidationError(path, `Value must be a date.`));
        }
        if (this._format === "email" && !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(input)) {
            errors.push(new TschValidationError(path, `Value must be an email.`));
        }
        if (this._format === "url" && !/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/.test(input)) {
            errors.push(new TschValidationError(path, `Value must be a URL.`));
        }
    }
}
exports.TschString = TschString;
class TschNumber extends TschType {
    constructor() {
        super("number");
        this._integer = false;
        this._min = null;
        this._max = null;
    }
    newInstance() {
        return new TschNumber();
    }
    clone() {
        const clone = super.clone();
        clone._integer = this._integer;
        clone._min = this._min;
        clone._max = this._max;
        return clone;
    }
    integer() {
        const clone = this.clone();
        clone._integer = true;
        return clone;
    }
    min(min) {
        const clone = this.clone();
        clone._min = min;
        return clone;
    }
    max(max) {
        const clone = this.clone();
        clone._max = max;
        return clone;
    }
    getJsonSchemaProperty() {
        const schema = super.getJsonSchemaProperty();
        if (this._integer)
            schema.type = "integer";
        if (this._min !== null)
            schema.minimum = this._min;
        if (this._max !== null)
            schema.maximum = this._max;
        return schema;
    }
    isCorrectType(input) {
        return typeof input === "number";
    }
    getTypeName() { return "number"; }
    validateCorrectType(path, input, errors) {
        if (this._integer && !Number.isInteger(input)) {
            errors.push(new TschValidationError(path, `Value has to be an integer.`));
        }
        if (typeof this._min === "number" && input < this._min) {
            errors.push(new TschValidationError(path, `Value must be at least ${this._min}.`));
        }
        if (typeof this._max === "number" && input > this._max) {
            errors.push(new TschValidationError(path, `Value must be at less than ${this._max}.`));
        }
    }
}
exports.TschNumber = TschNumber;
class TschBoolean extends TschType {
    constructor() {
        super("boolean");
    }
    newInstance() {
        return new TschBoolean();
    }
    clone() {
        const clone = super.clone();
        return clone;
    }
    isCorrectType(input) {
        return typeof input === "boolean";
    }
    getTypeName() { return "boolean"; }
    validateCorrectType(path, input, errors) {
    }
}
exports.TschBoolean = TschBoolean;
class TschNull extends TschType {
    constructor() {
        super("null");
    }
    newInstance() {
        return new TschNull();
    }
    clone() {
        const clone = super.clone();
        return clone;
    }
    isCorrectType(input) {
        return input === null;
    }
    getTypeName() { return "null"; }
    validateCorrectType(path, input, errors) {
    }
}
exports.TschNull = TschNull;
class TschUndefined extends TschType {
    constructor() {
        super("undefined");
    }
    newInstance() {
        return new TschUndefined();
    }
    clone() {
        const clone = super.clone();
        return clone;
    }
    isCorrectType(input) {
        return typeof input === "undefined";
    }
    getTypeName() { return "undefined"; }
    validateCorrectType(path, input, errors) {
    }
}
exports.TschUndefined = TschUndefined;
class TschUnion extends TschType {
    constructor(type1, type2) {
        super(`union_${type1._type}_${type2._type}`);
        this.type1 = type1;
        this.type2 = type2;
    }
    Type1Internal() { return this.type1; }
    Type2Internal() { return this.type2; }
    newInstance() {
        return new TschUnion(this.type1.clone(), this.type2.clone());
    }
    clone() {
        const clone = super.clone();
        clone.type1 = this.Type1Internal().clone();
        clone.type2 = this.Type2Internal().clone();
        return clone;
    }
    getJsonSchemaProperty() {
        var _a, _b, _c, _d;
        const schema1 = this.Type1Internal()._type === "undefined" ? {} : this.type1.getJsonSchemaProperty();
        const schema2 = this.Type2Internal()._type === "undefined" ? {} : this.type2.getJsonSchemaProperty();
        const combined = Object.assign(Object.assign({}, schema1), schema2);
        combined.type = [...(Array.isArray(schema1.type) ? schema1.type : [schema1.type]), ...(Array.isArray(schema2.type) ? schema2.type : [schema2.type])].filter(t => !!t && t !== "undefined");
        if (combined.type.length < 2)
            combined.type = combined.type[0];
        if (schema1.properties && schema2.properties) {
            combined.properties = Object.assign(Object.assign({}, ((_a = schema1.properties) !== null && _a !== void 0 ? _a : {})), ((_b = schema2.properties) !== null && _b !== void 0 ? _b : {}));
            if (!!schema1.required && !!schema2.required)
                combined.required = schema1.required.filter((f) => { var _a; return (_a = schema2.required) === null || _a === void 0 ? void 0 : _a.includes(f); });
            else
                combined.required = (_d = (_c = schema1.required) !== null && _c !== void 0 ? _c : schema2.required) !== null && _d !== void 0 ? _d : [];
        }
        if (this._title)
            combined.title = this._title;
        if (this._description)
            combined.description = this._description;
        if (this._default)
            combined.default = this._default;
        return combined;
    }
    isNullable() {
        return this.Type1Internal()._type === "null" || this.Type2Internal()._type === "null" || this.Type1Internal().isNullable() || this.Type2Internal().isNullable();
    }
    isOptional() {
        return this.Type1Internal()._type === "undefined" || this.Type2Internal()._type === "undefined" || this.Type1Internal().isOptional() || this.Type2Internal().isOptional();
    }
    isCorrectType(input) {
        return this.Type1Internal().isCorrectType(input) || this.Type2Internal().isCorrectType(input);
    }
    getTypeName() { return `${this.type1.getTypeName()} or ${this.type2.getTypeName()}`; }
    validateCorrectType(path, input, errors) {
        if (this.Type1Internal().isCorrectType(input)) {
            this.Type1Internal().validateInternal(path, input, errors);
        }
        if (this.Type2Internal().isCorrectType(input)) {
            this.Type2Internal().validateInternal(path, input, errors);
        }
    }
}
exports.TschUnion = TschUnion;
class TschObject extends TschType {
    constructor(shape) {
        super("object");
        this.shape = shape;
    }
    newInstance() {
        return new TschObject(this.shape);
    }
    clone() {
        const clone = super.clone();
        clone.shape = this.shape;
        return clone;
    }
    getJsonSchemaProperty() {
        const schema = super.getJsonSchemaProperty();
        schema.required = Object.keys(this.shape).filter(k => !this.shape[k].isOptional());
        schema.properties = {};
        for (const key in this.shape) {
            schema.properties[key] = this.shape[key].getJsonSchemaProperty();
        }
        return schema;
    }
    isCorrectType(input) {
        return typeof input === "object" && input !== null && !Array.isArray(input);
    }
    getTypeName() {
        return "object";
    }
    validateCorrectType(path, input, errors) {
        for (const key in this.shape) {
            const child = this.shape[key];
            const childInternal = child;
            if (!childInternal.isOptional() && !input.hasOwnProperty(key)) {
                errors.push(new TschValidationError(path, `Property ${key} of type ${childInternal.getTypeName()} is required.`));
            }
            if (input.hasOwnProperty(key)) {
                childInternal.validateInternal([...path, key], input[key], errors);
            }
        }
    }
}
exports.TschObject = TschObject;
class TschArray extends TschType {
    constructor(elementType) {
        super("array");
        this.elementType = elementType;
        this._format = null;
        this._minElementCount = null;
        this._maxElementCount = null;
        this._unique = false;
    }
    newInstance() {
        return new TschArray(this.elementType);
    }
    clone() {
        const clone = super.clone();
        clone.elementType = this.elementType;
        clone._format = this._format;
        clone._unique = this._unique;
        clone._minElementCount = this._minElementCount;
        clone._maxElementCount = this._maxElementCount;
        return clone;
    }
    getJsonSchemaProperty() {
        const schema = super.getJsonSchemaProperty();
        schema.items = this.elementType.getJsonSchemaProperty();
        if (this._format)
            schema.format = this._format;
        if (this._unique)
            schema.uniqueItems = this._unique;
        if (this._minElementCount)
            schema.minItems = this._minElementCount;
        if (this._maxElementCount)
            schema.maxItems = this._maxElementCount;
        return schema;
    }
    table() {
        const clone = this.clone();
        clone._format = "table";
        return clone;
    }
    minElements(count) {
        const clone = this.clone();
        clone._minElementCount = count;
        return clone;
    }
    maxElements(count) {
        const clone = this.clone();
        clone._maxElementCount = count;
        return clone;
    }
    unique() {
        const clone = this.clone();
        clone._unique = true;
        return clone;
    }
    isCorrectType(input) {
        return typeof input === "object" && input !== null && Array.isArray(input);
    }
    getTypeName() {
        return `array of ${this.elementType.getTypeName()}`;
    }
    validateCorrectType(path, input, errors) {
        const elementTypeInternal = this.elementType;
        const used = new Set();
        if (typeof this._minElementCount === "number" && input.length < this._minElementCount) {
            errors.push(new TschValidationError(path, `Array must contain at least ${this._minElementCount} elements.`));
        }
        if (typeof this._maxElementCount === "number" && input.length > this._maxElementCount) {
            errors.push(new TschValidationError(path, `Array must contain at most ${this._maxElementCount} elements.`));
        }
        for (let i = 0; i < input.length; i++) {
            const element = input[i];
            elementTypeInternal.validateInternal([...path, i.toString()], element, errors);
            if (this._unique) {
                const json = JSON.stringify(element);
                if (used.has(json)) {
                    errors.push(new TschValidationError(path, "All values have to be unique."));
                }
                used.add(json);
            }
        }
    }
}
exports.TschArray = TschArray;
//# sourceMappingURL=TschType.js.map

/***/ }),

/***/ "./node_modules/tsch/dist/index.js":
/*!*****************************************!*\
  !*** ./node_modules/tsch/dist/index.js ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tsch = void 0;
const tsch = __importStar(__webpack_require__(/*! ./tsch */ "./node_modules/tsch/dist/tsch.js"));
exports.tsch = tsch;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/tsch/dist/tsch.js":
/*!****************************************!*\
  !*** ./node_modules/tsch/dist/tsch.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.array = exports.object = exports.boolean = exports.number = exports.string = void 0;
const TschType_1 = __webpack_require__(/*! ./TschType */ "./node_modules/tsch/dist/TschType.js");
function string() { return new TschType_1.TschString(); }
exports.string = string;
function number() { return new TschType_1.TschNumber(); }
exports.number = number;
function boolean() { return new TschType_1.TschBoolean(); }
exports.boolean = boolean;
function object(shape) {
    return new TschType_1.TschObject(shape);
}
exports.object = object;
function array(elementType) {
    return new TschType_1.TschArray(elementType);
}
exports.array = array;
//# sourceMappingURL=tsch.js.map

/***/ }),

/***/ "./node_modules/uri-js/dist/es5/uri.all.js":
/*!*************************************************!*\
  !*** ./node_modules/uri-js/dist/es5/uri.all.js ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports) {

/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
(function (global, factory) {
	 true ? factory(exports) :
	0;
}(this, (function (exports) { 'use strict';

function merge() {
    for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
        sets[_key] = arguments[_key];
    }

    if (sets.length > 1) {
        sets[0] = sets[0].slice(0, -1);
        var xl = sets.length - 1;
        for (var x = 1; x < xl; ++x) {
            sets[x] = sets[x].slice(1, -1);
        }
        sets[xl] = sets[xl].slice(1);
        return sets.join('');
    } else {
        return sets[0];
    }
}
function subexp(str) {
    return "(?:" + str + ")";
}
function typeOf(o) {
    return o === undefined ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
}
function toUpperCase(str) {
    return str.toUpperCase();
}
function toArray(obj) {
    return obj !== undefined && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
}
function assign(target, source) {
    var obj = target;
    if (source) {
        for (var key in source) {
            obj[key] = source[key];
        }
    }
    return obj;
}

function buildExps(isIRI) {
    var ALPHA$$ = "[A-Za-z]",
        CR$ = "[\\x0D]",
        DIGIT$$ = "[0-9]",
        DQUOTE$$ = "[\\x22]",
        HEXDIG$$ = merge(DIGIT$$, "[A-Fa-f]"),
        //case-insensitive
    LF$$ = "[\\x0A]",
        SP$$ = "[\\x20]",
        PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)),
        //expanded
    GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]",
        SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]",
        RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$),
        UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]",
        //subset, excludes bidi control characters
    IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]",
        //subset
    UNRESERVED$$ = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$),
        SCHEME$ = subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*"),
        USERINFO$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]")) + "*"),
        DEC_OCTET$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("[1-9]" + DIGIT$$) + "|" + DIGIT$$),
        DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$),
        //relaxed parsing rules
    IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$),
        H16$ = subexp(HEXDIG$$ + "{1,4}"),
        LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$),
        IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$),
        //                           6( h16 ":" ) ls32
    IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$),
        //                      "::" 5( h16 ":" ) ls32
    IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$),
        //[               h16 ] "::" 4( h16 ":" ) ls32
    IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$),
        //[ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
    IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$),
        //[ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
    IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$),
        //[ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
    IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$),
        //[ *4( h16 ":" ) h16 ] "::"              ls32
    IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$),
        //[ *5( h16 ":" ) h16 ] "::"              h16
    IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"),
        //[ *6( h16 ":" ) h16 ] "::"
    IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")),
        ZONEID$ = subexp(subexp(UNRESERVED$$ + "|" + PCT_ENCODED$) + "+"),
        //RFC 6874
    IPV6ADDRZ$ = subexp(IPV6ADDRESS$ + "\\%25" + ZONEID$),
        //RFC 6874
    IPV6ADDRZ_RELAXED$ = subexp(IPV6ADDRESS$ + subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + ZONEID$),
        //RFC 6874, with relaxed parsing rules
    IPVFUTURE$ = subexp("[vV]" + HEXDIG$$ + "+\\." + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:]") + "+"),
        IP_LITERAL$ = subexp("\\[" + subexp(IPV6ADDRZ_RELAXED$ + "|" + IPV6ADDRESS$ + "|" + IPVFUTURE$) + "\\]"),
        //RFC 6874
    REG_NAME$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$)) + "*"),
        HOST$ = subexp(IP_LITERAL$ + "|" + IPV4ADDRESS$ + "(?!" + REG_NAME$ + ")" + "|" + REG_NAME$),
        PORT$ = subexp(DIGIT$$ + "*"),
        AUTHORITY$ = subexp(subexp(USERINFO$ + "@") + "?" + HOST$ + subexp("\\:" + PORT$) + "?"),
        PCHAR$ = subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@]")),
        SEGMENT$ = subexp(PCHAR$ + "*"),
        SEGMENT_NZ$ = subexp(PCHAR$ + "+"),
        SEGMENT_NZ_NC$ = subexp(subexp(PCT_ENCODED$ + "|" + merge(UNRESERVED$$, SUB_DELIMS$$, "[\\@]")) + "+"),
        PATH_ABEMPTY$ = subexp(subexp("\\/" + SEGMENT$) + "*"),
        PATH_ABSOLUTE$ = subexp("\\/" + subexp(SEGMENT_NZ$ + PATH_ABEMPTY$) + "?"),
        //simplified
    PATH_NOSCHEME$ = subexp(SEGMENT_NZ_NC$ + PATH_ABEMPTY$),
        //simplified
    PATH_ROOTLESS$ = subexp(SEGMENT_NZ$ + PATH_ABEMPTY$),
        //simplified
    PATH_EMPTY$ = "(?!" + PCHAR$ + ")",
        PATH$ = subexp(PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$),
        QUERY$ = subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*"),
        FRAGMENT$ = subexp(subexp(PCHAR$ + "|[\\/\\?]") + "*"),
        HIER_PART$ = subexp(subexp("\\/\\/" + AUTHORITY$ + PATH_ABEMPTY$) + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$),
        URI$ = subexp(SCHEME$ + "\\:" + HIER_PART$ + subexp("\\?" + QUERY$) + "?" + subexp("\\#" + FRAGMENT$) + "?"),
        RELATIVE_PART$ = subexp(subexp("\\/\\/" + AUTHORITY$ + PATH_ABEMPTY$) + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_EMPTY$),
        RELATIVE$ = subexp(RELATIVE_PART$ + subexp("\\?" + QUERY$) + "?" + subexp("\\#" + FRAGMENT$) + "?"),
        URI_REFERENCE$ = subexp(URI$ + "|" + RELATIVE$),
        ABSOLUTE_URI$ = subexp(SCHEME$ + "\\:" + HIER_PART$ + subexp("\\?" + QUERY$) + "?"),
        GENERIC_REF$ = "^(" + SCHEME$ + ")\\:" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        RELATIVE_REF$ = "^(){0}" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_NOSCHEME$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        ABSOLUTE_REF$ = "^(" + SCHEME$ + ")\\:" + subexp(subexp("\\/\\/(" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?)") + "?(" + PATH_ABEMPTY$ + "|" + PATH_ABSOLUTE$ + "|" + PATH_ROOTLESS$ + "|" + PATH_EMPTY$ + ")") + subexp("\\?(" + QUERY$ + ")") + "?$",
        SAMEDOC_REF$ = "^" + subexp("\\#(" + FRAGMENT$ + ")") + "?$",
        AUTHORITY_REF$ = "^" + subexp("(" + USERINFO$ + ")@") + "?(" + HOST$ + ")" + subexp("\\:(" + PORT$ + ")") + "?$";
    return {
        NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
        NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
        NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
        ESCAPE: new RegExp(merge("[^]", UNRESERVED$$, SUB_DELIMS$$), "g"),
        UNRESERVED: new RegExp(UNRESERVED$$, "g"),
        OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$, RESERVED$$), "g"),
        PCT_ENCODED: new RegExp(PCT_ENCODED$, "g"),
        IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
        IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$ + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$") //RFC 6874, with relaxed parsing rules
    };
}
var URI_PROTOCOL = buildExps(false);

var IRI_PROTOCOL = buildExps(true);

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

/** Highest positive signed 32-bit float value */

var maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1

/** Bootstring parameters */
var base = 36;
var tMin = 1;
var tMax = 26;
var skew = 38;
var damp = 700;
var initialBias = 72;
var initialN = 128; // 0x80
var delimiter = '-'; // '\x2D'

/** Regular expressions */
var regexPunycode = /^xn--/;
var regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators

/** Error messages */
var errors = {
	'overflow': 'Overflow: input needs wider integers to process',
	'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
	'invalid-input': 'Invalid input'
};

/** Convenience shortcuts */
var baseMinusTMin = base - tMin;
var floor = Math.floor;
var stringFromCharCode = String.fromCharCode;

/*--------------------------------------------------------------------------*/

/**
 * A generic error utility function.
 * @private
 * @param {String} type The error type.
 * @returns {Error} Throws a `RangeError` with the applicable error message.
 */
function error$1(type) {
	throw new RangeError(errors[type]);
}

/**
 * A generic `Array#map` utility function.
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} callback The function that gets called for every array
 * item.
 * @returns {Array} A new array of values returned by the callback function.
 */
function map(array, fn) {
	var result = [];
	var length = array.length;
	while (length--) {
		result[length] = fn(array[length]);
	}
	return result;
}

/**
 * A simple `Array#map`-like wrapper to work with domain name strings or email
 * addresses.
 * @private
 * @param {String} domain The domain name or email address.
 * @param {Function} callback The function that gets called for every
 * character.
 * @returns {Array} A new string of characters returned by the callback
 * function.
 */
function mapDomain(string, fn) {
	var parts = string.split('@');
	var result = '';
	if (parts.length > 1) {
		// In email addresses, only the domain name should be punycoded. Leave
		// the local part (i.e. everything up to `@`) intact.
		result = parts[0] + '@';
		string = parts[1];
	}
	// Avoid `split(regex)` for IE8 compatibility. See #17.
	string = string.replace(regexSeparators, '\x2E');
	var labels = string.split('.');
	var encoded = map(labels, fn).join('.');
	return result + encoded;
}

/**
 * Creates an array containing the numeric code points of each Unicode
 * character in the string. While JavaScript uses UCS-2 internally,
 * this function will convert a pair of surrogate halves (each of which
 * UCS-2 exposes as separate characters) into a single code point,
 * matching UTF-16.
 * @see `punycode.ucs2.encode`
 * @see <https://mathiasbynens.be/notes/javascript-encoding>
 * @memberOf punycode.ucs2
 * @name decode
 * @param {String} string The Unicode input string (UCS-2).
 * @returns {Array} The new array of code points.
 */
function ucs2decode(string) {
	var output = [];
	var counter = 0;
	var length = string.length;
	while (counter < length) {
		var value = string.charCodeAt(counter++);
		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
			// It's a high surrogate, and there is a next character.
			var extra = string.charCodeAt(counter++);
			if ((extra & 0xFC00) == 0xDC00) {
				// Low surrogate.
				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
			} else {
				// It's an unmatched surrogate; only append this code unit, in case the
				// next code unit is the high surrogate of a surrogate pair.
				output.push(value);
				counter--;
			}
		} else {
			output.push(value);
		}
	}
	return output;
}

/**
 * Creates a string based on an array of numeric code points.
 * @see `punycode.ucs2.decode`
 * @memberOf punycode.ucs2
 * @name encode
 * @param {Array} codePoints The array of numeric code points.
 * @returns {String} The new Unicode string (UCS-2).
 */
var ucs2encode = function ucs2encode(array) {
	return String.fromCodePoint.apply(String, toConsumableArray(array));
};

/**
 * Converts a basic code point into a digit/integer.
 * @see `digitToBasic()`
 * @private
 * @param {Number} codePoint The basic numeric code point value.
 * @returns {Number} The numeric value of a basic code point (for use in
 * representing integers) in the range `0` to `base - 1`, or `base` if
 * the code point does not represent a value.
 */
var basicToDigit = function basicToDigit(codePoint) {
	if (codePoint - 0x30 < 0x0A) {
		return codePoint - 0x16;
	}
	if (codePoint - 0x41 < 0x1A) {
		return codePoint - 0x41;
	}
	if (codePoint - 0x61 < 0x1A) {
		return codePoint - 0x61;
	}
	return base;
};

/**
 * Converts a digit/integer into a basic code point.
 * @see `basicToDigit()`
 * @private
 * @param {Number} digit The numeric value of a basic code point.
 * @returns {Number} The basic code point whose value (when used for
 * representing integers) is `digit`, which needs to be in the range
 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
 * used; else, the lowercase form is used. The behavior is undefined
 * if `flag` is non-zero and `digit` has no uppercase form.
 */
var digitToBasic = function digitToBasic(digit, flag) {
	//  0..25 map to ASCII a..z or A..Z
	// 26..35 map to ASCII 0..9
	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
};

/**
 * Bias adaptation function as per section 3.4 of RFC 3492.
 * https://tools.ietf.org/html/rfc3492#section-3.4
 * @private
 */
var adapt = function adapt(delta, numPoints, firstTime) {
	var k = 0;
	delta = firstTime ? floor(delta / damp) : delta >> 1;
	delta += floor(delta / numPoints);
	for (; /* no initialization */delta > baseMinusTMin * tMax >> 1; k += base) {
		delta = floor(delta / baseMinusTMin);
	}
	return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};

/**
 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
 * symbols.
 * @memberOf punycode
 * @param {String} input The Punycode string of ASCII-only symbols.
 * @returns {String} The resulting string of Unicode symbols.
 */
var decode = function decode(input) {
	// Don't use UCS-2.
	var output = [];
	var inputLength = input.length;
	var i = 0;
	var n = initialN;
	var bias = initialBias;

	// Handle the basic code points: let `basic` be the number of input code
	// points before the last delimiter, or `0` if there is none, then copy
	// the first basic code points to the output.

	var basic = input.lastIndexOf(delimiter);
	if (basic < 0) {
		basic = 0;
	}

	for (var j = 0; j < basic; ++j) {
		// if it's not a basic code point
		if (input.charCodeAt(j) >= 0x80) {
			error$1('not-basic');
		}
		output.push(input.charCodeAt(j));
	}

	// Main decoding loop: start just after the last delimiter if any basic code
	// points were copied; start at the beginning otherwise.

	for (var index = basic > 0 ? basic + 1 : 0; index < inputLength;) /* no final expression */{

		// `index` is the index of the next character to be consumed.
		// Decode a generalized variable-length integer into `delta`,
		// which gets added to `i`. The overflow checking is easier
		// if we increase `i` as we go, then subtract off its starting
		// value at the end to obtain `delta`.
		var oldi = i;
		for (var w = 1, k = base;; /* no condition */k += base) {

			if (index >= inputLength) {
				error$1('invalid-input');
			}

			var digit = basicToDigit(input.charCodeAt(index++));

			if (digit >= base || digit > floor((maxInt - i) / w)) {
				error$1('overflow');
			}

			i += digit * w;
			var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;

			if (digit < t) {
				break;
			}

			var baseMinusT = base - t;
			if (w > floor(maxInt / baseMinusT)) {
				error$1('overflow');
			}

			w *= baseMinusT;
		}

		var out = output.length + 1;
		bias = adapt(i - oldi, out, oldi == 0);

		// `i` was supposed to wrap around from `out` to `0`,
		// incrementing `n` each time, so we'll fix that now:
		if (floor(i / out) > maxInt - n) {
			error$1('overflow');
		}

		n += floor(i / out);
		i %= out;

		// Insert `n` at position `i` of the output.
		output.splice(i++, 0, n);
	}

	return String.fromCodePoint.apply(String, output);
};

/**
 * Converts a string of Unicode symbols (e.g. a domain name label) to a
 * Punycode string of ASCII-only symbols.
 * @memberOf punycode
 * @param {String} input The string of Unicode symbols.
 * @returns {String} The resulting Punycode string of ASCII-only symbols.
 */
var encode = function encode(input) {
	var output = [];

	// Convert the input in UCS-2 to an array of Unicode code points.
	input = ucs2decode(input);

	// Cache the length.
	var inputLength = input.length;

	// Initialize the state.
	var n = initialN;
	var delta = 0;
	var bias = initialBias;

	// Handle the basic code points.
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var _currentValue2 = _step.value;

			if (_currentValue2 < 0x80) {
				output.push(stringFromCharCode(_currentValue2));
			}
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	var basicLength = output.length;
	var handledCPCount = basicLength;

	// `handledCPCount` is the number of code points that have been handled;
	// `basicLength` is the number of basic code points.

	// Finish the basic string with a delimiter unless it's empty.
	if (basicLength) {
		output.push(delimiter);
	}

	// Main encoding loop:
	while (handledCPCount < inputLength) {

		// All non-basic code points < n have been handled already. Find the next
		// larger one:
		var m = maxInt;
		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2 = false;
		var _iteratorError2 = undefined;

		try {
			for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var currentValue = _step2.value;

				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow.
		} catch (err) {
			_didIteratorError2 = true;
			_iteratorError2 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion2 && _iterator2.return) {
					_iterator2.return();
				}
			} finally {
				if (_didIteratorError2) {
					throw _iteratorError2;
				}
			}
		}

		var handledCPCountPlusOne = handledCPCount + 1;
		if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
			error$1('overflow');
		}

		delta += (m - n) * handledCPCountPlusOne;
		n = m;

		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var _currentValue = _step3.value;

				if (_currentValue < n && ++delta > maxInt) {
					error$1('overflow');
				}
				if (_currentValue == n) {
					// Represent delta as a generalized variable-length integer.
					var q = delta;
					for (var k = base;; /* no condition */k += base) {
						var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
						if (q < t) {
							break;
						}
						var qMinusT = q - t;
						var baseMinusT = base - t;
						output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		++delta;
		++n;
	}
	return output.join('');
};

/**
 * Converts a Punycode string representing a domain name or an email address
 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
 * it doesn't matter if you call it on a string that has already been
 * converted to Unicode.
 * @memberOf punycode
 * @param {String} input The Punycoded domain name or email address to
 * convert to Unicode.
 * @returns {String} The Unicode representation of the given Punycode
 * string.
 */
var toUnicode = function toUnicode(input) {
	return mapDomain(input, function (string) {
		return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
	});
};

/**
 * Converts a Unicode string representing a domain name or an email address to
 * Punycode. Only the non-ASCII parts of the domain name will be converted,
 * i.e. it doesn't matter if you call it with a domain that's already in
 * ASCII.
 * @memberOf punycode
 * @param {String} input The domain name or email address to convert, as a
 * Unicode string.
 * @returns {String} The Punycode representation of the given domain name or
 * email address.
 */
var toASCII = function toASCII(input) {
	return mapDomain(input, function (string) {
		return regexNonASCII.test(string) ? 'xn--' + encode(string) : string;
	});
};

/*--------------------------------------------------------------------------*/

/** Define the public API */
var punycode = {
	/**
  * A string representing the current Punycode.js version number.
  * @memberOf punycode
  * @type String
  */
	'version': '2.1.0',
	/**
  * An object of methods to convert from JavaScript's internal character
  * representation (UCS-2) to Unicode code points, and back.
  * @see <https://mathiasbynens.be/notes/javascript-encoding>
  * @memberOf punycode
  * @type Object
  */
	'ucs2': {
		'decode': ucs2decode,
		'encode': ucs2encode
	},
	'decode': decode,
	'encode': encode,
	'toASCII': toASCII,
	'toUnicode': toUnicode
};

/**
 * URI.js
 *
 * @fileoverview An RFC 3986 compliant, scheme extendable URI parsing/validating/resolving library for JavaScript.
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/uri-js
 */
/**
 * Copyright 2011 Gary Court. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Gary Court.
 */
var SCHEMES = {};
function pctEncChar(chr) {
    var c = chr.charCodeAt(0);
    var e = void 0;
    if (c < 16) e = "%0" + c.toString(16).toUpperCase();else if (c < 128) e = "%" + c.toString(16).toUpperCase();else if (c < 2048) e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();else e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
    return e;
}
function pctDecChars(str) {
    var newStr = "";
    var i = 0;
    var il = str.length;
    while (i < il) {
        var c = parseInt(str.substr(i + 1, 2), 16);
        if (c < 128) {
            newStr += String.fromCharCode(c);
            i += 3;
        } else if (c >= 194 && c < 224) {
            if (il - i >= 6) {
                var c2 = parseInt(str.substr(i + 4, 2), 16);
                newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
            } else {
                newStr += str.substr(i, 6);
            }
            i += 6;
        } else if (c >= 224) {
            if (il - i >= 9) {
                var _c = parseInt(str.substr(i + 4, 2), 16);
                var c3 = parseInt(str.substr(i + 7, 2), 16);
                newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
            } else {
                newStr += str.substr(i, 9);
            }
            i += 9;
        } else {
            newStr += str.substr(i, 3);
            i += 3;
        }
    }
    return newStr;
}
function _normalizeComponentEncoding(components, protocol) {
    function decodeUnreserved(str) {
        var decStr = pctDecChars(str);
        return !decStr.match(protocol.UNRESERVED) ? str : decStr;
    }
    if (components.scheme) components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_SCHEME, "");
    if (components.userinfo !== undefined) components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.host !== undefined) components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.path !== undefined) components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.query !== undefined) components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    if (components.fragment !== undefined) components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
    return components;
}

function _stripLeadingZeros(str) {
    return str.replace(/^0*(.*)/, "$1") || "0";
}
function _normalizeIPv4(host, protocol) {
    var matches = host.match(protocol.IPV4ADDRESS) || [];

    var _matches = slicedToArray(matches, 2),
        address = _matches[1];

    if (address) {
        return address.split(".").map(_stripLeadingZeros).join(".");
    } else {
        return host;
    }
}
function _normalizeIPv6(host, protocol) {
    var matches = host.match(protocol.IPV6ADDRESS) || [];

    var _matches2 = slicedToArray(matches, 3),
        address = _matches2[1],
        zone = _matches2[2];

    if (address) {
        var _address$toLowerCase$ = address.toLowerCase().split('::').reverse(),
            _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2),
            last = _address$toLowerCase$2[0],
            first = _address$toLowerCase$2[1];

        var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
        var lastFields = last.split(":").map(_stripLeadingZeros);
        var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
        var fieldCount = isLastFieldIPv4Address ? 7 : 8;
        var lastFieldsStart = lastFields.length - fieldCount;
        var fields = Array(fieldCount);
        for (var x = 0; x < fieldCount; ++x) {
            fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || '';
        }
        if (isLastFieldIPv4Address) {
            fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
        }
        var allZeroFields = fields.reduce(function (acc, field, index) {
            if (!field || field === "0") {
                var lastLongest = acc[acc.length - 1];
                if (lastLongest && lastLongest.index + lastLongest.length === index) {
                    lastLongest.length++;
                } else {
                    acc.push({ index: index, length: 1 });
                }
            }
            return acc;
        }, []);
        var longestZeroFields = allZeroFields.sort(function (a, b) {
            return b.length - a.length;
        })[0];
        var newHost = void 0;
        if (longestZeroFields && longestZeroFields.length > 1) {
            var newFirst = fields.slice(0, longestZeroFields.index);
            var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
            newHost = newFirst.join(":") + "::" + newLast.join(":");
        } else {
            newHost = fields.join(":");
        }
        if (zone) {
            newHost += "%" + zone;
        }
        return newHost;
    } else {
        return host;
    }
}
var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === undefined;
function parse(uriString) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var components = {};
    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
    if (options.reference === "suffix") uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
    var matches = uriString.match(URI_PARSE);
    if (matches) {
        if (NO_MATCH_IS_UNDEFINED) {
            //store each component
            components.scheme = matches[1];
            components.userinfo = matches[3];
            components.host = matches[4];
            components.port = parseInt(matches[5], 10);
            components.path = matches[6] || "";
            components.query = matches[7];
            components.fragment = matches[8];
            //fix port number
            if (isNaN(components.port)) {
                components.port = matches[5];
            }
        } else {
            //IE FIX for improper RegExp matching
            //store each component
            components.scheme = matches[1] || undefined;
            components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : undefined;
            components.host = uriString.indexOf("//") !== -1 ? matches[4] : undefined;
            components.port = parseInt(matches[5], 10);
            components.path = matches[6] || "";
            components.query = uriString.indexOf("?") !== -1 ? matches[7] : undefined;
            components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : undefined;
            //fix port number
            if (isNaN(components.port)) {
                components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : undefined;
            }
        }
        if (components.host) {
            //normalize IP hosts
            components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
        }
        //determine reference type
        if (components.scheme === undefined && components.userinfo === undefined && components.host === undefined && components.port === undefined && !components.path && components.query === undefined) {
            components.reference = "same-document";
        } else if (components.scheme === undefined) {
            components.reference = "relative";
        } else if (components.fragment === undefined) {
            components.reference = "absolute";
        } else {
            components.reference = "uri";
        }
        //check for reference errors
        if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
            components.error = components.error || "URI is not a " + options.reference + " reference.";
        }
        //find scheme handler
        var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
        //check if scheme can't handle IRIs
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
            //if host component is a domain name
            if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
                //convert Unicode IDN -> ASCII IDN
                try {
                    components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
                } catch (e) {
                    components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
                }
            }
            //convert IRI -> URI
            _normalizeComponentEncoding(components, URI_PROTOCOL);
        } else {
            //normalize encodings
            _normalizeComponentEncoding(components, protocol);
        }
        //perform scheme specific parsing
        if (schemeHandler && schemeHandler.parse) {
            schemeHandler.parse(components, options);
        }
    } else {
        components.error = components.error || "URI can not be parsed.";
    }
    return components;
}

function _recomposeAuthority(components, options) {
    var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
    var uriTokens = [];
    if (components.userinfo !== undefined) {
        uriTokens.push(components.userinfo);
        uriTokens.push("@");
    }
    if (components.host !== undefined) {
        //normalize IP hosts, add brackets and escape zone separator for IPv6
        uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function (_, $1, $2) {
            return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
        }));
    }
    if (typeof components.port === "number" || typeof components.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(components.port));
    }
    return uriTokens.length ? uriTokens.join("") : undefined;
}

var RDS1 = /^\.\.?\//;
var RDS2 = /^\/\.(\/|$)/;
var RDS3 = /^\/\.\.(\/|$)/;
var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
function removeDotSegments(input) {
    var output = [];
    while (input.length) {
        if (input.match(RDS1)) {
            input = input.replace(RDS1, "");
        } else if (input.match(RDS2)) {
            input = input.replace(RDS2, "/");
        } else if (input.match(RDS3)) {
            input = input.replace(RDS3, "/");
            output.pop();
        } else if (input === "." || input === "..") {
            input = "";
        } else {
            var im = input.match(RDS5);
            if (im) {
                var s = im[0];
                input = input.slice(s.length);
                output.push(s);
            } else {
                throw new Error("Unexpected dot segment condition");
            }
        }
    }
    return output.join("");
}

function serialize(components) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
    var uriTokens = [];
    //find scheme handler
    var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
    //perform scheme specific serialization
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(components, options);
    if (components.host) {
        //if host component is an IPv6 address
        if (protocol.IPV6ADDRESS.test(components.host)) {}
        //TODO: normalize IPv6 address as per RFC 5952

        //if host component is a domain name
        else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
                //convert IDN via punycode
                try {
                    components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
                } catch (e) {
                    components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                }
            }
    }
    //normalize encoding
    _normalizeComponentEncoding(components, protocol);
    if (options.reference !== "suffix" && components.scheme) {
        uriTokens.push(components.scheme);
        uriTokens.push(":");
    }
    var authority = _recomposeAuthority(components, options);
    if (authority !== undefined) {
        if (options.reference !== "suffix") {
            uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (components.path && components.path.charAt(0) !== "/") {
            uriTokens.push("/");
        }
    }
    if (components.path !== undefined) {
        var s = components.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
            s = removeDotSegments(s);
        }
        if (authority === undefined) {
            s = s.replace(/^\/\//, "/%2F"); //don't allow the path to start with "//"
        }
        uriTokens.push(s);
    }
    if (components.query !== undefined) {
        uriTokens.push("?");
        uriTokens.push(components.query);
    }
    if (components.fragment !== undefined) {
        uriTokens.push("#");
        uriTokens.push(components.fragment);
    }
    return uriTokens.join(""); //merge tokens into a string
}

function resolveComponents(base, relative) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var skipNormalization = arguments[3];

    var target = {};
    if (!skipNormalization) {
        base = parse(serialize(base, options), options); //normalize base components
        relative = parse(serialize(relative, options), options); //normalize relative components
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        //target.authority = relative.authority;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
    } else {
        if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
            //target.authority = relative.authority;
            target.userinfo = relative.userinfo;
            target.host = relative.host;
            target.port = relative.port;
            target.path = removeDotSegments(relative.path || "");
            target.query = relative.query;
        } else {
            if (!relative.path) {
                target.path = base.path;
                if (relative.query !== undefined) {
                    target.query = relative.query;
                } else {
                    target.query = base.query;
                }
            } else {
                if (relative.path.charAt(0) === "/") {
                    target.path = removeDotSegments(relative.path);
                } else {
                    if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
                        target.path = "/" + relative.path;
                    } else if (!base.path) {
                        target.path = relative.path;
                    } else {
                        target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
                    }
                    target.path = removeDotSegments(target.path);
                }
                target.query = relative.query;
            }
            //target.authority = base.authority;
            target.userinfo = base.userinfo;
            target.host = base.host;
            target.port = base.port;
        }
        target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
}

function resolve(baseURI, relativeURI, options) {
    var schemelessOptions = assign({ scheme: 'null' }, options);
    return serialize(resolveComponents(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
}

function normalize(uri, options) {
    if (typeof uri === "string") {
        uri = serialize(parse(uri, options), options);
    } else if (typeOf(uri) === "object") {
        uri = parse(serialize(uri, options), options);
    }
    return uri;
}

function equal(uriA, uriB, options) {
    if (typeof uriA === "string") {
        uriA = serialize(parse(uriA, options), options);
    } else if (typeOf(uriA) === "object") {
        uriA = serialize(uriA, options);
    }
    if (typeof uriB === "string") {
        uriB = serialize(parse(uriB, options), options);
    } else if (typeOf(uriB) === "object") {
        uriB = serialize(uriB, options);
    }
    return uriA === uriB;
}

function escapeComponent(str, options) {
    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
}

function unescapeComponent(str, options) {
    return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
}

var handler = {
    scheme: "http",
    domainHost: true,
    parse: function parse(components, options) {
        //report missing host
        if (!components.host) {
            components.error = components.error || "HTTP URIs must have a host.";
        }
        return components;
    },
    serialize: function serialize(components, options) {
        var secure = String(components.scheme).toLowerCase() === "https";
        //normalize the default port
        if (components.port === (secure ? 443 : 80) || components.port === "") {
            components.port = undefined;
        }
        //normalize the empty path
        if (!components.path) {
            components.path = "/";
        }
        //NOTE: We do not parse query strings for HTTP URIs
        //as WWW Form Url Encoded query strings are part of the HTML4+ spec,
        //and not the HTTP spec.
        return components;
    }
};

var handler$1 = {
    scheme: "https",
    domainHost: handler.domainHost,
    parse: handler.parse,
    serialize: handler.serialize
};

function isSecure(wsComponents) {
    return typeof wsComponents.secure === 'boolean' ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
}
//RFC 6455
var handler$2 = {
    scheme: "ws",
    domainHost: true,
    parse: function parse(components, options) {
        var wsComponents = components;
        //indicate if the secure flag is set
        wsComponents.secure = isSecure(wsComponents);
        //construct resouce name
        wsComponents.resourceName = (wsComponents.path || '/') + (wsComponents.query ? '?' + wsComponents.query : '');
        wsComponents.path = undefined;
        wsComponents.query = undefined;
        return wsComponents;
    },
    serialize: function serialize(wsComponents, options) {
        //normalize the default port
        if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
            wsComponents.port = undefined;
        }
        //ensure scheme matches secure flag
        if (typeof wsComponents.secure === 'boolean') {
            wsComponents.scheme = wsComponents.secure ? 'wss' : 'ws';
            wsComponents.secure = undefined;
        }
        //reconstruct path from resource name
        if (wsComponents.resourceName) {
            var _wsComponents$resourc = wsComponents.resourceName.split('?'),
                _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2),
                path = _wsComponents$resourc2[0],
                query = _wsComponents$resourc2[1];

            wsComponents.path = path && path !== '/' ? path : undefined;
            wsComponents.query = query;
            wsComponents.resourceName = undefined;
        }
        //forbid fragment component
        wsComponents.fragment = undefined;
        return wsComponents;
    }
};

var handler$3 = {
    scheme: "wss",
    domainHost: handler$2.domainHost,
    parse: handler$2.parse,
    serialize: handler$2.serialize
};

var O = {};
var isIRI = true;
//RFC 3986
var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~" + (isIRI ? "\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF" : "") + "]";
var HEXDIG$$ = "[0-9A-Fa-f]"; //case-insensitive
var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$)); //expanded
//RFC 5322, except these symbols as per RFC 6068: @ : / ? # [ ] & ; =
//const ATEXT$$ = "[A-Za-z0-9\\!\\#\\$\\%\\&\\'\\*\\+\\-\\/\\=\\?\\^\\_\\`\\{\\|\\}\\~]";
//const WSP$$ = "[\\x20\\x09]";
//const OBS_QTEXT$$ = "[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]";  //(%d1-8 / %d11-12 / %d14-31 / %d127)
//const QTEXT$$ = merge("[\\x21\\x23-\\x5B\\x5D-\\x7E]", OBS_QTEXT$$);  //%d33 / %d35-91 / %d93-126 / obs-qtext
//const VCHAR$$ = "[\\x21-\\x7E]";
//const WSP$$ = "[\\x20\\x09]";
//const OBS_QP$ = subexp("\\\\" + merge("[\\x00\\x0D\\x0A]", OBS_QTEXT$$));  //%d0 / CR / LF / obs-qtext
//const FWS$ = subexp(subexp(WSP$$ + "*" + "\\x0D\\x0A") + "?" + WSP$$ + "+");
//const QUOTED_PAIR$ = subexp(subexp("\\\\" + subexp(VCHAR$$ + "|" + WSP$$)) + "|" + OBS_QP$);
//const QUOTED_STRING$ = subexp('\\"' + subexp(FWS$ + "?" + QCONTENT$) + "*" + FWS$ + "?" + '\\"');
var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
var VCHAR$$ = merge(QTEXT$$, "[\\\"\\\\]");
var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
var UNRESERVED = new RegExp(UNRESERVED$$, "g");
var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
var NOT_HFVALUE = NOT_HFNAME;
function decodeUnreserved(str) {
    var decStr = pctDecChars(str);
    return !decStr.match(UNRESERVED) ? str : decStr;
}
var handler$4 = {
    scheme: "mailto",
    parse: function parse$$1(components, options) {
        var mailtoComponents = components;
        var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
        mailtoComponents.path = undefined;
        if (mailtoComponents.query) {
            var unknownHeaders = false;
            var headers = {};
            var hfields = mailtoComponents.query.split("&");
            for (var x = 0, xl = hfields.length; x < xl; ++x) {
                var hfield = hfields[x].split("=");
                switch (hfield[0]) {
                    case "to":
                        var toAddrs = hfield[1].split(",");
                        for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                            to.push(toAddrs[_x]);
                        }
                        break;
                    case "subject":
                        mailtoComponents.subject = unescapeComponent(hfield[1], options);
                        break;
                    case "body":
                        mailtoComponents.body = unescapeComponent(hfield[1], options);
                        break;
                    default:
                        unknownHeaders = true;
                        headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
                        break;
                }
            }
            if (unknownHeaders) mailtoComponents.headers = headers;
        }
        mailtoComponents.query = undefined;
        for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
            var addr = to[_x2].split("@");
            addr[0] = unescapeComponent(addr[0]);
            if (!options.unicodeSupport) {
                //convert Unicode IDN -> ASCII IDN
                try {
                    addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
                } catch (e) {
                    mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
                }
            } else {
                addr[1] = unescapeComponent(addr[1], options).toLowerCase();
            }
            to[_x2] = addr.join("@");
        }
        return mailtoComponents;
    },
    serialize: function serialize$$1(mailtoComponents, options) {
        var components = mailtoComponents;
        var to = toArray(mailtoComponents.to);
        if (to) {
            for (var x = 0, xl = to.length; x < xl; ++x) {
                var toAddr = String(to[x]);
                var atIdx = toAddr.lastIndexOf("@");
                var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
                var domain = toAddr.slice(atIdx + 1);
                //convert IDN via punycode
                try {
                    domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
                } catch (e) {
                    components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
                }
                to[x] = localPart + "@" + domain;
            }
            components.path = to.join(",");
        }
        var headers = mailtoComponents.headers = mailtoComponents.headers || {};
        if (mailtoComponents.subject) headers["subject"] = mailtoComponents.subject;
        if (mailtoComponents.body) headers["body"] = mailtoComponents.body;
        var fields = [];
        for (var name in headers) {
            if (headers[name] !== O[name]) {
                fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
            }
        }
        if (fields.length) {
            components.query = fields.join("&");
        }
        return components;
    }
};

var URN_PARSE = /^([^\:]+)\:(.*)/;
//RFC 2141
var handler$5 = {
    scheme: "urn",
    parse: function parse$$1(components, options) {
        var matches = components.path && components.path.match(URN_PARSE);
        var urnComponents = components;
        if (matches) {
            var scheme = options.scheme || urnComponents.scheme || "urn";
            var nid = matches[1].toLowerCase();
            var nss = matches[2];
            var urnScheme = scheme + ":" + (options.nid || nid);
            var schemeHandler = SCHEMES[urnScheme];
            urnComponents.nid = nid;
            urnComponents.nss = nss;
            urnComponents.path = undefined;
            if (schemeHandler) {
                urnComponents = schemeHandler.parse(urnComponents, options);
            }
        } else {
            urnComponents.error = urnComponents.error || "URN can not be parsed.";
        }
        return urnComponents;
    },
    serialize: function serialize$$1(urnComponents, options) {
        var scheme = options.scheme || urnComponents.scheme || "urn";
        var nid = urnComponents.nid;
        var urnScheme = scheme + ":" + (options.nid || nid);
        var schemeHandler = SCHEMES[urnScheme];
        if (schemeHandler) {
            urnComponents = schemeHandler.serialize(urnComponents, options);
        }
        var uriComponents = urnComponents;
        var nss = urnComponents.nss;
        uriComponents.path = (nid || options.nid) + ":" + nss;
        return uriComponents;
    }
};

var UUID = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
//RFC 4122
var handler$6 = {
    scheme: "urn:uuid",
    parse: function parse(urnComponents, options) {
        var uuidComponents = urnComponents;
        uuidComponents.uuid = uuidComponents.nss;
        uuidComponents.nss = undefined;
        if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID))) {
            uuidComponents.error = uuidComponents.error || "UUID is not valid.";
        }
        return uuidComponents;
    },
    serialize: function serialize(uuidComponents, options) {
        var urnComponents = uuidComponents;
        //normalize UUID
        urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
        return urnComponents;
    }
};

SCHEMES[handler.scheme] = handler;
SCHEMES[handler$1.scheme] = handler$1;
SCHEMES[handler$2.scheme] = handler$2;
SCHEMES[handler$3.scheme] = handler$3;
SCHEMES[handler$4.scheme] = handler$4;
SCHEMES[handler$5.scheme] = handler$5;
SCHEMES[handler$6.scheme] = handler$6;

exports.SCHEMES = SCHEMES;
exports.pctEncChar = pctEncChar;
exports.pctDecChars = pctDecChars;
exports.parse = parse;
exports.removeDotSegments = removeDotSegments;
exports.serialize = serialize;
exports.resolveComponents = resolveComponents;
exports.resolve = resolve;
exports.normalize = normalize;
exports.equal = equal;
exports.escapeComponent = escapeComponent;
exports.unescapeComponent = unescapeComponent;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=uri.all.js.map


/***/ }),

/***/ "./node_modules/ajv/lib/refs/data.json":
/*!*********************************************!*\
  !*** ./node_modules/ajv/lib/refs/data.json ***!
  \*********************************************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"$schema":"http://json-schema.org/draft-07/schema#","$id":"https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#","description":"Meta-schema for $data reference (JSON Schema extension proposal)","type":"object","required":["$data"],"properties":{"$data":{"type":"string","anyOf":[{"format":"relative-json-pointer"},{"format":"json-pointer"}]}},"additionalProperties":false}');

/***/ }),

/***/ "./node_modules/ajv/lib/refs/json-schema-draft-07.json":
/*!*************************************************************!*\
  !*** ./node_modules/ajv/lib/refs/json-schema-draft-07.json ***!
  \*************************************************************/
/***/ ((module) => {

"use strict";
module.exports = JSON.parse('{"$schema":"http://json-schema.org/draft-07/schema#","$id":"http://json-schema.org/draft-07/schema#","title":"Core schema meta-schema","definitions":{"schemaArray":{"type":"array","minItems":1,"items":{"$ref":"#"}},"nonNegativeInteger":{"type":"integer","minimum":0},"nonNegativeIntegerDefault0":{"allOf":[{"$ref":"#/definitions/nonNegativeInteger"},{"default":0}]},"simpleTypes":{"enum":["array","boolean","integer","null","number","object","string"]},"stringArray":{"type":"array","items":{"type":"string"},"uniqueItems":true,"default":[]}},"type":["object","boolean"],"properties":{"$id":{"type":"string","format":"uri-reference"},"$schema":{"type":"string","format":"uri"},"$ref":{"type":"string","format":"uri-reference"},"$comment":{"type":"string"},"title":{"type":"string"},"description":{"type":"string"},"default":true,"readOnly":{"type":"boolean","default":false},"examples":{"type":"array","items":true},"multipleOf":{"type":"number","exclusiveMinimum":0},"maximum":{"type":"number"},"exclusiveMaximum":{"type":"number"},"minimum":{"type":"number"},"exclusiveMinimum":{"type":"number"},"maxLength":{"$ref":"#/definitions/nonNegativeInteger"},"minLength":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"pattern":{"type":"string","format":"regex"},"additionalItems":{"$ref":"#"},"items":{"anyOf":[{"$ref":"#"},{"$ref":"#/definitions/schemaArray"}],"default":true},"maxItems":{"$ref":"#/definitions/nonNegativeInteger"},"minItems":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"uniqueItems":{"type":"boolean","default":false},"contains":{"$ref":"#"},"maxProperties":{"$ref":"#/definitions/nonNegativeInteger"},"minProperties":{"$ref":"#/definitions/nonNegativeIntegerDefault0"},"required":{"$ref":"#/definitions/stringArray"},"additionalProperties":{"$ref":"#"},"definitions":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"properties":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"patternProperties":{"type":"object","additionalProperties":{"$ref":"#"},"propertyNames":{"format":"regex"},"default":{}},"dependencies":{"type":"object","additionalProperties":{"anyOf":[{"$ref":"#"},{"$ref":"#/definitions/stringArray"}]}},"propertyNames":{"$ref":"#"},"const":true,"enum":{"type":"array","items":true,"minItems":1,"uniqueItems":true},"type":{"anyOf":[{"$ref":"#/definitions/simpleTypes"},{"type":"array","items":{"$ref":"#/definitions/simpleTypes"},"minItems":1,"uniqueItems":true}]},"format":{"type":"string"},"contentMediaType":{"type":"string"},"contentEncoding":{"type":"string"},"if":{"$ref":"#"},"then":{"$ref":"#"},"else":{"$ref":"#"},"allOf":{"$ref":"#/definitions/schemaArray"},"anyOf":{"$ref":"#/definitions/schemaArray"},"oneOf":{"$ref":"#/definitions/schemaArray"},"not":{"$ref":"#"}},"default":true}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/www/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCLGdCQUFnQjtBQUNoQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxRQUFRO0FBQ3BCLFlBQVksUUFBUTtBQUNwQixZQUFZLFFBQVE7QUFDcEIsWUFBWSxR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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsd0RBQXdEO0FBQ3hELHdEQUF3RDs7QUFFeEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLGlCQUFpQixZQUFZLFNBQVMsYUFBYSxpREFBaUQ7QUFDakk7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQztBQUNsQztBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0EsdUVBQXVFO0FBQ3ZFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0QkFBNEIsZ0JBQWdCO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVRXRCQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9hanYuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2NhY2hlLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2FzeW5jLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL2Vycm9yX2NsYXNzZXMuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvZm9ybWF0cy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9pbmRleC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS9yZXNvbHZlLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3J1bGVzLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9jb21waWxlL3NjaGVtYV9vYmouanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2NvbXBpbGUvdWNzMmxlbmd0aC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvY29tcGlsZS91dGlsLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kYXRhLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRJdGVtcy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvX2xpbWl0TGVuZ3RoLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9fbGltaXRQcm9wZXJ0aWVzLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9hbGxPZi5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvYW55T2YuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbW1lbnQuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2NvbnN0LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9jb250YWlucy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvY3VzdG9tLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9kZXBlbmRlbmNpZXMuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2VudW0uanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2Zvcm1hdC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvaWYuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL2luZGV4LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9pdGVtcy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvbXVsdGlwbGVPZi5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvbm90LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9vbmVPZi5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcGF0dGVybi5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcHJvcGVydGllcy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcHJvcGVydHlOYW1lcy5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvcmVmLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9kb3Rqcy9yZXF1aXJlZC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2Fqdi9saWIvZG90anMvdW5pcXVlSXRlbXMuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9hanYvbGliL2RvdGpzL3ZhbGlkYXRlLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvYWp2L2xpYi9rZXl3b3JkLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvZmFzdC1kZWVwLWVxdWFsL2luZGV4LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnkvaW5kZXguanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy9qc29uLXNjaGVtYS10cmF2ZXJzZS9pbmRleC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL2pzb24tdG9vbC9qcy9Kc29uVG9vbC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vc3JjL3d3dy9BcGlVdGlscy50cyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vc3JjL3d3dy9TY2hlbWEudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL3NyYy93d3cvU2VydmVyVXRpbHMudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL3NyYy93d3cvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvVHNjaFR5cGUuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvdHNjaC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vbm9kZV9tb2R1bGVzL3VyaS1qcy9kaXN0L2VzNS91cmkuYWxsLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvd2VicGFjay9zdGFydHVwIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvd2VicGFjay9hZnRlci1zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbXBpbGVTY2hlbWEgPSByZXF1aXJlKCcuL2NvbXBpbGUnKVxuICAsIHJlc29sdmUgPSByZXF1aXJlKCcuL2NvbXBpbGUvcmVzb2x2ZScpXG4gICwgQ2FjaGUgPSByZXF1aXJlKCcuL2NhY2hlJylcbiAgLCBTY2hlbWFPYmplY3QgPSByZXF1aXJlKCcuL2NvbXBpbGUvc2NoZW1hX29iaicpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKVxuICAsIGZvcm1hdHMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZm9ybWF0cycpXG4gICwgcnVsZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvcnVsZXMnKVxuICAsICRkYXRhTWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vZGF0YScpXG4gICwgdXRpbCA9IHJlcXVpcmUoJy4vY29tcGlsZS91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQWp2O1xuXG5BanYucHJvdG90eXBlLnZhbGlkYXRlID0gdmFsaWRhdGU7XG5BanYucHJvdG90eXBlLmNvbXBpbGUgPSBjb21waWxlO1xuQWp2LnByb3RvdHlwZS5hZGRTY2hlbWEgPSBhZGRTY2hlbWE7XG5BanYucHJvdG90eXBlLmFkZE1ldGFTY2hlbWEgPSBhZGRNZXRhU2NoZW1hO1xuQWp2LnByb3RvdHlwZS52YWxpZGF0ZVNjaGVtYSA9IHZhbGlkYXRlU2NoZW1hO1xuQWp2LnByb3RvdHlwZS5nZXRTY2hlbWEgPSBnZXRTY2hlbWE7XG5BanYucHJvdG90eXBlLnJlbW92ZVNjaGVtYSA9IHJlbW92ZVNjaGVtYTtcbkFqdi5wcm90b3R5cGUuYWRkRm9ybWF0ID0gYWRkRm9ybWF0O1xuQWp2LnByb3RvdHlwZS5lcnJvcnNUZXh0ID0gZXJyb3JzVGV4dDtcblxuQWp2LnByb3RvdHlwZS5fYWRkU2NoZW1hID0gX2FkZFNjaGVtYTtcbkFqdi5wcm90b3R5cGUuX2NvbXBpbGUgPSBfY29tcGlsZTtcblxuQWp2LnByb3RvdHlwZS5jb21waWxlQXN5bmMgPSByZXF1aXJlKCcuL2NvbXBpbGUvYXN5bmMnKTtcbnZhciBjdXN0b21LZXl3b3JkID0gcmVxdWlyZSgnLi9rZXl3b3JkJyk7XG5BanYucHJvdG90eXBlLmFkZEtleXdvcmQgPSBjdXN0b21LZXl3b3JkLmFkZDtcbkFqdi5wcm90b3R5cGUuZ2V0S2V5d29yZCA9IGN1c3RvbUtleXdvcmQuZ2V0O1xuQWp2LnByb3RvdHlwZS5yZW1vdmVLZXl3b3JkID0gY3VzdG9tS2V5d29yZC5yZW1vdmU7XG5BanYucHJvdG90eXBlLnZhbGlkYXRlS2V5d29yZCA9IGN1c3RvbUtleXdvcmQudmFsaWRhdGU7XG5cbnZhciBlcnJvckNsYXNzZXMgPSByZXF1aXJlKCcuL2NvbXBpbGUvZXJyb3JfY2xhc3NlcycpO1xuQWp2LlZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuQWp2Lk1pc3NpbmdSZWZFcnJvciA9IGVycm9yQ2xhc3Nlcy5NaXNzaW5nUmVmO1xuQWp2LiRkYXRhTWV0YVNjaGVtYSA9ICRkYXRhTWV0YVNjaGVtYTtcblxudmFyIE1FVEFfU0NIRU1BX0lEID0gJ2h0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDcvc2NoZW1hJztcblxudmFyIE1FVEFfSUdOT1JFX09QVElPTlMgPSBbICdyZW1vdmVBZGRpdGlvbmFsJywgJ3VzZURlZmF1bHRzJywgJ2NvZXJjZVR5cGVzJywgJ3N0cmljdERlZmF1bHRzJyBdO1xudmFyIE1FVEFfU1VQUE9SVF9EQVRBID0gWycvcHJvcGVydGllcyddO1xuXG4vKipcbiAqIENyZWF0ZXMgdmFsaWRhdG9yIGluc3RhbmNlLlxuICogVXNhZ2U6IGBBanYob3B0cylgXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBvcHRpb25hbCBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFqdiBpbnN0YW5jZVxuICovXG5mdW5jdGlvbiBBanYob3B0cykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQWp2KSkgcmV0dXJuIG5ldyBBanYob3B0cyk7XG4gIG9wdHMgPSB0aGlzLl9vcHRzID0gdXRpbC5jb3B5KG9wdHMpIHx8IHt9O1xuICBzZXRMb2dnZXIodGhpcyk7XG4gIHRoaXMuX3NjaGVtYXMgPSB7fTtcbiAgdGhpcy5fcmVmcyA9IHt9O1xuICB0aGlzLl9mcmFnbWVudHMgPSB7fTtcbiAgdGhpcy5fZm9ybWF0cyA9IGZvcm1hdHMob3B0cy5mb3JtYXQpO1xuXG4gIHRoaXMuX2NhY2hlID0gb3B0cy5jYWNoZSB8fCBuZXcgQ2FjaGU7XG4gIHRoaXMuX2xvYWRpbmdTY2hlbWFzID0ge307XG4gIHRoaXMuX2NvbXBpbGF0aW9ucyA9IFtdO1xuICB0aGlzLlJVTEVTID0gcnVsZXMoKTtcbiAgdGhpcy5fZ2V0SWQgPSBjaG9vc2VHZXRJZChvcHRzKTtcblxuICBvcHRzLmxvb3BSZXF1aXJlZCA9IG9wdHMubG9vcFJlcXVpcmVkIHx8IEluZmluaXR5O1xuICBpZiAob3B0cy5lcnJvckRhdGFQYXRoID09ICdwcm9wZXJ0eScpIG9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA9IHRydWU7XG4gIGlmIChvcHRzLnNlcmlhbGl6ZSA9PT0gdW5kZWZpbmVkKSBvcHRzLnNlcmlhbGl6ZSA9IHN0YWJsZVN0cmluZ2lmeTtcbiAgdGhpcy5fbWV0YU9wdHMgPSBnZXRNZXRhU2NoZW1hT3B0aW9ucyh0aGlzKTtcblxuICBpZiAob3B0cy5mb3JtYXRzKSBhZGRJbml0aWFsRm9ybWF0cyh0aGlzKTtcbiAgaWYgKG9wdHMua2V5d29yZHMpIGFkZEluaXRpYWxLZXl3b3Jkcyh0aGlzKTtcbiAgYWRkRGVmYXVsdE1ldGFTY2hlbWEodGhpcyk7XG4gIGlmICh0eXBlb2Ygb3B0cy5tZXRhID09ICdvYmplY3QnKSB0aGlzLmFkZE1ldGFTY2hlbWEob3B0cy5tZXRhKTtcbiAgaWYgKG9wdHMubnVsbGFibGUpIHRoaXMuYWRkS2V5d29yZCgnbnVsbGFibGUnLCB7bWV0YVNjaGVtYToge3R5cGU6ICdib29sZWFuJ319KTtcbiAgYWRkSW5pdGlhbFNjaGVtYXModGhpcyk7XG59XG5cblxuXG4vKipcbiAqIFZhbGlkYXRlIGRhdGEgdXNpbmcgc2NoZW1hXG4gKiBTY2hlbWEgd2lsbCBiZSBjb21waWxlZCBhbmQgY2FjaGVkICh1c2luZyBzZXJpYWxpemVkIEpTT04gYXMga2V5LiBbZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnldKGh0dHBzOi8vZ2l0aHViLmNvbS9lcG9iZXJlemtpbi9mYXN0LWpzb24tc3RhYmxlLXN0cmluZ2lmeSkgaXMgdXNlZCB0byBzZXJpYWxpemUuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfE9iamVjdH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmIG9yIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge0FueX0gZGF0YSB0byBiZSB2YWxpZGF0ZWRcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHZhbGlkYXRpb24gcmVzdWx0LiBFcnJvcnMgZnJvbSB0aGUgbGFzdCB2YWxpZGF0aW9uIHdpbGwgYmUgYXZhaWxhYmxlIGluIGBhanYuZXJyb3JzYCAoYW5kIGFsc28gaW4gY29tcGlsZWQgc2NoZW1hOiBgc2NoZW1hLmVycm9yc2ApLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZShzY2hlbWFLZXlSZWYsIGRhdGEpIHtcbiAgdmFyIHY7XG4gIGlmICh0eXBlb2Ygc2NoZW1hS2V5UmVmID09ICdzdHJpbmcnKSB7XG4gICAgdiA9IHRoaXMuZ2V0U2NoZW1hKHNjaGVtYUtleVJlZik7XG4gICAgaWYgKCF2KSB0aHJvdyBuZXcgRXJyb3IoJ25vIHNjaGVtYSB3aXRoIGtleSBvciByZWYgXCInICsgc2NoZW1hS2V5UmVmICsgJ1wiJyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHRoaXMuX2FkZFNjaGVtYShzY2hlbWFLZXlSZWYpO1xuICAgIHYgPSBzY2hlbWFPYmoudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShzY2hlbWFPYmopO1xuICB9XG5cbiAgdmFyIHZhbGlkID0gdihkYXRhKTtcbiAgaWYgKHYuJGFzeW5jICE9PSB0cnVlKSB0aGlzLmVycm9ycyA9IHYuZXJyb3JzO1xuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuLyoqXG4gKiBDcmVhdGUgdmFsaWRhdGluZyBmdW5jdGlvbiBmb3IgcGFzc2VkIHNjaGVtYS5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0gIHtCb29sZWFufSBfbWV0YSB0cnVlIGlmIHNjaGVtYSBpcyBhIG1ldGEtc2NoZW1hLiBVc2VkIGludGVybmFsbHkgdG8gY29tcGlsZSBtZXRhIHNjaGVtYXMgb2YgY3VzdG9tIGtleXdvcmRzLlxuICogQHJldHVybiB7RnVuY3Rpb259IHZhbGlkYXRpbmcgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gY29tcGlsZShzY2hlbWEsIF9tZXRhKSB7XG4gIHZhciBzY2hlbWFPYmogPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCB1bmRlZmluZWQsIF9tZXRhKTtcbiAgcmV0dXJuIHNjaGVtYU9iai52YWxpZGF0ZSB8fCB0aGlzLl9jb21waWxlKHNjaGVtYU9iaik7XG59XG5cblxuLyoqXG4gKiBBZGRzIHNjaGVtYSB0byB0aGUgaW5zdGFuY2UuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHNjaGVtYSBzY2hlbWEgb3IgYXJyYXkgb2Ygc2NoZW1hcy4gSWYgYXJyYXkgaXMgcGFzc2VkLCBga2V5YCBhbmQgb3RoZXIgcGFyYW1ldGVycyB3aWxsIGJlIGlnbm9yZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IE9wdGlvbmFsIHNjaGVtYSBrZXkuIENhbiBiZSBwYXNzZWQgdG8gYHZhbGlkYXRlYCBtZXRob2QgaW5zdGVhZCBvZiBzY2hlbWEgb2JqZWN0IG9yIGlkL3JlZi4gT25lIHNjaGVtYSBwZXIgaW5zdGFuY2UgY2FuIGhhdmUgZW1wdHkgYGlkYCBhbmQgYGtleWAuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9za2lwVmFsaWRhdGlvbiB0cnVlIHRvIHNraXAgc2NoZW1hIHZhbGlkYXRpb24uIFVzZWQgaW50ZXJuYWxseSwgb3B0aW9uIHZhbGlkYXRlU2NoZW1hIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IF9tZXRhIHRydWUgaWYgc2NoZW1hIGlzIGEgbWV0YS1zY2hlbWEuIFVzZWQgaW50ZXJuYWxseSwgYWRkTWV0YVNjaGVtYSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gYWRkU2NoZW1hKHNjaGVtYSwga2V5LCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpe1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHRoaXMuYWRkU2NoZW1hKHNjaGVtYVtpXSwgdW5kZWZpbmVkLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWEpO1xuICBpZiAoaWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgaWQgIT0gJ3N0cmluZycpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzY2hlbWEgaWQgbXVzdCBiZSBzdHJpbmcnKTtcbiAga2V5ID0gcmVzb2x2ZS5ub3JtYWxpemVJZChrZXkgfHwgaWQpO1xuICBjaGVja1VuaXF1ZSh0aGlzLCBrZXkpO1xuICB0aGlzLl9zY2hlbWFzW2tleV0gPSB0aGlzLl9hZGRTY2hlbWEoc2NoZW1hLCBfc2tpcFZhbGlkYXRpb24sIF9tZXRhLCB0cnVlKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBBZGQgc2NoZW1hIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHZhbGlkYXRlIG90aGVyIHNjaGVtYXNcbiAqIG9wdGlvbnMgaW4gTUVUQV9JR05PUkVfT1BUSU9OUyBhcmUgYWx3YXkgc2V0IHRvIGZhbHNlXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9IHNjaGVtYSBzY2hlbWEgb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IG9wdGlvbmFsIHNjaGVtYSBrZXlcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gc2tpcFZhbGlkYXRpb24gdHJ1ZSB0byBza2lwIHNjaGVtYSB2YWxpZGF0aW9uLCBjYW4gYmUgdXNlZCB0byBvdmVycmlkZSB2YWxpZGF0ZVNjaGVtYSBvcHRpb24gZm9yIG1ldGEtc2NoZW1hXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRNZXRhU2NoZW1hKHNjaGVtYSwga2V5LCBza2lwVmFsaWRhdGlvbikge1xuICB0aGlzLmFkZFNjaGVtYShzY2hlbWEsIGtleSwgc2tpcFZhbGlkYXRpb24sIHRydWUpO1xuICByZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiAqIFZhbGlkYXRlIHNjaGVtYVxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIHZhbGlkYXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93T3JMb2dFcnJvciBwYXNzIHRydWUgdG8gdGhyb3cgKG9yIGxvZykgYW4gZXJyb3IgaWYgaW52YWxpZFxuICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiBzY2hlbWEgaXMgdmFsaWRcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVTY2hlbWEoc2NoZW1hLCB0aHJvd09yTG9nRXJyb3IpIHtcbiAgdmFyICRzY2hlbWEgPSBzY2hlbWEuJHNjaGVtYTtcbiAgaWYgKCRzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgJHNjaGVtYSAhPSAnc3RyaW5nJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJyRzY2hlbWEgbXVzdCBiZSBhIHN0cmluZycpO1xuICAkc2NoZW1hID0gJHNjaGVtYSB8fCB0aGlzLl9vcHRzLmRlZmF1bHRNZXRhIHx8IGRlZmF1bHRNZXRhKHRoaXMpO1xuICBpZiAoISRzY2hlbWEpIHtcbiAgICB0aGlzLmxvZ2dlci53YXJuKCdtZXRhLXNjaGVtYSBub3QgYXZhaWxhYmxlJyk7XG4gICAgdGhpcy5lcnJvcnMgPSBudWxsO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZhciB2YWxpZCA9IHRoaXMudmFsaWRhdGUoJHNjaGVtYSwgc2NoZW1hKTtcbiAgaWYgKCF2YWxpZCAmJiB0aHJvd09yTG9nRXJyb3IpIHtcbiAgICB2YXIgbWVzc2FnZSA9ICdzY2hlbWEgaXMgaW52YWxpZDogJyArIHRoaXMuZXJyb3JzVGV4dCgpO1xuICAgIGlmICh0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hID09ICdsb2cnKSB0aGlzLmxvZ2dlci5lcnJvcihtZXNzYWdlKTtcbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cblxuZnVuY3Rpb24gZGVmYXVsdE1ldGEoc2VsZikge1xuICB2YXIgbWV0YSA9IHNlbGYuX29wdHMubWV0YTtcbiAgc2VsZi5fb3B0cy5kZWZhdWx0TWV0YSA9IHR5cGVvZiBtZXRhID09ICdvYmplY3QnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBzZWxmLl9nZXRJZChtZXRhKSB8fCBtZXRhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBzZWxmLmdldFNjaGVtYShNRVRBX1NDSEVNQV9JRClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gTUVUQV9TQ0hFTUFfSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICByZXR1cm4gc2VsZi5fb3B0cy5kZWZhdWx0TWV0YTtcbn1cblxuXG4vKipcbiAqIEdldCBjb21waWxlZCBzY2hlbWEgZnJvbSB0aGUgaW5zdGFuY2UgYnkgYGtleWAgb3IgYHJlZmAuXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7U3RyaW5nfSBrZXlSZWYgYGtleWAgdGhhdCB3YXMgcGFzc2VkIHRvIGBhZGRTY2hlbWFgIG9yIGZ1bGwgc2NoZW1hIHJlZmVyZW5jZSAoYHNjaGVtYS5pZGAgb3IgcmVzb2x2ZWQgaWQpLlxuICogQHJldHVybiB7RnVuY3Rpb259IHNjaGVtYSB2YWxpZGF0aW5nIGZ1bmN0aW9uICh3aXRoIHByb3BlcnR5IGBzY2hlbWFgKS5cbiAqL1xuZnVuY3Rpb24gZ2V0U2NoZW1hKGtleVJlZikge1xuICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBrZXlSZWYpO1xuICBzd2l0Y2ggKHR5cGVvZiBzY2hlbWFPYmopIHtcbiAgICBjYXNlICdvYmplY3QnOiByZXR1cm4gc2NoZW1hT2JqLnZhbGlkYXRlIHx8IHRoaXMuX2NvbXBpbGUoc2NoZW1hT2JqKTtcbiAgICBjYXNlICdzdHJpbmcnOiByZXR1cm4gdGhpcy5nZXRTY2hlbWEoc2NoZW1hT2JqKTtcbiAgICBjYXNlICd1bmRlZmluZWQnOiByZXR1cm4gX2dldFNjaGVtYUZyYWdtZW50KHRoaXMsIGtleVJlZik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hRnJhZ21lbnQoc2VsZiwgcmVmKSB7XG4gIHZhciByZXMgPSByZXNvbHZlLnNjaGVtYS5jYWxsKHNlbGYsIHsgc2NoZW1hOiB7fSB9LCByZWYpO1xuICBpZiAocmVzKSB7XG4gICAgdmFyIHNjaGVtYSA9IHJlcy5zY2hlbWFcbiAgICAgICwgcm9vdCA9IHJlcy5yb290XG4gICAgICAsIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgdmFyIHYgPSBjb21waWxlU2NoZW1hLmNhbGwoc2VsZiwgc2NoZW1hLCByb290LCB1bmRlZmluZWQsIGJhc2VJZCk7XG4gICAgc2VsZi5fZnJhZ21lbnRzW3JlZl0gPSBuZXcgU2NoZW1hT2JqZWN0KHtcbiAgICAgIHJlZjogcmVmLFxuICAgICAgZnJhZ21lbnQ6IHRydWUsXG4gICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgIHJvb3Q6IHJvb3QsXG4gICAgICBiYXNlSWQ6IGJhc2VJZCxcbiAgICAgIHZhbGlkYXRlOiB2XG4gICAgfSk7XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBfZ2V0U2NoZW1hT2JqKHNlbGYsIGtleVJlZikge1xuICBrZXlSZWYgPSByZXNvbHZlLm5vcm1hbGl6ZUlkKGtleVJlZik7XG4gIHJldHVybiBzZWxmLl9zY2hlbWFzW2tleVJlZl0gfHwgc2VsZi5fcmVmc1trZXlSZWZdIHx8IHNlbGYuX2ZyYWdtZW50c1trZXlSZWZdO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGNhY2hlZCBzY2hlbWEocykuXG4gKiBJZiBubyBwYXJhbWV0ZXIgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIGJ1dCBtZXRhLXNjaGVtYXMgYXJlIHJlbW92ZWQuXG4gKiBJZiBSZWdFeHAgaXMgcGFzc2VkIGFsbCBzY2hlbWFzIHdpdGgga2V5L2lkIG1hdGNoaW5nIHBhdHRlcm4gYnV0IG1ldGEtc2NoZW1hcyBhcmUgcmVtb3ZlZC5cbiAqIEV2ZW4gaWYgc2NoZW1hIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgc2NoZW1hcyBpdCBzdGlsbCBjYW4gYmUgcmVtb3ZlZCBhcyBvdGhlciBzY2hlbWFzIGhhdmUgbG9jYWwgcmVmZXJlbmNlcy5cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtTdHJpbmd8T2JqZWN0fFJlZ0V4cH0gc2NoZW1hS2V5UmVmIGtleSwgcmVmLCBwYXR0ZXJuIHRvIG1hdGNoIGtleS9yZWYgb3Igc2NoZW1hIG9iamVjdFxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlU2NoZW1hKHNjaGVtYUtleVJlZikge1xuICBpZiAoc2NoZW1hS2V5UmVmIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgX3JlbW92ZUFsbFNjaGVtYXModGhpcywgdGhpcy5fc2NoZW1hcywgc2NoZW1hS2V5UmVmKTtcbiAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9yZWZzLCBzY2hlbWFLZXlSZWYpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHN3aXRjaCAodHlwZW9mIHNjaGVtYUtleVJlZikge1xuICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICBfcmVtb3ZlQWxsU2NoZW1hcyh0aGlzLCB0aGlzLl9zY2hlbWFzKTtcbiAgICAgIF9yZW1vdmVBbGxTY2hlbWFzKHRoaXMsIHRoaXMuX3JlZnMpO1xuICAgICAgdGhpcy5fY2FjaGUuY2xlYXIoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICB2YXIgc2NoZW1hT2JqID0gX2dldFNjaGVtYU9iaih0aGlzLCBzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKHNjaGVtYU9iaikgdGhpcy5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgdGhpcy5fc2NoZW1hc1tzY2hlbWFLZXlSZWZdO1xuICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbc2NoZW1hS2V5UmVmXTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICB2YXIgc2VyaWFsaXplID0gdGhpcy5fb3B0cy5zZXJpYWxpemU7XG4gICAgICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hS2V5UmVmKSA6IHNjaGVtYUtleVJlZjtcbiAgICAgIHRoaXMuX2NhY2hlLmRlbChjYWNoZUtleSk7XG4gICAgICB2YXIgaWQgPSB0aGlzLl9nZXRJZChzY2hlbWFLZXlSZWYpO1xuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9zY2hlbWFzW2lkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3JlZnNbaWRdO1xuICAgICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIF9yZW1vdmVBbGxTY2hlbWFzKHNlbGYsIHNjaGVtYXMsIHJlZ2V4KSB7XG4gIGZvciAodmFyIGtleVJlZiBpbiBzY2hlbWFzKSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHNjaGVtYXNba2V5UmVmXTtcbiAgICBpZiAoIXNjaGVtYU9iai5tZXRhICYmICghcmVnZXggfHwgcmVnZXgudGVzdChrZXlSZWYpKSkge1xuICAgICAgc2VsZi5fY2FjaGUuZGVsKHNjaGVtYU9iai5jYWNoZUtleSk7XG4gICAgICBkZWxldGUgc2NoZW1hc1trZXlSZWZdO1xuICAgIH1cbiAgfVxufVxuXG5cbi8qIEB0aGlzICAgQWp2ICovXG5mdW5jdGlvbiBfYWRkU2NoZW1hKHNjaGVtYSwgc2tpcFZhbGlkYXRpb24sIG1ldGEsIHNob3VsZEFkZFNjaGVtYSkge1xuICBpZiAodHlwZW9mIHNjaGVtYSAhPSAnb2JqZWN0JyAmJiB0eXBlb2Ygc2NoZW1hICE9ICdib29sZWFuJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSBzaG91bGQgYmUgb2JqZWN0IG9yIGJvb2xlYW4nKTtcbiAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX29wdHMuc2VyaWFsaXplO1xuICB2YXIgY2FjaGVLZXkgPSBzZXJpYWxpemUgPyBzZXJpYWxpemUoc2NoZW1hKSA6IHNjaGVtYTtcbiAgdmFyIGNhY2hlZCA9IHRoaXMuX2NhY2hlLmdldChjYWNoZUtleSk7XG4gIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XG5cbiAgc2hvdWxkQWRkU2NoZW1hID0gc2hvdWxkQWRkU2NoZW1hIHx8IHRoaXMuX29wdHMuYWRkVXNlZFNjaGVtYSAhPT0gZmFsc2U7XG5cbiAgdmFyIGlkID0gcmVzb2x2ZS5ub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgaWYgKGlkICYmIHNob3VsZEFkZFNjaGVtYSkgY2hlY2tVbmlxdWUodGhpcywgaWQpO1xuXG4gIHZhciB3aWxsVmFsaWRhdGUgPSB0aGlzLl9vcHRzLnZhbGlkYXRlU2NoZW1hICE9PSBmYWxzZSAmJiAhc2tpcFZhbGlkYXRpb247XG4gIHZhciByZWN1cnNpdmVNZXRhO1xuICBpZiAod2lsbFZhbGlkYXRlICYmICEocmVjdXJzaXZlTWV0YSA9IGlkICYmIGlkID09IHJlc29sdmUubm9ybWFsaXplSWQoc2NoZW1hLiRzY2hlbWEpKSlcbiAgICB0aGlzLnZhbGlkYXRlU2NoZW1hKHNjaGVtYSwgdHJ1ZSk7XG5cbiAgdmFyIGxvY2FsUmVmcyA9IHJlc29sdmUuaWRzLmNhbGwodGhpcywgc2NoZW1hKTtcblxuICB2YXIgc2NoZW1hT2JqID0gbmV3IFNjaGVtYU9iamVjdCh7XG4gICAgaWQ6IGlkLFxuICAgIHNjaGVtYTogc2NoZW1hLFxuICAgIGxvY2FsUmVmczogbG9jYWxSZWZzLFxuICAgIGNhY2hlS2V5OiBjYWNoZUtleSxcbiAgICBtZXRhOiBtZXRhXG4gIH0pO1xuXG4gIGlmIChpZFswXSAhPSAnIycgJiYgc2hvdWxkQWRkU2NoZW1hKSB0aGlzLl9yZWZzW2lkXSA9IHNjaGVtYU9iajtcbiAgdGhpcy5fY2FjaGUucHV0KGNhY2hlS2V5LCBzY2hlbWFPYmopO1xuXG4gIGlmICh3aWxsVmFsaWRhdGUgJiYgcmVjdXJzaXZlTWV0YSkgdGhpcy52YWxpZGF0ZVNjaGVtYShzY2hlbWEsIHRydWUpO1xuXG4gIHJldHVybiBzY2hlbWFPYmo7XG59XG5cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9jb21waWxlKHNjaGVtYU9iaiwgcm9vdCkge1xuICBpZiAoc2NoZW1hT2JqLmNvbXBpbGluZykge1xuICAgIHNjaGVtYU9iai52YWxpZGF0ZSA9IGNhbGxWYWxpZGF0ZTtcbiAgICBjYWxsVmFsaWRhdGUuc2NoZW1hID0gc2NoZW1hT2JqLnNjaGVtYTtcbiAgICBjYWxsVmFsaWRhdGUuZXJyb3JzID0gbnVsbDtcbiAgICBjYWxsVmFsaWRhdGUucm9vdCA9IHJvb3QgPyByb290IDogY2FsbFZhbGlkYXRlO1xuICAgIGlmIChzY2hlbWFPYmouc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSlcbiAgICAgIGNhbGxWYWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIHJldHVybiBjYWxsVmFsaWRhdGU7XG4gIH1cbiAgc2NoZW1hT2JqLmNvbXBpbGluZyA9IHRydWU7XG5cbiAgdmFyIGN1cnJlbnRPcHRzO1xuICBpZiAoc2NoZW1hT2JqLm1ldGEpIHtcbiAgICBjdXJyZW50T3B0cyA9IHRoaXMuX29wdHM7XG4gICAgdGhpcy5fb3B0cyA9IHRoaXMuX21ldGFPcHRzO1xuICB9XG5cbiAgdmFyIHY7XG4gIHRyeSB7IHYgPSBjb21waWxlU2NoZW1hLmNhbGwodGhpcywgc2NoZW1hT2JqLnNjaGVtYSwgcm9vdCwgc2NoZW1hT2JqLmxvY2FsUmVmcyk7IH1cbiAgY2F0Y2goZSkge1xuICAgIGRlbGV0ZSBzY2hlbWFPYmoudmFsaWRhdGU7XG4gICAgdGhyb3cgZTtcbiAgfVxuICBmaW5hbGx5IHtcbiAgICBzY2hlbWFPYmouY29tcGlsaW5nID0gZmFsc2U7XG4gICAgaWYgKHNjaGVtYU9iai5tZXRhKSB0aGlzLl9vcHRzID0gY3VycmVudE9wdHM7XG4gIH1cblxuICBzY2hlbWFPYmoudmFsaWRhdGUgPSB2O1xuICBzY2hlbWFPYmoucmVmcyA9IHYucmVmcztcbiAgc2NoZW1hT2JqLnJlZlZhbCA9IHYucmVmVmFsO1xuICBzY2hlbWFPYmoucm9vdCA9IHYucm9vdDtcbiAgcmV0dXJuIHY7XG5cblxuICAvKiBAdGhpcyAgIHsqfSAtIGN1c3RvbSBjb250ZXh0LCBzZWUgcGFzc0NvbnRleHQgb3B0aW9uICovXG4gIGZ1bmN0aW9uIGNhbGxWYWxpZGF0ZSgpIHtcbiAgICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gICAgdmFyIF92YWxpZGF0ZSA9IHNjaGVtYU9iai52YWxpZGF0ZTtcbiAgICB2YXIgcmVzdWx0ID0gX3ZhbGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgY2FsbFZhbGlkYXRlLmVycm9ycyA9IF92YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNob29zZUdldElkKG9wdHMpIHtcbiAgc3dpdGNoIChvcHRzLnNjaGVtYUlkKSB7XG4gICAgY2FzZSAnYXV0byc6IHJldHVybiBfZ2V0JElkT3JJZDtcbiAgICBjYXNlICdpZCc6IHJldHVybiBfZ2V0SWQ7XG4gICAgZGVmYXVsdDogcmV0dXJuIF9nZXQkSWQ7XG4gIH1cbn1cblxuLyogQHRoaXMgICBBanYgKi9cbmZ1bmN0aW9uIF9nZXRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQpIHRoaXMubG9nZ2VyLndhcm4oJ3NjaGVtYSAkaWQgaWdub3JlZCcsIHNjaGVtYS4kaWQpO1xuICByZXR1cm4gc2NoZW1hLmlkO1xufVxuXG4vKiBAdGhpcyAgIEFqdiAqL1xuZnVuY3Rpb24gX2dldCRJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS5pZCkgdGhpcy5sb2dnZXIud2Fybignc2NoZW1hIGlkIGlnbm9yZWQnLCBzY2hlbWEuaWQpO1xuICByZXR1cm4gc2NoZW1hLiRpZDtcbn1cblxuXG5mdW5jdGlvbiBfZ2V0JElkT3JJZChzY2hlbWEpIHtcbiAgaWYgKHNjaGVtYS4kaWQgJiYgc2NoZW1hLmlkICYmIHNjaGVtYS4kaWQgIT0gc2NoZW1hLmlkKVxuICAgIHRocm93IG5ldyBFcnJvcignc2NoZW1hICRpZCBpcyBkaWZmZXJlbnQgZnJvbSBpZCcpO1xuICByZXR1cm4gc2NoZW1hLiRpZCB8fCBzY2hlbWEuaWQ7XG59XG5cblxuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIGVycm9yIG1lc3NhZ2Ugb2JqZWN0cyB0byBzdHJpbmdcbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtBcnJheTxPYmplY3Q+fSBlcnJvcnMgb3B0aW9uYWwgYXJyYXkgb2YgdmFsaWRhdGlvbiBlcnJvcnMsIGlmIG5vdCBwYXNzZWQgZXJyb3JzIGZyb20gdGhlIGluc3RhbmNlIGFyZSB1c2VkLlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbmFsIG9wdGlvbnMgd2l0aCBwcm9wZXJ0aWVzIGBzZXBhcmF0b3JgIGFuZCBgZGF0YVZhcmAuXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGh1bWFuIHJlYWRhYmxlIHN0cmluZyB3aXRoIGFsbCBlcnJvcnMgZGVzY3JpcHRpb25zXG4gKi9cbmZ1bmN0aW9uIGVycm9yc1RleHQoZXJyb3JzLCBvcHRpb25zKSB7XG4gIGVycm9ycyA9IGVycm9ycyB8fCB0aGlzLmVycm9ycztcbiAgaWYgKCFlcnJvcnMpIHJldHVybiAnTm8gZXJyb3JzJztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBzZXBhcmF0b3IgPSBvcHRpb25zLnNlcGFyYXRvciA9PT0gdW5kZWZpbmVkID8gJywgJyA6IG9wdGlvbnMuc2VwYXJhdG9yO1xuICB2YXIgZGF0YVZhciA9IG9wdGlvbnMuZGF0YVZhciA9PT0gdW5kZWZpbmVkID8gJ2RhdGEnIDogb3B0aW9ucy5kYXRhVmFyO1xuXG4gIHZhciB0ZXh0ID0gJyc7XG4gIGZvciAodmFyIGk9MDsgaTxlcnJvcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZSA9IGVycm9yc1tpXTtcbiAgICBpZiAoZSkgdGV4dCArPSBkYXRhVmFyICsgZS5kYXRhUGF0aCArICcgJyArIGUubWVzc2FnZSArIHNlcGFyYXRvcjtcbiAgfVxuICByZXR1cm4gdGV4dC5zbGljZSgwLCAtc2VwYXJhdG9yLmxlbmd0aCk7XG59XG5cblxuLyoqXG4gKiBBZGQgY3VzdG9tIGZvcm1hdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIGZvcm1hdCBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB8RnVuY3Rpb259IGZvcm1hdCBzdHJpbmcgaXMgY29udmVydGVkIHRvIFJlZ0V4cDsgZnVuY3Rpb24gc2hvdWxkIHJldHVybiBib29sZWFuICh0cnVlIHdoZW4gdmFsaWQpXG4gKiBAcmV0dXJuIHtBanZ9IHRoaXMgZm9yIG1ldGhvZCBjaGFpbmluZ1xuICovXG5mdW5jdGlvbiBhZGRGb3JtYXQobmFtZSwgZm9ybWF0KSB7XG4gIGlmICh0eXBlb2YgZm9ybWF0ID09ICdzdHJpbmcnKSBmb3JtYXQgPSBuZXcgUmVnRXhwKGZvcm1hdCk7XG4gIHRoaXMuX2Zvcm1hdHNbbmFtZV0gPSBmb3JtYXQ7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbmZ1bmN0aW9uIGFkZERlZmF1bHRNZXRhU2NoZW1hKHNlbGYpIHtcbiAgdmFyICRkYXRhU2NoZW1hO1xuICBpZiAoc2VsZi5fb3B0cy4kZGF0YSkge1xuICAgICRkYXRhU2NoZW1hID0gcmVxdWlyZSgnLi9yZWZzL2RhdGEuanNvbicpO1xuICAgIHNlbGYuYWRkTWV0YVNjaGVtYSgkZGF0YVNjaGVtYSwgJGRhdGFTY2hlbWEuJGlkLCB0cnVlKTtcbiAgfVxuICBpZiAoc2VsZi5fb3B0cy5tZXRhID09PSBmYWxzZSkgcmV0dXJuO1xuICB2YXIgbWV0YVNjaGVtYSA9IHJlcXVpcmUoJy4vcmVmcy9qc29uLXNjaGVtYS1kcmFmdC0wNy5qc29uJyk7XG4gIGlmIChzZWxmLl9vcHRzLiRkYXRhKSBtZXRhU2NoZW1hID0gJGRhdGFNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU1VQUE9SVF9EQVRBKTtcbiAgc2VsZi5hZGRNZXRhU2NoZW1hKG1ldGFTY2hlbWEsIE1FVEFfU0NIRU1BX0lELCB0cnVlKTtcbiAgc2VsZi5fcmVmc1snaHR0cDovL2pzb24tc2NoZW1hLm9yZy9zY2hlbWEnXSA9IE1FVEFfU0NIRU1BX0lEO1xufVxuXG5cbmZ1bmN0aW9uIGFkZEluaXRpYWxTY2hlbWFzKHNlbGYpIHtcbiAgdmFyIG9wdHNTY2hlbWFzID0gc2VsZi5fb3B0cy5zY2hlbWFzO1xuICBpZiAoIW9wdHNTY2hlbWFzKSByZXR1cm47XG4gIGlmIChBcnJheS5pc0FycmF5KG9wdHNTY2hlbWFzKSkgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXMpO1xuICBlbHNlIGZvciAodmFyIGtleSBpbiBvcHRzU2NoZW1hcykgc2VsZi5hZGRTY2hlbWEob3B0c1NjaGVtYXNba2V5XSwga2V5KTtcbn1cblxuXG5mdW5jdGlvbiBhZGRJbml0aWFsRm9ybWF0cyhzZWxmKSB7XG4gIGZvciAodmFyIG5hbWUgaW4gc2VsZi5fb3B0cy5mb3JtYXRzKSB7XG4gICAgdmFyIGZvcm1hdCA9IHNlbGYuX29wdHMuZm9ybWF0c1tuYW1lXTtcbiAgICBzZWxmLmFkZEZvcm1hdChuYW1lLCBmb3JtYXQpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gYWRkSW5pdGlhbEtleXdvcmRzKHNlbGYpIHtcbiAgZm9yICh2YXIgbmFtZSBpbiBzZWxmLl9vcHRzLmtleXdvcmRzKSB7XG4gICAgdmFyIGtleXdvcmQgPSBzZWxmLl9vcHRzLmtleXdvcmRzW25hbWVdO1xuICAgIHNlbGYuYWRkS2V5d29yZChuYW1lLCBrZXl3b3JkKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGNoZWNrVW5pcXVlKHNlbGYsIGlkKSB7XG4gIGlmIChzZWxmLl9zY2hlbWFzW2lkXSB8fCBzZWxmLl9yZWZzW2lkXSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NjaGVtYSB3aXRoIGtleSBvciBpZCBcIicgKyBpZCArICdcIiBhbHJlYWR5IGV4aXN0cycpO1xufVxuXG5cbmZ1bmN0aW9uIGdldE1ldGFTY2hlbWFPcHRpb25zKHNlbGYpIHtcbiAgdmFyIG1ldGFPcHRzID0gdXRpbC5jb3B5KHNlbGYuX29wdHMpO1xuICBmb3IgKHZhciBpPTA7IGk8TUVUQV9JR05PUkVfT1BUSU9OUy5sZW5ndGg7IGkrKylcbiAgICBkZWxldGUgbWV0YU9wdHNbTUVUQV9JR05PUkVfT1BUSU9OU1tpXV07XG4gIHJldHVybiBtZXRhT3B0cztcbn1cblxuXG5mdW5jdGlvbiBzZXRMb2dnZXIoc2VsZikge1xuICB2YXIgbG9nZ2VyID0gc2VsZi5fb3B0cy5sb2dnZXI7XG4gIGlmIChsb2dnZXIgPT09IGZhbHNlKSB7XG4gICAgc2VsZi5sb2dnZXIgPSB7bG9nOiBub29wLCB3YXJuOiBub29wLCBlcnJvcjogbm9vcH07XG4gIH0gZWxzZSB7XG4gICAgaWYgKGxvZ2dlciA9PT0gdW5kZWZpbmVkKSBsb2dnZXIgPSBjb25zb2xlO1xuICAgIGlmICghKHR5cGVvZiBsb2dnZXIgPT0gJ29iamVjdCcgJiYgbG9nZ2VyLmxvZyAmJiBsb2dnZXIud2FybiAmJiBsb2dnZXIuZXJyb3IpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsb2dnZXIgbXVzdCBpbXBsZW1lbnQgbG9nLCB3YXJuIGFuZCBlcnJvciBtZXRob2RzJyk7XG4gICAgc2VsZi5sb2dnZXIgPSBsb2dnZXI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBub29wKCkge31cbiIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgQ2FjaGUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIENhY2hlKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gQ2FjaGVfcHV0KGtleSwgdmFsdWUpIHtcbiAgdGhpcy5fY2FjaGVba2V5XSA9IHZhbHVlO1xufTtcblxuXG5DYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gQ2FjaGVfZ2V0KGtleSkge1xuICByZXR1cm4gdGhpcy5fY2FjaGVba2V5XTtcbn07XG5cblxuQ2FjaGUucHJvdG90eXBlLmRlbCA9IGZ1bmN0aW9uIENhY2hlX2RlbChrZXkpIHtcbiAgZGVsZXRlIHRoaXMuX2NhY2hlW2tleV07XG59O1xuXG5cbkNhY2hlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIENhY2hlX2NsZWFyKCkge1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE1pc3NpbmdSZWZFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3JfY2xhc3NlcycpLk1pc3NpbmdSZWY7XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcGlsZUFzeW5jO1xuXG5cbi8qKlxuICogQ3JlYXRlcyB2YWxpZGF0aW5nIGZ1bmN0aW9uIGZvciBwYXNzZWQgc2NoZW1hIHdpdGggYXN5bmNocm9ub3VzIGxvYWRpbmcgb2YgbWlzc2luZyBzY2hlbWFzLlxuICogYGxvYWRTY2hlbWFgIG9wdGlvbiBzaG91bGQgYmUgYSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgc2NoZW1hIHVyaSBhbmQgcmV0dXJucyBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgc2NoZW1hLlxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtPYmplY3R9ICAgc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gIG1ldGEgb3B0aW9uYWwgdHJ1ZSB0byBjb21waWxlIG1ldGEtc2NoZW1hOyB0aGlzIHBhcmFtZXRlciBjYW4gYmUgc2tpcHBlZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgYW4gb3B0aW9uYWwgbm9kZS1zdHlsZSBjYWxsYmFjaywgaXQgaXMgY2FsbGVkIHdpdGggMiBwYXJhbWV0ZXJzOiBlcnJvciAob3IgbnVsbCkgYW5kIHZhbGlkYXRpbmcgZnVuY3Rpb24uXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIHZhbGlkYXRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVBc3luYyhzY2hlbWEsIG1ldGEsIGNhbGxiYWNrKSB7XG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgLyogZ2xvYmFsIFByb21pc2UgKi9cbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2YgdGhpcy5fb3B0cy5sb2FkU2NoZW1hICE9ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdvcHRpb25zLmxvYWRTY2hlbWEgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAodHlwZW9mIG1ldGEgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gbWV0YTtcbiAgICBtZXRhID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdmFyIHAgPSBsb2FkTWV0YVNjaGVtYU9mKHNjaGVtYSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjaGVtYU9iaiA9IHNlbGYuX2FkZFNjaGVtYShzY2hlbWEsIHVuZGVmaW5lZCwgbWV0YSk7XG4gICAgcmV0dXJuIHNjaGVtYU9iai52YWxpZGF0ZSB8fCBfY29tcGlsZUFzeW5jKHNjaGVtYU9iaik7XG4gIH0pO1xuXG4gIGlmIChjYWxsYmFjaykge1xuICAgIHAudGhlbihcbiAgICAgIGZ1bmN0aW9uKHYpIHsgY2FsbGJhY2sobnVsbCwgdik7IH0sXG4gICAgICBjYWxsYmFja1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gcDtcblxuXG4gIGZ1bmN0aW9uIGxvYWRNZXRhU2NoZW1hT2Yoc2NoKSB7XG4gICAgdmFyICRzY2hlbWEgPSBzY2guJHNjaGVtYTtcbiAgICByZXR1cm4gJHNjaGVtYSAmJiAhc2VsZi5nZXRTY2hlbWEoJHNjaGVtYSlcbiAgICAgICAgICAgID8gY29tcGlsZUFzeW5jLmNhbGwoc2VsZiwgeyAkcmVmOiAkc2NoZW1hIH0sIHRydWUpXG4gICAgICAgICAgICA6IFByb21pc2UucmVzb2x2ZSgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBfY29tcGlsZUFzeW5jKHNjaGVtYU9iaikge1xuICAgIHRyeSB7IHJldHVybiBzZWxmLl9jb21waWxlKHNjaGVtYU9iaik7IH1cbiAgICBjYXRjaChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE1pc3NpbmdSZWZFcnJvcikgcmV0dXJuIGxvYWRNaXNzaW5nU2NoZW1hKGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGxvYWRNaXNzaW5nU2NoZW1hKGUpIHtcbiAgICAgIHZhciByZWYgPSBlLm1pc3NpbmdTY2hlbWE7XG4gICAgICBpZiAoYWRkZWQocmVmKSkgdGhyb3cgbmV3IEVycm9yKCdTY2hlbWEgJyArIHJlZiArICcgaXMgbG9hZGVkIGJ1dCAnICsgZS5taXNzaW5nUmVmICsgJyBjYW5ub3QgYmUgcmVzb2x2ZWQnKTtcblxuICAgICAgdmFyIHNjaGVtYVByb21pc2UgPSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdO1xuICAgICAgaWYgKCFzY2hlbWFQcm9taXNlKSB7XG4gICAgICAgIHNjaGVtYVByb21pc2UgPSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdID0gc2VsZi5fb3B0cy5sb2FkU2NoZW1hKHJlZik7XG4gICAgICAgIHNjaGVtYVByb21pc2UudGhlbihyZW1vdmVQcm9taXNlLCByZW1vdmVQcm9taXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNjaGVtYVByb21pc2UudGhlbihmdW5jdGlvbiAoc2NoKSB7XG4gICAgICAgIGlmICghYWRkZWQocmVmKSkge1xuICAgICAgICAgIHJldHVybiBsb2FkTWV0YVNjaGVtYU9mKHNjaCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIWFkZGVkKHJlZikpIHNlbGYuYWRkU2NoZW1hKHNjaCwgcmVmLCB1bmRlZmluZWQsIG1ldGEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gX2NvbXBpbGVBc3luYyhzY2hlbWFPYmopO1xuICAgICAgfSk7XG5cbiAgICAgIGZ1bmN0aW9uIHJlbW92ZVByb21pc2UoKSB7XG4gICAgICAgIGRlbGV0ZSBzZWxmLl9sb2FkaW5nU2NoZW1hc1tyZWZdO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBhZGRlZChyZWYpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX3JlZnNbcmVmXSB8fCBzZWxmLl9zY2hlbWFzW3JlZl07XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZXNvbHZlID0gcmVxdWlyZSgnLi9yZXNvbHZlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBWYWxpZGF0aW9uOiBlcnJvclN1YmNsYXNzKFZhbGlkYXRpb25FcnJvciksXG4gIE1pc3NpbmdSZWY6IGVycm9yU3ViY2xhc3MoTWlzc2luZ1JlZkVycm9yKVxufTtcblxuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoZXJyb3JzKSB7XG4gIHRoaXMubWVzc2FnZSA9ICd2YWxpZGF0aW9uIGZhaWxlZCc7XG4gIHRoaXMuZXJyb3JzID0gZXJyb3JzO1xuICB0aGlzLmFqdiA9IHRoaXMudmFsaWRhdGlvbiA9IHRydWU7XG59XG5cblxuTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UgPSBmdW5jdGlvbiAoYmFzZUlkLCByZWYpIHtcbiAgcmV0dXJuICdjYW5cXCd0IHJlc29sdmUgcmVmZXJlbmNlICcgKyByZWYgKyAnIGZyb20gaWQgJyArIGJhc2VJZDtcbn07XG5cblxuZnVuY3Rpb24gTWlzc2luZ1JlZkVycm9yKGJhc2VJZCwgcmVmLCBtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UoYmFzZUlkLCByZWYpO1xuICB0aGlzLm1pc3NpbmdSZWYgPSByZXNvbHZlLnVybChiYXNlSWQsIHJlZik7XG4gIHRoaXMubWlzc2luZ1NjaGVtYSA9IHJlc29sdmUubm9ybWFsaXplSWQocmVzb2x2ZS5mdWxsUGF0aCh0aGlzLm1pc3NpbmdSZWYpKTtcbn1cblxuXG5mdW5jdGlvbiBlcnJvclN1YmNsYXNzKFN1YmNsYXNzKSB7XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbiAgU3ViY2xhc3MucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU3ViY2xhc3M7XG4gIHJldHVybiBTdWJjbGFzcztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIERBVEUgPSAvXihcXGRcXGRcXGRcXGQpLShcXGRcXGQpLShcXGRcXGQpJC87XG52YXIgREFZUyA9IFswLDMxLDI4LDMxLDMwLDMxLDMwLDMxLDMxLDMwLDMxLDMwLDMxXTtcbnZhciBUSU1FID0gL14oXFxkXFxkKTooXFxkXFxkKTooXFxkXFxkKShcXC5cXGQrKT8oenxbKy1dXFxkXFxkKD86Oj9cXGRcXGQpPyk/JC9pO1xudmFyIEhPU1ROQU1FID0gL14oPz0uezEsMjUzfVxcLj8kKVthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86Wy0wLTlhLXpdezAsNjF9WzAtOWEtel0pPykqXFwuPyQvaTtcbnZhciBVUkkgPSAvXig/OlthLXpdW2EtejAtOStcXC0uXSo6KSg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PV18JVswLTlhLWZdezJ9KSopKD86OlxcZCopPyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqfFxcLyg/Oig/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKikqKT98KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkrKD86XFwvKD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopKD86XFw/KD86W2EtejAtOVxcLS5ffiEkJicoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06QC8/XXwlWzAtOWEtZl17Mn0pKik/JC9pO1xudmFyIFVSSVJFRiA9IC9eKD86W2Etel1bYS16MC05K1xcLS5dKjopPyg/OlxcLz9cXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJygpKissOz06XXwlWzAtOWEtZl17Mn0pKkApPyg/OlxcWyg/Oig/Oig/Oig/OlswLTlhLWZdezEsNH06KXs2fXw6Oig/OlswLTlhLWZdezEsNH06KXs1fXwoPzpbMC05YS1mXXsxLDR9KT86Oig/OlswLTlhLWZdezEsNH06KXs0fXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MCwxfVswLTlhLWZdezEsNH0pPzo6KD86WzAtOWEtZl17MSw0fTopezN9fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDJ9WzAtOWEtZl17MSw0fSk/OjooPzpbMC05YS1mXXsxLDR9Oil7Mn18KD86KD86WzAtOWEtZl17MSw0fTopezAsM31bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH06fCg/Oig/OlswLTlhLWZdezEsNH06KXswLDR9WzAtOWEtZl17MSw0fSk/OjopKD86WzAtOWEtZl17MSw0fTpbMC05YS1mXXsxLDR9fCg/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSl8KD86KD86WzAtOWEtZl17MSw0fTopezAsNX1bMC05YS1mXXsxLDR9KT86OlswLTlhLWZdezEsNH18KD86KD86WzAtOWEtZl17MSw0fTopezAsNn1bMC05YS1mXXsxLDR9KT86Oil8W1Z2XVswLTlhLWZdK1xcLlthLXowLTlcXC0uX34hJCYnKCkqKyw7PTpdKylcXF18KD86KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pfCg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9XXwlWzAtOWEtZl17Mn0pKikoPzo6XFxkKik/KD86XFwvKD86W2EtejAtOVxcLS5ffiEkJidcIigpKissOz06QF18JVswLTlhLWZdezJ9KSopKnxcXC8oPzooPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopP3woPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpAXXwlWzAtOWEtZl17Mn0pKyg/OlxcLyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkBdfCVbMC05YS1mXXsyfSkqKSopPyg/OlxcPyg/OlthLXowLTlcXC0uX34hJCYnXCIoKSorLDs9OkAvP118JVswLTlhLWZdezJ9KSopPyg/OiMoPzpbYS16MC05XFwtLl9+ISQmJ1wiKCkqKyw7PTpALz9dfCVbMC05YS1mXXsyfSkqKT8kL2k7XG4vLyB1cmktdGVtcGxhdGU6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2NTcwXG52YXIgVVJJVEVNUExBVEUgPSAvXig/Oig/OlteXFx4MDAtXFx4MjBcIic8PiVcXFxcXmB7fH1dfCVbMC05YS1mXXsyfSl8XFx7WysjLi87PyY9LCFAfF0/KD86W2EtejAtOV9dfCVbMC05YS1mXXsyfSkrKD86OlsxLTldWzAtOV17MCwzfXxcXCopPyg/OiwoPzpbYS16MC05X118JVswLTlhLWZdezJ9KSsoPzo6WzEtOV1bMC05XXswLDN9fFxcKik/KSpcXH0pKiQvaTtcbi8vIEZvciB0aGUgc291cmNlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kcGVyaW5pLzcyOTI5NFxuLy8gRm9yIHRlc3QgY2FzZXM6IGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9kZW1vL3VybC1yZWdleFxuLy8gQHRvZG8gRGVsZXRlIGN1cnJlbnQgVVJMIGluIGZhdm91ciBvZiB0aGUgY29tbWVudGVkIG91dCBVUkwgcnVsZSB3aGVuIHRoaXMgaXNzdWUgaXMgZml4ZWQgaHR0cHM6Ly9naXRodWIuY29tL2VzbGludC9lc2xpbnQvaXNzdWVzLzc5ODMuXG4vLyB2YXIgVVJMID0gL14oPzooPzpodHRwcz98ZnRwKTpcXC9cXC8pKD86XFxTKyg/OjpcXFMqKT9AKT8oPzooPyExMCg/OlxcLlxcZHsxLDN9KXszfSkoPyExMjcoPzpcXC5cXGR7MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuXFxkezEsM30pezJ9KSg/ITE5MlxcLjE2OCg/OlxcLlxcZHsxLDN9KXsyfSkoPyExNzJcXC4oPzoxWzYtOV18MlxcZHwzWzAtMV0pKD86XFwuXFxkezEsM30pezJ9KSg/OlsxLTldXFxkP3wxXFxkXFxkfDJbMDFdXFxkfDIyWzAtM10pKD86XFwuKD86MT9cXGR7MSwyfXwyWzAtNF1cXGR8MjVbMC01XSkpezJ9KD86XFwuKD86WzEtOV1cXGQ/fDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNF0pKXwoPzooPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykoPzpcXC4oPzpbYS16XFx1ezAwYTF9LVxcdXtmZmZmfTAtOV0rLSkqW2EtelxcdXswMGExfS1cXHV7ZmZmZn0wLTldKykqKD86XFwuKD86W2EtelxcdXswMGExfS1cXHV7ZmZmZn1dezIsfSkpKSg/OjpcXGR7Miw1fSk/KD86XFwvW15cXHNdKik/JC9pdTtcbnZhciBVUkwgPSAvXig/Oig/Omh0dHBbc1xcdTAxN0ZdP3xmdHApOlxcL1xcLykoPzooPzpbXFwwLVxceDA4XFx4MEUtXFx4MUYhLVxceDlGXFx4QTEtXFx1MTY3RlxcdTE2ODEtXFx1MUZGRlxcdTIwMEItXFx1MjAyN1xcdTIwMkEtXFx1MjAyRVxcdTIwMzAtXFx1MjA1RVxcdTIwNjAtXFx1MkZGRlxcdTMwMDEtXFx1RDdGRlxcdUUwMDAtXFx1RkVGRVxcdUZGMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKD86Oig/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopP0ApPyg/Oig/ITEwKD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTI3KD86XFwuWzAtOV17MSwzfSl7M30pKD8hMTY5XFwuMjU0KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTkyXFwuMTY4KD86XFwuWzAtOV17MSwzfSl7Mn0pKD8hMTcyXFwuKD86MVs2LTldfDJbMC05XXwzWzAxXSkoPzpcXC5bMC05XXsxLDN9KXsyfSkoPzpbMS05XVswLTldP3wxWzAtOV1bMC05XXwyWzAxXVswLTldfDIyWzAtM10pKD86XFwuKD86MT9bMC05XXsxLDJ9fDJbMC00XVswLTldfDI1WzAtNV0pKXsyfSg/OlxcLig/OlsxLTldWzAtOV0/fDFbMC05XVswLTldfDJbMC00XVswLTldfDI1WzAtNF0pKXwoPzooPzooPzpbMC05YS16XFx4QTEtXFx1RDdGRlxcdUUwMDAtXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0pKy0pKig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrKSg/OlxcLig/Oig/OlswLTlhLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSkrLSkqKD86WzAtOWEtelxceEExLVxcdUQ3RkZcXHVFMDAwLVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSspKig/OlxcLig/Oig/OlthLXpcXHhBMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXSl7Mix9KSkpKD86OlswLTldezIsNX0pPyg/OlxcLyg/OltcXDAtXFx4MDhcXHgwRS1cXHgxRiEtXFx4OUZcXHhBMS1cXHUxNjdGXFx1MTY4MS1cXHUxRkZGXFx1MjAwQi1cXHUyMDI3XFx1MjAyQS1cXHUyMDJFXFx1MjAzMC1cXHUyMDVFXFx1MjA2MC1cXHUyRkZGXFx1MzAwMS1cXHVEN0ZGXFx1RTAwMC1cXHVGRUZFXFx1RkYwMC1cXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdKSopPyQvaTtcbnZhciBVVUlEID0gL14oPzp1cm46dXVpZDopP1swLTlhLWZdezh9LSg/OlswLTlhLWZdezR9LSl7M31bMC05YS1mXXsxMn0kL2k7XG52YXIgSlNPTl9QT0lOVEVSID0gL14oPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSokLztcbnZhciBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5UID0gL14jKD86XFwvKD86W2EtejAtOV9cXC0uISQmJygpKissOzo9QF18JVswLTlhLWZdezJ9fH4wfH4xKSopKiQvaTtcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXig/OjB8WzEtOV1bMC05XSopKD86I3woPzpcXC8oPzpbXn4vXXx+MHx+MSkqKSopJC87XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmb3JtYXRzO1xuXG5mdW5jdGlvbiBmb3JtYXRzKG1vZGUpIHtcbiAgbW9kZSA9IG1vZGUgPT0gJ2Z1bGwnID8gJ2Z1bGwnIDogJ2Zhc3QnO1xuICByZXR1cm4gdXRpbC5jb3B5KGZvcm1hdHNbbW9kZV0pO1xufVxuXG5cbmZvcm1hdHMuZmFzdCA9IHtcbiAgLy8gZGF0ZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICBkYXRlOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZCQvLFxuICAvLyBkYXRlLXRpbWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdGltZTogL14oPzpbMC0yXVxcZDpbMC01XVxcZDpbMC01XVxcZHwyMzo1OTo2MCkoPzpcXC5cXGQrKT8oPzp6fFsrLV1cXGRcXGQoPzo6P1xcZFxcZCk/KT8kL2ksXG4gICdkYXRlLXRpbWUnOiAvXlxcZFxcZFxcZFxcZC1bMC0xXVxcZC1bMC0zXVxcZFt0XFxzXSg/OlswLTJdXFxkOlswLTVdXFxkOlswLTVdXFxkfDIzOjU5OjYwKSg/OlxcLlxcZCspPyg/Onp8WystXVxcZFxcZCg/Ojo/XFxkXFxkKT8pJC9pLFxuICAvLyB1cmk6IGh0dHBzOi8vZ2l0aHViLmNvbS9tYWZpbnRvc2gvaXMtbXktanNvbi12YWxpZC9ibG9iL21hc3Rlci9mb3JtYXRzLmpzXG4gIHVyaTogL14oPzpbYS16XVthLXowLTkrXFwtLl0qOikoPzpcXC8/XFwvKT9bXlxcc10qJC9pLFxuICAndXJpLXJlZmVyZW5jZSc6IC9eKD86KD86W2Etel1bYS16MC05K1xcLS5dKjopP1xcLz9cXC8pPyg/OlteXFxcXFxccyNdW15cXHMjXSopPyg/OiNbXlxcXFxcXHNdKik/JC9pLFxuICAndXJpLXRlbXBsYXRlJzogVVJJVEVNUExBVEUsXG4gIHVybDogVVJMLFxuICAvLyBlbWFpbCAoc291cmNlcyBmcm9tIGpzZW4gdmFsaWRhdG9yKTpcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMDEzMjMvdXNpbmctYS1yZWd1bGFyLWV4cHJlc3Npb24tdG8tdmFsaWRhdGUtYW4tZW1haWwtYWRkcmVzcyNhbnN3ZXItODgyOTM2M1xuICAvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9odG1sNS9mb3Jtcy5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzIChzZWFyY2ggZm9yICd3aWxsZnVsIHZpb2xhdGlvbicpXG4gIGVtYWlsOiAvXlthLXowLTkuISMkJSYnKisvPT9eX2B7fH1+LV0rQFthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPyg/OlxcLlthLXowLTldKD86W2EtejAtOS1dezAsNjF9W2EtejAtOV0pPykqJC9pLFxuICBob3N0bmFtZTogSE9TVE5BTUUsXG4gIC8vIG9wdGltaXplZCBodHRwczovL3d3dy5zYWZhcmlib29rc29ubGluZS5jb20vbGlicmFyeS92aWV3L3JlZ3VsYXItZXhwcmVzc2lvbnMtY29va2Jvb2svOTc4MDU5NjgwMjgzNy9jaDA3czE2Lmh0bWxcbiAgaXB2NDogL14oPzooPzoyNVswLTVdfDJbMC00XVxcZHxbMDFdP1xcZFxcZD8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPykkLyxcbiAgLy8gb3B0aW1pemVkIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTM0OTcvcmVndWxhci1leHByZXNzaW9uLXRoYXQtbWF0Y2hlcy12YWxpZC1pcHY2LWFkZHJlc3Nlc1xuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIC8vIHV1aWQ6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzQxMjJcbiAgdXVpZDogVVVJRCxcbiAgLy8gSlNPTi1wb2ludGVyOiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMVxuICAvLyB1cmkgZnJhZ21lbnQ6IGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I2FwcGVuZGl4LUFcbiAgJ2pzb24tcG9pbnRlcic6IEpTT05fUE9JTlRFUixcbiAgJ2pzb24tcG9pbnRlci11cmktZnJhZ21lbnQnOiBKU09OX1BPSU5URVJfVVJJX0ZSQUdNRU5ULFxuICAvLyByZWxhdGl2ZSBKU09OLXBvaW50ZXI6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWx1ZmYtcmVsYXRpdmUtanNvbi1wb2ludGVyLTAwXG4gICdyZWxhdGl2ZS1qc29uLXBvaW50ZXInOiBSRUxBVElWRV9KU09OX1BPSU5URVJcbn07XG5cblxuZm9ybWF0cy5mdWxsID0ge1xuICBkYXRlOiBkYXRlLFxuICB0aW1lOiB0aW1lLFxuICAnZGF0ZS10aW1lJzogZGF0ZV90aW1lLFxuICB1cmk6IHVyaSxcbiAgJ3VyaS1yZWZlcmVuY2UnOiBVUklSRUYsXG4gICd1cmktdGVtcGxhdGUnOiBVUklURU1QTEFURSxcbiAgdXJsOiBVUkwsXG4gIGVtYWlsOiAvXlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSpAKD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pPyQvaSxcbiAgaG9zdG5hbWU6IEhPU1ROQU1FLFxuICBpcHY0OiAvXig/Oig/OjI1WzAtNV18MlswLTRdXFxkfFswMV0/XFxkXFxkPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1cXGR8WzAxXT9cXGRcXGQ/KSQvLFxuICBpcHY2OiAvXlxccyooPzooPzooPzpbMC05YS1mXXsxLDR9Oil7N30oPzpbMC05YS1mXXsxLDR9fDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Nn0oPzo6WzAtOWEtZl17MSw0fXwoPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezV9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsMn0pfDooPzooPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkoPzpcXC4oPzoyNVswLTVdfDJbMC00XVxcZHwxXFxkXFxkfFsxLTldP1xcZCkpezN9KXw6KSl8KD86KD86WzAtOWEtZl17MSw0fTopezR9KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsM30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KT86KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7M30oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw0fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsMn06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7Mn0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw1fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsM306KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzooPzpbMC05YS1mXXsxLDR9Oil7MX0oPzooPzooPzo6WzAtOWEtZl17MSw0fSl7MSw2fSl8KD86KD86OlswLTlhLWZdezEsNH0pezAsNH06KD86KD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKD86XFwuKD86MjVbMC01XXwyWzAtNF1cXGR8MVxcZFxcZHxbMS05XT9cXGQpKXszfSkpfDopKXwoPzo6KD86KD86KD86OlswLTlhLWZdezEsNH0pezEsN30pfCg/Oig/OjpbMC05YS1mXXsxLDR9KXswLDV9Oig/Oig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSg/OlxcLig/OjI1WzAtNV18MlswLTRdXFxkfDFcXGRcXGR8WzEtOV0/XFxkKSl7M30pKXw6KSkpKD86JS4rKT9cXHMqJC9pLFxuICByZWdleDogcmVnZXgsXG4gIHV1aWQ6IFVVSUQsXG4gICdqc29uLXBvaW50ZXInOiBKU09OX1BPSU5URVIsXG4gICdqc29uLXBvaW50ZXItdXJpLWZyYWdtZW50JzogSlNPTl9QT0lOVEVSX1VSSV9GUkFHTUVOVCxcbiAgJ3JlbGF0aXZlLWpzb24tcG9pbnRlcic6IFJFTEFUSVZFX0pTT05fUE9JTlRFUlxufTtcblxuXG5mdW5jdGlvbiBpc0xlYXBZZWFyKHllYXIpIHtcbiAgLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjYXBwZW5kaXgtQ1xuICByZXR1cm4geWVhciAlIDQgPT09IDAgJiYgKHllYXIgJSAxMDAgIT09IDAgfHwgeWVhciAlIDQwMCA9PT0gMCk7XG59XG5cblxuZnVuY3Rpb24gZGF0ZShzdHIpIHtcbiAgLy8gZnVsbC1kYXRlIGZyb20gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzMzOSNzZWN0aW9uLTUuNlxuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChEQVRFKTtcbiAgaWYgKCFtYXRjaGVzKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIHllYXIgPSArbWF0Y2hlc1sxXTtcbiAgdmFyIG1vbnRoID0gK21hdGNoZXNbMl07XG4gIHZhciBkYXkgPSArbWF0Y2hlc1szXTtcblxuICByZXR1cm4gbW9udGggPj0gMSAmJiBtb250aCA8PSAxMiAmJiBkYXkgPj0gMSAmJlxuICAgICAgICAgIGRheSA8PSAobW9udGggPT0gMiAmJiBpc0xlYXBZZWFyKHllYXIpID8gMjkgOiBEQVlTW21vbnRoXSk7XG59XG5cblxuZnVuY3Rpb24gdGltZShzdHIsIGZ1bGwpIHtcbiAgdmFyIG1hdGNoZXMgPSBzdHIubWF0Y2goVElNRSk7XG4gIGlmICghbWF0Y2hlcykgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBob3VyID0gbWF0Y2hlc1sxXTtcbiAgdmFyIG1pbnV0ZSA9IG1hdGNoZXNbMl07XG4gIHZhciBzZWNvbmQgPSBtYXRjaGVzWzNdO1xuICB2YXIgdGltZVpvbmUgPSBtYXRjaGVzWzVdO1xuICByZXR1cm4gKChob3VyIDw9IDIzICYmIG1pbnV0ZSA8PSA1OSAmJiBzZWNvbmQgPD0gNTkpIHx8XG4gICAgICAgICAgKGhvdXIgPT0gMjMgJiYgbWludXRlID09IDU5ICYmIHNlY29uZCA9PSA2MCkpICYmXG4gICAgICAgICAoIWZ1bGwgfHwgdGltZVpvbmUpO1xufVxuXG5cbnZhciBEQVRFX1RJTUVfU0VQQVJBVE9SID0gL3R8XFxzL2k7XG5mdW5jdGlvbiBkYXRlX3RpbWUoc3RyKSB7XG4gIC8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzMzMzkjc2VjdGlvbi01LjZcbiAgdmFyIGRhdGVUaW1lID0gc3RyLnNwbGl0KERBVEVfVElNRV9TRVBBUkFUT1IpO1xuICByZXR1cm4gZGF0ZVRpbWUubGVuZ3RoID09IDIgJiYgZGF0ZShkYXRlVGltZVswXSkgJiYgdGltZShkYXRlVGltZVsxXSwgdHJ1ZSk7XG59XG5cblxudmFyIE5PVF9VUklfRlJBR01FTlQgPSAvXFwvfDovO1xuZnVuY3Rpb24gdXJpKHN0cikge1xuICAvLyBodHRwOi8vam1yd2FyZS5jb20vYXJ0aWNsZXMvMjAwOS91cmlfcmVnZXhwL1VSSV9yZWdleC5odG1sICsgb3B0aW9uYWwgcHJvdG9jb2wgKyByZXF1aXJlZCBcIi5cIlxuICByZXR1cm4gTk9UX1VSSV9GUkFHTUVOVC50ZXN0KHN0cikgJiYgVVJJLnRlc3Qoc3RyKTtcbn1cblxuXG52YXIgWl9BTkNIT1IgPSAvW15cXFxcXVxcXFxaLztcbmZ1bmN0aW9uIHJlZ2V4KHN0cikge1xuICBpZiAoWl9BTkNIT1IudGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIHRyeSB7XG4gICAgbmV3IFJlZ0V4cChzdHIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlc29sdmUgPSByZXF1aXJlKCcuL3Jlc29sdmUnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIGVycm9yQ2xhc3NlcyA9IHJlcXVpcmUoJy4vZXJyb3JfY2xhc3NlcycpXG4gICwgc3RhYmxlU3RyaW5naWZ5ID0gcmVxdWlyZSgnZmFzdC1qc29uLXN0YWJsZS1zdHJpbmdpZnknKTtcblxudmFyIHZhbGlkYXRlR2VuZXJhdG9yID0gcmVxdWlyZSgnLi4vZG90anMvdmFsaWRhdGUnKTtcblxuLyoqXG4gKiBGdW5jdGlvbnMgYmVsb3cgYXJlIHVzZWQgaW5zaWRlIGNvbXBpbGVkIHZhbGlkYXRpb25zIGZ1bmN0aW9uXG4gKi9cblxudmFyIHVjczJsZW5ndGggPSB1dGlsLnVjczJsZW5ndGg7XG52YXIgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKTtcblxuLy8gdGhpcyBlcnJvciBpcyB0aHJvd24gYnkgYXN5bmMgc2NoZW1hcyB0byByZXR1cm4gdmFsaWRhdGlvbiBlcnJvcnMgdmlhIGV4Y2VwdGlvblxudmFyIFZhbGlkYXRpb25FcnJvciA9IGVycm9yQ2xhc3Nlcy5WYWxpZGF0aW9uO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLyoqXG4gKiBDb21waWxlcyBzY2hlbWEgdG8gdmFsaWRhdGlvbiBmdW5jdGlvblxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSBvYmplY3RcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCBvYmplY3Qgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcm9vdCBzY2hlbWEgZm9yIHRoaXMgc2NoZW1hXG4gKiBAcGFyYW0gIHtPYmplY3R9IGxvY2FsUmVmcyB0aGUgaGFzaCBvZiBsb2NhbCByZWZlcmVuY2VzIGluc2lkZSB0aGUgc2NoZW1hIChjcmVhdGVkIGJ5IHJlc29sdmUuaWQpLCB1c2VkIGZvciBpbmxpbmUgcmVzb2x1dGlvblxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBJRCBmb3IgSURzIGluIHRoZSBzY2hlbWFcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB2YWxpZGF0aW9uIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUoc2NoZW1hLCByb290LCBsb2NhbFJlZnMsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlLCBldmlsOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIHNlbGYgPSB0aGlzXG4gICAgLCBvcHRzID0gdGhpcy5fb3B0c1xuICAgICwgcmVmVmFsID0gWyB1bmRlZmluZWQgXVxuICAgICwgcmVmcyA9IHt9XG4gICAgLCBwYXR0ZXJucyA9IFtdXG4gICAgLCBwYXR0ZXJuc0hhc2ggPSB7fVxuICAgICwgZGVmYXVsdHMgPSBbXVxuICAgICwgZGVmYXVsdHNIYXNoID0ge31cbiAgICAsIGN1c3RvbVJ1bGVzID0gW107XG5cbiAgcm9vdCA9IHJvb3QgfHwgeyBzY2hlbWE6IHNjaGVtYSwgcmVmVmFsOiByZWZWYWwsIHJlZnM6IHJlZnMgfTtcblxuICB2YXIgYyA9IGNoZWNrQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB2YXIgY29tcGlsYXRpb24gPSB0aGlzLl9jb21waWxhdGlvbnNbYy5pbmRleF07XG4gIGlmIChjLmNvbXBpbGluZykgcmV0dXJuIChjb21waWxhdGlvbi5jYWxsVmFsaWRhdGUgPSBjYWxsVmFsaWRhdGUpO1xuXG4gIHZhciBmb3JtYXRzID0gdGhpcy5fZm9ybWF0cztcbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcblxuICB0cnkge1xuICAgIHZhciB2ID0gbG9jYWxDb21waWxlKHNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgIGNvbXBpbGF0aW9uLnZhbGlkYXRlID0gdjtcbiAgICB2YXIgY3YgPSBjb21waWxhdGlvbi5jYWxsVmFsaWRhdGU7XG4gICAgaWYgKGN2KSB7XG4gICAgICBjdi5zY2hlbWEgPSB2LnNjaGVtYTtcbiAgICAgIGN2LmVycm9ycyA9IG51bGw7XG4gICAgICBjdi5yZWZzID0gdi5yZWZzO1xuICAgICAgY3YucmVmVmFsID0gdi5yZWZWYWw7XG4gICAgICBjdi5yb290ID0gdi5yb290O1xuICAgICAgY3YuJGFzeW5jID0gdi4kYXN5bmM7XG4gICAgICBpZiAob3B0cy5zb3VyY2VDb2RlKSBjdi5zb3VyY2UgPSB2LnNvdXJjZTtcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH0gZmluYWxseSB7XG4gICAgZW5kQ29tcGlsaW5nLmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICB9XG5cbiAgLyogQHRoaXMgICB7Kn0gLSBjdXN0b20gY29udGV4dCwgc2VlIHBhc3NDb250ZXh0IG9wdGlvbiAqL1xuICBmdW5jdGlvbiBjYWxsVmFsaWRhdGUoKSB7XG4gICAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICAgIHZhciB2YWxpZGF0ZSA9IGNvbXBpbGF0aW9uLnZhbGlkYXRlO1xuICAgIHZhciByZXN1bHQgPSB2YWxpZGF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGNhbGxWYWxpZGF0ZS5lcnJvcnMgPSB2YWxpZGF0ZS5lcnJvcnM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvY2FsQ29tcGlsZShfc2NoZW1hLCBfcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpIHtcbiAgICB2YXIgaXNSb290ID0gIV9yb290IHx8IChfcm9vdCAmJiBfcm9vdC5zY2hlbWEgPT0gX3NjaGVtYSk7XG4gICAgaWYgKF9yb290LnNjaGVtYSAhPSByb290LnNjaGVtYSlcbiAgICAgIHJldHVybiBjb21waWxlLmNhbGwoc2VsZiwgX3NjaGVtYSwgX3Jvb3QsIGxvY2FsUmVmcywgYmFzZUlkKTtcblxuICAgIHZhciAkYXN5bmMgPSBfc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZTtcblxuICAgIHZhciBzb3VyY2VDb2RlID0gdmFsaWRhdGVHZW5lcmF0b3Ioe1xuICAgICAgaXNUb3A6IHRydWUsXG4gICAgICBzY2hlbWE6IF9zY2hlbWEsXG4gICAgICBpc1Jvb3Q6IGlzUm9vdCxcbiAgICAgIGJhc2VJZDogYmFzZUlkLFxuICAgICAgcm9vdDogX3Jvb3QsXG4gICAgICBzY2hlbWFQYXRoOiAnJyxcbiAgICAgIGVyclNjaGVtYVBhdGg6ICcjJyxcbiAgICAgIGVycm9yUGF0aDogJ1wiXCInLFxuICAgICAgTWlzc2luZ1JlZkVycm9yOiBlcnJvckNsYXNzZXMuTWlzc2luZ1JlZixcbiAgICAgIFJVTEVTOiBSVUxFUyxcbiAgICAgIHZhbGlkYXRlOiB2YWxpZGF0ZUdlbmVyYXRvcixcbiAgICAgIHV0aWw6IHV0aWwsXG4gICAgICByZXNvbHZlOiByZXNvbHZlLFxuICAgICAgcmVzb2x2ZVJlZjogcmVzb2x2ZVJlZixcbiAgICAgIHVzZVBhdHRlcm46IHVzZVBhdHRlcm4sXG4gICAgICB1c2VEZWZhdWx0OiB1c2VEZWZhdWx0LFxuICAgICAgdXNlQ3VzdG9tUnVsZTogdXNlQ3VzdG9tUnVsZSxcbiAgICAgIG9wdHM6IG9wdHMsXG4gICAgICBmb3JtYXRzOiBmb3JtYXRzLFxuICAgICAgbG9nZ2VyOiBzZWxmLmxvZ2dlcixcbiAgICAgIHNlbGY6IHNlbGZcbiAgICB9KTtcblxuICAgIHNvdXJjZUNvZGUgPSB2YXJzKHJlZlZhbCwgcmVmVmFsQ29kZSkgKyB2YXJzKHBhdHRlcm5zLCBwYXR0ZXJuQ29kZSlcbiAgICAgICAgICAgICAgICAgICArIHZhcnMoZGVmYXVsdHMsIGRlZmF1bHRDb2RlKSArIHZhcnMoY3VzdG9tUnVsZXMsIGN1c3RvbVJ1bGVDb2RlKVxuICAgICAgICAgICAgICAgICAgICsgc291cmNlQ29kZTtcblxuICAgIGlmIChvcHRzLnByb2Nlc3NDb2RlKSBzb3VyY2VDb2RlID0gb3B0cy5wcm9jZXNzQ29kZShzb3VyY2VDb2RlLCBfc2NoZW1hKTtcbiAgICAvLyBjb25zb2xlLmxvZygnXFxuXFxuXFxuICoqKiBcXG4nLCBKU09OLnN0cmluZ2lmeShzb3VyY2VDb2RlKSk7XG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIHRyeSB7XG4gICAgICB2YXIgbWFrZVZhbGlkYXRlID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgICAnc2VsZicsXG4gICAgICAgICdSVUxFUycsXG4gICAgICAgICdmb3JtYXRzJyxcbiAgICAgICAgJ3Jvb3QnLFxuICAgICAgICAncmVmVmFsJyxcbiAgICAgICAgJ2RlZmF1bHRzJyxcbiAgICAgICAgJ2N1c3RvbVJ1bGVzJyxcbiAgICAgICAgJ2VxdWFsJyxcbiAgICAgICAgJ3VjczJsZW5ndGgnLFxuICAgICAgICAnVmFsaWRhdGlvbkVycm9yJyxcbiAgICAgICAgc291cmNlQ29kZVxuICAgICAgKTtcblxuICAgICAgdmFsaWRhdGUgPSBtYWtlVmFsaWRhdGUoXG4gICAgICAgIHNlbGYsXG4gICAgICAgIFJVTEVTLFxuICAgICAgICBmb3JtYXRzLFxuICAgICAgICByb290LFxuICAgICAgICByZWZWYWwsXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBjdXN0b21SdWxlcyxcbiAgICAgICAgZXF1YWwsXG4gICAgICAgIHVjczJsZW5ndGgsXG4gICAgICAgIFZhbGlkYXRpb25FcnJvclxuICAgICAgKTtcblxuICAgICAgcmVmVmFsWzBdID0gdmFsaWRhdGU7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZWxmLmxvZ2dlci5lcnJvcignRXJyb3IgY29tcGlsaW5nIHNjaGVtYSwgZnVuY3Rpb24gY29kZTonLCBzb3VyY2VDb2RlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFsaWRhdGUuc2NoZW1hID0gX3NjaGVtYTtcbiAgICB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsO1xuICAgIHZhbGlkYXRlLnJlZnMgPSByZWZzO1xuICAgIHZhbGlkYXRlLnJlZlZhbCA9IHJlZlZhbDtcbiAgICB2YWxpZGF0ZS5yb290ID0gaXNSb290ID8gdmFsaWRhdGUgOiBfcm9vdDtcbiAgICBpZiAoJGFzeW5jKSB2YWxpZGF0ZS4kYXN5bmMgPSB0cnVlO1xuICAgIGlmIChvcHRzLnNvdXJjZUNvZGUgPT09IHRydWUpIHtcbiAgICAgIHZhbGlkYXRlLnNvdXJjZSA9IHtcbiAgICAgICAgY29kZTogc291cmNlQ29kZSxcbiAgICAgICAgcGF0dGVybnM6IHBhdHRlcm5zLFxuICAgICAgICBkZWZhdWx0czogZGVmYXVsdHNcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkYXRlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZVJlZihiYXNlSWQsIHJlZiwgaXNSb290KSB7XG4gICAgcmVmID0gcmVzb2x2ZS51cmwoYmFzZUlkLCByZWYpO1xuICAgIHZhciByZWZJbmRleCA9IHJlZnNbcmVmXTtcbiAgICB2YXIgX3JlZlZhbCwgcmVmQ29kZTtcbiAgICBpZiAocmVmSW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgX3JlZlZhbCA9IHJlZlZhbFtyZWZJbmRleF07XG4gICAgICByZWZDb2RlID0gJ3JlZlZhbFsnICsgcmVmSW5kZXggKyAnXSc7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRSZWYoX3JlZlZhbCwgcmVmQ29kZSk7XG4gICAgfVxuICAgIGlmICghaXNSb290ICYmIHJvb3QucmVmcykge1xuICAgICAgdmFyIHJvb3RSZWZJZCA9IHJvb3QucmVmc1tyZWZdO1xuICAgICAgaWYgKHJvb3RSZWZJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIF9yZWZWYWwgPSByb290LnJlZlZhbFtyb290UmVmSWRdO1xuICAgICAgICByZWZDb2RlID0gYWRkTG9jYWxSZWYocmVmLCBfcmVmVmFsKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKF9yZWZWYWwsIHJlZkNvZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlZkNvZGUgPSBhZGRMb2NhbFJlZihyZWYpO1xuICAgIHZhciB2ID0gcmVzb2x2ZS5jYWxsKHNlbGYsIGxvY2FsQ29tcGlsZSwgcm9vdCwgcmVmKTtcbiAgICBpZiAodiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgbG9jYWxTY2hlbWEgPSBsb2NhbFJlZnMgJiYgbG9jYWxSZWZzW3JlZl07XG4gICAgICBpZiAobG9jYWxTY2hlbWEpIHtcbiAgICAgICAgdiA9IHJlc29sdmUuaW5saW5lUmVmKGxvY2FsU2NoZW1hLCBvcHRzLmlubGluZVJlZnMpXG4gICAgICAgICAgICA/IGxvY2FsU2NoZW1hXG4gICAgICAgICAgICA6IGNvbXBpbGUuY2FsbChzZWxmLCBsb2NhbFNjaGVtYSwgcm9vdCwgbG9jYWxSZWZzLCBiYXNlSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlbW92ZUxvY2FsUmVmKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcGxhY2VMb2NhbFJlZihyZWYsIHYpO1xuICAgICAgcmV0dXJuIHJlc29sdmVkUmVmKHYsIHJlZkNvZGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZExvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZlZhbC5sZW5ndGg7XG4gICAgcmVmVmFsW3JlZklkXSA9IHY7XG4gICAgcmVmc1tyZWZdID0gcmVmSWQ7XG4gICAgcmV0dXJuICdyZWZWYWwnICsgcmVmSWQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVMb2NhbFJlZihyZWYpIHtcbiAgICBkZWxldGUgcmVmc1tyZWZdO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUxvY2FsUmVmKHJlZiwgdikge1xuICAgIHZhciByZWZJZCA9IHJlZnNbcmVmXTtcbiAgICByZWZWYWxbcmVmSWRdID0gdjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmVkUmVmKHJlZlZhbCwgY29kZSkge1xuICAgIHJldHVybiB0eXBlb2YgcmVmVmFsID09ICdvYmplY3QnIHx8IHR5cGVvZiByZWZWYWwgPT0gJ2Jvb2xlYW4nXG4gICAgICAgICAgICA/IHsgY29kZTogY29kZSwgc2NoZW1hOiByZWZWYWwsIGlubGluZTogdHJ1ZSB9XG4gICAgICAgICAgICA6IHsgY29kZTogY29kZSwgJGFzeW5jOiByZWZWYWwgJiYgISFyZWZWYWwuJGFzeW5jIH07XG4gIH1cblxuICBmdW5jdGlvbiB1c2VQYXR0ZXJuKHJlZ2V4U3RyKSB7XG4gICAgdmFyIGluZGV4ID0gcGF0dGVybnNIYXNoW3JlZ2V4U3RyXTtcbiAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgaW5kZXggPSBwYXR0ZXJuc0hhc2hbcmVnZXhTdHJdID0gcGF0dGVybnMubGVuZ3RoO1xuICAgICAgcGF0dGVybnNbaW5kZXhdID0gcmVnZXhTdHI7XG4gICAgfVxuICAgIHJldHVybiAncGF0dGVybicgKyBpbmRleDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZURlZmF1bHQodmFsdWUpIHtcbiAgICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIHJldHVybiB1dGlsLnRvUXVvdGVkU3RyaW5nKHZhbHVlKTtcbiAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcbiAgICAgICAgdmFyIHZhbHVlU3RyID0gc3RhYmxlU3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgdmFyIGluZGV4ID0gZGVmYXVsdHNIYXNoW3ZhbHVlU3RyXTtcbiAgICAgICAgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpbmRleCA9IGRlZmF1bHRzSGFzaFt2YWx1ZVN0cl0gPSBkZWZhdWx0cy5sZW5ndGg7XG4gICAgICAgICAgZGVmYXVsdHNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdkZWZhdWx0JyArIGluZGV4O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVzZUN1c3RvbVJ1bGUocnVsZSwgc2NoZW1hLCBwYXJlbnRTY2hlbWEsIGl0KSB7XG4gICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSB7XG4gICAgICB2YXIgZGVwcyA9IHJ1bGUuZGVmaW5pdGlvbi5kZXBlbmRlbmNpZXM7XG4gICAgICBpZiAoZGVwcyAmJiAhZGVwcy5ldmVyeShmdW5jdGlvbihrZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyZW50U2NoZW1hLCBrZXl3b3JkKTtcbiAgICAgIH0pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBzY2hlbWEgbXVzdCBoYXZlIGFsbCByZXF1aXJlZCBrZXl3b3JkczogJyArIGRlcHMuam9pbignLCcpKTtcblxuICAgICAgdmFyIHZhbGlkYXRlU2NoZW1hID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlU2NoZW1hO1xuICAgICAgaWYgKHZhbGlkYXRlU2NoZW1hKSB7XG4gICAgICAgIHZhciB2YWxpZCA9IHZhbGlkYXRlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICB2YXIgbWVzc2FnZSA9ICdrZXl3b3JkIHNjaGVtYSBpcyBpbnZhbGlkOiAnICsgc2VsZi5lcnJvcnNUZXh0KHZhbGlkYXRlU2NoZW1hLmVycm9ycyk7XG4gICAgICAgICAgaWYgKHNlbGYuX29wdHMudmFsaWRhdGVTY2hlbWEgPT0gJ2xvZycpIHNlbGYubG9nZ2VyLmVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbXBpbGUgPSBydWxlLmRlZmluaXRpb24uY29tcGlsZVxuICAgICAgLCBpbmxpbmUgPSBydWxlLmRlZmluaXRpb24uaW5saW5lXG4gICAgICAsIG1hY3JvID0gcnVsZS5kZWZpbml0aW9uLm1hY3JvO1xuXG4gICAgdmFyIHZhbGlkYXRlO1xuICAgIGlmIChjb21waWxlKSB7XG4gICAgICB2YWxpZGF0ZSA9IGNvbXBpbGUuY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgIH0gZWxzZSBpZiAobWFjcm8pIHtcbiAgICAgIHZhbGlkYXRlID0gbWFjcm8uY2FsbChzZWxmLCBzY2hlbWEsIHBhcmVudFNjaGVtYSwgaXQpO1xuICAgICAgaWYgKG9wdHMudmFsaWRhdGVTY2hlbWEgIT09IGZhbHNlKSBzZWxmLnZhbGlkYXRlU2NoZW1hKHZhbGlkYXRlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGlubGluZSkge1xuICAgICAgdmFsaWRhdGUgPSBpbmxpbmUuY2FsbChzZWxmLCBpdCwgcnVsZS5rZXl3b3JkLCBzY2hlbWEsIHBhcmVudFNjaGVtYSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbGlkYXRlID0gcnVsZS5kZWZpbml0aW9uLnZhbGlkYXRlO1xuICAgICAgaWYgKCF2YWxpZGF0ZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjdXN0b20ga2V5d29yZCBcIicgKyBydWxlLmtleXdvcmQgKyAnXCJmYWlsZWQgdG8gY29tcGlsZScpO1xuXG4gICAgdmFyIGluZGV4ID0gY3VzdG9tUnVsZXMubGVuZ3RoO1xuICAgIGN1c3RvbVJ1bGVzW2luZGV4XSA9IHZhbGlkYXRlO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6ICdjdXN0b21SdWxlJyArIGluZGV4LFxuICAgICAgdmFsaWRhdGU6IHZhbGlkYXRlXG4gICAgfTtcbiAgfVxufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBzY2hlbWEgaXMgY3VycmVudGx5IGNvbXBpbGVkXG4gKiBAdGhpcyAgIEFqdlxuICogQHBhcmFtICB7T2JqZWN0fSBzY2hlbWEgc2NoZW1hIHRvIGNvbXBpbGVcbiAqIEBwYXJhbSAge09iamVjdH0gcm9vdCByb290IG9iamVjdFxuICogQHBhcmFtICB7U3RyaW5nfSBiYXNlSWQgYmFzZSBzY2hlbWEgSURcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBcImluZGV4XCIgKGNvbXBpbGF0aW9uIGluZGV4KSBhbmQgXCJjb21waWxpbmdcIiAoYm9vbGVhbilcbiAqL1xuZnVuY3Rpb24gY2hlY2tDb21waWxpbmcoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgaW5kZXggPSBjb21wSW5kZXguY2FsbCh0aGlzLCBzY2hlbWEsIHJvb3QsIGJhc2VJZCk7XG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogdHJ1ZSB9O1xuICBpbmRleCA9IHRoaXMuX2NvbXBpbGF0aW9ucy5sZW5ndGg7XG4gIHRoaXMuX2NvbXBpbGF0aW9uc1tpbmRleF0gPSB7XG4gICAgc2NoZW1hOiBzY2hlbWEsXG4gICAgcm9vdDogcm9vdCxcbiAgICBiYXNlSWQ6IGJhc2VJZFxuICB9O1xuICByZXR1cm4geyBpbmRleDogaW5kZXgsIGNvbXBpbGluZzogZmFsc2UgfTtcbn1cblxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNjaGVtYSBmcm9tIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKi9cbmZ1bmN0aW9uIGVuZENvbXBpbGluZyhzY2hlbWEsIHJvb3QsIGJhc2VJZCkge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBpID0gY29tcEluZGV4LmNhbGwodGhpcywgc2NoZW1hLCByb290LCBiYXNlSWQpO1xuICBpZiAoaSA+PSAwKSB0aGlzLl9jb21waWxhdGlvbnMuc3BsaWNlKGksIDEpO1xufVxuXG5cbi8qKlxuICogSW5kZXggb2Ygc2NoZW1hIGNvbXBpbGF0aW9uIGluIHRoZSBjdXJyZW50bHkgY29tcGlsZWQgbGlzdFxuICogQHRoaXMgICBBanZcbiAqIEBwYXJhbSAge09iamVjdH0gc2NoZW1hIHNjaGVtYSB0byBjb21waWxlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gYmFzZUlkIGJhc2Ugc2NoZW1hIElEXG4gKiBAcmV0dXJuIHtJbnRlZ2VyfSBjb21waWxhdGlvbiBpbmRleFxuICovXG5mdW5jdGlvbiBjb21wSW5kZXgoc2NoZW1hLCByb290LCBiYXNlSWQpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBmb3IgKHZhciBpPTA7IGk8dGhpcy5fY29tcGlsYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9jb21waWxhdGlvbnNbaV07XG4gICAgaWYgKGMuc2NoZW1hID09IHNjaGVtYSAmJiBjLnJvb3QgPT0gcm9vdCAmJiBjLmJhc2VJZCA9PSBiYXNlSWQpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5mdW5jdGlvbiBwYXR0ZXJuQ29kZShpLCBwYXR0ZXJucykge1xuICByZXR1cm4gJ3ZhciBwYXR0ZXJuJyArIGkgKyAnID0gbmV3IFJlZ0V4cCgnICsgdXRpbC50b1F1b3RlZFN0cmluZyhwYXR0ZXJuc1tpXSkgKyAnKTsnO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmF1bHRDb2RlKGkpIHtcbiAgcmV0dXJuICd2YXIgZGVmYXVsdCcgKyBpICsgJyA9IGRlZmF1bHRzWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiByZWZWYWxDb2RlKGksIHJlZlZhbCkge1xuICByZXR1cm4gcmVmVmFsW2ldID09PSB1bmRlZmluZWQgPyAnJyA6ICd2YXIgcmVmVmFsJyArIGkgKyAnID0gcmVmVmFsWycgKyBpICsgJ107Jztcbn1cblxuXG5mdW5jdGlvbiBjdXN0b21SdWxlQ29kZShpKSB7XG4gIHJldHVybiAndmFyIGN1c3RvbVJ1bGUnICsgaSArICcgPSBjdXN0b21SdWxlc1snICsgaSArICddOyc7XG59XG5cblxuZnVuY3Rpb24gdmFycyhhcnIsIHN0YXRlbWVudCkge1xuICBpZiAoIWFyci5sZW5ndGgpIHJldHVybiAnJztcbiAgdmFyIGNvZGUgPSAnJztcbiAgZm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKylcbiAgICBjb2RlICs9IHN0YXRlbWVudChpLCBhcnIpO1xuICByZXR1cm4gY29kZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFVSSSA9IHJlcXVpcmUoJ3VyaS1qcycpXG4gICwgZXF1YWwgPSByZXF1aXJlKCdmYXN0LWRlZXAtZXF1YWwnKVxuICAsIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKVxuICAsIFNjaGVtYU9iamVjdCA9IHJlcXVpcmUoJy4vc2NoZW1hX29iaicpXG4gICwgdHJhdmVyc2UgPSByZXF1aXJlKCdqc29uLXNjaGVtYS10cmF2ZXJzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc29sdmU7XG5cbnJlc29sdmUubm9ybWFsaXplSWQgPSBub3JtYWxpemVJZDtcbnJlc29sdmUuZnVsbFBhdGggPSBnZXRGdWxsUGF0aDtcbnJlc29sdmUudXJsID0gcmVzb2x2ZVVybDtcbnJlc29sdmUuaWRzID0gcmVzb2x2ZUlkcztcbnJlc29sdmUuaW5saW5lUmVmID0gaW5saW5lUmVmO1xucmVzb2x2ZS5zY2hlbWEgPSByZXNvbHZlU2NoZW1hO1xuXG4vKipcbiAqIFtyZXNvbHZlIGFuZCBjb21waWxlIHRoZSByZWZlcmVuY2VzICgkcmVmKV1cbiAqIEB0aGlzICAgQWp2XG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gY29tcGlsZSByZWZlcmVuY2UgdG8gc2NoZW1hIGNvbXBpbGF0aW9uIGZ1bmNpdG9uIChsb2NhbENvbXBpbGUpXG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgb2JqZWN0IHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJvb3Qgc2NoZW1hIGZvciB0aGUgY3VycmVudCBzY2hlbWFcbiAqIEBwYXJhbSAge1N0cmluZ30gcmVmIHJlZmVyZW5jZSB0byByZXNvbHZlXG4gKiBAcmV0dXJuIHtPYmplY3R8RnVuY3Rpb259IHNjaGVtYSBvYmplY3QgKGlmIHRoZSBzY2hlbWEgY2FuIGJlIGlubGluZWQpIG9yIHZhbGlkYXRpb24gZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZShjb21waWxlLCByb290LCByZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVmVmFsID0gdGhpcy5fcmVmc1tyZWZdO1xuICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgIGlmICh0aGlzLl9yZWZzW3JlZlZhbF0pIHJlZlZhbCA9IHRoaXMuX3JlZnNbcmVmVmFsXTtcbiAgICBlbHNlIHJldHVybiByZXNvbHZlLmNhbGwodGhpcywgY29tcGlsZSwgcm9vdCwgcmVmVmFsKTtcbiAgfVxuXG4gIHJlZlZhbCA9IHJlZlZhbCB8fCB0aGlzLl9zY2hlbWFzW3JlZl07XG4gIGlmIChyZWZWYWwgaW5zdGFuY2VvZiBTY2hlbWFPYmplY3QpIHtcbiAgICByZXR1cm4gaW5saW5lUmVmKHJlZlZhbC5zY2hlbWEsIHRoaXMuX29wdHMuaW5saW5lUmVmcylcbiAgICAgICAgICAgID8gcmVmVmFsLnNjaGVtYVxuICAgICAgICAgICAgOiByZWZWYWwudmFsaWRhdGUgfHwgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICB9XG5cbiAgdmFyIHJlcyA9IHJlc29sdmVTY2hlbWEuY2FsbCh0aGlzLCByb290LCByZWYpO1xuICB2YXIgc2NoZW1hLCB2LCBiYXNlSWQ7XG4gIGlmIChyZXMpIHtcbiAgICBzY2hlbWEgPSByZXMuc2NoZW1hO1xuICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICBiYXNlSWQgPSByZXMuYmFzZUlkO1xuICB9XG5cbiAgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFNjaGVtYU9iamVjdCkge1xuICAgIHYgPSBzY2hlbWEudmFsaWRhdGUgfHwgY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYS5zY2hlbWEsIHJvb3QsIHVuZGVmaW5lZCwgYmFzZUlkKTtcbiAgfSBlbHNlIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCkge1xuICAgIHYgPSBpbmxpbmVSZWYoc2NoZW1hLCB0aGlzLl9vcHRzLmlubGluZVJlZnMpXG4gICAgICAgID8gc2NoZW1hXG4gICAgICAgIDogY29tcGlsZS5jYWxsKHRoaXMsIHNjaGVtYSwgcm9vdCwgdW5kZWZpbmVkLCBiYXNlSWQpO1xuICB9XG5cbiAgcmV0dXJuIHY7XG59XG5cblxuLyoqXG4gKiBSZXNvbHZlIHNjaGVtYSwgaXRzIHJvb3QgYW5kIGJhc2VJZFxuICogQHRoaXMgQWp2XG4gKiBAcGFyYW0gIHtPYmplY3R9IHJvb3Qgcm9vdCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHNjaGVtYSwgcmVmVmFsLCByZWZzXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHJlZiAgcmVmZXJlbmNlIHRvIHJlc29sdmVcbiAqIEByZXR1cm4ge09iamVjdH0gb2JqZWN0IHdpdGggcHJvcGVydGllcyBzY2hlbWEsIHJvb3QsIGJhc2VJZFxuICovXG5mdW5jdGlvbiByZXNvbHZlU2NoZW1hKHJvb3QsIHJlZikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIHZhciBwID0gVVJJLnBhcnNlKHJlZilcbiAgICAsIHJlZlBhdGggPSBfZ2V0RnVsbFBhdGgocClcbiAgICAsIGJhc2VJZCA9IGdldEZ1bGxQYXRoKHRoaXMuX2dldElkKHJvb3Quc2NoZW1hKSk7XG4gIGlmIChPYmplY3Qua2V5cyhyb290LnNjaGVtYSkubGVuZ3RoID09PSAwIHx8IHJlZlBhdGggIT09IGJhc2VJZCkge1xuICAgIHZhciBpZCA9IG5vcm1hbGl6ZUlkKHJlZlBhdGgpO1xuICAgIHZhciByZWZWYWwgPSB0aGlzLl9yZWZzW2lkXTtcbiAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHJlc29sdmVSZWN1cnNpdmUuY2FsbCh0aGlzLCByb290LCByZWZWYWwsIHApO1xuICAgIH0gZWxzZSBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICBpZiAoIXJlZlZhbC52YWxpZGF0ZSkgdGhpcy5fY29tcGlsZShyZWZWYWwpO1xuICAgICAgcm9vdCA9IHJlZlZhbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmVmFsID0gdGhpcy5fc2NoZW1hc1tpZF07XG4gICAgICBpZiAocmVmVmFsIGluc3RhbmNlb2YgU2NoZW1hT2JqZWN0KSB7XG4gICAgICAgIGlmICghcmVmVmFsLnZhbGlkYXRlKSB0aGlzLl9jb21waWxlKHJlZlZhbCk7XG4gICAgICAgIGlmIChpZCA9PSBub3JtYWxpemVJZChyZWYpKVxuICAgICAgICAgIHJldHVybiB7IHNjaGVtYTogcmVmVmFsLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xuICAgICAgICByb290ID0gcmVmVmFsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXJvb3Quc2NoZW1hKSByZXR1cm47XG4gICAgYmFzZUlkID0gZ2V0RnVsbFBhdGgodGhpcy5fZ2V0SWQocm9vdC5zY2hlbWEpKTtcbiAgfVxuICByZXR1cm4gZ2V0SnNvblBvaW50ZXIuY2FsbCh0aGlzLCBwLCBiYXNlSWQsIHJvb3Quc2NoZW1hLCByb290KTtcbn1cblxuXG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIHJlc29sdmVSZWN1cnNpdmUocm9vdCwgcmVmLCBwYXJzZWRSZWYpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICB2YXIgcmVzID0gcmVzb2x2ZVNjaGVtYS5jYWxsKHRoaXMsIHJvb3QsIHJlZik7XG4gIGlmIChyZXMpIHtcbiAgICB2YXIgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICB2YXIgYmFzZUlkID0gcmVzLmJhc2VJZDtcbiAgICByb290ID0gcmVzLnJvb3Q7XG4gICAgdmFyIGlkID0gdGhpcy5fZ2V0SWQoc2NoZW1hKTtcbiAgICBpZiAoaWQpIGJhc2VJZCA9IHJlc29sdmVVcmwoYmFzZUlkLCBpZCk7XG4gICAgcmV0dXJuIGdldEpzb25Qb2ludGVyLmNhbGwodGhpcywgcGFyc2VkUmVmLCBiYXNlSWQsIHNjaGVtYSwgcm9vdCk7XG4gIH1cbn1cblxuXG52YXIgUFJFVkVOVF9TQ09QRV9DSEFOR0UgPSB1dGlsLnRvSGFzaChbJ3Byb3BlcnRpZXMnLCAncGF0dGVyblByb3BlcnRpZXMnLCAnZW51bScsICdkZXBlbmRlbmNpZXMnLCAnZGVmaW5pdGlvbnMnXSk7XG4vKiBAdGhpcyBBanYgKi9cbmZ1bmN0aW9uIGdldEpzb25Qb2ludGVyKHBhcnNlZFJlZiwgYmFzZUlkLCBzY2hlbWEsIHJvb3QpIHtcbiAgLyoganNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuICBwYXJzZWRSZWYuZnJhZ21lbnQgPSBwYXJzZWRSZWYuZnJhZ21lbnQgfHwgJyc7XG4gIGlmIChwYXJzZWRSZWYuZnJhZ21lbnQuc2xpY2UoMCwxKSAhPSAnLycpIHJldHVybjtcbiAgdmFyIHBhcnRzID0gcGFyc2VkUmVmLmZyYWdtZW50LnNwbGl0KCcvJyk7XG5cbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgaWYgKHBhcnQpIHtcbiAgICAgIHBhcnQgPSB1dGlsLnVuZXNjYXBlRnJhZ21lbnQocGFydCk7XG4gICAgICBzY2hlbWEgPSBzY2hlbWFbcGFydF07XG4gICAgICBpZiAoc2NoZW1hID09PSB1bmRlZmluZWQpIGJyZWFrO1xuICAgICAgdmFyIGlkO1xuICAgICAgaWYgKCFQUkVWRU5UX1NDT1BFX0NIQU5HRVtwYXJ0XSkge1xuICAgICAgICBpZCA9IHRoaXMuX2dldElkKHNjaGVtYSk7XG4gICAgICAgIGlmIChpZCkgYmFzZUlkID0gcmVzb2x2ZVVybChiYXNlSWQsIGlkKTtcbiAgICAgICAgaWYgKHNjaGVtYS4kcmVmKSB7XG4gICAgICAgICAgdmFyICRyZWYgPSByZXNvbHZlVXJsKGJhc2VJZCwgc2NoZW1hLiRyZWYpO1xuICAgICAgICAgIHZhciByZXMgPSByZXNvbHZlU2NoZW1hLmNhbGwodGhpcywgcm9vdCwgJHJlZik7XG4gICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgc2NoZW1hID0gcmVzLnNjaGVtYTtcbiAgICAgICAgICAgIHJvb3QgPSByZXMucm9vdDtcbiAgICAgICAgICAgIGJhc2VJZCA9IHJlcy5iYXNlSWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChzY2hlbWEgIT09IHVuZGVmaW5lZCAmJiBzY2hlbWEgIT09IHJvb3Quc2NoZW1hKVxuICAgIHJldHVybiB7IHNjaGVtYTogc2NoZW1hLCByb290OiByb290LCBiYXNlSWQ6IGJhc2VJZCB9O1xufVxuXG5cbnZhciBTSU1QTEVfSU5MSU5FRCA9IHV0aWwudG9IYXNoKFtcbiAgJ3R5cGUnLCAnZm9ybWF0JywgJ3BhdHRlcm4nLFxuICAnbWF4TGVuZ3RoJywgJ21pbkxlbmd0aCcsXG4gICdtYXhQcm9wZXJ0aWVzJywgJ21pblByb3BlcnRpZXMnLFxuICAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLFxuICAnbWF4aW11bScsICdtaW5pbXVtJyxcbiAgJ3VuaXF1ZUl0ZW1zJywgJ211bHRpcGxlT2YnLFxuICAncmVxdWlyZWQnLCAnZW51bSdcbl0pO1xuZnVuY3Rpb24gaW5saW5lUmVmKHNjaGVtYSwgbGltaXQpIHtcbiAgaWYgKGxpbWl0ID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICBpZiAobGltaXQgPT09IHVuZGVmaW5lZCB8fCBsaW1pdCA9PT0gdHJ1ZSkgcmV0dXJuIGNoZWNrTm9SZWYoc2NoZW1hKTtcbiAgZWxzZSBpZiAobGltaXQpIHJldHVybiBjb3VudEtleXMoc2NoZW1hKSA8PSBsaW1pdDtcbn1cblxuXG5mdW5jdGlvbiBjaGVja05vUmVmKHNjaGVtYSkge1xuICB2YXIgaXRlbTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2NoZW1hKSkge1xuICAgIGZvciAodmFyIGk9MDsgaTxzY2hlbWEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGl0ZW0gPSBzY2hlbWFbaV07XG4gICAgICBpZiAodHlwZW9mIGl0ZW0gPT0gJ29iamVjdCcgJiYgIWNoZWNrTm9SZWYoaXRlbSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBmYWxzZTtcbiAgICAgIGl0ZW0gPSBzY2hlbWFba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JyAmJiAhY2hlY2tOb1JlZihpdGVtKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBjb3VudEtleXMoc2NoZW1hKSB7XG4gIHZhciBjb3VudCA9IDAsIGl0ZW07XG4gIGlmIChBcnJheS5pc0FycmF5KHNjaGVtYSkpIHtcbiAgICBmb3IgKHZhciBpPTA7IGk8c2NoZW1hLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpdGVtID0gc2NoZW1hW2ldO1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09ICdvYmplY3QnKSBjb3VudCArPSBjb3VudEtleXMoaXRlbSk7XG4gICAgICBpZiAoY291bnQgPT0gSW5maW5pdHkpIHJldHVybiBJbmZpbml0eTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkge1xuICAgICAgaWYgKGtleSA9PSAnJHJlZicpIHJldHVybiBJbmZpbml0eTtcbiAgICAgIGlmIChTSU1QTEVfSU5MSU5FRFtrZXldKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtID0gc2NoZW1hW2tleV07XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JykgY291bnQgKz0gY291bnRLZXlzKGl0ZW0pICsgMTtcbiAgICAgICAgaWYgKGNvdW50ID09IEluZmluaXR5KSByZXR1cm4gSW5maW5pdHk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3VudDtcbn1cblxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChpZCwgbm9ybWFsaXplKSB7XG4gIGlmIChub3JtYWxpemUgIT09IGZhbHNlKSBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgdmFyIHAgPSBVUkkucGFyc2UoaWQpO1xuICByZXR1cm4gX2dldEZ1bGxQYXRoKHApO1xufVxuXG5cbmZ1bmN0aW9uIF9nZXRGdWxsUGF0aChwKSB7XG4gIHJldHVybiBVUkkuc2VyaWFsaXplKHApLnNwbGl0KCcjJylbMF0gKyAnIyc7XG59XG5cblxudmFyIFRSQUlMSU5HX1NMQVNIX0hBU0ggPSAvI1xcLz8kLztcbmZ1bmN0aW9uIG5vcm1hbGl6ZUlkKGlkKSB7XG4gIHJldHVybiBpZCA/IGlkLnJlcGxhY2UoVFJBSUxJTkdfU0xBU0hfSEFTSCwgJycpIDogJyc7XG59XG5cblxuZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlSWQsIGlkKSB7XG4gIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICByZXR1cm4gVVJJLnJlc29sdmUoYmFzZUlkLCBpZCk7XG59XG5cblxuLyogQHRoaXMgQWp2ICovXG5mdW5jdGlvbiByZXNvbHZlSWRzKHNjaGVtYSkge1xuICB2YXIgc2NoZW1hSWQgPSBub3JtYWxpemVJZCh0aGlzLl9nZXRJZChzY2hlbWEpKTtcbiAgdmFyIGJhc2VJZHMgPSB7Jyc6IHNjaGVtYUlkfTtcbiAgdmFyIGZ1bGxQYXRocyA9IHsnJzogZ2V0RnVsbFBhdGgoc2NoZW1hSWQsIGZhbHNlKX07XG4gIHZhciBsb2NhbFJlZnMgPSB7fTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRyYXZlcnNlKHNjaGVtYSwge2FsbEtleXM6IHRydWV9LCBmdW5jdGlvbihzY2gsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpIHtcbiAgICBpZiAoanNvblB0ciA9PT0gJycpIHJldHVybjtcbiAgICB2YXIgaWQgPSBzZWxmLl9nZXRJZChzY2gpO1xuICAgIHZhciBiYXNlSWQgPSBiYXNlSWRzW3BhcmVudEpzb25QdHJdO1xuICAgIHZhciBmdWxsUGF0aCA9IGZ1bGxQYXRoc1twYXJlbnRKc29uUHRyXSArICcvJyArIHBhcmVudEtleXdvcmQ7XG4gICAgaWYgKGtleUluZGV4ICE9PSB1bmRlZmluZWQpXG4gICAgICBmdWxsUGF0aCArPSAnLycgKyAodHlwZW9mIGtleUluZGV4ID09ICdudW1iZXInID8ga2V5SW5kZXggOiB1dGlsLmVzY2FwZUZyYWdtZW50KGtleUluZGV4KSk7XG5cbiAgICBpZiAodHlwZW9mIGlkID09ICdzdHJpbmcnKSB7XG4gICAgICBpZCA9IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKGJhc2VJZCA/IFVSSS5yZXNvbHZlKGJhc2VJZCwgaWQpIDogaWQpO1xuXG4gICAgICB2YXIgcmVmVmFsID0gc2VsZi5fcmVmc1tpZF07XG4gICAgICBpZiAodHlwZW9mIHJlZlZhbCA9PSAnc3RyaW5nJykgcmVmVmFsID0gc2VsZi5fcmVmc1tyZWZWYWxdO1xuICAgICAgaWYgKHJlZlZhbCAmJiByZWZWYWwuc2NoZW1hKSB7XG4gICAgICAgIGlmICghZXF1YWwoc2NoLCByZWZWYWwuc2NoZW1hKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICB9IGVsc2UgaWYgKGlkICE9IG5vcm1hbGl6ZUlkKGZ1bGxQYXRoKSkge1xuICAgICAgICBpZiAoaWRbMF0gPT0gJyMnKSB7XG4gICAgICAgICAgaWYgKGxvY2FsUmVmc1tpZF0gJiYgIWVxdWFsKHNjaCwgbG9jYWxSZWZzW2lkXSkpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lkIFwiJyArIGlkICsgJ1wiIHJlc29sdmVzIHRvIG1vcmUgdGhhbiBvbmUgc2NoZW1hJyk7XG4gICAgICAgICAgbG9jYWxSZWZzW2lkXSA9IHNjaDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLl9yZWZzW2lkXSA9IGZ1bGxQYXRoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGJhc2VJZHNbanNvblB0cl0gPSBiYXNlSWQ7XG4gICAgZnVsbFBhdGhzW2pzb25QdHJdID0gZnVsbFBhdGg7XG4gIH0pO1xuXG4gIHJldHVybiBsb2NhbFJlZnM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBydWxlTW9kdWxlcyA9IHJlcXVpcmUoJy4uL2RvdGpzJylcbiAgLCB0b0hhc2ggPSByZXF1aXJlKCcuL3V0aWwnKS50b0hhc2g7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcnVsZXMoKSB7XG4gIHZhciBSVUxFUyA9IFtcbiAgICB7IHR5cGU6ICdudW1iZXInLFxuICAgICAgcnVsZXM6IFsgeyAnbWF4aW11bSc6IFsnZXhjbHVzaXZlTWF4aW11bSddIH0sXG4gICAgICAgICAgICAgICB7ICdtaW5pbXVtJzogWydleGNsdXNpdmVNaW5pbXVtJ10gfSwgJ211bHRpcGxlT2YnLCAnZm9ybWF0J10gfSxcbiAgICB7IHR5cGU6ICdzdHJpbmcnLFxuICAgICAgcnVsZXM6IFsgJ21heExlbmd0aCcsICdtaW5MZW5ndGgnLCAncGF0dGVybicsICdmb3JtYXQnIF0gfSxcbiAgICB7IHR5cGU6ICdhcnJheScsXG4gICAgICBydWxlczogWyAnbWF4SXRlbXMnLCAnbWluSXRlbXMnLCAnaXRlbXMnLCAnY29udGFpbnMnLCAndW5pcXVlSXRlbXMnIF0gfSxcbiAgICB7IHR5cGU6ICdvYmplY3QnLFxuICAgICAgcnVsZXM6IFsgJ21heFByb3BlcnRpZXMnLCAnbWluUHJvcGVydGllcycsICdyZXF1aXJlZCcsICdkZXBlbmRlbmNpZXMnLCAncHJvcGVydHlOYW1lcycsXG4gICAgICAgICAgICAgICB7ICdwcm9wZXJ0aWVzJzogWydhZGRpdGlvbmFsUHJvcGVydGllcycsICdwYXR0ZXJuUHJvcGVydGllcyddIH0gXSB9LFxuICAgIHsgcnVsZXM6IFsgJyRyZWYnLCAnY29uc3QnLCAnZW51bScsICdub3QnLCAnYW55T2YnLCAnb25lT2YnLCAnYWxsT2YnLCAnaWYnIF0gfVxuICBdO1xuXG4gIHZhciBBTEwgPSBbICd0eXBlJywgJyRjb21tZW50JyBdO1xuICB2YXIgS0VZV09SRFMgPSBbXG4gICAgJyRzY2hlbWEnLCAnJGlkJywgJ2lkJywgJyRkYXRhJywgJyRhc3luYycsICd0aXRsZScsXG4gICAgJ2Rlc2NyaXB0aW9uJywgJ2RlZmF1bHQnLCAnZGVmaW5pdGlvbnMnLFxuICAgICdleGFtcGxlcycsICdyZWFkT25seScsICd3cml0ZU9ubHknLFxuICAgICdjb250ZW50TWVkaWFUeXBlJywgJ2NvbnRlbnRFbmNvZGluZycsXG4gICAgJ2FkZGl0aW9uYWxJdGVtcycsICd0aGVuJywgJ2Vsc2UnXG4gIF07XG4gIHZhciBUWVBFUyA9IFsgJ251bWJlcicsICdpbnRlZ2VyJywgJ3N0cmluZycsICdhcnJheScsICdvYmplY3QnLCAnYm9vbGVhbicsICdudWxsJyBdO1xuICBSVUxFUy5hbGwgPSB0b0hhc2goQUxMKTtcbiAgUlVMRVMudHlwZXMgPSB0b0hhc2goVFlQRVMpO1xuXG4gIFJVTEVTLmZvckVhY2goZnVuY3Rpb24gKGdyb3VwKSB7XG4gICAgZ3JvdXAucnVsZXMgPSBncm91cC5ydWxlcy5tYXAoZnVuY3Rpb24gKGtleXdvcmQpIHtcbiAgICAgIHZhciBpbXBsS2V5d29yZHM7XG4gICAgICBpZiAodHlwZW9mIGtleXdvcmQgPT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIGtleSA9IE9iamVjdC5rZXlzKGtleXdvcmQpWzBdO1xuICAgICAgICBpbXBsS2V5d29yZHMgPSBrZXl3b3JkW2tleV07XG4gICAgICAgIGtleXdvcmQgPSBrZXk7XG4gICAgICAgIGltcGxLZXl3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgQUxMLnB1c2goayk7XG4gICAgICAgICAgUlVMRVMuYWxsW2tdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBBTEwucHVzaChrZXl3b3JkKTtcbiAgICAgIHZhciBydWxlID0gUlVMRVMuYWxsW2tleXdvcmRdID0ge1xuICAgICAgICBrZXl3b3JkOiBrZXl3b3JkLFxuICAgICAgICBjb2RlOiBydWxlTW9kdWxlc1trZXl3b3JkXSxcbiAgICAgICAgaW1wbGVtZW50czogaW1wbEtleXdvcmRzXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHJ1bGU7XG4gICAgfSk7XG5cbiAgICBSVUxFUy5hbGwuJGNvbW1lbnQgPSB7XG4gICAgICBrZXl3b3JkOiAnJGNvbW1lbnQnLFxuICAgICAgY29kZTogcnVsZU1vZHVsZXMuJGNvbW1lbnRcbiAgICB9O1xuXG4gICAgaWYgKGdyb3VwLnR5cGUpIFJVTEVTLnR5cGVzW2dyb3VwLnR5cGVdID0gZ3JvdXA7XG4gIH0pO1xuXG4gIFJVTEVTLmtleXdvcmRzID0gdG9IYXNoKEFMTC5jb25jYXQoS0VZV09SRFMpKTtcbiAgUlVMRVMuY3VzdG9tID0ge307XG5cbiAgcmV0dXJuIFJVTEVTO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWFPYmplY3Q7XG5cbmZ1bmN0aW9uIFNjaGVtYU9iamVjdChvYmopIHtcbiAgdXRpbC5jb3B5KG9iaiwgdGhpcyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvcHVueWNvZGUuanMgLSBwdW55Y29kZS51Y3MyLmRlY29kZVxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB1Y3MybGVuZ3RoKHN0cikge1xuICB2YXIgbGVuZ3RoID0gMFxuICAgICwgbGVuID0gc3RyLmxlbmd0aFxuICAgICwgcG9zID0gMFxuICAgICwgdmFsdWU7XG4gIHdoaWxlIChwb3MgPCBsZW4pIHtcbiAgICBsZW5ndGgrKztcbiAgICB2YWx1ZSA9IHN0ci5jaGFyQ29kZUF0KHBvcysrKTtcbiAgICBpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBwb3MgPCBsZW4pIHtcbiAgICAgIC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuICAgICAgdmFsdWUgPSBzdHIuY2hhckNvZGVBdChwb3MpO1xuICAgICAgaWYgKCh2YWx1ZSAmIDB4RkMwMCkgPT0gMHhEQzAwKSBwb3MrKzsgLy8gbG93IHN1cnJvZ2F0ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gbGVuZ3RoO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29weTogY29weSxcbiAgY2hlY2tEYXRhVHlwZTogY2hlY2tEYXRhVHlwZSxcbiAgY2hlY2tEYXRhVHlwZXM6IGNoZWNrRGF0YVR5cGVzLFxuICBjb2VyY2VUb1R5cGVzOiBjb2VyY2VUb1R5cGVzLFxuICB0b0hhc2g6IHRvSGFzaCxcbiAgZ2V0UHJvcGVydHk6IGdldFByb3BlcnR5LFxuICBlc2NhcGVRdW90ZXM6IGVzY2FwZVF1b3RlcyxcbiAgZXF1YWw6IHJlcXVpcmUoJ2Zhc3QtZGVlcC1lcXVhbCcpLFxuICB1Y3MybGVuZ3RoOiByZXF1aXJlKCcuL3VjczJsZW5ndGgnKSxcbiAgdmFyT2NjdXJlbmNlczogdmFyT2NjdXJlbmNlcyxcbiAgdmFyUmVwbGFjZTogdmFyUmVwbGFjZSxcbiAgc2NoZW1hSGFzUnVsZXM6IHNjaGVtYUhhc1J1bGVzLFxuICBzY2hlbWFIYXNSdWxlc0V4Y2VwdDogc2NoZW1hSGFzUnVsZXNFeGNlcHQsXG4gIHNjaGVtYVVua25vd25SdWxlczogc2NoZW1hVW5rbm93blJ1bGVzLFxuICB0b1F1b3RlZFN0cmluZzogdG9RdW90ZWRTdHJpbmcsXG4gIGdldFBhdGhFeHByOiBnZXRQYXRoRXhwcixcbiAgZ2V0UGF0aDogZ2V0UGF0aCxcbiAgZ2V0RGF0YTogZ2V0RGF0YSxcbiAgdW5lc2NhcGVGcmFnbWVudDogdW5lc2NhcGVGcmFnbWVudCxcbiAgdW5lc2NhcGVKc29uUG9pbnRlcjogdW5lc2NhcGVKc29uUG9pbnRlcixcbiAgZXNjYXBlRnJhZ21lbnQ6IGVzY2FwZUZyYWdtZW50LFxuICBlc2NhcGVKc29uUG9pbnRlcjogZXNjYXBlSnNvblBvaW50ZXJcbn07XG5cblxuZnVuY3Rpb24gY29weShvLCB0bykge1xuICB0byA9IHRvIHx8IHt9O1xuICBmb3IgKHZhciBrZXkgaW4gbykgdG9ba2V5XSA9IG9ba2V5XTtcbiAgcmV0dXJuIHRvO1xufVxuXG5cbmZ1bmN0aW9uIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGUsIGRhdGEsIHN0cmljdE51bWJlcnMsIG5lZ2F0ZSkge1xuICB2YXIgRVFVQUwgPSBuZWdhdGUgPyAnICE9PSAnIDogJyA9PT0gJ1xuICAgICwgQU5EID0gbmVnYXRlID8gJyB8fCAnIDogJyAmJiAnXG4gICAgLCBPSyA9IG5lZ2F0ZSA/ICchJyA6ICcnXG4gICAgLCBOT1QgPSBuZWdhdGUgPyAnJyA6ICchJztcbiAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgIGNhc2UgJ251bGwnOiByZXR1cm4gZGF0YSArIEVRVUFMICsgJ251bGwnO1xuICAgIGNhc2UgJ2FycmF5JzogcmV0dXJuIE9LICsgJ0FycmF5LmlzQXJyYXkoJyArIGRhdGEgKyAnKSc7XG4gICAgY2FzZSAnb2JqZWN0JzogcmV0dXJuICcoJyArIE9LICsgZGF0YSArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlb2YgJyArIGRhdGEgKyBFUVVBTCArICdcIm9iamVjdFwiJyArIEFORCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIE5PVCArICdBcnJheS5pc0FycmF5KCcgKyBkYXRhICsgJykpJztcbiAgICBjYXNlICdpbnRlZ2VyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCJudW1iZXJcIicgKyBBTkQgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgTk9UICsgJygnICsgZGF0YSArICcgJSAxKScgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgQU5EICsgZGF0YSArIEVRVUFMICsgZGF0YSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAoc3RyaWN0TnVtYmVycyA/IChBTkQgKyBPSyArICdpc0Zpbml0ZSgnICsgZGF0YSArICcpJykgOiAnJykgKyAnKSc7XG4gICAgY2FzZSAnbnVtYmVyJzogcmV0dXJuICcodHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHN0cmljdE51bWJlcnMgPyAoQU5EICsgT0sgKyAnaXNGaW5pdGUoJyArIGRhdGEgKyAnKScpIDogJycpICsgJyknO1xuICAgIGRlZmF1bHQ6IHJldHVybiAndHlwZW9mICcgKyBkYXRhICsgRVFVQUwgKyAnXCInICsgZGF0YVR5cGUgKyAnXCInO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2hlY2tEYXRhVHlwZXMoZGF0YVR5cGVzLCBkYXRhLCBzdHJpY3ROdW1iZXJzKSB7XG4gIHN3aXRjaCAoZGF0YVR5cGVzLmxlbmd0aCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGNoZWNrRGF0YVR5cGUoZGF0YVR5cGVzWzBdLCBkYXRhLCBzdHJpY3ROdW1iZXJzLCB0cnVlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdmFyIGNvZGUgPSAnJztcbiAgICAgIHZhciB0eXBlcyA9IHRvSGFzaChkYXRhVHlwZXMpO1xuICAgICAgaWYgKHR5cGVzLmFycmF5ICYmIHR5cGVzLm9iamVjdCkge1xuICAgICAgICBjb2RlID0gdHlwZXMubnVsbCA/ICcoJzogJyghJyArIGRhdGEgKyAnIHx8ICc7XG4gICAgICAgIGNvZGUgKz0gJ3R5cGVvZiAnICsgZGF0YSArICcgIT09IFwib2JqZWN0XCIpJztcbiAgICAgICAgZGVsZXRlIHR5cGVzLm51bGw7XG4gICAgICAgIGRlbGV0ZSB0eXBlcy5hcnJheTtcbiAgICAgICAgZGVsZXRlIHR5cGVzLm9iamVjdDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlcy5udW1iZXIpIGRlbGV0ZSB0eXBlcy5pbnRlZ2VyO1xuICAgICAgZm9yICh2YXIgdCBpbiB0eXBlcylcbiAgICAgICAgY29kZSArPSAoY29kZSA/ICcgJiYgJyA6ICcnICkgKyBjaGVja0RhdGFUeXBlKHQsIGRhdGEsIHN0cmljdE51bWJlcnMsIHRydWUpO1xuXG4gICAgICByZXR1cm4gY29kZTtcbiAgfVxufVxuXG5cbnZhciBDT0VSQ0VfVE9fVFlQRVMgPSB0b0hhc2goWyAnc3RyaW5nJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ2Jvb2xlYW4nLCAnbnVsbCcgXSk7XG5mdW5jdGlvbiBjb2VyY2VUb1R5cGVzKG9wdGlvbkNvZXJjZVR5cGVzLCBkYXRhVHlwZXMpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YVR5cGVzKSkge1xuICAgIHZhciB0eXBlcyA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0ID0gZGF0YVR5cGVzW2ldO1xuICAgICAgaWYgKENPRVJDRV9UT19UWVBFU1t0XSkgdHlwZXNbdHlwZXMubGVuZ3RoXSA9IHQ7XG4gICAgICBlbHNlIGlmIChvcHRpb25Db2VyY2VUeXBlcyA9PT0gJ2FycmF5JyAmJiB0ID09PSAnYXJyYXknKSB0eXBlc1t0eXBlcy5sZW5ndGhdID0gdDtcbiAgICB9XG4gICAgaWYgKHR5cGVzLmxlbmd0aCkgcmV0dXJuIHR5cGVzO1xuICB9IGVsc2UgaWYgKENPRVJDRV9UT19UWVBFU1tkYXRhVHlwZXNdKSB7XG4gICAgcmV0dXJuIFtkYXRhVHlwZXNdO1xuICB9IGVsc2UgaWYgKG9wdGlvbkNvZXJjZVR5cGVzID09PSAnYXJyYXknICYmIGRhdGFUeXBlcyA9PT0gJ2FycmF5Jykge1xuICAgIHJldHVybiBbJ2FycmF5J107XG4gIH1cbn1cblxuXG5mdW5jdGlvbiB0b0hhc2goYXJyKSB7XG4gIHZhciBoYXNoID0ge307XG4gIGZvciAodmFyIGk9MDsgaTxhcnIubGVuZ3RoOyBpKyspIGhhc2hbYXJyW2ldXSA9IHRydWU7XG4gIHJldHVybiBoYXNoO1xufVxuXG5cbnZhciBJREVOVElGSUVSID0gL15bYS16JF9dW2EteiRfMC05XSokL2k7XG52YXIgU0lOR0xFX1FVT1RFID0gLyd8XFxcXC9nO1xuZnVuY3Rpb24gZ2V0UHJvcGVydHkoa2V5KSB7XG4gIHJldHVybiB0eXBlb2Yga2V5ID09ICdudW1iZXInXG4gICAgICAgICAgPyAnWycgKyBrZXkgKyAnXSdcbiAgICAgICAgICA6IElERU5USUZJRVIudGVzdChrZXkpXG4gICAgICAgICAgICA/ICcuJyArIGtleVxuICAgICAgICAgICAgOiBcIlsnXCIgKyBlc2NhcGVRdW90ZXMoa2V5KSArIFwiJ11cIjtcbn1cblxuXG5mdW5jdGlvbiBlc2NhcGVRdW90ZXMoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShTSU5HTEVfUVVPVEUsICdcXFxcJCYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbn1cblxuXG5mdW5jdGlvbiB2YXJPY2N1cmVuY2VzKHN0ciwgZGF0YVZhcikge1xuICBkYXRhVmFyICs9ICdbXjAtOV0nO1xuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChuZXcgUmVnRXhwKGRhdGFWYXIsICdnJykpO1xuICByZXR1cm4gbWF0Y2hlcyA/IG1hdGNoZXMubGVuZ3RoIDogMDtcbn1cblxuXG5mdW5jdGlvbiB2YXJSZXBsYWNlKHN0ciwgZGF0YVZhciwgZXhwcikge1xuICBkYXRhVmFyICs9ICcoW14wLTldKSc7XG4gIGV4cHIgPSBleHByLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuICByZXR1cm4gc3RyLnJlcGxhY2UobmV3IFJlZ0V4cChkYXRhVmFyLCAnZycpLCBleHByICsgJyQxJyk7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hO1xuICBmb3IgKHZhciBrZXkgaW4gc2NoZW1hKSBpZiAocnVsZXNba2V5XSkgcmV0dXJuIHRydWU7XG59XG5cblxuZnVuY3Rpb24gc2NoZW1hSGFzUnVsZXNFeGNlcHQoc2NoZW1hLCBydWxlcywgZXhjZXB0S2V5d29yZCkge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybiAhc2NoZW1hICYmIGV4Y2VwdEtleXdvcmQgIT0gJ25vdCc7XG4gIGZvciAodmFyIGtleSBpbiBzY2hlbWEpIGlmIChrZXkgIT0gZXhjZXB0S2V5d29yZCAmJiBydWxlc1trZXldKSByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBzY2hlbWFVbmtub3duUnVsZXMoc2NoZW1hLCBydWxlcykge1xuICBpZiAodHlwZW9mIHNjaGVtYSA9PSAnYm9vbGVhbicpIHJldHVybjtcbiAgZm9yICh2YXIga2V5IGluIHNjaGVtYSkgaWYgKCFydWxlc1trZXldKSByZXR1cm4ga2V5O1xufVxuXG5cbmZ1bmN0aW9uIHRvUXVvdGVkU3RyaW5nKHN0cikge1xuICByZXR1cm4gJ1xcJycgKyBlc2NhcGVRdW90ZXMoc3RyKSArICdcXCcnO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGhFeHByKGN1cnJlbnRQYXRoLCBleHByLCBqc29uUG9pbnRlcnMsIGlzTnVtYmVyKSB7XG4gIHZhciBwYXRoID0ganNvblBvaW50ZXJzIC8vIGZhbHNlIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgPyAnXFwnL1xcJyArICcgKyBleHByICsgKGlzTnVtYmVyID8gJycgOiAnLnJlcGxhY2UoL34vZywgXFwnfjBcXCcpLnJlcGxhY2UoL1xcXFwvL2csIFxcJ34xXFwnKScpXG4gICAgICAgICAgICAgIDogKGlzTnVtYmVyID8gJ1xcJ1tcXCcgKyAnICsgZXhwciArICcgKyBcXCddXFwnJyA6ICdcXCdbXFxcXFxcJ1xcJyArICcgKyBleHByICsgJyArIFxcJ1xcXFxcXCddXFwnJyk7XG4gIHJldHVybiBqb2luUGF0aHMoY3VycmVudFBhdGgsIHBhdGgpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFBhdGgoY3VycmVudFBhdGgsIHByb3AsIGpzb25Qb2ludGVycykge1xuICB2YXIgcGF0aCA9IGpzb25Qb2ludGVycyAvLyBmYWxzZSBieSBkZWZhdWx0XG4gICAgICAgICAgICAgID8gdG9RdW90ZWRTdHJpbmcoJy8nICsgZXNjYXBlSnNvblBvaW50ZXIocHJvcCkpXG4gICAgICAgICAgICAgIDogdG9RdW90ZWRTdHJpbmcoZ2V0UHJvcGVydHkocHJvcCkpO1xuICByZXR1cm4gam9pblBhdGhzKGN1cnJlbnRQYXRoLCBwYXRoKTtcbn1cblxuXG52YXIgSlNPTl9QT0lOVEVSID0gL15cXC8oPzpbXn5dfH4wfH4xKSokLztcbnZhciBSRUxBVElWRV9KU09OX1BPSU5URVIgPSAvXihbMC05XSspKCN8XFwvKD86W15+XXx+MHx+MSkqKT8kLztcbmZ1bmN0aW9uIGdldERhdGEoJGRhdGEsIGx2bCwgcGF0aHMpIHtcbiAgdmFyIHVwLCBqc29uUG9pbnRlciwgZGF0YSwgbWF0Y2hlcztcbiAgaWYgKCRkYXRhID09PSAnJykgcmV0dXJuICdyb290RGF0YSc7XG4gIGlmICgkZGF0YVswXSA9PSAnLycpIHtcbiAgICBpZiAoIUpTT05fUE9JTlRFUi50ZXN0KCRkYXRhKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICBqc29uUG9pbnRlciA9ICRkYXRhO1xuICAgIGRhdGEgPSAncm9vdERhdGEnO1xuICB9IGVsc2Uge1xuICAgIG1hdGNoZXMgPSAkZGF0YS5tYXRjaChSRUxBVElWRV9KU09OX1BPSU5URVIpO1xuICAgIGlmICghbWF0Y2hlcykgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04tcG9pbnRlcjogJyArICRkYXRhKTtcbiAgICB1cCA9ICttYXRjaGVzWzFdO1xuICAgIGpzb25Qb2ludGVyID0gbWF0Y2hlc1syXTtcbiAgICBpZiAoanNvblBvaW50ZXIgPT0gJyMnKSB7XG4gICAgICBpZiAodXAgPj0gbHZsKSB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhY2Nlc3MgcHJvcGVydHkvaW5kZXggJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgICByZXR1cm4gcGF0aHNbbHZsIC0gdXBdO1xuICAgIH1cblxuICAgIGlmICh1cCA+IGx2bCkgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWNjZXNzIGRhdGEgJyArIHVwICsgJyBsZXZlbHMgdXAsIGN1cnJlbnQgbGV2ZWwgaXMgJyArIGx2bCk7XG4gICAgZGF0YSA9ICdkYXRhJyArICgobHZsIC0gdXApIHx8ICcnKTtcbiAgICBpZiAoIWpzb25Qb2ludGVyKSByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBleHByID0gZGF0YTtcbiAgdmFyIHNlZ21lbnRzID0ganNvblBvaW50ZXIuc3BsaXQoJy8nKTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcbiAgICBpZiAoc2VnbWVudCkge1xuICAgICAgZGF0YSArPSBnZXRQcm9wZXJ0eSh1bmVzY2FwZUpzb25Qb2ludGVyKHNlZ21lbnQpKTtcbiAgICAgIGV4cHIgKz0gJyAmJiAnICsgZGF0YTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4cHI7XG59XG5cblxuZnVuY3Rpb24gam9pblBhdGhzIChhLCBiKSB7XG4gIGlmIChhID09ICdcIlwiJykgcmV0dXJuIGI7XG4gIHJldHVybiAoYSArICcgKyAnICsgYikucmVwbGFjZSgvKFteXFxcXF0pJyBcXCsgJy9nLCAnJDEnKTtcbn1cblxuXG5mdW5jdGlvbiB1bmVzY2FwZUZyYWdtZW50KHN0cikge1xuICByZXR1cm4gdW5lc2NhcGVKc29uUG9pbnRlcihkZWNvZGVVUklDb21wb25lbnQoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlRnJhZ21lbnQoc3RyKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoZXNjYXBlSnNvblBvaW50ZXIoc3RyKSk7XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlSnNvblBvaW50ZXIoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvfi9nLCAnfjAnKS5yZXBsYWNlKC9cXC8vZywgJ34xJyk7XG59XG5cblxuZnVuY3Rpb24gdW5lc2NhcGVKc29uUG9pbnRlcihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9+MS9nLCAnLycpLnJlcGxhY2UoL34wL2csICd+Jyk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBLRVlXT1JEUyA9IFtcbiAgJ211bHRpcGxlT2YnLFxuICAnbWF4aW11bScsXG4gICdleGNsdXNpdmVNYXhpbXVtJyxcbiAgJ21pbmltdW0nLFxuICAnZXhjbHVzaXZlTWluaW11bScsXG4gICdtYXhMZW5ndGgnLFxuICAnbWluTGVuZ3RoJyxcbiAgJ3BhdHRlcm4nLFxuICAnYWRkaXRpb25hbEl0ZW1zJyxcbiAgJ21heEl0ZW1zJyxcbiAgJ21pbkl0ZW1zJyxcbiAgJ3VuaXF1ZUl0ZW1zJyxcbiAgJ21heFByb3BlcnRpZXMnLFxuICAnbWluUHJvcGVydGllcycsXG4gICdyZXF1aXJlZCcsXG4gICdhZGRpdGlvbmFsUHJvcGVydGllcycsXG4gICdlbnVtJyxcbiAgJ2Zvcm1hdCcsXG4gICdjb25zdCdcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG1ldGFTY2hlbWEsIGtleXdvcmRzSnNvblBvaW50ZXJzKSB7XG4gIGZvciAodmFyIGk9MDsgaTxrZXl3b3Jkc0pzb25Qb2ludGVycy5sZW5ndGg7IGkrKykge1xuICAgIG1ldGFTY2hlbWEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG1ldGFTY2hlbWEpKTtcbiAgICB2YXIgc2VnbWVudHMgPSBrZXl3b3Jkc0pzb25Qb2ludGVyc1tpXS5zcGxpdCgnLycpO1xuICAgIHZhciBrZXl3b3JkcyA9IG1ldGFTY2hlbWE7XG4gICAgdmFyIGo7XG4gICAgZm9yIChqPTE7IGo8c2VnbWVudHMubGVuZ3RoOyBqKyspXG4gICAgICBrZXl3b3JkcyA9IGtleXdvcmRzW3NlZ21lbnRzW2pdXTtcblxuICAgIGZvciAoaj0wOyBqPEtFWVdPUkRTLmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIga2V5ID0gS0VZV09SRFNbal07XG4gICAgICB2YXIgc2NoZW1hID0ga2V5d29yZHNba2V5XTtcbiAgICAgIGlmIChzY2hlbWEpIHtcbiAgICAgICAga2V5d29yZHNba2V5XSA9IHtcbiAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgc2NoZW1hLFxuICAgICAgICAgICAgeyAkcmVmOiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXRhU2NoZW1hO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG1ldGFTY2hlbWEgPSByZXF1aXJlKCcuL3JlZnMvanNvbi1zY2hlbWEtZHJhZnQtMDcuanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJGlkOiAnaHR0cHM6Ly9naXRodWIuY29tL2Fqdi12YWxpZGF0b3IvYWp2L2Jsb2IvbWFzdGVyL2xpYi9kZWZpbml0aW9uX3NjaGVtYS5qcycsXG4gIGRlZmluaXRpb25zOiB7XG4gICAgc2ltcGxlVHlwZXM6IG1ldGFTY2hlbWEuZGVmaW5pdGlvbnMuc2ltcGxlVHlwZXNcbiAgfSxcbiAgdHlwZTogJ29iamVjdCcsXG4gIGRlcGVuZGVuY2llczoge1xuICAgIHNjaGVtYTogWyd2YWxpZGF0ZSddLFxuICAgICRkYXRhOiBbJ3ZhbGlkYXRlJ10sXG4gICAgc3RhdGVtZW50czogWydpbmxpbmUnXSxcbiAgICB2YWxpZDoge25vdDoge3JlcXVpcmVkOiBbJ21hY3JvJ119fVxuICB9LFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgdHlwZTogbWV0YVNjaGVtYS5wcm9wZXJ0aWVzLnR5cGUsXG4gICAgc2NoZW1hOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBzdGF0ZW1lbnRzOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBpdGVtczoge3R5cGU6ICdzdHJpbmcnfVxuICAgIH0sXG4gICAgbWV0YVNjaGVtYToge3R5cGU6ICdvYmplY3QnfSxcbiAgICBtb2RpZnlpbmc6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIHZhbGlkOiB7dHlwZTogJ2Jvb2xlYW4nfSxcbiAgICAkZGF0YToge3R5cGU6ICdib29sZWFuJ30sXG4gICAgYXN5bmM6IHt0eXBlOiAnYm9vbGVhbid9LFxuICAgIGVycm9yczoge1xuICAgICAgYW55T2Y6IFtcbiAgICAgICAge3R5cGU6ICdib29sZWFuJ30sXG4gICAgICAgIHtjb25zdDogJ2Z1bGwnfVxuICAgICAgXVxuICAgIH1cbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0KGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICRpc01heCA9ICRrZXl3b3JkID09ICdtYXhpbXVtJyxcbiAgICAkZXhjbHVzaXZlS2V5d29yZCA9ICRpc01heCA/ICdleGNsdXNpdmVNYXhpbXVtJyA6ICdleGNsdXNpdmVNaW5pbXVtJyxcbiAgICAkc2NoZW1hRXhjbCA9IGl0LnNjaGVtYVskZXhjbHVzaXZlS2V5d29yZF0sXG4gICAgJGlzRGF0YUV4Y2wgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWFFeGNsICYmICRzY2hlbWFFeGNsLiRkYXRhLFxuICAgICRvcCA9ICRpc01heCA/ICc8JyA6ICc+JyxcbiAgICAkbm90T3AgPSAkaXNNYXggPyAnPicgOiAnPCcsXG4gICAgJGVycm9yS2V5d29yZCA9IHVuZGVmaW5lZDtcbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJyB8fCAkc2NoZW1hID09PSB1bmRlZmluZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlcicpO1xuICB9XG4gIGlmICghKCRpc0RhdGFFeGNsIHx8ICRzY2hlbWFFeGNsID09PSB1bmRlZmluZWQgfHwgdHlwZW9mICRzY2hlbWFFeGNsID09ICdudW1iZXInIHx8IHR5cGVvZiAkc2NoZW1hRXhjbCA9PSAnYm9vbGVhbicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRleGNsdXNpdmVLZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlciBvciBib29sZWFuJyk7XG4gIH1cbiAgaWYgKCRpc0RhdGFFeGNsKSB7XG4gICAgdmFyICRzY2hlbWFWYWx1ZUV4Y2wgPSBpdC51dGlsLmdldERhdGEoJHNjaGVtYUV4Y2wuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFyciksXG4gICAgICAkZXhjbHVzaXZlID0gJ2V4Y2x1c2l2ZScgKyAkbHZsLFxuICAgICAgJGV4Y2xUeXBlID0gJ2V4Y2xUeXBlJyArICRsdmwsXG4gICAgICAkZXhjbElzTnVtYmVyID0gJ2V4Y2xJc051bWJlcicgKyAkbHZsLFxuICAgICAgJG9wRXhwciA9ICdvcCcgKyAkbHZsLFxuICAgICAgJG9wU3RyID0gJ1xcJyArICcgKyAkb3BFeHByICsgJyArIFxcJyc7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYUV4Y2wnICsgKCRsdmwpICsgJyA9ICcgKyAoJHNjaGVtYVZhbHVlRXhjbCkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZUV4Y2wgPSAnc2NoZW1hRXhjbCcgKyAkbHZsO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRleGNsdXNpdmUpICsgJzsgdmFyICcgKyAoJGV4Y2xUeXBlKSArICcgPSB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICc7IGlmICgnICsgKCRleGNsVHlwZSkgKyAnICE9IFxcJ2Jvb2xlYW5cXCcgJiYgJyArICgkZXhjbFR5cGUpICsgJyAhPSBcXCd1bmRlZmluZWRcXCcgJiYgJyArICgkZXhjbFR5cGUpICsgJyAhPSBcXCdudW1iZXJcXCcpIHsgJztcbiAgICB2YXIgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19leGNsdXNpdmVMaW1pdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnICsgKCRleGNsdXNpdmVLZXl3b3JkKSArICcgc2hvdWxkIGJlIGJvb2xlYW5cXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9IGVsc2UgaWYgKCAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZXhjbFR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgPyAoICgnICsgKCRleGNsdXNpdmUpICsgJyA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCB8fCAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJyAnICsgKCRvcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnKSA/ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnPSAnICsgKCRzY2hlbWFWYWx1ZUV4Y2wpICsgJyA6ICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKSA6ICggKCcgKyAoJGV4Y2x1c2l2ZSkgKyAnID0gJyArICgkc2NoZW1hVmFsdWVFeGNsKSArICcgPT09IHRydWUpID8gJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgOiAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICkgfHwgJyArICgkZGF0YSkgKyAnICE9PSAnICsgKCRkYXRhKSArICcpIHsgdmFyIG9wJyArICgkbHZsKSArICcgPSAnICsgKCRleGNsdXNpdmUpICsgJyA/IFxcJycgKyAoJG9wKSArICdcXCcgOiBcXCcnICsgKCRvcCkgKyAnPVxcJzsgJztcbiAgICBpZiAoJHNjaGVtYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAkZXJyb3JLZXl3b3JkID0gJGV4Y2x1c2l2ZUtleXdvcmQ7XG4gICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWFWYWx1ZUV4Y2w7XG4gICAgICAkaXNEYXRhID0gJGlzRGF0YUV4Y2w7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciAkZXhjbElzTnVtYmVyID0gdHlwZW9mICRzY2hlbWFFeGNsID09ICdudW1iZXInLFxuICAgICAgJG9wU3RyID0gJG9wO1xuICAgIGlmICgkZXhjbElzTnVtYmVyICYmICRpc0RhdGEpIHtcbiAgICAgIHZhciAkb3BFeHByID0gJ1xcJycgKyAkb3BTdHIgKyAnXFwnJztcbiAgICAgIG91dCArPSAnIGlmICggJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICcgKyAoJHNjaGVtYVZhbHVlKSArICcgIT0gXFwnbnVtYmVyXFwnKSB8fCAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgKCAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQgfHwgJyArICgkc2NoZW1hRXhjbCkgKyAnICcgKyAoJG9wKSArICc9ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgPyAnICsgKCRkYXRhKSArICcgJyArICgkbm90T3ApICsgJz0gJyArICgkc2NoZW1hRXhjbCkgKyAnIDogJyArICgkZGF0YSkgKyAnICcgKyAoJG5vdE9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJyApIHx8ICcgKyAoJGRhdGEpICsgJyAhPT0gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkZXhjbElzTnVtYmVyICYmICRzY2hlbWEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAkZXhjbHVzaXZlID0gdHJ1ZTtcbiAgICAgICAgJGVycm9yS2V5d29yZCA9ICRleGNsdXNpdmVLZXl3b3JkO1xuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYUV4Y2w7XG4gICAgICAgICRub3RPcCArPSAnPSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoJGV4Y2xJc051bWJlcikgJHNjaGVtYVZhbHVlID0gTWF0aFskaXNNYXggPyAnbWluJyA6ICdtYXgnXSgkc2NoZW1hRXhjbCwgJHNjaGVtYSk7XG4gICAgICAgIGlmICgkc2NoZW1hRXhjbCA9PT0gKCRleGNsSXNOdW1iZXIgPyAkc2NoZW1hVmFsdWUgOiB0cnVlKSkge1xuICAgICAgICAgICRleGNsdXNpdmUgPSB0cnVlO1xuICAgICAgICAgICRlcnJvcktleXdvcmQgPSAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAkZXhjbHVzaXZlS2V5d29yZDtcbiAgICAgICAgICAkbm90T3AgKz0gJz0nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRleGNsdXNpdmUgPSBmYWxzZTtcbiAgICAgICAgICAkb3BTdHIgKz0gJz0nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgJG9wRXhwciA9ICdcXCcnICsgJG9wU3RyICsgJ1xcJyc7XG4gICAgICBvdXQgKz0gJyBpZiAoICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJyAnICsgKCRub3RPcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfHwgJyArICgkZGF0YSkgKyAnICE9PSAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICB9XG4gIH1cbiAgJGVycm9yS2V5d29yZCA9ICRlcnJvcktleXdvcmQgfHwgJGtleXdvcmQ7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdfbGltaXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGNvbXBhcmlzb246ICcgKyAoJG9wRXhwcikgKyAnLCBsaW1pdDogJyArICgkc2NoZW1hVmFsdWUpICsgJywgZXhjbHVzaXZlOiAnICsgKCRleGNsdXNpdmUpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBiZSAnICsgKCRvcFN0cikgKyAnICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpICsgJ1xcJyc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9fbGltaXRJdGVtcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIGlmICghKCRpc0RhdGEgfHwgdHlwZW9mICRzY2hlbWEgPT0gJ251bWJlcicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCRrZXl3b3JkICsgJyBtdXN0IGJlIG51bWJlcicpO1xuICB9XG4gIHZhciAkb3AgPSAka2V5d29yZCA9PSAnbWF4SXRlbXMnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAnICsgKCRkYXRhKSArICcubGVuZ3RoICcgKyAoJG9wKSArICcgJyArICgkc2NoZW1hVmFsdWUpICsgJykgeyAnO1xuICB2YXIgJGVycm9yS2V5d29yZCA9ICRrZXl3b3JkO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJGVycm9yS2V5d29yZCB8fCAnX2xpbWl0SXRlbXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heEl0ZW1zJykge1xuICAgICAgICBvdXQgKz0gJ21vcmUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdmZXdlcic7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0aGFuICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKSArICcgKyBcXCcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKCRzY2hlbWEpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgaXRlbXNcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6ICAnO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hKTtcbiAgICAgIH1cbiAgICAgIG91dCArPSAnICAgICAgICAgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICd9ICc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfX2xpbWl0TGVuZ3RoKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZXJyb3JLZXl3b3JkO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgdmFyICRvcCA9ICRrZXl3b3JkID09ICdtYXhMZW5ndGgnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBpZiAoaXQub3B0cy51bmljb2RlID09PSBmYWxzZSkge1xuICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJy5sZW5ndGggJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1Y3MybGVuZ3RoKCcgKyAoJGRhdGEpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdExlbmd0aCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbGltaXQ6ICcgKyAoJHNjaGVtYVZhbHVlKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heExlbmd0aCcpIHtcbiAgICAgICAgb3V0ICs9ICdsb25nZXInO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICdzaG9ydGVyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBjaGFyYWN0ZXJzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX19saW1pdFByb3BlcnRpZXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRlcnJvcktleXdvcmQ7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoISgkaXNEYXRhIHx8IHR5cGVvZiAkc2NoZW1hID09ICdudW1iZXInKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigka2V5d29yZCArICcgbXVzdCBiZSBudW1iZXInKTtcbiAgfVxuICB2YXIgJG9wID0gJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnID8gJz4nIDogJzwnO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ251bWJlclxcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpLmxlbmd0aCAnICsgKCRvcCkgKyAnICcgKyAoJHNjaGVtYVZhbHVlKSArICcpIHsgJztcbiAgdmFyICRlcnJvcktleXdvcmQgPSAka2V5d29yZDtcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ19saW1pdFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGxpbWl0OiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlICc7XG4gICAgICBpZiAoJGtleXdvcmQgPT0gJ21heFByb3BlcnRpZXMnKSB7XG4gICAgICAgIG91dCArPSAnbW9yZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJ2Zld2VyJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIHRoYW4gJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBwcm9wZXJ0aWVzXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2FsbE9mKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGl0ID0gaXQudXRpbC5jb3B5KGl0KTtcbiAgdmFyICRjbG9zaW5nQnJhY2VzID0gJyc7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQsXG4gICAgJGFsbFNjaGVtYXNFbXB0eSA9IHRydWU7XG4gIHZhciBhcnIxID0gJHNjaGVtYTtcbiAgaWYgKGFycjEpIHtcbiAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgIGwxID0gYXJyMS5sZW5ndGggLSAxO1xuICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgJGFsbFNjaGVtYXNFbXB0eSA9IGZhbHNlO1xuICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICdbJyArICRpICsgJ10nO1xuICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgaWYgKCRhbGxTY2hlbWFzRW1wdHkpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMuc2xpY2UoMCwgLTEpKSArICcgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfYW55T2YoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRub0VtcHR5U2NoZW1hID0gJHNjaGVtYS5ldmVyeShmdW5jdGlvbigkc2NoKSB7XG4gICAgcmV0dXJuIChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2gpLmxlbmd0aCA+IDApIHx8ICRzY2ggPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoLCBpdC5SVUxFUy5hbGwpKTtcbiAgfSk7XG4gIGlmICgkbm9FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsgdmFyICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgIGlmIChhcnIxKSB7XG4gICAgICB2YXIgJHNjaCwgJGkgPSAtMSxcbiAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAkc2NoID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArICRpO1xuICAgICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkdmFsaWQpICsgJyB8fCAnICsgKCRuZXh0VmFsaWQpICsgJzsgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdhbnlPZicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggc29tZSBzY2hlbWEgaW4gYW55T2ZcXCcgJztcbiAgICAgIH1cbiAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSBlbHNlIHsgIGVycm9ycyA9ICcgKyAoJGVycnMpICsgJzsgaWYgKHZFcnJvcnMgIT09IG51bGwpIHsgaWYgKCcgKyAoJGVycnMpICsgJykgdkVycm9ycy5sZW5ndGggPSAnICsgKCRlcnJzKSArICc7IGVsc2UgdkVycm9ycyA9IG51bGw7IH0gJztcbiAgICBpZiAoaXQub3B0cy5hbGxFcnJvcnMpIHtcbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2NvbW1lbnQoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGNvbW1lbnQgPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRzY2hlbWEpO1xuICBpZiAoaXQub3B0cy4kY29tbWVudCA9PT0gdHJ1ZSkge1xuICAgIG91dCArPSAnIGNvbnNvbGUubG9nKCcgKyAoJGNvbW1lbnQpICsgJyk7JztcbiAgfSBlbHNlIGlmICh0eXBlb2YgaXQub3B0cy4kY29tbWVudCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgb3V0ICs9ICcgc2VsZi5fb3B0cy4kY29tbWVudCgnICsgKCRjb21tZW50KSArICcsICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJywgdmFsaWRhdGUucm9vdC5zY2hlbWEpOyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29uc3QoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyc7XG4gIH1cbiAgb3V0ICs9ICd2YXIgJyArICgkdmFsaWQpICsgJyA9IGVxdWFsKCcgKyAoJGRhdGEpICsgJywgc2NoZW1hJyArICgkbHZsKSArICcpOyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnN0JykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBhbGxvd2VkVmFsdWU6IHNjaGVtYScgKyAoJGx2bCkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIGVxdWFsIHRvIGNvbnN0YW50XFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSc7XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfY29udGFpbnMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQsXG4gICAgJG5vbkVtcHR5U2NoZW1hID0gKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkbmV4dFZhbGlkKSArICcgPSBmYWxzZTsgZm9yICh2YXIgJyArICgkaWR4KSArICcgPSAwOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgfSAgJztcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7JztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAwKSB7JztcbiAgfVxuICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2NvbnRhaW5zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczoge30gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGNvbnRhaW4gYSB2YWxpZCBpdGVtXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gJztcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB7fSAnO1xuICB9XG4gIHZhciBfX2VyciA9IG91dDtcbiAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gIH1cbiAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgaWYgKCRub25FbXB0eVNjaGVtYSkge1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gIH1cbiAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2N1c3RvbShpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJHJ1bGUgPSB0aGlzLFxuICAgICRkZWZpbml0aW9uID0gJ2RlZmluaXRpb24nICsgJGx2bCxcbiAgICAkckRlZiA9ICRydWxlLmRlZmluaXRpb24sXG4gICAgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgdmFyICRjb21waWxlLCAkaW5saW5lLCAkbWFjcm8sICRydWxlVmFsaWRhdGUsICR2YWxpZGF0ZUNvZGU7XG4gIGlmICgkaXNEYXRhICYmICRyRGVmLiRkYXRhKSB7XG4gICAgJHZhbGlkYXRlQ29kZSA9ICdrZXl3b3JkVmFsaWRhdGUnICsgJGx2bDtcbiAgICB2YXIgJHZhbGlkYXRlU2NoZW1hID0gJHJEZWYudmFsaWRhdGVTY2hlbWE7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJGRlZmluaXRpb24pICsgJyA9IFJVTEVTLmN1c3RvbVtcXCcnICsgKCRrZXl3b3JkKSArICdcXCddLmRlZmluaXRpb247IHZhciAnICsgKCR2YWxpZGF0ZUNvZGUpICsgJyA9ICcgKyAoJGRlZmluaXRpb24pICsgJy52YWxpZGF0ZTsnO1xuICB9IGVsc2Uge1xuICAgICRydWxlVmFsaWRhdGUgPSBpdC51c2VDdXN0b21SdWxlKCRydWxlLCAkc2NoZW1hLCBpdC5zY2hlbWEsIGl0KTtcbiAgICBpZiAoISRydWxlVmFsaWRhdGUpIHJldHVybjtcbiAgICAkc2NoZW1hVmFsdWUgPSAndmFsaWRhdGUuc2NoZW1hJyArICRzY2hlbWFQYXRoO1xuICAgICR2YWxpZGF0ZUNvZGUgPSAkcnVsZVZhbGlkYXRlLmNvZGU7XG4gICAgJGNvbXBpbGUgPSAkckRlZi5jb21waWxlO1xuICAgICRpbmxpbmUgPSAkckRlZi5pbmxpbmU7XG4gICAgJG1hY3JvID0gJHJEZWYubWFjcm87XG4gIH1cbiAgdmFyICRydWxlRXJycyA9ICR2YWxpZGF0ZUNvZGUgKyAnLmVycm9ycycsXG4gICAgJGkgPSAnaScgKyAkbHZsLFxuICAgICRydWxlRXJyID0gJ3J1bGVFcnInICsgJGx2bCxcbiAgICAkYXN5bmNLZXl3b3JkID0gJHJEZWYuYXN5bmM7XG4gIGlmICgkYXN5bmNLZXl3b3JkICYmICFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBrZXl3b3JkIGluIHN5bmMgc2NoZW1hJyk7XG4gIGlmICghKCRpbmxpbmUgfHwgJG1hY3JvKSkge1xuICAgIG91dCArPSAnJyArICgkcnVsZUVycnMpICsgJyA9IG51bGw7JztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRpc0RhdGEgJiYgJHJEZWYuJGRhdGEpIHtcbiAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgb3V0ICs9ICcgaWYgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgPT09IHVuZGVmaW5lZCkgeyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgfSBlbHNlIHsgJztcbiAgICBpZiAoJHZhbGlkYXRlU2NoZW1hKSB7XG4gICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGVmaW5pdGlvbikgKyAnLnZhbGlkYXRlU2NoZW1hKCcgKyAoJHNjaGVtYVZhbHVlKSArICcpOyBpZiAoJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgIH1cbiAgfVxuICBpZiAoJGlubGluZSkge1xuICAgIGlmICgkckRlZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRydWxlVmFsaWRhdGUudmFsaWRhdGUpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkcnVsZVZhbGlkYXRlLnZhbGlkYXRlKSArICc7ICc7XG4gICAgfVxuICB9IGVsc2UgaWYgKCRtYWNybykge1xuICAgIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICAgIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAgICRpdC5sZXZlbCsrO1xuICAgIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgICAkaXQuc2NoZW1hID0gJHJ1bGVWYWxpZGF0ZS52YWxpZGF0ZTtcbiAgICAkaXQuc2NoZW1hUGF0aCA9ICcnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCkucmVwbGFjZSgvdmFsaWRhdGVcXC5zY2hlbWEvZywgJHZhbGlkYXRlQ29kZSk7XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyAnICsgKCRjb2RlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgb3V0ICs9ICcgICcgKyAoJHZhbGlkYXRlQ29kZSkgKyAnLmNhbGwoICc7XG4gICAgaWYgKGl0Lm9wdHMucGFzc0NvbnRleHQpIHtcbiAgICAgIG91dCArPSAndGhpcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnc2VsZic7XG4gICAgfVxuICAgIGlmICgkY29tcGlsZSB8fCAkckRlZi5zY2hlbWEgPT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAsICcgKyAoJHNjaGVtYVZhbHVlKSArICcgLCAnICsgKCRkYXRhKSArICcgLCB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAsIChkYXRhUGF0aCB8fCBcXCdcXCcpJztcbiAgICBpZiAoaXQuZXJyb3JQYXRoICE9ICdcIlwiJykge1xuICAgICAgb3V0ICs9ICcgKyAnICsgKGl0LmVycm9yUGF0aCk7XG4gICAgfVxuICAgIHZhciAkcGFyZW50RGF0YSA9ICRkYXRhTHZsID8gJ2RhdGEnICsgKCgkZGF0YUx2bCAtIDEpIHx8ICcnKSA6ICdwYXJlbnREYXRhJyxcbiAgICAgICRwYXJlbnREYXRhUHJvcGVydHkgPSAkZGF0YUx2bCA/IGl0LmRhdGFQYXRoQXJyWyRkYXRhTHZsXSA6ICdwYXJlbnREYXRhUHJvcGVydHknO1xuICAgIG91dCArPSAnICwgJyArICgkcGFyZW50RGF0YSkgKyAnICwgJyArICgkcGFyZW50RGF0YVByb3BlcnR5KSArICcgLCByb290RGF0YSApICAnO1xuICAgIHZhciBkZWZfY2FsbFJ1bGVWYWxpZGF0ZSA9IG91dDtcbiAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgIGlmICgkckRlZi5lcnJvcnMgPT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJztcbiAgICAgIGlmICgkYXN5bmNLZXl3b3JkKSB7XG4gICAgICAgIG91dCArPSAnYXdhaXQgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnJyArIChkZWZfY2FsbFJ1bGVWYWxpZGF0ZSkgKyAnOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGFzeW5jS2V5d29yZCkge1xuICAgICAgICAkcnVsZUVycnMgPSAnY3VzdG9tRXJyb3JzJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRydWxlRXJycykgKyAnID0gbnVsbDsgdHJ5IHsgJyArICgkdmFsaWQpICsgJyA9IGF3YWl0ICcgKyAoZGVmX2NhbGxSdWxlVmFsaWRhdGUpICsgJzsgfSBjYXRjaCAoZSkgeyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGlmIChlIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSAnICsgKCRydWxlRXJycykgKyAnID0gZS5lcnJvcnM7IGVsc2UgdGhyb3cgZTsgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycnMpICsgJyA9IG51bGw7ICcgKyAoJHZhbGlkKSArICcgPSAnICsgKGRlZl9jYWxsUnVsZVZhbGlkYXRlKSArICc7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkckRlZi5tb2RpZnlpbmcpIHtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFyZW50RGF0YSkgKyAnKSAnICsgKCRkYXRhKSArICcgPSAnICsgKCRwYXJlbnREYXRhKSArICdbJyArICgkcGFyZW50RGF0YVByb3BlcnR5KSArICddOyc7XG4gIH1cbiAgb3V0ICs9ICcnICsgKCRjbG9zaW5nQnJhY2VzKTtcbiAgaWYgKCRyRGVmLnZhbGlkKSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIGlmICggJztcbiAgICBpZiAoJHJEZWYudmFsaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3V0ICs9ICcgISc7XG4gICAgICBpZiAoJG1hY3JvKSB7XG4gICAgICAgIG91dCArPSAnJyArICgkbmV4dFZhbGlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkdmFsaWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCEkckRlZi52YWxpZCkgKyAnICc7XG4gICAgfVxuICAgIG91dCArPSAnKSB7ICc7XG4gICAgJGVycm9yS2V5d29yZCA9ICRydWxlLmtleXdvcmQ7XG4gICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgIG91dCA9ICcnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2N1c3RvbScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsga2V5d29yZDogXFwnJyArICgkcnVsZS5rZXl3b3JkKSArICdcXCcgfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIHBhc3MgXCInICsgKCRydWxlLmtleXdvcmQpICsgJ1wiIGtleXdvcmQgdmFsaWRhdGlvblxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIHZhciBkZWZfY3VzdG9tRXJyb3IgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoJGlubGluZSkge1xuICAgICAgaWYgKCRyRGVmLmVycm9ycykge1xuICAgICAgICBpZiAoJHJEZWYuZXJyb3JzICE9ICdmdWxsJykge1xuICAgICAgICAgIG91dCArPSAnICBmb3IgKHZhciAnICsgKCRpKSArICc9JyArICgkZXJycykgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2YXIgJyArICgkcnVsZUVycikgKyAnID0gdkVycm9yc1snICsgKCRpKSArICddOyBpZiAoJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID09PSB1bmRlZmluZWQpICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJzsgaWYgKCcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID09PSB1bmRlZmluZWQpIHsgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPSBcIicgKyAoJGVyclNjaGVtYVBhdGgpICsgJ1wiOyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArICgkcnVsZUVycikgKyAnLnNjaGVtYSA9ICcgKyAoJHNjaGVtYVZhbHVlKSArICc7ICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhID0gJyArICgkZGF0YSkgKyAnOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICgkckRlZi5lcnJvcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7ICcgKyAoZGVmX2N1c3RvbUVycm9yKSArICcgfSBlbHNlIHsgIGZvciAodmFyICcgKyAoJGkpICsgJz0nICsgKCRlcnJzKSArICc7ICcgKyAoJGkpICsgJzxlcnJvcnM7ICcgKyAoJGkpICsgJysrKSB7IHZhciAnICsgKCRydWxlRXJyKSArICcgPSB2RXJyb3JzWycgKyAoJGkpICsgJ107IGlmICgnICsgKCRydWxlRXJyKSArICcuZGF0YVBhdGggPT09IHVuZGVmaW5lZCkgJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID0gKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnOyBpZiAoJyArICgkcnVsZUVycikgKyAnLnNjaGVtYVBhdGggPT09IHVuZGVmaW5lZCkgeyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hUGF0aCA9IFwiJyArICgkZXJyU2NoZW1hUGF0aCkgKyAnXCI7IH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hID0gJyArICgkc2NoZW1hVmFsdWUpICsgJzsgJyArICgkcnVsZUVycikgKyAnLmRhdGEgPSAnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gfSAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgkbWFjcm8pIHtcbiAgICAgIG91dCArPSAnICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICdjdXN0b20nKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGtleXdvcmQ6IFxcJycgKyAoJHJ1bGUua2V5d29yZCkgKyAnXFwnIH0gJztcbiAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgcGFzcyBcIicgKyAoJHJ1bGUua2V5d29yZCkgKyAnXCIga2V5d29yZCB2YWxpZGF0aW9uXFwnICc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcih2RXJyb3JzKTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCRyRGVmLmVycm9ycyA9PT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgJyArIChkZWZfY3VzdG9tRXJyb3IpICsgJyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKEFycmF5LmlzQXJyYXkoJyArICgkcnVsZUVycnMpICsgJykpIHsgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSAnICsgKCRydWxlRXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSB2RXJyb3JzLmNvbmNhdCgnICsgKCRydWxlRXJycykgKyAnKTsgZXJyb3JzID0gdkVycm9ycy5sZW5ndGg7ICBmb3IgKHZhciAnICsgKCRpKSArICc9JyArICgkZXJycykgKyAnOyAnICsgKCRpKSArICc8ZXJyb3JzOyAnICsgKCRpKSArICcrKykgeyB2YXIgJyArICgkcnVsZUVycikgKyAnID0gdkVycm9yc1snICsgKCRpKSArICddOyBpZiAoJyArICgkcnVsZUVycikgKyAnLmRhdGFQYXRoID09PSB1bmRlZmluZWQpICcgKyAoJHJ1bGVFcnIpICsgJy5kYXRhUGF0aCA9IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJzsgICcgKyAoJHJ1bGVFcnIpICsgJy5zY2hlbWFQYXRoID0gXCInICsgKCRlcnJTY2hlbWFQYXRoKSArICdcIjsgICc7XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKCRydWxlRXJyKSArICcuc2NoZW1hID0gJyArICgkc2NoZW1hVmFsdWUpICsgJzsgJyArICgkcnVsZUVycikgKyAnLmRhdGEgPSAnICsgKCRkYXRhKSArICc7ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSB9IGVsc2UgeyAnICsgKGRlZl9jdXN0b21FcnJvcikgKyAnIH0gJztcbiAgICAgIH1cbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfZGVwZW5kZW5jaWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJHNjaGVtYURlcHMgPSB7fSxcbiAgICAkcHJvcGVydHlEZXBzID0ge30sXG4gICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXM7XG4gIGZvciAoJHByb3BlcnR5IGluICRzY2hlbWEpIHtcbiAgICBpZiAoJHByb3BlcnR5ID09ICdfX3Byb3RvX18nKSBjb250aW51ZTtcbiAgICB2YXIgJHNjaCA9ICRzY2hlbWFbJHByb3BlcnR5XTtcbiAgICB2YXIgJGRlcHMgPSBBcnJheS5pc0FycmF5KCRzY2gpID8gJHByb3BlcnR5RGVwcyA6ICRzY2hlbWFEZXBzO1xuICAgICRkZXBzWyRwcm9wZXJ0eV0gPSAkc2NoO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczsnO1xuICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGg7XG4gIG91dCArPSAndmFyIG1pc3NpbmcnICsgKCRsdmwpICsgJzsnO1xuICBmb3IgKHZhciAkcHJvcGVydHkgaW4gJHByb3BlcnR5RGVwcykge1xuICAgICRkZXBzID0gJHByb3BlcnR5RGVwc1skcHJvcGVydHldO1xuICAgIGlmICgkZGVwcy5sZW5ndGgpIHtcbiAgICAgIG91dCArPSAnIGlmICggJyArICgkZGF0YSkgKyAoaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHkpKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgIG91dCArPSAnICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnXFwnKSAnO1xuICAgICAgfVxuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgJiYgKCAnO1xuICAgICAgICB2YXIgYXJyMSA9ICRkZXBzO1xuICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksICRpID0gLTEsXG4gICAgICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkaSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkdXNlRGF0YSA9ICRkYXRhICsgJHByb3A7XG4gICAgICAgICAgICBvdXQgKz0gJyAoICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpICYmIChtaXNzaW5nJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoaXQub3B0cy5qc29uUG9pbnRlcnMgPyAkcHJvcGVydHlLZXkgOiAkcHJvcCkpICsgJykgKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJykpIHsgICc7XG4gICAgICAgIHZhciAkcHJvcGVydHlQYXRoID0gJ21pc3NpbmcnICsgJGx2bCxcbiAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gJ1xcJyArICcgKyAkcHJvcGVydHlQYXRoICsgJyArIFxcJyc7XG4gICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC5vcHRzLmpzb25Qb2ludGVycyA/IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIHRydWUpIDogJGN1cnJlbnRFcnJvclBhdGggKyAnICsgJyArICRwcm9wZXJ0eVBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdkZXBlbmRlbmNpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHByb3BlcnR5OiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eSkpICsgJ1xcJywgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJywgZGVwc0NvdW50OiAnICsgKCRkZXBzLmxlbmd0aCkgKyAnLCBkZXBzOiBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmxlbmd0aCA9PSAxID8gJGRlcHNbMF0gOiAkZGVwcy5qb2luKFwiLCBcIikpKSArICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgaGF2ZSAnO1xuICAgICAgICAgICAgaWYgKCRkZXBzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgIG91dCArPSAncHJvcGVydHkgJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwc1swXSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0aWVzICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJGRlcHMuam9pbihcIiwgXCIpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB3aGVuIHByb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnIGlzIHByZXNlbnRcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgKSB7ICc7XG4gICAgICAgIHZhciBhcnIyID0gJGRlcHM7XG4gICAgICAgIGlmIChhcnIyKSB7XG4gICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTIgPSAtMSxcbiAgICAgICAgICAgIGwyID0gYXJyMi5sZW5ndGggLSAxO1xuICAgICAgICAgIHdoaWxlIChpMiA8IGwyKSB7XG4gICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIyW2kyICs9IDFdO1xuICAgICAgICAgICAgdmFyICRwcm9wID0gaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpLFxuICAgICAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHlLZXkpKSArICdcXCcpICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJykgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnZGVwZW5kZW5jaWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwcm9wZXJ0eTogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcsIG1pc3NpbmdQcm9wZXJ0eTogXFwnJyArICgkbWlzc2luZ1Byb3BlcnR5KSArICdcXCcsIGRlcHNDb3VudDogJyArICgkZGVwcy5sZW5ndGgpICsgJywgZGVwczogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkZGVwcy5sZW5ndGggPT0gMSA/ICRkZXBzWzBdIDogJGRlcHMuam9pbihcIiwgXCIpKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgaGF2ZSAnO1xuICAgICAgICAgICAgICAgIGlmICgkZGVwcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdwcm9wZXJ0eSAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzWzBdKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAncHJvcGVydGllcyAnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRkZXBzLmpvaW4oXCIsIFwiKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB3aGVuIHByb3BlcnR5ICcgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5KSkgKyAnIGlzIHByZXNlbnRcXCcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7fSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAgICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgdmFyICRjdXJyZW50QmFzZUlkID0gJGl0LmJhc2VJZDtcbiAgZm9yICh2YXIgJHByb3BlcnR5IGluICRzY2hlbWFEZXBzKSB7XG4gICAgdmFyICRzY2ggPSAkc2NoZW1hRGVwc1skcHJvcGVydHldO1xuICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCAnICsgKCRkYXRhKSArIChpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eSkpICsgJyAhPT0gdW5kZWZpbmVkICc7XG4gICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgb3V0ICs9ICcgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3RlcygkcHJvcGVydHkpKSArICdcXCcpICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJykgeyAnO1xuICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHkpO1xuICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aCArICcvJyArIGl0LnV0aWwuZXNjYXBlRnJhZ21lbnQoJHByb3BlcnR5KTtcbiAgICAgIG91dCArPSAnICAnICsgKGl0LnZhbGlkYXRlKCRpdCkpICsgJyAnO1xuICAgICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICAgb3V0ICs9ICcgfSAgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgICAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2VudW0oaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgdmFyICRpID0gJ2knICsgJGx2bCxcbiAgICAkdlNjaGVtYSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJHZTY2hlbWEpICsgJyA9IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJzsnO1xuICB9XG4gIG91dCArPSAndmFyICcgKyAoJHZhbGlkKSArICc7JztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyBpZiAoc2NoZW1hJyArICgkbHZsKSArICcgPT09IHVuZGVmaW5lZCkgJyArICgkdmFsaWQpICsgJyA9IHRydWU7IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHNjaGVtYScgKyAoJGx2bCkgKyAnKSkgJyArICgkdmFsaWQpICsgJyA9IGZhbHNlOyBlbHNlIHsnO1xuICB9XG4gIG91dCArPSAnJyArICgkdmFsaWQpICsgJyA9IGZhbHNlO2ZvciAodmFyICcgKyAoJGkpICsgJz0wOyAnICsgKCRpKSArICc8JyArICgkdlNjaGVtYSkgKyAnLmxlbmd0aDsgJyArICgkaSkgKyAnKyspIGlmIChlcXVhbCgnICsgKCRkYXRhKSArICcsICcgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddKSkgeyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgYnJlYWs7IH0nO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnICB9ICAnO1xuICB9XG4gIG91dCArPSAnIGlmICghJyArICgkdmFsaWQpICsgJykgeyAgICc7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnZW51bScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgYWxsb3dlZFZhbHVlczogc2NoZW1hJyArICgkbHZsKSArICcgfSAnO1xuICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgZXF1YWwgdG8gb25lIG9mIHRoZSBhbGxvd2VkIHZhbHVlc1xcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0nO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX2Zvcm1hdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICBpZiAoaXQub3B0cy5mb3JtYXQgPT09IGZhbHNlKSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdW5rbm93bkZvcm1hdHMgPSBpdC5vcHRzLnVua25vd25Gb3JtYXRzLFxuICAgICRhbGxvd1Vua25vd24gPSBBcnJheS5pc0FycmF5KCR1bmtub3duRm9ybWF0cyk7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgdmFyICRmb3JtYXQgPSAnZm9ybWF0JyArICRsdmwsXG4gICAgICAkaXNPYmplY3QgPSAnaXNPYmplY3QnICsgJGx2bCxcbiAgICAgICRmb3JtYXRUeXBlID0gJ2Zvcm1hdFR5cGUnICsgJGx2bDtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZm9ybWF0KSArICcgPSBmb3JtYXRzWycgKyAoJHNjaGVtYVZhbHVlKSArICddOyB2YXIgJyArICgkaXNPYmplY3QpICsgJyA9IHR5cGVvZiAnICsgKCRmb3JtYXQpICsgJyA9PSBcXCdvYmplY3RcXCcgJiYgISgnICsgKCRmb3JtYXQpICsgJyBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJyArICgkZm9ybWF0KSArICcudmFsaWRhdGU7IHZhciAnICsgKCRmb3JtYXRUeXBlKSArICcgPSAnICsgKCRpc09iamVjdCkgKyAnICYmICcgKyAoJGZvcm1hdCkgKyAnLnR5cGUgfHwgXFwnc3RyaW5nXFwnOyBpZiAoJyArICgkaXNPYmplY3QpICsgJykgeyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdmFyIGFzeW5jJyArICgkbHZsKSArICcgPSAnICsgKCRmb3JtYXQpICsgJy5hc3luYzsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcgPSAnICsgKCRmb3JtYXQpICsgJy52YWxpZGF0ZTsgfSBpZiAoICAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgKCc7XG4gICAgaWYgKCR1bmtub3duRm9ybWF0cyAhPSAnaWdub3JlJykge1xuICAgICAgb3V0ICs9ICcgKCcgKyAoJHNjaGVtYVZhbHVlKSArICcgJiYgIScgKyAoJGZvcm1hdCkgKyAnICc7XG4gICAgICBpZiAoJGFsbG93VW5rbm93bikge1xuICAgICAgICBvdXQgKz0gJyAmJiBzZWxmLl9vcHRzLnVua25vd25Gb3JtYXRzLmluZGV4T2YoJyArICgkc2NoZW1hVmFsdWUpICsgJykgPT0gLTEgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnKSB8fCAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyAoJyArICgkZm9ybWF0KSArICcgJiYgJyArICgkZm9ybWF0VHlwZSkgKyAnID09IFxcJycgKyAoJHJ1bGVUeXBlKSArICdcXCcgJiYgISh0eXBlb2YgJyArICgkZm9ybWF0KSArICcgPT0gXFwnZnVuY3Rpb25cXCcgPyAnO1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgKGFzeW5jJyArICgkbHZsKSArICcgPyBhd2FpdCAnICsgKCRmb3JtYXQpICsgJygnICsgKCRkYXRhKSArICcpIDogJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSkgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgJyArICgkZm9ybWF0KSArICcoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyA6ICcgKyAoJGZvcm1hdCkgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSkpKSkgeyc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRmb3JtYXQgPSBpdC5mb3JtYXRzWyRzY2hlbWFdO1xuICAgIGlmICghJGZvcm1hdCkge1xuICAgICAgaWYgKCR1bmtub3duRm9ybWF0cyA9PSAnaWdub3JlJykge1xuICAgICAgICBpdC5sb2dnZXIud2FybigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpZ25vcmVkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICBvdXQgKz0gJyBpZiAodHJ1ZSkgeyAnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9IGVsc2UgaWYgKCRhbGxvd1Vua25vd24gJiYgJHVua25vd25Gb3JtYXRzLmluZGV4T2YoJHNjaGVtYSkgPj0gMCkge1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBmb3JtYXQgXCInICsgJHNjaGVtYSArICdcIiBpcyB1c2VkIGluIHNjaGVtYSBhdCBwYXRoIFwiJyArIGl0LmVyclNjaGVtYVBhdGggKyAnXCInKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyICRpc09iamVjdCA9IHR5cGVvZiAkZm9ybWF0ID09ICdvYmplY3QnICYmICEoJGZvcm1hdCBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgJGZvcm1hdC52YWxpZGF0ZTtcbiAgICB2YXIgJGZvcm1hdFR5cGUgPSAkaXNPYmplY3QgJiYgJGZvcm1hdC50eXBlIHx8ICdzdHJpbmcnO1xuICAgIGlmICgkaXNPYmplY3QpIHtcbiAgICAgIHZhciAkYXN5bmMgPSAkZm9ybWF0LmFzeW5jID09PSB0cnVlO1xuICAgICAgJGZvcm1hdCA9ICRmb3JtYXQudmFsaWRhdGU7XG4gICAgfVxuICAgIGlmICgkZm9ybWF0VHlwZSAhPSAkcnVsZVR5cGUpIHtcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpZiAoIWl0LmFzeW5jKSB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jIGZvcm1hdCBpbiBzeW5jIHNjaGVtYScpO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpICsgJy52YWxpZGF0ZSc7XG4gICAgICBvdXQgKz0gJyBpZiAoIShhd2FpdCAnICsgKCRmb3JtYXRSZWYpICsgJygnICsgKCRkYXRhKSArICcpKSkgeyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoISAnO1xuICAgICAgdmFyICRmb3JtYXRSZWYgPSAnZm9ybWF0cycgKyBpdC51dGlsLmdldFByb3BlcnR5KCRzY2hlbWEpO1xuICAgICAgaWYgKCRpc09iamVjdCkgJGZvcm1hdFJlZiArPSAnLnZhbGlkYXRlJztcbiAgICAgIGlmICh0eXBlb2YgJGZvcm1hdCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnKCcgKyAoJGRhdGEpICsgJykgJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGZvcm1hdFJlZikgKyAnLnRlc3QoJyArICgkZGF0YSkgKyAnKSAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICB9XG4gIH1cbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdmb3JtYXQnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGZvcm1hdDogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBmb3JtYXQgXCInO1xuICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgb3V0ICs9ICdcXCcgKyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICsgXFwnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJ1wiXFwnICc7XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnIH0gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9pZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICRpdC5sZXZlbCsrO1xuICB2YXIgJG5leHRWYWxpZCA9ICd2YWxpZCcgKyAkaXQubGV2ZWw7XG4gIHZhciAkdGhlblNjaCA9IGl0LnNjaGVtYVsndGhlbiddLFxuICAgICRlbHNlU2NoID0gaXQuc2NoZW1hWydlbHNlJ10sXG4gICAgJHRoZW5QcmVzZW50ID0gJHRoZW5TY2ggIT09IHVuZGVmaW5lZCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHRoZW5TY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHRoZW5TY2gpLmxlbmd0aCA+IDApIHx8ICR0aGVuU2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHRoZW5TY2gsIGl0LlJVTEVTLmFsbCkpLFxuICAgICRlbHNlUHJlc2VudCA9ICRlbHNlU2NoICE9PSB1bmRlZmluZWQgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRlbHNlU2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRlbHNlU2NoKS5sZW5ndGggPiAwKSB8fCAkZWxzZVNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRlbHNlU2NoLCBpdC5SVUxFUy5hbGwpKSxcbiAgICAkY3VycmVudEJhc2VJZCA9ICRpdC5iYXNlSWQ7XG4gIGlmICgkdGhlblByZXNlbnQgfHwgJGVsc2VQcmVzZW50KSB7XG4gICAgdmFyICRpZkNsYXVzZTtcbiAgICAkaXQuY3JlYXRlRXJyb3JzID0gZmFsc2U7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7IHZhciAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgICc7XG4gICAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9IHRydWU7XG4gICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSB0cnVlO1xuICAgIG91dCArPSAnICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICAnO1xuICAgIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gICAgaWYgKCR0aGVuUHJlc2VudCkge1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICAnO1xuICAgICAgJGl0LnNjaGVtYSA9IGl0LnNjaGVtYVsndGhlbiddO1xuICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy50aGVuJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdGhlbic7XG4gICAgICBvdXQgKz0gJyAgJyArIChpdC52YWxpZGF0ZSgkaXQpKSArICcgJztcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRuZXh0VmFsaWQpICsgJzsgJztcbiAgICAgIGlmICgkdGhlblByZXNlbnQgJiYgJGVsc2VQcmVzZW50KSB7XG4gICAgICAgICRpZkNsYXVzZSA9ICdpZkNsYXVzZScgKyAkbHZsO1xuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkaWZDbGF1c2UpICsgJyA9IFxcJ3RoZW5cXCc7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkaWZDbGF1c2UgPSAnXFwndGhlblxcJyc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGVsc2VQcmVzZW50KSB7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkZWxzZVByZXNlbnQpIHtcbiAgICAgICRpdC5zY2hlbWEgPSBpdC5zY2hlbWFbJ2Vsc2UnXTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuZWxzZSc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2Vsc2UnO1xuICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkbmV4dFZhbGlkKSArICc7ICc7XG4gICAgICBpZiAoJHRoZW5QcmVzZW50ICYmICRlbHNlUHJlc2VudCkge1xuICAgICAgICAkaWZDbGF1c2UgPSAnaWZDbGF1c2UnICsgJGx2bDtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJGlmQ2xhdXNlKSArICcgPSBcXCdlbHNlXFwnOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGlmQ2xhdXNlID0gJ1xcJ2Vsc2VcXCcnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ2lmJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBmYWlsaW5nS2V5d29yZDogJyArICgkaWZDbGF1c2UpICsgJyB9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgbWF0Y2ggXCJcXCcgKyAnICsgKCRpZkNsYXVzZSkgKyAnICsgXFwnXCIgc2NoZW1hXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgfVxuICAgIG91dCArPSAnIH0gICAnO1xuICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vYWxsIHJlcXVpcmVzIG11c3QgYmUgZXhwbGljaXQgYmVjYXVzZSBicm93c2VyaWZ5IHdvbid0IHdvcmsgd2l0aCBkeW5hbWljIHJlcXVpcmVzXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgJyRyZWYnOiByZXF1aXJlKCcuL3JlZicpLFxuICBhbGxPZjogcmVxdWlyZSgnLi9hbGxPZicpLFxuICBhbnlPZjogcmVxdWlyZSgnLi9hbnlPZicpLFxuICAnJGNvbW1lbnQnOiByZXF1aXJlKCcuL2NvbW1lbnQnKSxcbiAgY29uc3Q6IHJlcXVpcmUoJy4vY29uc3QnKSxcbiAgY29udGFpbnM6IHJlcXVpcmUoJy4vY29udGFpbnMnKSxcbiAgZGVwZW5kZW5jaWVzOiByZXF1aXJlKCcuL2RlcGVuZGVuY2llcycpLFxuICAnZW51bSc6IHJlcXVpcmUoJy4vZW51bScpLFxuICBmb3JtYXQ6IHJlcXVpcmUoJy4vZm9ybWF0JyksXG4gICdpZic6IHJlcXVpcmUoJy4vaWYnKSxcbiAgaXRlbXM6IHJlcXVpcmUoJy4vaXRlbXMnKSxcbiAgbWF4aW11bTogcmVxdWlyZSgnLi9fbGltaXQnKSxcbiAgbWluaW11bTogcmVxdWlyZSgnLi9fbGltaXQnKSxcbiAgbWF4SXRlbXM6IHJlcXVpcmUoJy4vX2xpbWl0SXRlbXMnKSxcbiAgbWluSXRlbXM6IHJlcXVpcmUoJy4vX2xpbWl0SXRlbXMnKSxcbiAgbWF4TGVuZ3RoOiByZXF1aXJlKCcuL19saW1pdExlbmd0aCcpLFxuICBtaW5MZW5ndGg6IHJlcXVpcmUoJy4vX2xpbWl0TGVuZ3RoJyksXG4gIG1heFByb3BlcnRpZXM6IHJlcXVpcmUoJy4vX2xpbWl0UHJvcGVydGllcycpLFxuICBtaW5Qcm9wZXJ0aWVzOiByZXF1aXJlKCcuL19saW1pdFByb3BlcnRpZXMnKSxcbiAgbXVsdGlwbGVPZjogcmVxdWlyZSgnLi9tdWx0aXBsZU9mJyksXG4gIG5vdDogcmVxdWlyZSgnLi9ub3QnKSxcbiAgb25lT2Y6IHJlcXVpcmUoJy4vb25lT2YnKSxcbiAgcGF0dGVybjogcmVxdWlyZSgnLi9wYXR0ZXJuJyksXG4gIHByb3BlcnRpZXM6IHJlcXVpcmUoJy4vcHJvcGVydGllcycpLFxuICBwcm9wZXJ0eU5hbWVzOiByZXF1aXJlKCcuL3Byb3BlcnR5TmFtZXMnKSxcbiAgcmVxdWlyZWQ6IHJlcXVpcmUoJy4vcmVxdWlyZWQnKSxcbiAgdW5pcXVlSXRlbXM6IHJlcXVpcmUoJy4vdW5pcXVlSXRlbXMnKSxcbiAgdmFsaWRhdGU6IHJlcXVpcmUoJy4vdmFsaWRhdGUnKVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfaXRlbXMoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcgJztcbiAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgdmFyICRkYXRhTHZsID0gaXQuZGF0YUxldmVsO1xuICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYVska2V5d29yZF07XG4gIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICB2YXIgJGNsb3NpbmdCcmFjZXMgPSAnJztcbiAgJGl0LmxldmVsKys7XG4gIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgdmFyICRpZHggPSAnaScgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9yczt2YXIgJyArICgkdmFsaWQpICsgJzsnO1xuICBpZiAoQXJyYXkuaXNBcnJheSgkc2NoZW1hKSkge1xuICAgIHZhciAkYWRkaXRpb25hbEl0ZW1zID0gaXQuc2NoZW1hLmFkZGl0aW9uYWxJdGVtcztcbiAgICBpZiAoJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHZhbGlkKSArICcgPSAnICsgKCRkYXRhKSArICcubGVuZ3RoIDw9ICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJzsgJztcbiAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICBpZiAoIScgKyAoJHZhbGlkKSArICcpIHsgICAnO1xuICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbEl0ZW1zJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBsaW1pdDogJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnIH0gJztcbiAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGhhdmUgbW9yZSB0aGFuICcgKyAoJHNjaGVtYS5sZW5ndGgpICsgJyBpdGVtc1xcJyAnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogZmFsc2UgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgIH1cbiAgICAgIHZhciBfX2VyciA9IG91dDtcbiAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgJGVyclNjaGVtYVBhdGggPSAkY3VyckVyclNjaGVtYVBhdGg7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gICAgaWYgKGFycjEpIHtcbiAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgIHdoaWxlICgkaSA8IGwxKSB7XG4gICAgICAgICRzY2ggPSBhcnIxWyRpICs9IDFdO1xuICAgICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICAgb3V0ICs9ICcgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyBpZiAoJyArICgkZGF0YSkgKyAnLmxlbmd0aCA+ICcgKyAoJGkpICsgJykgeyAnO1xuICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGggKyAnWycgKyAkaSArICddJztcbiAgICAgICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoICsgJy8nICsgJGk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAkaSwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIH0gICc7XG4gICAgICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRhZGRpdGlvbmFsSXRlbXMgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJGFkZGl0aW9uYWxJdGVtcykubGVuZ3RoID4gMCkgfHwgJGFkZGl0aW9uYWxJdGVtcyA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRhZGRpdGlvbmFsSXRlbXMsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAkaXQuc2NoZW1hID0gJGFkZGl0aW9uYWxJdGVtcztcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcuYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvYWRkaXRpb25hbEl0ZW1zJztcbiAgICAgIG91dCArPSAnICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgaWYgKCcgKyAoJGRhdGEpICsgJy5sZW5ndGggPiAnICsgKCRzY2hlbWEubGVuZ3RoKSArICcpIHsgIGZvciAodmFyICcgKyAoJGlkeCkgKyAnID0gJyArICgkc2NoZW1hLmxlbmd0aCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAgICRpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGhFeHByKGl0LmVycm9yUGF0aCwgJGlkeCwgaXQub3B0cy5qc29uUG9pbnRlcnMsIHRydWUpO1xuICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGlkeCArICddJztcbiAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICAgIG91dCArPSAnICcgKyAoaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSkpICsgJyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIH1cbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSB9ICAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICRjbG9zaW5nQnJhY2VzICs9ICd9JztcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnICBmb3IgKHZhciAnICsgKCRpZHgpICsgJyA9ICcgKyAoMCkgKyAnOyAnICsgKCRpZHgpICsgJyA8ICcgKyAoJGRhdGEpICsgJy5sZW5ndGg7ICcgKyAoJGlkeCkgKyAnKyspIHsgJztcbiAgICAkaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoRXhwcihpdC5lcnJvclBhdGgsICRpZHgsIGl0Lm9wdHMuanNvblBvaW50ZXJzLCB0cnVlKTtcbiAgICB2YXIgJHBhc3NEYXRhID0gJGRhdGEgKyAnWycgKyAkaWR4ICsgJ10nO1xuICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSAkaWR4O1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIGJyZWFrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9JztcbiAgfVxuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnICcgKyAoJGNsb3NpbmdCcmFjZXMpICsgJyBpZiAoJyArICgkZXJycykgKyAnID09IGVycm9ycykgeyc7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfbXVsdGlwbGVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGlzRGF0YSA9IGl0Lm9wdHMuJGRhdGEgJiYgJHNjaGVtYSAmJiAkc2NoZW1hLiRkYXRhLFxuICAgICRzY2hlbWFWYWx1ZTtcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyB2YXIgc2NoZW1hJyArICgkbHZsKSArICcgPSAnICsgKGl0LnV0aWwuZ2V0RGF0YSgkc2NoZW1hLiRkYXRhLCAkZGF0YUx2bCwgaXQuZGF0YVBhdGhBcnIpKSArICc7ICc7XG4gICAgJHNjaGVtYVZhbHVlID0gJ3NjaGVtYScgKyAkbHZsO1xuICB9IGVsc2Uge1xuICAgICRzY2hlbWFWYWx1ZSA9ICRzY2hlbWE7XG4gIH1cbiAgaWYgKCEoJGlzRGF0YSB8fCB0eXBlb2YgJHNjaGVtYSA9PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmQgKyAnIG11c3QgYmUgbnVtYmVyJyk7XG4gIH1cbiAgb3V0ICs9ICd2YXIgZGl2aXNpb24nICsgKCRsdmwpICsgJztpZiAoJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9PSB1bmRlZmluZWQgJiYgKCB0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdudW1iZXJcXCcgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAoZGl2aXNpb24nICsgKCRsdmwpICsgJyA9ICcgKyAoJGRhdGEpICsgJyAvICcgKyAoJHNjaGVtYVZhbHVlKSArICcsICc7XG4gIGlmIChpdC5vcHRzLm11bHRpcGxlT2ZQcmVjaXNpb24pIHtcbiAgICBvdXQgKz0gJyBNYXRoLmFicyhNYXRoLnJvdW5kKGRpdmlzaW9uJyArICgkbHZsKSArICcpIC0gZGl2aXNpb24nICsgKCRsdmwpICsgJykgPiAxZS0nICsgKGl0Lm9wdHMubXVsdGlwbGVPZlByZWNpc2lvbikgKyAnICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgZGl2aXNpb24nICsgKCRsdmwpICsgJyAhPT0gcGFyc2VJbnQoZGl2aXNpb24nICsgKCRsdmwpICsgJykgJztcbiAgfVxuICBvdXQgKz0gJyApICc7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgICkgICc7XG4gIH1cbiAgb3V0ICs9ICcgKSB7ICAgJztcbiAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdtdWx0aXBsZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtdWx0aXBsZU9mOiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnIH0gJztcbiAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlIG11bHRpcGxlIG9mICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ1xcJyArICcgKyAoJHNjaGVtYVZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpICsgJ1xcJyc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgIG91dCArPSAnICwgc2NoZW1hOiAgJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAndmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyAgICAgICAgICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcge30gJztcbiAgfVxuICB2YXIgX19lcnIgPSBvdXQ7XG4gIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICB9XG4gIG91dCArPSAnfSAnO1xuICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX25vdChpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJGVycnMgPSAnZXJyc19fJyArICRsdmw7XG4gIHZhciAkaXQgPSBpdC51dGlsLmNvcHkoaXQpO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2hlbWEgPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaGVtYSkubGVuZ3RoID4gMCkgfHwgJHNjaGVtYSA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2hlbWEsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgJGl0LnNjaGVtYSA9ICRzY2hlbWE7XG4gICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aDtcbiAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRlcnJTY2hlbWFQYXRoO1xuICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICRpdC5jcmVhdGVFcnJvcnMgPSBmYWxzZTtcbiAgICB2YXIgJGFsbEVycm9yc09wdGlvbjtcbiAgICBpZiAoJGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICAkYWxsRXJyb3JzT3B0aW9uID0gJGl0Lm9wdHMuYWxsRXJyb3JzO1xuICAgICAgJGl0Lm9wdHMuYWxsRXJyb3JzID0gZmFsc2U7XG4gICAgfVxuICAgIG91dCArPSAnICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgJGl0LmNyZWF0ZUVycm9ycyA9IHRydWU7XG4gICAgaWYgKCRhbGxFcnJvcnNPcHRpb24pICRpdC5vcHRzLmFsbEVycm9ycyA9ICRhbGxFcnJvcnNPcHRpb247XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgICAnO1xuICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdub3QnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7fSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBiZSB2YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgb3V0ID0gJCRvdXRTdGFjay5wb3AoKTtcbiAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBbJyArIChfX2VycikgKyAnXTsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YXIgZXJyID0gJyArIChfX2VycikgKyAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gZWxzZSB7ICBlcnJvcnMgPSAnICsgKCRlcnJzKSArICc7IGlmICh2RXJyb3JzICE9PSBudWxsKSB7IGlmICgnICsgKCRlcnJzKSArICcpIHZFcnJvcnMubGVuZ3RoID0gJyArICgkZXJycykgKyAnOyBlbHNlIHZFcnJvcnMgPSBudWxsOyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMuYWxsRXJyb3JzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnICB2YXIgZXJyID0gICAnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ25vdCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgTk9UIGJlIHZhbGlkXFwnICc7XG4gICAgICB9XG4gICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgfVxuICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9vbmVPZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGN1cnJlbnRCYXNlSWQgPSAkaXQuYmFzZUlkLFxuICAgICRwcmV2VmFsaWQgPSAncHJldlZhbGlkJyArICRsdmwsXG4gICAgJHBhc3NpbmdTY2hlbWFzID0gJ3Bhc3NpbmdTY2hlbWFzJyArICRsdmw7XG4gIG91dCArPSAndmFyICcgKyAoJGVycnMpICsgJyA9IGVycm9ycyAsICcgKyAoJHByZXZWYWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2UgLCAnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnID0gbnVsbDsgJztcbiAgdmFyICR3YXNDb21wb3NpdGUgPSBpdC5jb21wb3NpdGVSdWxlO1xuICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICB2YXIgYXJyMSA9ICRzY2hlbWE7XG4gIGlmIChhcnIxKSB7XG4gICAgdmFyICRzY2gsICRpID0gLTEsXG4gICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAoJGkgPCBsMSkge1xuICAgICAgJHNjaCA9IGFycjFbJGkgKz0gMV07XG4gICAgICBpZiAoKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPyAodHlwZW9mICRzY2ggPT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoJHNjaCkubGVuZ3RoID4gMCkgfHwgJHNjaCA9PT0gZmFsc2UgOiBpdC51dGlsLnNjaGVtYUhhc1J1bGVzKCRzY2gsIGl0LlJVTEVTLmFsbCkpKSB7XG4gICAgICAgICRpdC5zY2hlbWEgPSAkc2NoO1xuICAgICAgICAkaXQuc2NoZW1hUGF0aCA9ICRzY2hlbWFQYXRoICsgJ1snICsgJGkgKyAnXSc7XG4gICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyAkaTtcbiAgICAgICAgb3V0ICs9ICcgICcgKyAoaXQudmFsaWRhdGUoJGl0KSkgKyAnICc7XG4gICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0VmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICB9XG4gICAgICBpZiAoJGkpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnICYmICcgKyAoJHByZXZWYWxpZCkgKyAnKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9IFsnICsgKCRwYXNzaW5nU2NoZW1hcykgKyAnLCAnICsgKCRpKSArICddOyB9IGVsc2UgeyAnO1xuICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyBpZiAoJyArICgkbmV4dFZhbGlkKSArICcpIHsgJyArICgkdmFsaWQpICsgJyA9ICcgKyAoJHByZXZWYWxpZCkgKyAnID0gdHJ1ZTsgJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyA9ICcgKyAoJGkpICsgJzsgfSc7XG4gICAgfVxuICB9XG4gIGl0LmNvbXBvc2l0ZVJ1bGUgPSAkaXQuY29tcG9zaXRlUnVsZSA9ICR3YXNDb21wb3NpdGU7XG4gIG91dCArPSAnJyArICgkY2xvc2luZ0JyYWNlcykgKyAnaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ29uZU9mJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwYXNzaW5nU2NoZW1hczogJyArICgkcGFzc2luZ1NjaGVtYXMpICsgJyB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBleGFjdGx5IG9uZSBzY2hlbWEgaW4gb25lT2ZcXCcgJztcbiAgICB9XG4gICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoaXQuYXN5bmMpIHtcbiAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IodkVycm9ycyk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IHZFcnJvcnM7IHJldHVybiBmYWxzZTsgJztcbiAgICB9XG4gIH1cbiAgb3V0ICs9ICd9IGVsc2UgeyAgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodkVycm9ycyAhPT0gbnVsbCkgeyBpZiAoJyArICgkZXJycykgKyAnKSB2RXJyb3JzLmxlbmd0aCA9ICcgKyAoJGVycnMpICsgJzsgZWxzZSB2RXJyb3JzID0gbnVsbDsgfSc7XG4gIGlmIChpdC5vcHRzLmFsbEVycm9ycykge1xuICAgIG91dCArPSAnIH0gJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wYXR0ZXJuKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICB2YXIgJHJlZ2V4cCA9ICRpc0RhdGEgPyAnKG5ldyBSZWdFeHAoJyArICRzY2hlbWFWYWx1ZSArICcpKScgOiBpdC51c2VQYXR0ZXJuKCRzY2hlbWEpO1xuICBvdXQgKz0gJ2lmICggJztcbiAgaWYgKCRpc0RhdGEpIHtcbiAgICBvdXQgKz0gJyAoJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnICE9IFxcJ3N0cmluZ1xcJykgfHwgJztcbiAgfVxuICBvdXQgKz0gJyAhJyArICgkcmVnZXhwKSArICcudGVzdCgnICsgKCRkYXRhKSArICcpICkgeyAgICc7XG4gIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgncGF0dGVybicpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgcGF0dGVybjogICc7XG4gICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgIG91dCArPSAnJyArICgkc2NoZW1hVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkc2NoZW1hKSk7XG4gICAgfVxuICAgIG91dCArPSAnICB9ICc7XG4gICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJ3Nob3VsZCBtYXRjaCBwYXR0ZXJuIFwiJztcbiAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgIG91dCArPSAnXFwnICsgJyArICgkc2NoZW1hVmFsdWUpICsgJyArIFxcJyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQgKz0gJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICdcIlxcJyAnO1xuICAgIH1cbiAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICBvdXQgKz0gJ3ZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHt9ICc7XG4gIH1cbiAgdmFyIF9fZXJyID0gb3V0O1xuICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChpdC5hc3luYykge1xuICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgfVxuICBvdXQgKz0gJ30gJztcbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyBlbHNlIHsgJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wcm9wZXJ0aWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICB2YXIgJGtleSA9ICdrZXknICsgJGx2bCxcbiAgICAkaWR4ID0gJ2lkeCcgKyAkbHZsLFxuICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgJG5leHREYXRhID0gJ2RhdGEnICsgJGRhdGFOeHQsXG4gICAgJGRhdGFQcm9wZXJ0aWVzID0gJ2RhdGFQcm9wZXJ0aWVzJyArICRsdmw7XG4gIHZhciAkc2NoZW1hS2V5cyA9IE9iamVjdC5rZXlzKCRzY2hlbWEgfHwge30pLmZpbHRlcihub3RQcm90byksXG4gICAgJHBQcm9wZXJ0aWVzID0gaXQuc2NoZW1hLnBhdHRlcm5Qcm9wZXJ0aWVzIHx8IHt9LFxuICAgICRwUHJvcGVydHlLZXlzID0gT2JqZWN0LmtleXMoJHBQcm9wZXJ0aWVzKS5maWx0ZXIobm90UHJvdG8pLFxuICAgICRhUHJvcGVydGllcyA9IGl0LnNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcyxcbiAgICAkc29tZVByb3BlcnRpZXMgPSAkc2NoZW1hS2V5cy5sZW5ndGggfHwgJHBQcm9wZXJ0eUtleXMubGVuZ3RoLFxuICAgICRub0FkZGl0aW9uYWwgPSAkYVByb3BlcnRpZXMgPT09IGZhbHNlLFxuICAgICRhZGRpdGlvbmFsSXNTY2hlbWEgPSB0eXBlb2YgJGFQcm9wZXJ0aWVzID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRhUHJvcGVydGllcykubGVuZ3RoLFxuICAgICRyZW1vdmVBZGRpdGlvbmFsID0gaXQub3B0cy5yZW1vdmVBZGRpdGlvbmFsLFxuICAgICRjaGVja0FkZGl0aW9uYWwgPSAkbm9BZGRpdGlvbmFsIHx8ICRhZGRpdGlvbmFsSXNTY2hlbWEgfHwgJHJlbW92ZUFkZGl0aW9uYWwsXG4gICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXMsXG4gICAgJGN1cnJlbnRCYXNlSWQgPSBpdC5iYXNlSWQ7XG4gIHZhciAkcmVxdWlyZWQgPSBpdC5zY2hlbWEucmVxdWlyZWQ7XG4gIGlmICgkcmVxdWlyZWQgJiYgIShpdC5vcHRzLiRkYXRhICYmICRyZXF1aXJlZC4kZGF0YSkgJiYgJHJlcXVpcmVkLmxlbmd0aCA8IGl0Lm9wdHMubG9vcFJlcXVpcmVkKSB7XG4gICAgdmFyICRyZXF1aXJlZEhhc2ggPSBpdC51dGlsLnRvSGFzaCgkcmVxdWlyZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm90UHJvdG8ocCkge1xuICAgIHJldHVybiBwICE9PSAnX19wcm90b19fJztcbiAgfVxuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7dmFyICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsnO1xuICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICBvdXQgKz0gJyB2YXIgJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyA9IHVuZGVmaW5lZDsnO1xuICB9XG4gIGlmICgkY2hlY2tBZGRpdGlvbmFsKSB7XG4gICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gJyArICgkZGF0YVByb3BlcnRpZXMpICsgJyB8fCBPYmplY3Qua2V5cygnICsgKCRkYXRhKSArICcpOyBmb3IgKHZhciAnICsgKCRpZHgpICsgJz0wOyAnICsgKCRpZHgpICsgJzwnICsgKCRkYXRhUHJvcGVydGllcykgKyAnLmxlbmd0aDsgJyArICgkaWR4KSArICcrKykgeyB2YXIgJyArICgka2V5KSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnWycgKyAoJGlkeCkgKyAnXTsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgZm9yICh2YXIgJyArICgka2V5KSArICcgaW4gJyArICgkZGF0YSkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkc29tZVByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnIHZhciBpc0FkZGl0aW9uYWwnICsgKCRsdmwpICsgJyA9ICEoZmFsc2UgJztcbiAgICAgIGlmICgkc2NoZW1hS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCA+IDgpIHtcbiAgICAgICAgICBvdXQgKz0gJyB8fCB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcuaGFzT3duUHJvcGVydHkoJyArICgka2V5KSArICcpICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGFycjEgPSAkc2NoZW1hS2V5cztcbiAgICAgICAgICBpZiAoYXJyMSkge1xuICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTEgPSAtMSxcbiAgICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoaTEgPCBsMSkge1xuICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKCRrZXkpICsgJyA9PSAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHByb3BlcnR5S2V5KSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoJHBQcm9wZXJ0eUtleXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBhcnIyID0gJHBQcm9wZXJ0eUtleXM7XG4gICAgICAgIGlmIChhcnIyKSB7XG4gICAgICAgICAgdmFyICRwUHJvcGVydHksICRpID0gLTEsXG4gICAgICAgICAgICBsMiA9IGFycjIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoJGkgPCBsMikge1xuICAgICAgICAgICAgJHBQcm9wZXJ0eSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBvdXQgKz0gJyB8fCAnICsgKGl0LnVzZVBhdHRlcm4oJHBQcm9wZXJ0eSkpICsgJy50ZXN0KCcgKyAoJGtleSkgKyAnKSAnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb3V0ICs9ICcgKTsgaWYgKGlzQWRkaXRpb25hbCcgKyAoJGx2bCkgKyAnKSB7ICc7XG4gICAgfVxuICAgIGlmICgkcmVtb3ZlQWRkaXRpb25hbCA9PSAnYWxsJykge1xuICAgICAgb3V0ICs9ICcgZGVsZXRlICcgKyAoJGRhdGEpICsgJ1snICsgKCRrZXkpICsgJ107ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciAkY3VycmVudEVycm9yUGF0aCA9IGl0LmVycm9yUGF0aDtcbiAgICAgIHZhciAkYWRkaXRpb25hbFByb3BlcnR5ID0gJ1xcJyArICcgKyAka2V5ICsgJyArIFxcJyc7XG4gICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoJG5vQWRkaXRpb25hbCkge1xuICAgICAgICBpZiAoJHJlbW92ZUFkZGl0aW9uYWwpIHtcbiAgICAgICAgICBvdXQgKz0gJyBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgIHZhciAkY3VyckVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL2FkZGl0aW9uYWxQcm9wZXJ0aWVzJztcbiAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgnYWRkaXRpb25hbFByb3BlcnRpZXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGFkZGl0aW9uYWxQcm9wZXJ0eTogXFwnJyArICgkYWRkaXRpb25hbFByb3BlcnR5KSArICdcXCcgfSAnO1xuICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYW4gaW52YWxpZCBhZGRpdGlvbmFsIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBOT1QgaGF2ZSBhZGRpdGlvbmFsIHByb3BlcnRpZXMnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiBmYWxzZSAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICAkZXJyU2NoZW1hUGF0aCA9ICRjdXJyRXJyU2NoZW1hUGF0aDtcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgYnJlYWs7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCRhZGRpdGlvbmFsSXNTY2hlbWEpIHtcbiAgICAgICAgaWYgKCRyZW1vdmVBZGRpdGlvbmFsID09ICdmYWlsaW5nJykge1xuICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7ICAnO1xuICAgICAgICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnIGlmICghJyArICgkbmV4dFZhbGlkKSArICcpIHsgZXJyb3JzID0gJyArICgkZXJycykgKyAnOyBpZiAodmFsaWRhdGUuZXJyb3JzICE9PSBudWxsKSB7IGlmIChlcnJvcnMpIHZhbGlkYXRlLmVycm9ycy5sZW5ndGggPSBlcnJvcnM7IGVsc2UgdmFsaWRhdGUuZXJyb3JzID0gbnVsbDsgfSBkZWxldGUgJyArICgkZGF0YSkgKyAnWycgKyAoJGtleSkgKyAnXTsgfSAgJztcbiAgICAgICAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSAkd2FzQ29tcG9zaXRlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICRpdC5zY2hlbWEgPSAkYVByb3BlcnRpZXM7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgJy5hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9hZGRpdGlvbmFsUHJvcGVydGllcyc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSA/IGl0LmVycm9yUGF0aCA6IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGl0LmVycm9yUGF0aCA9ICRjdXJyZW50RXJyb3JQYXRoO1xuICAgIH1cbiAgICBpZiAoJHNvbWVQcm9wZXJ0aWVzKSB7XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgIH1cbiAgfVxuICB2YXIgJHVzZURlZmF1bHRzID0gaXQub3B0cy51c2VEZWZhdWx0cyAmJiAhaXQuY29tcG9zaXRlUnVsZTtcbiAgaWYgKCRzY2hlbWFLZXlzLmxlbmd0aCkge1xuICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgaWYgKGFycjMpIHtcbiAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgd2hpbGUgKGkzIDwgbDMpIHtcbiAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICB2YXIgJHByb3AgPSBpdC51dGlsLmdldFByb3BlcnR5KCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAkcGFzc0RhdGEgPSAkZGF0YSArICRwcm9wLFxuICAgICAgICAgICAgJGhhc0RlZmF1bHQgPSAkdXNlRGVmYXVsdHMgJiYgJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgJGl0LnNjaGVtYSA9ICRzY2g7XG4gICAgICAgICAgJGl0LnNjaGVtYVBhdGggPSAkc2NoZW1hUGF0aCArICRwcm9wO1xuICAgICAgICAgICRpdC5lcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGggKyAnLycgKyBpdC51dGlsLmVzY2FwZUZyYWdtZW50KCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aChpdC5lcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICRpdC5kYXRhUGF0aEFyclskZGF0YU54dF0gPSBpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgdmFyICRjb2RlID0gaXQudmFsaWRhdGUoJGl0KTtcbiAgICAgICAgICAkaXQuYmFzZUlkID0gJGN1cnJlbnRCYXNlSWQ7XG4gICAgICAgICAgaWYgKGl0LnV0aWwudmFyT2NjdXJlbmNlcygkY29kZSwgJG5leHREYXRhKSA8IDIpIHtcbiAgICAgICAgICAgICRjb2RlID0gaXQudXRpbC52YXJSZXBsYWNlKCRjb2RlLCAkbmV4dERhdGEsICRwYXNzRGF0YSk7XG4gICAgICAgICAgICB2YXIgJHVzZURhdGEgPSAkcGFzc0RhdGE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciAkdXNlRGF0YSA9ICRuZXh0RGF0YTtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRoYXNEZWZhdWx0KSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRyZXF1aXJlZEhhc2ggJiYgJHJlcXVpcmVkSGFzaFskcHJvcGVydHlLZXldKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgICAgaWYgKCRvd25Qcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJykgeyAnICsgKCRuZXh0VmFsaWQpICsgJyA9IGZhbHNlOyAnO1xuICAgICAgICAgICAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAgICAgICAgICAgJGN1cnJFcnJTY2hlbWFQYXRoID0gJGVyclNjaGVtYVBhdGgsXG4gICAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC51dGlsLmdldFBhdGgoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eUtleSwgaXQub3B0cy5qc29uUG9pbnRlcnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvcmVxdWlyZWQnO1xuICAgICAgICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnJztcbiAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gJGN1cnJFcnJTY2hlbWFQYXRoO1xuICAgICAgICAgICAgICBpdC5lcnJvclBhdGggPSAkY3VycmVudEVycm9yUGF0aDtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSBlbHNlIHsgJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCAnICsgKCR1c2VEYXRhKSArICcgPT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcpIHsgJyArICgkbmV4dFZhbGlkKSArICcgPSB0cnVlOyB9IGVsc2UgeyAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR1c2VEYXRhKSArICcgIT09IHVuZGVmaW5lZCAnO1xuICAgICAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJiYgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgKSB7ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGNvZGUpICsgJyB9ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgJGNsb3NpbmdCcmFjZXMgKz0gJ30nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkcFByb3BlcnR5S2V5cy5sZW5ndGgpIHtcbiAgICB2YXIgYXJyNCA9ICRwUHJvcGVydHlLZXlzO1xuICAgIGlmIChhcnI0KSB7XG4gICAgICB2YXIgJHBQcm9wZXJ0eSwgaTQgPSAtMSxcbiAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTQgPCBsNCkge1xuICAgICAgICAkcFByb3BlcnR5ID0gYXJyNFtpNCArPSAxXTtcbiAgICAgICAgdmFyICRzY2ggPSAkcFByb3BlcnRpZXNbJHBQcm9wZXJ0eV07XG4gICAgICAgIGlmICgoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHNjaCA9PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cygkc2NoKS5sZW5ndGggPiAwKSB8fCAkc2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHNjaCwgaXQuUlVMRVMuYWxsKSkpIHtcbiAgICAgICAgICAkaXQuc2NoZW1hID0gJHNjaDtcbiAgICAgICAgICAkaXQuc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnBhdHRlcm5Qcm9wZXJ0aWVzJyArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJHBQcm9wZXJ0eSk7XG4gICAgICAgICAgJGl0LmVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy9wYXR0ZXJuUHJvcGVydGllcy8nICsgaXQudXRpbC5lc2NhcGVGcmFnbWVudCgkcFByb3BlcnR5KTtcbiAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIG91dCArPSAnICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnIHx8IE9iamVjdC5rZXlzKCcgKyAoJGRhdGEpICsgJyk7IGZvciAodmFyICcgKyAoJGlkeCkgKyAnPTA7ICcgKyAoJGlkeCkgKyAnPCcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7IHZhciAnICsgKCRrZXkpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICdbJyArICgkaWR4KSArICddOyAnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRrZXkpICsgJyBpbiAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXNlUGF0dGVybigkcFByb3BlcnR5KSkgKyAnLnRlc3QoJyArICgka2V5KSArICcpKSB7ICc7XG4gICAgICAgICAgJGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoaXQuZXJyb3JQYXRoLCAka2V5LCBpdC5vcHRzLmpzb25Qb2ludGVycyk7XG4gICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgJ1snICsgJGtleSArICddJztcbiAgICAgICAgICAkaXQuZGF0YVBhdGhBcnJbJGRhdGFOeHRdID0gJGtleTtcbiAgICAgICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpO1xuICAgICAgICAgICRpdC5iYXNlSWQgPSAkY3VycmVudEJhc2VJZDtcbiAgICAgICAgICBpZiAoaXQudXRpbC52YXJPY2N1cmVuY2VzKCRjb2RlLCAkbmV4dERhdGEpIDwgMikge1xuICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51dGlsLnZhclJlcGxhY2UoJGNvZGUsICRuZXh0RGF0YSwgJHBhc3NEYXRhKSkgKyAnICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhciAnICsgKCRuZXh0RGF0YSkgKyAnID0gJyArICgkcGFzc0RhdGEpICsgJzsgJyArICgkY29kZSkgKyAnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSBicmVhazsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBlbHNlICcgKyAoJG5leHRWYWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAgJztcbiAgICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJG5leHRWYWxpZCkgKyAnKSB7ICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlcyArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlcykgKyAnIGlmICgnICsgKCRlcnJzKSArICcgPT0gZXJyb3JzKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV9wcm9wZXJ0eU5hbWVzKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkZXJycyA9ICdlcnJzX18nICsgJGx2bDtcbiAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gIHZhciAkY2xvc2luZ0JyYWNlcyA9ICcnO1xuICAkaXQubGV2ZWwrKztcbiAgdmFyICRuZXh0VmFsaWQgPSAndmFsaWQnICsgJGl0LmxldmVsO1xuICBvdXQgKz0gJ3ZhciAnICsgKCRlcnJzKSArICcgPSBlcnJvcnM7JztcbiAgaWYgKChpdC5vcHRzLnN0cmljdEtleXdvcmRzID8gKHR5cGVvZiAkc2NoZW1hID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRzY2hlbWEpLmxlbmd0aCA+IDApIHx8ICRzY2hlbWEgPT09IGZhbHNlIDogaXQudXRpbC5zY2hlbWFIYXNSdWxlcygkc2NoZW1hLCBpdC5SVUxFUy5hbGwpKSkge1xuICAgICRpdC5zY2hlbWEgPSAkc2NoZW1hO1xuICAgICRpdC5zY2hlbWFQYXRoID0gJHNjaGVtYVBhdGg7XG4gICAgJGl0LmVyclNjaGVtYVBhdGggPSAkZXJyU2NoZW1hUGF0aDtcbiAgICB2YXIgJGtleSA9ICdrZXknICsgJGx2bCxcbiAgICAgICRpZHggPSAnaWR4JyArICRsdmwsXG4gICAgICAkaSA9ICdpJyArICRsdmwsXG4gICAgICAkaW52YWxpZE5hbWUgPSAnXFwnICsgJyArICRrZXkgKyAnICsgXFwnJyxcbiAgICAgICRkYXRhTnh0ID0gJGl0LmRhdGFMZXZlbCA9IGl0LmRhdGFMZXZlbCArIDEsXG4gICAgICAkbmV4dERhdGEgPSAnZGF0YScgKyAkZGF0YU54dCxcbiAgICAgICRkYXRhUHJvcGVydGllcyA9ICdkYXRhUHJvcGVydGllcycgKyAkbHZsLFxuICAgICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXMsXG4gICAgICAkY3VycmVudEJhc2VJZCA9IGl0LmJhc2VJZDtcbiAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnIHZhciAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnID0gdW5kZWZpbmVkOyAnO1xuICAgIH1cbiAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcgPSAnICsgKCRkYXRhUHJvcGVydGllcykgKyAnIHx8IE9iamVjdC5rZXlzKCcgKyAoJGRhdGEpICsgJyk7IGZvciAodmFyICcgKyAoJGlkeCkgKyAnPTA7ICcgKyAoJGlkeCkgKyAnPCcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICcubGVuZ3RoOyAnICsgKCRpZHgpICsgJysrKSB7IHZhciAnICsgKCRrZXkpICsgJyA9ICcgKyAoJGRhdGFQcm9wZXJ0aWVzKSArICdbJyArICgkaWR4KSArICddOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRrZXkpICsgJyBpbiAnICsgKCRkYXRhKSArICcpIHsgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgdmFyIHN0YXJ0RXJycycgKyAoJGx2bCkgKyAnID0gZXJyb3JzOyAnO1xuICAgIHZhciAkcGFzc0RhdGEgPSAka2V5O1xuICAgIHZhciAkd2FzQ29tcG9zaXRlID0gaXQuY29tcG9zaXRlUnVsZTtcbiAgICBpdC5jb21wb3NpdGVSdWxlID0gJGl0LmNvbXBvc2l0ZVJ1bGUgPSB0cnVlO1xuICAgIHZhciAkY29kZSA9IGl0LnZhbGlkYXRlKCRpdCk7XG4gICAgJGl0LmJhc2VJZCA9ICRjdXJyZW50QmFzZUlkO1xuICAgIGlmIChpdC51dGlsLnZhck9jY3VyZW5jZXMoJGNvZGUsICRuZXh0RGF0YSkgPCAyKSB7XG4gICAgICBvdXQgKz0gJyAnICsgKGl0LnV0aWwudmFyUmVwbGFjZSgkY29kZSwgJG5leHREYXRhLCAkcGFzc0RhdGEpKSArICcgJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJG5leHREYXRhKSArICcgPSAnICsgKCRwYXNzRGF0YSkgKyAnOyAnICsgKCRjb2RlKSArICcgJztcbiAgICB9XG4gICAgaXQuY29tcG9zaXRlUnVsZSA9ICRpdC5jb21wb3NpdGVSdWxlID0gJHdhc0NvbXBvc2l0ZTtcbiAgICBvdXQgKz0gJyBpZiAoIScgKyAoJG5leHRWYWxpZCkgKyAnKSB7IGZvciAodmFyICcgKyAoJGkpICsgJz1zdGFydEVycnMnICsgKCRsdmwpICsgJzsgJyArICgkaSkgKyAnPGVycm9yczsgJyArICgkaSkgKyAnKyspIHsgdkVycm9yc1snICsgKCRpKSArICddLnByb3BlcnR5TmFtZSA9ICcgKyAoJGtleSkgKyAnOyB9ICAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdwcm9wZXJ0eU5hbWVzJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBwcm9wZXJ0eU5hbWU6IFxcJycgKyAoJGludmFsaWROYW1lKSArICdcXCcgfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwncHJvcGVydHkgbmFtZSBcXFxcXFwnJyArICgkaW52YWxpZE5hbWUpICsgJ1xcXFxcXCcgaXMgaW52YWxpZFxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcgfSAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB7fSAnO1xuICAgIH1cbiAgICBvdXQgKz0gJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gdkVycm9yczsgcmV0dXJuIGZhbHNlOyAnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgYnJlYWs7ICc7XG4gICAgfVxuICAgIG91dCArPSAnIH0gfSc7XG4gIH1cbiAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzKSArICcgaWYgKCcgKyAoJGVycnMpICsgJyA9PSBlcnJvcnMpIHsnO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlZihpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvJyArICRrZXl3b3JkO1xuICB2YXIgJGJyZWFrT25FcnJvciA9ICFpdC5vcHRzLmFsbEVycm9ycztcbiAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgdmFyICR2YWxpZCA9ICd2YWxpZCcgKyAkbHZsO1xuICB2YXIgJGFzeW5jLCAkcmVmQ29kZTtcbiAgaWYgKCRzY2hlbWEgPT0gJyMnIHx8ICRzY2hlbWEgPT0gJyMvJykge1xuICAgIGlmIChpdC5pc1Jvb3QpIHtcbiAgICAgICRhc3luYyA9IGl0LmFzeW5jO1xuICAgICAgJHJlZkNvZGUgPSAndmFsaWRhdGUnO1xuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSBpdC5yb290LnNjaGVtYS4kYXN5bmMgPT09IHRydWU7XG4gICAgICAkcmVmQ29kZSA9ICdyb290LnJlZlZhbFswXSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciAkcmVmVmFsID0gaXQucmVzb2x2ZVJlZihpdC5iYXNlSWQsICRzY2hlbWEsIGl0LmlzUm9vdCk7XG4gICAgaWYgKCRyZWZWYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyICRtZXNzYWdlID0gaXQuTWlzc2luZ1JlZkVycm9yLm1lc3NhZ2UoaXQuYmFzZUlkLCAkc2NoZW1hKTtcbiAgICAgIGlmIChpdC5vcHRzLm1pc3NpbmdSZWZzID09ICdmYWlsJykge1xuICAgICAgICBpdC5sb2dnZXIuZXJyb3IoJG1lc3NhZ2UpO1xuICAgICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAgICQkb3V0U3RhY2sucHVzaChvdXQpO1xuICAgICAgICBvdXQgPSAnJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJyRyZWYnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHJlZjogXFwnJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnIH0gJztcbiAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnY2FuXFxcXFxcJ3QgcmVzb2x2ZSByZWZlcmVuY2UgJyArIChpdC51dGlsLmVzY2FwZVF1b3Rlcygkc2NoZW1hKSkgKyAnXFwnICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnZlcmJvc2UpIHtcbiAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJHNjaGVtYSkpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmIChmYWxzZSkgeyAnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGl0Lm9wdHMubWlzc2luZ1JlZnMgPT0gJ2lnbm9yZScpIHtcbiAgICAgICAgaXQubG9nZ2VyLndhcm4oJG1lc3NhZ2UpO1xuICAgICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIG91dCArPSAnIGlmICh0cnVlKSB7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBpdC5NaXNzaW5nUmVmRXJyb3IoaXQuYmFzZUlkLCAkc2NoZW1hLCAkbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgkcmVmVmFsLmlubGluZSkge1xuICAgICAgdmFyICRpdCA9IGl0LnV0aWwuY29weShpdCk7XG4gICAgICAkaXQubGV2ZWwrKztcbiAgICAgIHZhciAkbmV4dFZhbGlkID0gJ3ZhbGlkJyArICRpdC5sZXZlbDtcbiAgICAgICRpdC5zY2hlbWEgPSAkcmVmVmFsLnNjaGVtYTtcbiAgICAgICRpdC5zY2hlbWFQYXRoID0gJyc7XG4gICAgICAkaXQuZXJyU2NoZW1hUGF0aCA9ICRzY2hlbWE7XG4gICAgICB2YXIgJGNvZGUgPSBpdC52YWxpZGF0ZSgkaXQpLnJlcGxhY2UoL3ZhbGlkYXRlXFwuc2NoZW1hL2csICRyZWZWYWwuY29kZSk7XG4gICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgIG91dCArPSAnIGlmICgnICsgKCRuZXh0VmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkYXN5bmMgPSAkcmVmVmFsLiRhc3luYyA9PT0gdHJ1ZSB8fCAoaXQuYXN5bmMgJiYgJHJlZlZhbC4kYXN5bmMgIT09IGZhbHNlKTtcbiAgICAgICRyZWZDb2RlID0gJHJlZlZhbC5jb2RlO1xuICAgIH1cbiAgfVxuICBpZiAoJHJlZkNvZGUpIHtcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7XG4gICAgaWYgKGl0Lm9wdHMucGFzc0NvbnRleHQpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJy5jYWxsKHRoaXMsICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnICcgKyAoJHJlZkNvZGUpICsgJyggJztcbiAgICB9XG4gICAgb3V0ICs9ICcgJyArICgkZGF0YSkgKyAnLCAoZGF0YVBhdGggfHwgXFwnXFwnKSc7XG4gICAgaWYgKGl0LmVycm9yUGF0aCAhPSAnXCJcIicpIHtcbiAgICAgIG91dCArPSAnICsgJyArIChpdC5lcnJvclBhdGgpO1xuICAgIH1cbiAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAkcGFyZW50RGF0YVByb3BlcnR5ID0gJGRhdGFMdmwgPyBpdC5kYXRhUGF0aEFyclskZGF0YUx2bF0gOiAncGFyZW50RGF0YVByb3BlcnR5JztcbiAgICBvdXQgKz0gJyAsICcgKyAoJHBhcmVudERhdGEpICsgJyAsICcgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnLCByb290RGF0YSkgICc7XG4gICAgdmFyIF9fY2FsbFZhbGlkYXRlID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgaWYgKCFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgcmVmZXJlbmNlZCBieSBzeW5jIHNjaGVtYScpO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICc7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB0cnkgeyBhd2FpdCAnICsgKF9fY2FsbFZhbGlkYXRlKSArICc7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gY2F0Y2ggKGUpIHsgaWYgKCEoZSBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvcikpIHRocm93IGU7IGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gZS5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KGUuZXJyb3JzKTsgZXJyb3JzID0gdkVycm9ycy5sZW5ndGg7ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkdmFsaWQpICsgJykgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyBpZiAoIScgKyAoX19jYWxsVmFsaWRhdGUpICsgJykgeyBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9ICcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnM7IGVsc2UgdkVycm9ycyA9IHZFcnJvcnMuY29uY2F0KCcgKyAoJHJlZkNvZGUpICsgJy5lcnJvcnMpOyBlcnJvcnMgPSB2RXJyb3JzLmxlbmd0aDsgfSAnO1xuICAgICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdlbmVyYXRlX3JlcXVpcmVkKGl0LCAka2V5d29yZCwgJHJ1bGVUeXBlKSB7XG4gIHZhciBvdXQgPSAnICc7XG4gIHZhciAkbHZsID0gaXQubGV2ZWw7XG4gIHZhciAkZGF0YUx2bCA9IGl0LmRhdGFMZXZlbDtcbiAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICB2YXIgJHNjaGVtYVBhdGggPSBpdC5zY2hlbWFQYXRoICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgka2V5d29yZCk7XG4gIHZhciAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnLycgKyAka2V5d29yZDtcbiAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gIHZhciAkZGF0YSA9ICdkYXRhJyArICgkZGF0YUx2bCB8fCAnJyk7XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bDtcbiAgdmFyICRpc0RhdGEgPSBpdC5vcHRzLiRkYXRhICYmICRzY2hlbWEgJiYgJHNjaGVtYS4kZGF0YSxcbiAgICAkc2NoZW1hVmFsdWU7XG4gIGlmICgkaXNEYXRhKSB7XG4gICAgb3V0ICs9ICcgdmFyIHNjaGVtYScgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLmdldERhdGEoJHNjaGVtYS4kZGF0YSwgJGRhdGFMdmwsIGl0LmRhdGFQYXRoQXJyKSkgKyAnOyAnO1xuICAgICRzY2hlbWFWYWx1ZSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgfSBlbHNlIHtcbiAgICAkc2NoZW1hVmFsdWUgPSAkc2NoZW1hO1xuICB9XG4gIHZhciAkdlNjaGVtYSA9ICdzY2hlbWEnICsgJGx2bDtcbiAgaWYgKCEkaXNEYXRhKSB7XG4gICAgaWYgKCRzY2hlbWEubGVuZ3RoIDwgaXQub3B0cy5sb29wUmVxdWlyZWQgJiYgaXQuc2NoZW1hLnByb3BlcnRpZXMgJiYgT2JqZWN0LmtleXMoaXQuc2NoZW1hLnByb3BlcnRpZXMpLmxlbmd0aCkge1xuICAgICAgdmFyICRyZXF1aXJlZCA9IFtdO1xuICAgICAgdmFyIGFycjEgPSAkc2NoZW1hO1xuICAgICAgaWYgKGFycjEpIHtcbiAgICAgICAgdmFyICRwcm9wZXJ0eSwgaTEgPSAtMSxcbiAgICAgICAgICBsMSA9IGFycjEubGVuZ3RoIC0gMTtcbiAgICAgICAgd2hpbGUgKGkxIDwgbDEpIHtcbiAgICAgICAgICAkcHJvcGVydHkgPSBhcnIxW2kxICs9IDFdO1xuICAgICAgICAgIHZhciAkcHJvcGVydHlTY2ggPSBpdC5zY2hlbWEucHJvcGVydGllc1skcHJvcGVydHldO1xuICAgICAgICAgIGlmICghKCRwcm9wZXJ0eVNjaCAmJiAoaXQub3B0cy5zdHJpY3RLZXl3b3JkcyA/ICh0eXBlb2YgJHByb3BlcnR5U2NoID09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKCRwcm9wZXJ0eVNjaCkubGVuZ3RoID4gMCkgfHwgJHByb3BlcnR5U2NoID09PSBmYWxzZSA6IGl0LnV0aWwuc2NoZW1hSGFzUnVsZXMoJHByb3BlcnR5U2NoLCBpdC5SVUxFUy5hbGwpKSkpIHtcbiAgICAgICAgICAgICRyZXF1aXJlZFskcmVxdWlyZWQubGVuZ3RoXSA9ICRwcm9wZXJ0eTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyICRyZXF1aXJlZCA9ICRzY2hlbWE7XG4gICAgfVxuICB9XG4gIGlmICgkaXNEYXRhIHx8ICRyZXF1aXJlZC5sZW5ndGgpIHtcbiAgICB2YXIgJGN1cnJlbnRFcnJvclBhdGggPSBpdC5lcnJvclBhdGgsXG4gICAgICAkbG9vcFJlcXVpcmVkID0gJGlzRGF0YSB8fCAkcmVxdWlyZWQubGVuZ3RoID49IGl0Lm9wdHMubG9vcFJlcXVpcmVkLFxuICAgICAgJG93blByb3BlcnRpZXMgPSBpdC5vcHRzLm93blByb3BlcnRpZXM7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIHZhciBtaXNzaW5nJyArICgkbHZsKSArICc7ICc7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdmFsaWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgaWYgKHNjaGVtYScgKyAoJGx2bCkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzY2hlbWEnICsgKCRsdmwpICsgJykpICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgZWxzZSB7JztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyAnICsgKCR2YWxpZCkgKyAnID0gJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSAhPT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnICYmICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7IGlmICghJyArICgkdmFsaWQpICsgJykgYnJlYWs7IH0gJztcbiAgICAgICAgaWYgKCRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyAgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKCAnO1xuICAgICAgICB2YXIgYXJyMiA9ICRyZXF1aXJlZDtcbiAgICAgICAgaWYgKGFycjIpIHtcbiAgICAgICAgICB2YXIgJHByb3BlcnR5S2V5LCAkaSA9IC0xLFxuICAgICAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDIpIHtcbiAgICAgICAgICAgICRwcm9wZXJ0eUtleSA9IGFycjJbJGkgKz0gMV07XG4gICAgICAgICAgICBpZiAoJGkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJHVzZURhdGEgPSAkZGF0YSArICRwcm9wO1xuICAgICAgICAgICAgb3V0ICs9ICcgKCAoICcgKyAoJHVzZURhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICBpZiAoJG93blByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgISBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJyArICgkZGF0YSkgKyAnLCBcXCcnICsgKGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSkpICsgJ1xcJykgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnKSAmJiAobWlzc2luZycgKyAoJGx2bCkgKyAnID0gJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKGl0Lm9wdHMuanNvblBvaW50ZXJzID8gJHByb3BlcnR5S2V5IDogJHByb3ApKSArICcpICkgJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgICc7XG4gICAgICAgIHZhciAkcHJvcGVydHlQYXRoID0gJ21pc3NpbmcnICsgJGx2bCxcbiAgICAgICAgICAkbWlzc2luZ1Byb3BlcnR5ID0gJ1xcJyArICcgKyAkcHJvcGVydHlQYXRoICsgJyArIFxcJyc7XG4gICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICBpdC5lcnJvclBhdGggPSBpdC5vcHRzLmpzb25Qb2ludGVycyA/IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIHRydWUpIDogJGN1cnJlbnRFcnJvclBhdGggKyAnICsgJyArICRwcm9wZXJ0eVBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyB9IGVsc2UgeyAnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoJGxvb3BSZXF1aXJlZCkge1xuICAgICAgICBpZiAoISRpc0RhdGEpIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YXIgJyArICgkdlNjaGVtYSkgKyAnID0gdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnOyAnO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkaSA9ICdpJyArICRsdmwsXG4gICAgICAgICAgJHByb3BlcnR5UGF0aCA9ICdzY2hlbWEnICsgJGx2bCArICdbJyArICRpICsgJ10nLFxuICAgICAgICAgICRtaXNzaW5nUHJvcGVydHkgPSAnXFwnICsgJyArICRwcm9wZXJ0eVBhdGggKyAnICsgXFwnJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuX2Vycm9yRGF0YVBhdGhQcm9wZXJ0eSkge1xuICAgICAgICAgIGl0LmVycm9yUGF0aCA9IGl0LnV0aWwuZ2V0UGF0aEV4cHIoJGN1cnJlbnRFcnJvclBhdGgsICRwcm9wZXJ0eVBhdGgsIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCR2U2NoZW1hKSArICcgJiYgIUFycmF5LmlzQXJyYXkoJyArICgkdlNjaGVtYSkgKyAnKSkgeyAgdmFyIGVyciA9ICAgJzsgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICdpcyBhIHJlcXVpcmVkIHByb3BlcnR5JztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gZWxzZSBpZiAoJyArICgkdlNjaGVtYSkgKyAnICE9PSB1bmRlZmluZWQpIHsgJztcbiAgICAgICAgfVxuICAgICAgICBvdXQgKz0gJyBmb3IgKHZhciAnICsgKCRpKSArICcgPSAwOyAnICsgKCRpKSArICcgPCAnICsgKCR2U2NoZW1hKSArICcubGVuZ3RoOyAnICsgKCRpKSArICcrKykgeyBpZiAoJyArICgkZGF0YSkgKyAnWycgKyAoJHZTY2hlbWEpICsgJ1snICsgKCRpKSArICddXSA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgIG91dCArPSAnIHx8ICEgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCcgKyAoJGRhdGEpICsgJywgJyArICgkdlNjaGVtYSkgKyAnWycgKyAoJGkpICsgJ10pICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCdyZXF1aXJlZCcpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHsgbWlzc2luZ1Byb3BlcnR5OiBcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcJyB9ICc7XG4gICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIG1lc3NhZ2U6IFxcJyc7XG4gICAgICAgICAgICBpZiAoaXQub3B0cy5fZXJyb3JEYXRhUGF0aFByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXQgKz0gJ3Nob3VsZCBoYXZlIHJlcXVpcmVkIHByb3BlcnR5IFxcXFxcXCcnICsgKCRtaXNzaW5nUHJvcGVydHkpICsgJ1xcXFxcXCcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgfSB9ICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICcgIH0gICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcnIzID0gJHJlcXVpcmVkO1xuICAgICAgICBpZiAoYXJyMykge1xuICAgICAgICAgIHZhciAkcHJvcGVydHlLZXksIGkzID0gLTEsXG4gICAgICAgICAgICBsMyA9IGFycjMubGVuZ3RoIC0gMTtcbiAgICAgICAgICB3aGlsZSAoaTMgPCBsMykge1xuICAgICAgICAgICAgJHByb3BlcnR5S2V5ID0gYXJyM1tpMyArPSAxXTtcbiAgICAgICAgICAgIHZhciAkcHJvcCA9IGl0LnV0aWwuZ2V0UHJvcGVydHkoJHByb3BlcnR5S2V5KSxcbiAgICAgICAgICAgICAgJG1pc3NpbmdQcm9wZXJ0eSA9IGl0LnV0aWwuZXNjYXBlUXVvdGVzKCRwcm9wZXJ0eUtleSksXG4gICAgICAgICAgICAgICR1c2VEYXRhID0gJGRhdGEgKyAkcHJvcDtcbiAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgaXQuZXJyb3JQYXRoID0gaXQudXRpbC5nZXRQYXRoKCRjdXJyZW50RXJyb3JQYXRoLCAkcHJvcGVydHlLZXksIGl0Lm9wdHMuanNvblBvaW50ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnIGlmICggJyArICgkdXNlRGF0YSkgKyAnID09PSB1bmRlZmluZWQgJztcbiAgICAgICAgICAgIGlmICgkb3duUHJvcGVydGllcykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB8fCAhIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCgnICsgKCRkYXRhKSArICcsIFxcJycgKyAoaXQudXRpbC5lc2NhcGVRdW90ZXMoJHByb3BlcnR5S2V5KSkgKyAnXFwnKSAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgIHZhciBlcnIgPSAgICc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBvdXQgKz0gJyB7IGtleXdvcmQ6IFxcJycgKyAoJ3JlcXVpcmVkJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyBtaXNzaW5nUHJvcGVydHk6IFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFwnIH0gJztcbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLl9lcnJvckRhdGFQYXRoUHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnaXMgYSByZXF1aXJlZCBwcm9wZXJ0eSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnc2hvdWxkIGhhdmUgcmVxdWlyZWQgcHJvcGVydHkgXFxcXFxcJycgKyAoJG1pc3NpbmdQcm9wZXJ0eSkgKyAnXFxcXFxcJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICwgc2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKSArICcgLCBwYXJlbnRTY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoaXQuc2NoZW1hUGF0aCkgKyAnICwgZGF0YTogJyArICgkZGF0YSkgKyAnICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSAnOyAgaWYgKHZFcnJvcnMgPT09IG51bGwpIHZFcnJvcnMgPSBbZXJyXTsgZWxzZSB2RXJyb3JzLnB1c2goZXJyKTsgZXJyb3JzKys7IH0gJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaXQuZXJyb3JQYXRoID0gJGN1cnJlbnRFcnJvclBhdGg7XG4gIH0gZWxzZSBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgIG91dCArPSAnIGlmICh0cnVlKSB7JztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZW5lcmF0ZV91bmlxdWVJdGVtcyhpdCwgJGtleXdvcmQsICRydWxlVHlwZSkge1xuICB2YXIgb3V0ID0gJyAnO1xuICB2YXIgJGx2bCA9IGl0LmxldmVsO1xuICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gIHZhciAkc2NoZW1hID0gaXQuc2NoZW1hWyRrZXl3b3JkXTtcbiAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArIGl0LnV0aWwuZ2V0UHJvcGVydHkoJGtleXdvcmQpO1xuICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gIHZhciAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzO1xuICB2YXIgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gIHZhciAkaXNEYXRhID0gaXQub3B0cy4kZGF0YSAmJiAkc2NoZW1hICYmICRzY2hlbWEuJGRhdGEsXG4gICAgJHNjaGVtYVZhbHVlO1xuICBpZiAoJGlzRGF0YSkge1xuICAgIG91dCArPSAnIHZhciBzY2hlbWEnICsgKCRsdmwpICsgJyA9ICcgKyAoaXQudXRpbC5nZXREYXRhKCRzY2hlbWEuJGRhdGEsICRkYXRhTHZsLCBpdC5kYXRhUGF0aEFycikpICsgJzsgJztcbiAgICAkc2NoZW1hVmFsdWUgPSAnc2NoZW1hJyArICRsdmw7XG4gIH0gZWxzZSB7XG4gICAgJHNjaGVtYVZhbHVlID0gJHNjaGVtYTtcbiAgfVxuICBpZiAoKCRzY2hlbWEgfHwgJGlzRGF0YSkgJiYgaXQub3B0cy51bmlxdWVJdGVtcyAhPT0gZmFsc2UpIHtcbiAgICBpZiAoJGlzRGF0YSkge1xuICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICc7IGlmICgnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSBmYWxzZSB8fCAnICsgKCRzY2hlbWFWYWx1ZSkgKyAnID09PSB1bmRlZmluZWQpICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyBlbHNlIGlmICh0eXBlb2YgJyArICgkc2NoZW1hVmFsdWUpICsgJyAhPSBcXCdib29sZWFuXFwnKSAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7IGVsc2UgeyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgaSA9ICcgKyAoJGRhdGEpICsgJy5sZW5ndGggLCAnICsgKCR2YWxpZCkgKyAnID0gdHJ1ZSAsIGo7IGlmIChpID4gMSkgeyAnO1xuICAgIHZhciAkaXRlbVR5cGUgPSBpdC5zY2hlbWEuaXRlbXMgJiYgaXQuc2NoZW1hLml0ZW1zLnR5cGUsXG4gICAgICAkdHlwZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KCRpdGVtVHlwZSk7XG4gICAgaWYgKCEkaXRlbVR5cGUgfHwgJGl0ZW1UeXBlID09ICdvYmplY3QnIHx8ICRpdGVtVHlwZSA9PSAnYXJyYXknIHx8ICgkdHlwZUlzQXJyYXkgJiYgKCRpdGVtVHlwZS5pbmRleE9mKCdvYmplY3QnKSA+PSAwIHx8ICRpdGVtVHlwZS5pbmRleE9mKCdhcnJheScpID49IDApKSkge1xuICAgICAgb3V0ICs9ICcgb3V0ZXI6IGZvciAoO2ktLTspIHsgZm9yIChqID0gaTsgai0tOykgeyBpZiAoZXF1YWwoJyArICgkZGF0YSkgKyAnW2ldLCAnICsgKCRkYXRhKSArICdbal0pKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgYnJlYWsgb3V0ZXI7IH0gfSB9ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSAnIHZhciBpdGVtSW5kaWNlcyA9IHt9LCBpdGVtOyBmb3IgKDtpLS07KSB7IHZhciBpdGVtID0gJyArICgkZGF0YSkgKyAnW2ldOyAnO1xuICAgICAgdmFyICRtZXRob2QgPSAnY2hlY2tEYXRhVHlwZScgKyAoJHR5cGVJc0FycmF5ID8gJ3MnIDogJycpO1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXRpbFskbWV0aG9kXSgkaXRlbVR5cGUsICdpdGVtJywgaXQub3B0cy5zdHJpY3ROdW1iZXJzLCB0cnVlKSkgKyAnKSBjb250aW51ZTsgJztcbiAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgb3V0ICs9ICcgaWYgKHR5cGVvZiBpdGVtID09IFxcJ3N0cmluZ1xcJykgaXRlbSA9IFxcJ1wiXFwnICsgaXRlbTsgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIGlmICh0eXBlb2YgaXRlbUluZGljZXNbaXRlbV0gPT0gXFwnbnVtYmVyXFwnKSB7ICcgKyAoJHZhbGlkKSArICcgPSBmYWxzZTsgaiA9IGl0ZW1JbmRpY2VzW2l0ZW1dOyBicmVhazsgfSBpdGVtSW5kaWNlc1tpdGVtXSA9IGk7IH0gJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfSAnO1xuICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICBvdXQgKz0gJyAgfSAgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgaWYgKCEnICsgKCR2YWxpZCkgKyAnKSB7ICAgJztcbiAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgndW5pcXVlSXRlbXMnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IGk6IGksIGo6IGogfSAnO1xuICAgICAgaWYgKGl0Lm9wdHMubWVzc2FnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIE5PVCBoYXZlIGR1cGxpY2F0ZSBpdGVtcyAoaXRlbXMgIyMgXFwnICsgaiArIFxcJyBhbmQgXFwnICsgaSArIFxcJyBhcmUgaWRlbnRpY2FsKVxcJyAnO1xuICAgICAgfVxuICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogICc7XG4gICAgICAgIGlmICgkaXNEYXRhKSB7XG4gICAgICAgICAgb3V0ICs9ICd2YWxpZGF0ZS5zY2hlbWEnICsgKCRzY2hlbWFQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJycgKyAoJHNjaGVtYSk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgICAgICAgICAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgIH1cbiAgICAgIG91dCArPSAnIH0gJztcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcge30gJztcbiAgICB9XG4gICAgdmFyIF9fZXJyID0gb3V0O1xuICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgIH1cbiAgICBvdXQgKz0gJyB9ICc7XG4gICAgaWYgKCRicmVha09uRXJyb3IpIHtcbiAgICAgIG91dCArPSAnIGVsc2UgeyAnO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgaWYgKHRydWUpIHsgJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2VuZXJhdGVfdmFsaWRhdGUoaXQsICRrZXl3b3JkLCAkcnVsZVR5cGUpIHtcbiAgdmFyIG91dCA9ICcnO1xuICB2YXIgJGFzeW5jID0gaXQuc2NoZW1hLiRhc3luYyA9PT0gdHJ1ZSxcbiAgICAkcmVmS2V5d29yZHMgPSBpdC51dGlsLnNjaGVtYUhhc1J1bGVzRXhjZXB0KGl0LnNjaGVtYSwgaXQuUlVMRVMuYWxsLCAnJHJlZicpLFxuICAgICRpZCA9IGl0LnNlbGYuX2dldElkKGl0LnNjaGVtYSk7XG4gIGlmIChpdC5vcHRzLnN0cmljdEtleXdvcmRzKSB7XG4gICAgdmFyICR1bmtub3duS3dkID0gaXQudXRpbC5zY2hlbWFVbmtub3duUnVsZXMoaXQuc2NoZW1hLCBpdC5SVUxFUy5rZXl3b3Jkcyk7XG4gICAgaWYgKCR1bmtub3duS3dkKSB7XG4gICAgICB2YXIgJGtleXdvcmRzTXNnID0gJ3Vua25vd24ga2V5d29yZDogJyArICR1bmtub3duS3dkO1xuICAgICAgaWYgKGl0Lm9wdHMuc3RyaWN0S2V5d29yZHMgPT09ICdsb2cnKSBpdC5sb2dnZXIud2Fybigka2V5d29yZHNNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGtleXdvcmRzTXNnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGl0LmlzVG9wKSB7XG4gICAgb3V0ICs9ICcgdmFyIHZhbGlkYXRlID0gJztcbiAgICBpZiAoJGFzeW5jKSB7XG4gICAgICBpdC5hc3luYyA9IHRydWU7XG4gICAgICBvdXQgKz0gJ2FzeW5jICc7XG4gICAgfVxuICAgIG91dCArPSAnZnVuY3Rpb24oZGF0YSwgZGF0YVBhdGgsIHBhcmVudERhdGEsIHBhcmVudERhdGFQcm9wZXJ0eSwgcm9vdERhdGEpIHsgXFwndXNlIHN0cmljdFxcJzsgJztcbiAgICBpZiAoJGlkICYmIChpdC5vcHRzLnNvdXJjZUNvZGUgfHwgaXQub3B0cy5wcm9jZXNzQ29kZSkpIHtcbiAgICAgIG91dCArPSAnICcgKyAoJy9cXCojIHNvdXJjZVVSTD0nICsgJGlkICsgJyAqLycpICsgJyAnO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIGl0LnNjaGVtYSA9PSAnYm9vbGVhbicgfHwgISgkcmVmS2V5d29yZHMgfHwgaXQuc2NoZW1hLiRyZWYpKSB7XG4gICAgdmFyICRrZXl3b3JkID0gJ2ZhbHNlIHNjaGVtYSc7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbDtcbiAgICB2YXIgJGRhdGFMdmwgPSBpdC5kYXRhTGV2ZWw7XG4gICAgdmFyICRzY2hlbWEgPSBpdC5zY2hlbWFbJGtleXdvcmRdO1xuICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyBpdC51dGlsLmdldFByb3BlcnR5KCRrZXl3b3JkKTtcbiAgICB2YXIgJGVyclNjaGVtYVBhdGggPSBpdC5lcnJTY2hlbWFQYXRoICsgJy8nICsgJGtleXdvcmQ7XG4gICAgdmFyICRicmVha09uRXJyb3IgPSAhaXQub3B0cy5hbGxFcnJvcnM7XG4gICAgdmFyICRlcnJvcktleXdvcmQ7XG4gICAgdmFyICRkYXRhID0gJ2RhdGEnICsgKCRkYXRhTHZsIHx8ICcnKTtcbiAgICB2YXIgJHZhbGlkID0gJ3ZhbGlkJyArICRsdmw7XG4gICAgaWYgKGl0LnNjaGVtYSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChpdC5pc1RvcCkge1xuICAgICAgICAkYnJlYWtPbkVycm9yID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCR2YWxpZCkgKyAnID0gZmFsc2U7ICc7XG4gICAgICB9XG4gICAgICB2YXIgJCRvdXRTdGFjayA9ICQkb3V0U3RhY2sgfHwgW107XG4gICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKGl0LmNyZWF0ZUVycm9ycyAhPT0gZmFsc2UpIHtcbiAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ2ZhbHNlIHNjaGVtYScpICsgJ1xcJyAsIGRhdGFQYXRoOiAoZGF0YVBhdGggfHwgXFwnXFwnKSArICcgKyAoaXQuZXJyb3JQYXRoKSArICcgLCBzY2hlbWFQYXRoOiAnICsgKGl0LnV0aWwudG9RdW90ZWRTdHJpbmcoJGVyclNjaGVtYVBhdGgpKSArICcgLCBwYXJhbXM6IHt9ICc7XG4gICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnYm9vbGVhbiBzY2hlbWEgaXMgZmFsc2VcXCcgJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IGZhbHNlICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICB9XG4gICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgaWYgKCFpdC5jb21wb3NpdGVSdWxlICYmICRicmVha09uRXJyb3IpIHtcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgIG91dCArPSAnIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoWycgKyAoX19lcnIpICsgJ10pOyAnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGl0LmlzVG9wKSB7XG4gICAgICAgIGlmICgkYXN5bmMpIHtcbiAgICAgICAgICBvdXQgKz0gJyByZXR1cm4gZGF0YTsgJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSBudWxsOyByZXR1cm4gdHJ1ZTsgJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSB0cnVlOyAnO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXQuaXNUb3ApIHtcbiAgICAgIG91dCArPSAnIH07IHJldHVybiB2YWxpZGF0ZTsgJztcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuICBpZiAoaXQuaXNUb3ApIHtcbiAgICB2YXIgJHRvcCA9IGl0LmlzVG9wLFxuICAgICAgJGx2bCA9IGl0LmxldmVsID0gMCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsID0gMCxcbiAgICAgICRkYXRhID0gJ2RhdGEnO1xuICAgIGl0LnJvb3RJZCA9IGl0LnJlc29sdmUuZnVsbFBhdGgoaXQuc2VsZi5fZ2V0SWQoaXQucm9vdC5zY2hlbWEpKTtcbiAgICBpdC5iYXNlSWQgPSBpdC5iYXNlSWQgfHwgaXQucm9vdElkO1xuICAgIGRlbGV0ZSBpdC5pc1RvcDtcbiAgICBpdC5kYXRhUGF0aEFyciA9IFtcIlwiXTtcbiAgICBpZiAoaXQuc2NoZW1hLmRlZmF1bHQgIT09IHVuZGVmaW5lZCAmJiBpdC5vcHRzLnVzZURlZmF1bHRzICYmIGl0Lm9wdHMuc3RyaWN0RGVmYXVsdHMpIHtcbiAgICAgIHZhciAkZGVmYXVsdE1zZyA9ICdkZWZhdWx0IGlzIGlnbm9yZWQgaW4gdGhlIHNjaGVtYSByb290JztcbiAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgIH1cbiAgICBvdXQgKz0gJyB2YXIgdkVycm9ycyA9IG51bGw7ICc7XG4gICAgb3V0ICs9ICcgdmFyIGVycm9ycyA9IDA7ICAgICAnO1xuICAgIG91dCArPSAnIGlmIChyb290RGF0YSA9PT0gdW5kZWZpbmVkKSByb290RGF0YSA9IGRhdGE7ICc7XG4gIH0gZWxzZSB7XG4gICAgdmFyICRsdmwgPSBpdC5sZXZlbCxcbiAgICAgICRkYXRhTHZsID0gaXQuZGF0YUxldmVsLFxuICAgICAgJGRhdGEgPSAnZGF0YScgKyAoJGRhdGFMdmwgfHwgJycpO1xuICAgIGlmICgkaWQpIGl0LmJhc2VJZCA9IGl0LnJlc29sdmUudXJsKGl0LmJhc2VJZCwgJGlkKTtcbiAgICBpZiAoJGFzeW5jICYmICFpdC5hc3luYykgdGhyb3cgbmV3IEVycm9yKCdhc3luYyBzY2hlbWEgaW4gc3luYyBzY2hlbWEnKTtcbiAgICBvdXQgKz0gJyB2YXIgZXJyc18nICsgKCRsdmwpICsgJyA9IGVycm9yczsnO1xuICB9XG4gIHZhciAkdmFsaWQgPSAndmFsaWQnICsgJGx2bCxcbiAgICAkYnJlYWtPbkVycm9yID0gIWl0Lm9wdHMuYWxsRXJyb3JzLFxuICAgICRjbG9zaW5nQnJhY2VzMSA9ICcnLFxuICAgICRjbG9zaW5nQnJhY2VzMiA9ICcnO1xuICB2YXIgJGVycm9yS2V5d29yZDtcbiAgdmFyICR0eXBlU2NoZW1hID0gaXQuc2NoZW1hLnR5cGUsXG4gICAgJHR5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheSgkdHlwZVNjaGVtYSk7XG4gIGlmICgkdHlwZVNjaGVtYSAmJiBpdC5vcHRzLm51bGxhYmxlICYmIGl0LnNjaGVtYS5udWxsYWJsZSA9PT0gdHJ1ZSkge1xuICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgIGlmICgkdHlwZVNjaGVtYS5pbmRleE9mKCdudWxsJykgPT0gLTEpICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWEuY29uY2F0KCdudWxsJyk7XG4gICAgfSBlbHNlIGlmICgkdHlwZVNjaGVtYSAhPSAnbnVsbCcpIHtcbiAgICAgICR0eXBlU2NoZW1hID0gWyR0eXBlU2NoZW1hLCAnbnVsbCddO1xuICAgICAgJHR5cGVJc0FycmF5ID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgaWYgKCR0eXBlSXNBcnJheSAmJiAkdHlwZVNjaGVtYS5sZW5ndGggPT0gMSkge1xuICAgICR0eXBlU2NoZW1hID0gJHR5cGVTY2hlbWFbMF07XG4gICAgJHR5cGVJc0FycmF5ID0gZmFsc2U7XG4gIH1cbiAgaWYgKGl0LnNjaGVtYS4kcmVmICYmICRyZWZLZXl3b3Jkcykge1xuICAgIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgPT0gJ2ZhaWwnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJyRyZWY6IHZhbGlkYXRpb24ga2V5d29yZHMgdXNlZCBpbiBzY2hlbWEgYXQgcGF0aCBcIicgKyBpdC5lcnJTY2hlbWFQYXRoICsgJ1wiIChzZWUgb3B0aW9uIGV4dGVuZFJlZnMpJyk7XG4gICAgfSBlbHNlIGlmIChpdC5vcHRzLmV4dGVuZFJlZnMgIT09IHRydWUpIHtcbiAgICAgICRyZWZLZXl3b3JkcyA9IGZhbHNlO1xuICAgICAgaXQubG9nZ2VyLndhcm4oJyRyZWY6IGtleXdvcmRzIGlnbm9yZWQgaW4gc2NoZW1hIGF0IHBhdGggXCInICsgaXQuZXJyU2NoZW1hUGF0aCArICdcIicpO1xuICAgIH1cbiAgfVxuICBpZiAoaXQuc2NoZW1hLiRjb21tZW50ICYmIGl0Lm9wdHMuJGNvbW1lbnQpIHtcbiAgICBvdXQgKz0gJyAnICsgKGl0LlJVTEVTLmFsbC4kY29tbWVudC5jb2RlKGl0LCAnJGNvbW1lbnQnKSk7XG4gIH1cbiAgaWYgKCR0eXBlU2NoZW1hKSB7XG4gICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMpIHtcbiAgICAgIHZhciAkY29lcmNlVG9UeXBlcyA9IGl0LnV0aWwuY29lcmNlVG9UeXBlcyhpdC5vcHRzLmNvZXJjZVR5cGVzLCAkdHlwZVNjaGVtYSk7XG4gICAgfVxuICAgIHZhciAkcnVsZXNHcm91cCA9IGl0LlJVTEVTLnR5cGVzWyR0eXBlU2NoZW1hXTtcbiAgICBpZiAoJGNvZXJjZVRvVHlwZXMgfHwgJHR5cGVJc0FycmF5IHx8ICRydWxlc0dyb3VwID09PSB0cnVlIHx8ICgkcnVsZXNHcm91cCAmJiAhJHNob3VsZFVzZUdyb3VwKCRydWxlc0dyb3VwKSkpIHtcbiAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAkZXJyU2NoZW1hUGF0aCA9IGl0LmVyclNjaGVtYVBhdGggKyAnL3R5cGUnO1xuICAgICAgdmFyICRzY2hlbWFQYXRoID0gaXQuc2NoZW1hUGF0aCArICcudHlwZScsXG4gICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZScsXG4gICAgICAgICRtZXRob2QgPSAkdHlwZUlzQXJyYXkgPyAnY2hlY2tEYXRhVHlwZXMnIDogJ2NoZWNrRGF0YVR5cGUnO1xuICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoaXQudXRpbFskbWV0aG9kXSgkdHlwZVNjaGVtYSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycywgdHJ1ZSkpICsgJykgeyAnO1xuICAgICAgaWYgKCRjb2VyY2VUb1R5cGVzKSB7XG4gICAgICAgIHZhciAkZGF0YVR5cGUgPSAnZGF0YVR5cGUnICsgJGx2bCxcbiAgICAgICAgICAkY29lcmNlZCA9ICdjb2VyY2VkJyArICRsdmw7XG4gICAgICAgIG91dCArPSAnIHZhciAnICsgKCRkYXRhVHlwZSkgKyAnID0gdHlwZW9mICcgKyAoJGRhdGEpICsgJzsgdmFyICcgKyAoJGNvZXJjZWQpICsgJyA9IHVuZGVmaW5lZDsgJztcbiAgICAgICAgaWYgKGl0Lm9wdHMuY29lcmNlVHlwZXMgPT0gJ2FycmF5Jykge1xuICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ29iamVjdFxcJyAmJiBBcnJheS5pc0FycmF5KCcgKyAoJGRhdGEpICsgJykgJiYgJyArICgkZGF0YSkgKyAnLmxlbmd0aCA9PSAxKSB7ICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGRhdGEpICsgJ1swXTsgJyArICgkZGF0YVR5cGUpICsgJyA9IHR5cGVvZiAnICsgKCRkYXRhKSArICc7IGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZShpdC5zY2hlbWEudHlwZSwgJGRhdGEsIGl0Lm9wdHMuc3RyaWN0TnVtYmVycykpICsgJykgJyArICgkY29lcmNlZCkgKyAnID0gJyArICgkZGF0YSkgKyAnOyB9ICc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSA7ICc7XG4gICAgICAgIHZhciBhcnIxID0gJGNvZXJjZVRvVHlwZXM7XG4gICAgICAgIGlmIChhcnIxKSB7XG4gICAgICAgICAgdmFyICR0eXBlLCAkaSA9IC0xLFxuICAgICAgICAgICAgbDEgPSBhcnIxLmxlbmd0aCAtIDE7XG4gICAgICAgICAgd2hpbGUgKCRpIDwgbDEpIHtcbiAgICAgICAgICAgICR0eXBlID0gYXJyMVskaSArPSAxXTtcbiAgICAgICAgICAgIGlmICgkdHlwZSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ251bWJlclxcJyB8fCAnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcpICcgKyAoJGNvZXJjZWQpICsgJyA9IFxcJ1xcJyArICcgKyAoJGRhdGEpICsgJzsgZWxzZSBpZiAoJyArICgkZGF0YSkgKyAnID09PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBcXCdcXCc7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudW1iZXInIHx8ICR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ2Jvb2xlYW5cXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSBudWxsIHx8ICgnICsgKCRkYXRhVHlwZSkgKyAnID09IFxcJ3N0cmluZ1xcJyAmJiAnICsgKCRkYXRhKSArICcgJiYgJyArICgkZGF0YSkgKyAnID09ICsnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgaWYgKCR0eXBlID09ICdpbnRlZ2VyJykge1xuICAgICAgICAgICAgICAgIG91dCArPSAnICYmICEoJyArICgkZGF0YSkgKyAnICUgMSknO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG91dCArPSAnKSkgJyArICgkY29lcmNlZCkgKyAnID0gKycgKyAoJGRhdGEpICsgJzsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgIG91dCArPSAnIGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwnZmFsc2VcXCcgfHwgJyArICgkZGF0YSkgKyAnID09PSAwIHx8ICcgKyAoJGRhdGEpICsgJyA9PT0gbnVsbCkgJyArICgkY29lcmNlZCkgKyAnID0gZmFsc2U7IGVsc2UgaWYgKCcgKyAoJGRhdGEpICsgJyA9PT0gXFwndHJ1ZVxcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDEpICcgKyAoJGNvZXJjZWQpICsgJyA9IHRydWU7ICc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCR0eXBlID09ICdudWxsJykge1xuICAgICAgICAgICAgICBvdXQgKz0gJyBlbHNlIGlmICgnICsgKCRkYXRhKSArICcgPT09IFxcJ1xcJyB8fCAnICsgKCRkYXRhKSArICcgPT09IDAgfHwgJyArICgkZGF0YSkgKyAnID09PSBmYWxzZSkgJyArICgkY29lcmNlZCkgKyAnID0gbnVsbDsgJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXQub3B0cy5jb2VyY2VUeXBlcyA9PSAnYXJyYXknICYmICR0eXBlID09ICdhcnJheScpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSBpZiAoJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdzdHJpbmdcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdudW1iZXJcXCcgfHwgJyArICgkZGF0YVR5cGUpICsgJyA9PSBcXCdib29sZWFuXFwnIHx8ICcgKyAoJGRhdGEpICsgJyA9PSBudWxsKSAnICsgKCRjb2VyY2VkKSArICcgPSBbJyArICgkZGF0YSkgKyAnXTsgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICAgJztcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSAnIH0gaWYgKCcgKyAoJGNvZXJjZWQpICsgJyAhPT0gdW5kZWZpbmVkKSB7ICAnO1xuICAgICAgICB2YXIgJHBhcmVudERhdGEgPSAkZGF0YUx2bCA/ICdkYXRhJyArICgoJGRhdGFMdmwgLSAxKSB8fCAnJykgOiAncGFyZW50RGF0YScsXG4gICAgICAgICAgJHBhcmVudERhdGFQcm9wZXJ0eSA9ICRkYXRhTHZsID8gaXQuZGF0YVBhdGhBcnJbJGRhdGFMdmxdIDogJ3BhcmVudERhdGFQcm9wZXJ0eSc7XG4gICAgICAgIG91dCArPSAnICcgKyAoJGRhdGEpICsgJyA9ICcgKyAoJGNvZXJjZWQpICsgJzsgJztcbiAgICAgICAgaWYgKCEkZGF0YUx2bCkge1xuICAgICAgICAgIG91dCArPSAnaWYgKCcgKyAoJHBhcmVudERhdGEpICsgJyAhPT0gdW5kZWZpbmVkKSc7XG4gICAgICAgIH1cbiAgICAgICAgb3V0ICs9ICcgJyArICgkcGFyZW50RGF0YSkgKyAnWycgKyAoJHBhcmVudERhdGFQcm9wZXJ0eSkgKyAnXSA9ICcgKyAoJGNvZXJjZWQpICsgJzsgfSAnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyICQkb3V0U3RhY2sgPSAkJG91dFN0YWNrIHx8IFtdO1xuICAgICAgICAkJG91dFN0YWNrLnB1c2gob3V0KTtcbiAgICAgICAgb3V0ID0gJyc7IC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICAgIGlmIChpdC5jcmVhdGVFcnJvcnMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgb3V0ICs9ICcgeyBrZXl3b3JkOiBcXCcnICsgKCRlcnJvcktleXdvcmQgfHwgJ3R5cGUnKSArICdcXCcgLCBkYXRhUGF0aDogKGRhdGFQYXRoIHx8IFxcJ1xcJykgKyAnICsgKGl0LmVycm9yUGF0aCkgKyAnICwgc2NoZW1hUGF0aDogJyArIChpdC51dGlsLnRvUXVvdGVkU3RyaW5nKCRlcnJTY2hlbWFQYXRoKSkgKyAnICwgcGFyYW1zOiB7IHR5cGU6IFxcJyc7XG4gICAgICAgICAgaWYgKCR0eXBlSXNBcnJheSkge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0ICs9ICdcXCcgfSAnO1xuICAgICAgICAgIGlmIChpdC5vcHRzLm1lc3NhZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgb3V0ICs9ICcgLCBtZXNzYWdlOiBcXCdzaG91bGQgYmUgJztcbiAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcnICsgKCR0eXBlU2NoZW1hLmpvaW4oXCIsXCIpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gJ1xcJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXQub3B0cy52ZXJib3NlKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAsIHNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArICgkc2NoZW1hUGF0aCkgKyAnICwgcGFyZW50U2NoZW1hOiB2YWxpZGF0ZS5zY2hlbWEnICsgKGl0LnNjaGVtYVBhdGgpICsgJyAsIGRhdGE6ICcgKyAoJGRhdGEpICsgJyAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcge30gJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgX19lcnIgPSBvdXQ7XG4gICAgICAgIG91dCA9ICQkb3V0U3RhY2sucG9wKCk7XG4gICAgICAgIGlmICghaXQuY29tcG9zaXRlUnVsZSAmJiAkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICAgICAgaWYgKGl0LmFzeW5jKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFsnICsgKF9fZXJyKSArICddKTsgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9ICcgdmFsaWRhdGUuZXJyb3JzID0gWycgKyAoX19lcnIpICsgJ107IHJldHVybiBmYWxzZTsgJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0ICs9ICcgdmFyIGVyciA9ICcgKyAoX19lcnIpICsgJzsgIGlmICh2RXJyb3JzID09PSBudWxsKSB2RXJyb3JzID0gW2Vycl07IGVsc2UgdkVycm9ycy5wdXNoKGVycik7IGVycm9ycysrOyAnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvdXQgKz0gJyB9ICc7XG4gICAgfVxuICB9XG4gIGlmIChpdC5zY2hlbWEuJHJlZiAmJiAhJHJlZktleXdvcmRzKSB7XG4gICAgb3V0ICs9ICcgJyArIChpdC5SVUxFUy5hbGwuJHJlZi5jb2RlKGl0LCAnJHJlZicpKSArICcgJztcbiAgICBpZiAoJGJyZWFrT25FcnJvcikge1xuICAgICAgb3V0ICs9ICcgfSBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgfVxuICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhcnIyID0gaXQuUlVMRVM7XG4gICAgaWYgKGFycjIpIHtcbiAgICAgIHZhciAkcnVsZXNHcm91cCwgaTIgPSAtMSxcbiAgICAgICAgbDIgPSBhcnIyLmxlbmd0aCAtIDE7XG4gICAgICB3aGlsZSAoaTIgPCBsMikge1xuICAgICAgICAkcnVsZXNHcm91cCA9IGFycjJbaTIgKz0gMV07XG4gICAgICAgIGlmICgkc2hvdWxkVXNlR3JvdXAoJHJ1bGVzR3JvdXApKSB7XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIGlmICgnICsgKGl0LnV0aWwuY2hlY2tEYXRhVHlwZSgkcnVsZXNHcm91cC50eXBlLCAkZGF0YSwgaXQub3B0cy5zdHJpY3ROdW1iZXJzKSkgKyAnKSB7ICc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpdC5vcHRzLnVzZURlZmF1bHRzKSB7XG4gICAgICAgICAgICBpZiAoJHJ1bGVzR3JvdXAudHlwZSA9PSAnb2JqZWN0JyAmJiBpdC5zY2hlbWEucHJvcGVydGllcykge1xuICAgICAgICAgICAgICB2YXIgJHNjaGVtYSA9IGl0LnNjaGVtYS5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgICRzY2hlbWFLZXlzID0gT2JqZWN0LmtleXMoJHNjaGVtYSk7XG4gICAgICAgICAgICAgIHZhciBhcnIzID0gJHNjaGVtYUtleXM7XG4gICAgICAgICAgICAgIGlmIChhcnIzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwcm9wZXJ0eUtleSwgaTMgPSAtMSxcbiAgICAgICAgICAgICAgICAgIGwzID0gYXJyMy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpMyA8IGwzKSB7XG4gICAgICAgICAgICAgICAgICAkcHJvcGVydHlLZXkgPSBhcnIzW2kzICs9IDFdO1xuICAgICAgICAgICAgICAgICAgdmFyICRzY2ggPSAkc2NoZW1hWyRwcm9wZXJ0eUtleV07XG4gICAgICAgICAgICAgICAgICBpZiAoJHNjaC5kZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRwYXNzRGF0YSA9ICRkYXRhICsgaXQudXRpbC5nZXRQcm9wZXJ0eSgkcHJvcGVydHlLZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICgkcnVsZXNHcm91cC50eXBlID09ICdhcnJheScgJiYgQXJyYXkuaXNBcnJheShpdC5zY2hlbWEuaXRlbXMpKSB7XG4gICAgICAgICAgICAgIHZhciBhcnI0ID0gaXQuc2NoZW1hLml0ZW1zO1xuICAgICAgICAgICAgICBpZiAoYXJyNCkge1xuICAgICAgICAgICAgICAgIHZhciAkc2NoLCAkaSA9IC0xLFxuICAgICAgICAgICAgICAgICAgbDQgPSBhcnI0Lmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCRpIDwgbDQpIHtcbiAgICAgICAgICAgICAgICAgICRzY2ggPSBhcnI0WyRpICs9IDFdO1xuICAgICAgICAgICAgICAgICAgaWYgKCRzY2guZGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkcGFzc0RhdGEgPSAkZGF0YSArICdbJyArICRpICsgJ10nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXQuY29tcG9zaXRlUnVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgJGRlZmF1bHRNc2cgPSAnZGVmYXVsdCBpcyBpZ25vcmVkIGZvcjogJyArICRwYXNzRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdC5vcHRzLnN0cmljdERlZmF1bHRzID09PSAnbG9nJykgaXQubG9nZ2VyLndhcm4oJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJGRlZmF1bHRNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyBpZiAoJyArICgkcGFzc0RhdGEpICsgJyA9PT0gdW5kZWZpbmVkICc7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudXNlRGVmYXVsdHMgPT0gJ2VtcHR5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgfHwgJyArICgkcGFzc0RhdGEpICsgJyA9PT0gbnVsbCB8fCAnICsgKCRwYXNzRGF0YSkgKyAnID09PSBcXCdcXCcgJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgKSAnICsgKCRwYXNzRGF0YSkgKyAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy51c2VEZWZhdWx0cyA9PSAnc2hhcmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgJyArIChpdC51c2VEZWZhdWx0KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKEpTT04uc3RyaW5naWZ5KCRzY2guZGVmYXVsdCkpICsgJyAnO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJzsgJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgYXJyNSA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgICAgICAgIGlmIChhcnI1KSB7XG4gICAgICAgICAgICB2YXIgJHJ1bGUsIGk1ID0gLTEsXG4gICAgICAgICAgICAgIGw1ID0gYXJyNS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgd2hpbGUgKGk1IDwgbDUpIHtcbiAgICAgICAgICAgICAgJHJ1bGUgPSBhcnI1W2k1ICs9IDFdO1xuICAgICAgICAgICAgICBpZiAoJHNob3VsZFVzZVJ1bGUoJHJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgdmFyICRjb2RlID0gJHJ1bGUuY29kZShpdCwgJHJ1bGUua2V5d29yZCwgJHJ1bGVzR3JvdXAudHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKCRjb2RlKSB7XG4gICAgICAgICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjb2RlKSArICcgJztcbiAgICAgICAgICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMSArPSAnfSc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyAnICsgKCRjbG9zaW5nQnJhY2VzMSkgKyAnICc7XG4gICAgICAgICAgICAkY2xvc2luZ0JyYWNlczEgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCRydWxlc0dyb3VwLnR5cGUpIHtcbiAgICAgICAgICAgIG91dCArPSAnIH0gJztcbiAgICAgICAgICAgIGlmICgkdHlwZVNjaGVtYSAmJiAkdHlwZVNjaGVtYSA9PT0gJHJ1bGVzR3JvdXAudHlwZSAmJiAhJGNvZXJjZVRvVHlwZXMpIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcgZWxzZSB7ICc7XG4gICAgICAgICAgICAgIHZhciAkc2NoZW1hUGF0aCA9IGl0LnNjaGVtYVBhdGggKyAnLnR5cGUnLFxuICAgICAgICAgICAgICAgICRlcnJTY2hlbWFQYXRoID0gaXQuZXJyU2NoZW1hUGF0aCArICcvdHlwZSc7XG4gICAgICAgICAgICAgIHZhciAkJG91dFN0YWNrID0gJCRvdXRTdGFjayB8fCBbXTtcbiAgICAgICAgICAgICAgJCRvdXRTdGFjay5wdXNoKG91dCk7XG4gICAgICAgICAgICAgIG91dCA9ICcnOyAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgICAgICAgICBpZiAoaXQuY3JlYXRlRXJyb3JzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHsga2V5d29yZDogXFwnJyArICgkZXJyb3JLZXl3b3JkIHx8ICd0eXBlJykgKyAnXFwnICwgZGF0YVBhdGg6IChkYXRhUGF0aCB8fCBcXCdcXCcpICsgJyArIChpdC5lcnJvclBhdGgpICsgJyAsIHNjaGVtYVBhdGg6ICcgKyAoaXQudXRpbC50b1F1b3RlZFN0cmluZygkZXJyU2NoZW1hUGF0aCkpICsgJyAsIHBhcmFtczogeyB0eXBlOiBcXCcnO1xuICAgICAgICAgICAgICAgIGlmICgkdHlwZUlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dCArPSAnXFwnIH0gJztcbiAgICAgICAgICAgICAgICBpZiAoaXQub3B0cy5tZXNzYWdlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnICwgbWVzc2FnZTogXFwnc2hvdWxkIGJlICc7XG4gICAgICAgICAgICAgICAgICBpZiAoJHR5cGVJc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSAnJyArICgkdHlwZVNjaGVtYS5qb2luKFwiLFwiKSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJycgKyAoJHR5cGVTY2hlbWEpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXCcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0Lm9wdHMudmVyYm9zZSkge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgLCBzY2hlbWE6IHZhbGlkYXRlLnNjaGVtYScgKyAoJHNjaGVtYVBhdGgpICsgJyAsIHBhcmVudFNjaGVtYTogdmFsaWRhdGUuc2NoZW1hJyArIChpdC5zY2hlbWFQYXRoKSArICcgLCBkYXRhOiAnICsgKCRkYXRhKSArICcgJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0ICs9ICcgfSAnO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHt9ICc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFyIF9fZXJyID0gb3V0O1xuICAgICAgICAgICAgICBvdXQgPSAkJG91dFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICBpZiAoIWl0LmNvbXBvc2l0ZVJ1bGUgJiYgJGJyZWFrT25FcnJvcikge1xuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICAgICAgICAgIGlmIChpdC5hc3luYykge1xuICAgICAgICAgICAgICAgICAgb3V0ICs9ICcgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihbJyArIChfX2VycikgKyAnXSk7ICc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIG91dCArPSAnIHZhbGlkYXRlLmVycm9ycyA9IFsnICsgKF9fZXJyKSArICddOyByZXR1cm4gZmFsc2U7ICc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHZhciBlcnIgPSAnICsgKF9fZXJyKSArICc7ICBpZiAodkVycm9ycyA9PT0gbnVsbCkgdkVycm9ycyA9IFtlcnJdOyBlbHNlIHZFcnJvcnMucHVzaChlcnIpOyBlcnJvcnMrKzsgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdXQgKz0gJyB9ICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgICAgICAgICBvdXQgKz0gJyBpZiAoZXJyb3JzID09PSAnO1xuICAgICAgICAgICAgaWYgKCR0b3ApIHtcbiAgICAgICAgICAgICAgb3V0ICs9ICcwJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG91dCArPSAnZXJyc18nICsgKCRsdmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9ICcpIHsgJztcbiAgICAgICAgICAgICRjbG9zaW5nQnJhY2VzMiArPSAnfSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmICgkYnJlYWtPbkVycm9yKSB7XG4gICAgb3V0ICs9ICcgJyArICgkY2xvc2luZ0JyYWNlczIpICsgJyAnO1xuICB9XG4gIGlmICgkdG9wKSB7XG4gICAgaWYgKCRhc3luYykge1xuICAgICAgb3V0ICs9ICcgaWYgKGVycm9ycyA9PT0gMCkgcmV0dXJuIGRhdGE7ICAgICAgICAgICAnO1xuICAgICAgb3V0ICs9ICcgZWxzZSB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKHZFcnJvcnMpOyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gJyB2YWxpZGF0ZS5lcnJvcnMgPSB2RXJyb3JzOyAnO1xuICAgICAgb3V0ICs9ICcgcmV0dXJuIGVycm9ycyA9PT0gMDsgICAgICAgJztcbiAgICB9XG4gICAgb3V0ICs9ICcgfTsgcmV0dXJuIHZhbGlkYXRlOyc7XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdmFyICcgKyAoJHZhbGlkKSArICcgPSBlcnJvcnMgPT09IGVycnNfJyArICgkbHZsKSArICc7JztcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VHcm91cCgkcnVsZXNHcm91cCkge1xuICAgIHZhciBydWxlcyA9ICRydWxlc0dyb3VwLnJ1bGVzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoJHNob3VsZFVzZVJ1bGUocnVsZXNbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uICRzaG91bGRVc2VSdWxlKCRydWxlKSB7XG4gICAgcmV0dXJuIGl0LnNjaGVtYVskcnVsZS5rZXl3b3JkXSAhPT0gdW5kZWZpbmVkIHx8ICgkcnVsZS5pbXBsZW1lbnRzICYmICRydWxlSW1wbGVtZW50c1NvbWVLZXl3b3JkKCRydWxlKSk7XG4gIH1cblxuICBmdW5jdGlvbiAkcnVsZUltcGxlbWVudHNTb21lS2V5d29yZCgkcnVsZSkge1xuICAgIHZhciBpbXBsID0gJHJ1bGUuaW1wbGVtZW50cztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGltcGwubGVuZ3RoOyBpKyspXG4gICAgICBpZiAoaXQuc2NoZW1hW2ltcGxbaV1dICE9PSB1bmRlZmluZWQpIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBJREVOVElGSUVSID0gL15bYS16XyRdW2EtejAtOV8kLV0qJC9pO1xudmFyIGN1c3RvbVJ1bGVDb2RlID0gcmVxdWlyZSgnLi9kb3Rqcy9jdXN0b20nKTtcbnZhciBkZWZpbml0aW9uU2NoZW1hID0gcmVxdWlyZSgnLi9kZWZpbml0aW9uX3NjaGVtYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGRLZXl3b3JkLFxuICBnZXQ6IGdldEtleXdvcmQsXG4gIHJlbW92ZTogcmVtb3ZlS2V5d29yZCxcbiAgdmFsaWRhdGU6IHZhbGlkYXRlS2V5d29yZFxufTtcblxuXG4vKipcbiAqIERlZmluZSBjdXN0b20ga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgY3VzdG9tIGtleXdvcmQsIHNob3VsZCBiZSB1bmlxdWUgKGluY2x1ZGluZyBkaWZmZXJlbnQgZnJvbSBhbGwgc3RhbmRhcmQsIGN1c3RvbSBhbmQgbWFjcm8ga2V5d29yZHMpLlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb24ga2V5d29yZCBkZWZpbml0aW9uIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgYHR5cGVgICh0eXBlKHMpIHdoaWNoIHRoZSBrZXl3b3JkIGFwcGxpZXMgdG8pLCBgdmFsaWRhdGVgIG9yIGBjb21waWxlYC5cbiAqIEByZXR1cm4ge0Fqdn0gdGhpcyBmb3IgbWV0aG9kIGNoYWluaW5nXG4gKi9cbmZ1bmN0aW9uIGFkZEtleXdvcmQoa2V5d29yZCwgZGVmaW5pdGlvbikge1xuICAvKiBqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG4gIC8qIGVzbGludCBuby1zaGFkb3c6IDAgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgaWYgKFJVTEVTLmtleXdvcmRzW2tleXdvcmRdKVxuICAgIHRocm93IG5ldyBFcnJvcignS2V5d29yZCAnICsga2V5d29yZCArICcgaXMgYWxyZWFkeSBkZWZpbmVkJyk7XG5cbiAgaWYgKCFJREVOVElGSUVSLnRlc3Qoa2V5d29yZCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdLZXl3b3JkICcgKyBrZXl3b3JkICsgJyBpcyBub3QgYSB2YWxpZCBpZGVudGlmaWVyJyk7XG5cbiAgaWYgKGRlZmluaXRpb24pIHtcbiAgICB0aGlzLnZhbGlkYXRlS2V5d29yZChkZWZpbml0aW9uLCB0cnVlKTtcblxuICAgIHZhciBkYXRhVHlwZSA9IGRlZmluaXRpb24udHlwZTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhVHlwZSkpIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxkYXRhVHlwZS5sZW5ndGg7IGkrKylcbiAgICAgICAgX2FkZFJ1bGUoa2V5d29yZCwgZGF0YVR5cGVbaV0sIGRlZmluaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbik7XG4gICAgfVxuXG4gICAgdmFyIG1ldGFTY2hlbWEgPSBkZWZpbml0aW9uLm1ldGFTY2hlbWE7XG4gICAgaWYgKG1ldGFTY2hlbWEpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLiRkYXRhICYmIHRoaXMuX29wdHMuJGRhdGEpIHtcbiAgICAgICAgbWV0YVNjaGVtYSA9IHtcbiAgICAgICAgICBhbnlPZjogW1xuICAgICAgICAgICAgbWV0YVNjaGVtYSxcbiAgICAgICAgICAgIHsgJyRyZWYnOiAnaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2Fqdi12YWxpZGF0b3IvYWp2L21hc3Rlci9saWIvcmVmcy9kYXRhLmpzb24jJyB9XG4gICAgICAgICAgXVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgZGVmaW5pdGlvbi52YWxpZGF0ZVNjaGVtYSA9IHRoaXMuY29tcGlsZShtZXRhU2NoZW1hLCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICBSVUxFUy5rZXl3b3Jkc1trZXl3b3JkXSA9IFJVTEVTLmFsbFtrZXl3b3JkXSA9IHRydWU7XG5cblxuICBmdW5jdGlvbiBfYWRkUnVsZShrZXl3b3JkLCBkYXRhVHlwZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBydWxlR3JvdXA7XG4gICAgZm9yICh2YXIgaT0wOyBpPFJVTEVTLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcmcgPSBSVUxFU1tpXTtcbiAgICAgIGlmIChyZy50eXBlID09IGRhdGFUeXBlKSB7XG4gICAgICAgIHJ1bGVHcm91cCA9IHJnO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXJ1bGVHcm91cCkge1xuICAgICAgcnVsZUdyb3VwID0geyB0eXBlOiBkYXRhVHlwZSwgcnVsZXM6IFtdIH07XG4gICAgICBSVUxFUy5wdXNoKHJ1bGVHcm91cCk7XG4gICAgfVxuXG4gICAgdmFyIHJ1bGUgPSB7XG4gICAgICBrZXl3b3JkOiBrZXl3b3JkLFxuICAgICAgZGVmaW5pdGlvbjogZGVmaW5pdGlvbixcbiAgICAgIGN1c3RvbTogdHJ1ZSxcbiAgICAgIGNvZGU6IGN1c3RvbVJ1bGVDb2RlLFxuICAgICAgaW1wbGVtZW50czogZGVmaW5pdGlvbi5pbXBsZW1lbnRzXG4gICAgfTtcbiAgICBydWxlR3JvdXAucnVsZXMucHVzaChydWxlKTtcbiAgICBSVUxFUy5jdXN0b21ba2V5d29yZF0gPSBydWxlO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBHZXQga2V5d29yZFxuICogQHRoaXMgIEFqdlxuICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgcHJlLWRlZmluZWQgb3IgY3VzdG9tIGtleXdvcmQuXG4gKiBAcmV0dXJuIHtPYmplY3R8Qm9vbGVhbn0gY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiwgYHRydWVgIGlmIGl0IGlzIGEgcHJlZGVmaW5lZCBrZXl3b3JkLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIHJ1bGUgPSB0aGlzLlJVTEVTLmN1c3RvbVtrZXl3b3JkXTtcbiAgcmV0dXJuIHJ1bGUgPyBydWxlLmRlZmluaXRpb24gOiB0aGlzLlJVTEVTLmtleXdvcmRzW2tleXdvcmRdIHx8IGZhbHNlO1xufVxuXG5cbi8qKlxuICogUmVtb3ZlIGtleXdvcmRcbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXl3b3JkIHByZS1kZWZpbmVkIG9yIGN1c3RvbSBrZXl3b3JkLlxuICogQHJldHVybiB7QWp2fSB0aGlzIGZvciBtZXRob2QgY2hhaW5pbmdcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlS2V5d29yZChrZXl3b3JkKSB7XG4gIC8qIGpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cbiAgdmFyIFJVTEVTID0gdGhpcy5SVUxFUztcbiAgZGVsZXRlIFJVTEVTLmtleXdvcmRzW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuYWxsW2tleXdvcmRdO1xuICBkZWxldGUgUlVMRVMuY3VzdG9tW2tleXdvcmRdO1xuICBmb3IgKHZhciBpPTA7IGk8UlVMRVMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcnVsZXMgPSBSVUxFU1tpXS5ydWxlcztcbiAgICBmb3IgKHZhciBqPTA7IGo8cnVsZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChydWxlc1tqXS5rZXl3b3JkID09IGtleXdvcmQpIHtcbiAgICAgICAgcnVsZXMuc3BsaWNlKGosIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4gKiBWYWxpZGF0ZSBrZXl3b3JkIGRlZmluaXRpb25cbiAqIEB0aGlzICBBanZcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZpbml0aW9uIGtleXdvcmQgZGVmaW5pdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRocm93RXJyb3IgdHJ1ZSB0byB0aHJvdyBleGNlcHRpb24gaWYgZGVmaW5pdGlvbiBpcyBpbnZhbGlkXG4gKiBAcmV0dXJuIHtib29sZWFufSB2YWxpZGF0aW9uIHJlc3VsdFxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUtleXdvcmQoZGVmaW5pdGlvbiwgdGhyb3dFcnJvcikge1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gbnVsbDtcbiAgdmFyIHYgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmQgPSB0aGlzLl92YWxpZGF0ZUtleXdvcmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB0aGlzLmNvbXBpbGUoZGVmaW5pdGlvblNjaGVtYSwgdHJ1ZSk7XG5cbiAgaWYgKHYoZGVmaW5pdGlvbikpIHJldHVybiB0cnVlO1xuICB2YWxpZGF0ZUtleXdvcmQuZXJyb3JzID0gdi5lcnJvcnM7XG4gIGlmICh0aHJvd0Vycm9yKVxuICAgIHRocm93IG5ldyBFcnJvcignY3VzdG9tIGtleXdvcmQgZGVmaW5pdGlvbiBpcyBpbnZhbGlkOiAnICArIHRoaXMuZXJyb3JzVGV4dCh2LmVycm9ycykpO1xuICBlbHNlXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBkbyBub3QgZWRpdCAuanMgZmlsZXMgZGlyZWN0bHkgLSBlZGl0IHNyYy9pbmRleC5qc3RcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXF1YWwoYSwgYikge1xuICBpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XG5cbiAgaWYgKGEgJiYgYiAmJiB0eXBlb2YgYSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PSAnb2JqZWN0Jykge1xuICAgIGlmIChhLmNvbnN0cnVjdG9yICE9PSBiLmNvbnN0cnVjdG9yKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgbGVuZ3RoLCBpLCBrZXlzO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGEpKSB7XG4gICAgICBsZW5ndGggPSBhLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggIT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tICE9PSAwOylcbiAgICAgICAgaWYgKCFlcXVhbChhW2ldLCBiW2ldKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cblxuICAgIGlmIChhLmNvbnN0cnVjdG9yID09PSBSZWdFeHApIHJldHVybiBhLnNvdXJjZSA9PT0gYi5zb3VyY2UgJiYgYS5mbGFncyA9PT0gYi5mbGFncztcbiAgICBpZiAoYS52YWx1ZU9mICE9PSBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YpIHJldHVybiBhLnZhbHVlT2YoKSA9PT0gYi52YWx1ZU9mKCk7XG4gICAgaWYgKGEudG9TdHJpbmcgIT09IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpIHJldHVybiBhLnRvU3RyaW5nKCkgPT09IGIudG9TdHJpbmcoKTtcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhhKTtcbiAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSBPYmplY3Qua2V5cyhiKS5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tICE9PSAwOylcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIGtleXNbaV0pKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSAhPT0gMDspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICBpZiAoIWVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gdHJ1ZSBpZiBib3RoIE5hTiwgZmFsc2Ugb3RoZXJ3aXNlXG4gIHJldHVybiBhIT09YSAmJiBiIT09Yjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGRhdGEsIG9wdHMpIHtcbiAgICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcbiAgICBpZiAodHlwZW9mIG9wdHMgPT09ICdmdW5jdGlvbicpIG9wdHMgPSB7IGNtcDogb3B0cyB9O1xuICAgIHZhciBjeWNsZXMgPSAodHlwZW9mIG9wdHMuY3ljbGVzID09PSAnYm9vbGVhbicpID8gb3B0cy5jeWNsZXMgOiBmYWxzZTtcblxuICAgIHZhciBjbXAgPSBvcHRzLmNtcCAmJiAoZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYW9iaiA9IHsga2V5OiBhLCB2YWx1ZTogbm9kZVthXSB9O1xuICAgICAgICAgICAgICAgIHZhciBib2JqID0geyBrZXk6IGIsIHZhbHVlOiBub2RlW2JdIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGYoYW9iaiwgYm9iaik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIH0pKG9wdHMuY21wKTtcblxuICAgIHZhciBzZWVuID0gW107XG4gICAgcmV0dXJuIChmdW5jdGlvbiBzdHJpbmdpZnkgKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUgJiYgbm9kZS50b0pTT04gJiYgdHlwZW9mIG5vZGUudG9KU09OID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBub2RlID0gbm9kZS50b0pTT04oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgaWYgKHR5cGVvZiBub2RlID09ICdudW1iZXInKSByZXR1cm4gaXNGaW5pdGUobm9kZSkgPyAnJyArIG5vZGUgOiAnbnVsbCc7XG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZSAhPT0gJ29iamVjdCcpIHJldHVybiBKU09OLnN0cmluZ2lmeShub2RlKTtcblxuICAgICAgICB2YXIgaSwgb3V0O1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgICAgICAgb3V0ID0gJ1snO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG5vZGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSkgb3V0ICs9ICcsJztcbiAgICAgICAgICAgICAgICBvdXQgKz0gc3RyaW5naWZ5KG5vZGVbaV0pIHx8ICdudWxsJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQgKyAnXSc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZSA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcblxuICAgICAgICBpZiAoc2Vlbi5pbmRleE9mKG5vZGUpICE9PSAtMSkge1xuICAgICAgICAgICAgaWYgKGN5Y2xlcykgcmV0dXJuIEpTT04uc3RyaW5naWZ5KCdfX2N5Y2xlX18nKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0NvbnZlcnRpbmcgY2lyY3VsYXIgc3RydWN0dXJlIHRvIEpTT04nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWVuSW5kZXggPSBzZWVuLnB1c2gobm9kZSkgLSAxO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG5vZGUpLnNvcnQoY21wICYmIGNtcChub2RlKSk7XG4gICAgICAgIG91dCA9ICcnO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBzdHJpbmdpZnkobm9kZVtrZXldKTtcblxuICAgICAgICAgICAgaWYgKCF2YWx1ZSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAob3V0KSBvdXQgKz0gJywnO1xuICAgICAgICAgICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KGtleSkgKyAnOicgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBzZWVuLnNwbGljZShzZWVuSW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gJ3snICsgb3V0ICsgJ30nO1xuICAgIH0pKGRhdGEpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHRyYXZlcnNlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc2NoZW1hLCBvcHRzLCBjYikge1xuICAvLyBMZWdhY3kgc3VwcG9ydCBmb3IgdjAuMy4xIGFuZCBlYXJsaWVyLlxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBjYiA9IG9wdHMuY2IgfHwgY2I7XG4gIHZhciBwcmUgPSAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpID8gY2IgOiBjYi5wcmUgfHwgZnVuY3Rpb24oKSB7fTtcbiAgdmFyIHBvc3QgPSBjYi5wb3N0IHx8IGZ1bmN0aW9uKCkge307XG5cbiAgX3RyYXZlcnNlKG9wdHMsIHByZSwgcG9zdCwgc2NoZW1hLCAnJywgc2NoZW1hKTtcbn07XG5cblxudHJhdmVyc2Uua2V5d29yZHMgPSB7XG4gIGFkZGl0aW9uYWxJdGVtczogdHJ1ZSxcbiAgaXRlbXM6IHRydWUsXG4gIGNvbnRhaW5zOiB0cnVlLFxuICBhZGRpdGlvbmFsUHJvcGVydGllczogdHJ1ZSxcbiAgcHJvcGVydHlOYW1lczogdHJ1ZSxcbiAgbm90OiB0cnVlXG59O1xuXG50cmF2ZXJzZS5hcnJheUtleXdvcmRzID0ge1xuICBpdGVtczogdHJ1ZSxcbiAgYWxsT2Y6IHRydWUsXG4gIGFueU9mOiB0cnVlLFxuICBvbmVPZjogdHJ1ZVxufTtcblxudHJhdmVyc2UucHJvcHNLZXl3b3JkcyA9IHtcbiAgZGVmaW5pdGlvbnM6IHRydWUsXG4gIHByb3BlcnRpZXM6IHRydWUsXG4gIHBhdHRlcm5Qcm9wZXJ0aWVzOiB0cnVlLFxuICBkZXBlbmRlbmNpZXM6IHRydWVcbn07XG5cbnRyYXZlcnNlLnNraXBLZXl3b3JkcyA9IHtcbiAgZGVmYXVsdDogdHJ1ZSxcbiAgZW51bTogdHJ1ZSxcbiAgY29uc3Q6IHRydWUsXG4gIHJlcXVpcmVkOiB0cnVlLFxuICBtYXhpbXVtOiB0cnVlLFxuICBtaW5pbXVtOiB0cnVlLFxuICBleGNsdXNpdmVNYXhpbXVtOiB0cnVlLFxuICBleGNsdXNpdmVNaW5pbXVtOiB0cnVlLFxuICBtdWx0aXBsZU9mOiB0cnVlLFxuICBtYXhMZW5ndGg6IHRydWUsXG4gIG1pbkxlbmd0aDogdHJ1ZSxcbiAgcGF0dGVybjogdHJ1ZSxcbiAgZm9ybWF0OiB0cnVlLFxuICBtYXhJdGVtczogdHJ1ZSxcbiAgbWluSXRlbXM6IHRydWUsXG4gIHVuaXF1ZUl0ZW1zOiB0cnVlLFxuICBtYXhQcm9wZXJ0aWVzOiB0cnVlLFxuICBtaW5Qcm9wZXJ0aWVzOiB0cnVlXG59O1xuXG5cbmZ1bmN0aW9uIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaGVtYSwganNvblB0ciwgcm9vdFNjaGVtYSwgcGFyZW50SnNvblB0ciwgcGFyZW50S2V5d29yZCwgcGFyZW50U2NoZW1hLCBrZXlJbmRleCkge1xuICBpZiAoc2NoZW1hICYmIHR5cGVvZiBzY2hlbWEgPT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoc2NoZW1hKSkge1xuICAgIHByZShzY2hlbWEsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpO1xuICAgIGZvciAodmFyIGtleSBpbiBzY2hlbWEpIHtcbiAgICAgIHZhciBzY2ggPSBzY2hlbWFba2V5XTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjaCkpIHtcbiAgICAgICAgaWYgKGtleSBpbiB0cmF2ZXJzZS5hcnJheUtleXdvcmRzKSB7XG4gICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHNjaC5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaFtpXSwganNvblB0ciArICcvJyArIGtleSArICcvJyArIGksIHJvb3RTY2hlbWEsIGpzb25QdHIsIGtleSwgc2NoZW1hLCBpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChrZXkgaW4gdHJhdmVyc2UucHJvcHNLZXl3b3Jkcykge1xuICAgICAgICBpZiAoc2NoICYmIHR5cGVvZiBzY2ggPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNjaClcbiAgICAgICAgICAgIF90cmF2ZXJzZShvcHRzLCBwcmUsIHBvc3QsIHNjaFtwcm9wXSwganNvblB0ciArICcvJyArIGtleSArICcvJyArIGVzY2FwZUpzb25QdHIocHJvcCksIHJvb3RTY2hlbWEsIGpzb25QdHIsIGtleSwgc2NoZW1hLCBwcm9wKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChrZXkgaW4gdHJhdmVyc2Uua2V5d29yZHMgfHwgKG9wdHMuYWxsS2V5cyAmJiAhKGtleSBpbiB0cmF2ZXJzZS5za2lwS2V5d29yZHMpKSkge1xuICAgICAgICBfdHJhdmVyc2Uob3B0cywgcHJlLCBwb3N0LCBzY2gsIGpzb25QdHIgKyAnLycgKyBrZXksIHJvb3RTY2hlbWEsIGpzb25QdHIsIGtleSwgc2NoZW1hKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcG9zdChzY2hlbWEsIGpzb25QdHIsIHJvb3RTY2hlbWEsIHBhcmVudEpzb25QdHIsIHBhcmVudEtleXdvcmQsIHBhcmVudFNjaGVtYSwga2V5SW5kZXgpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZXNjYXBlSnNvblB0cihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9+L2csICd+MCcpLnJlcGxhY2UoL1xcLy9nLCAnfjEnKTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Kc29uVG9vbCA9IHZvaWQgMDtcbmNsYXNzIEpzb25Ub29sIHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50LCB2YWxpZGF0b3IgPSBudWxsKSB7XG4gICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgIHRoaXMuY29udGFpbmVyRWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIHRoaXMudmFsaWRhdG9yID0gdmFsaWRhdG9yICE9PSBudWxsICYmIHZhbGlkYXRvciAhPT0gdm9pZCAwID8gdmFsaWRhdG9yIDogKCgpID0+IHsgcmV0dXJuIHsgdmFsaWQ6IHRydWUgfTsgfSk7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gbnVsbDtcbiAgICAgICAgdGhpcy5yb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdGhpcy5yb290LnN0eWxlLmZvbnRGYW1pbHkgPSBcIm1vbm9zcGFjZVwiO1xuICAgICAgICB0aGlzLnJvb3Quc3R5bGUubWFyZ2luTGVmdCA9IFwiMzBweFwiO1xuICAgICAgICB0aGlzLnJvb3QuY2xhc3NMaXN0LmFkZChcImpzb24tdG9vbFwiKTtcbiAgICAgICAgdGhpcy5yb290T2JqZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5yb290RWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlcy5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWVycm9yc1wiKTtcbiAgICAgICAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKTtcbiAgICAgICAgaWZyYW1lLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgIGlmcmFtZS5zdHlsZS5oZWlnaHQgPSBcIjEwMCVcIjtcbiAgICAgICAgaWZyYW1lLnN0eWxlLm92ZXJmbG93ID0gXCJzY3JvbGxcIjtcbiAgICAgICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9IFwiMFwiO1xuICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICAgICAgdGhpcy5pZnJhbWVCb2R5ID0gKF9iID0gKGlmcmFtZS5jb250ZW50RG9jdW1lbnQgfHwgKChfYSA9IGlmcmFtZS5jb250ZW50V2luZG93KSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EuZG9jdW1lbnQpKSkgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLnF1ZXJ5U2VsZWN0b3IoXCJib2R5XCIpO1xuICAgICAgICB0aGlzLmlmcmFtZUJvZHkuYXBwZW5kKHRoaXMucm9vdCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQ3NzKHRoaXMuaWZyYW1lQm9keSk7XG4gICAgICAgIGlmcmFtZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWVCb2R5ID0gKF9iID0gKGlmcmFtZS5jb250ZW50RG9jdW1lbnQgfHwgKChfYSA9IGlmcmFtZS5jb250ZW50V2luZG93KSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EuZG9jdW1lbnQpKSkgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLnF1ZXJ5U2VsZWN0b3IoXCJib2R5XCIpO1xuICAgICAgICAgICAgdGhpcy5pZnJhbWVCb2R5LmFwcGVuZCh0aGlzLnJvb3QpO1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVDc3ModGhpcy5pZnJhbWVCb2R5KTtcbiAgICAgICAgICAgIHRoaXMuaWZyYW1lQm9keS5hcHBlbmRDaGlsZCh0aGlzLmVycm9yTWVzc2FnZXMpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBsb2FkKHNjaGVtYSwgdmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICB0aGlzLnZhbGlkYXRvciA9IHZhbGlkYXRvciAhPT0gbnVsbCAmJiB2YWxpZGF0b3IgIT09IHZvaWQgMCA/IHZhbGlkYXRvciA6IHRoaXMudmFsaWRhdG9yO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IHNjaGVtYTtcbiAgICAgICAgdGhpcy5yb290LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgIGlmIChzY2hlbWEudGl0bGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImgzXCIpO1xuICAgICAgICAgICAgdGl0bGUudGV4dENvbnRlbnQgPSBzY2hlbWEudGl0bGU7XG4gICAgICAgICAgICBKc29uRWxlbWVudC5hZGREZXNjcmlwdGlvbih0aXRsZSwgc2NoZW1hLmRlc2NyaXB0aW9uLCBzY2hlbWEgPT09IG51bGwgfHwgc2NoZW1hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBzY2hlbWEuZXhhbXBsZXMpO1xuICAgICAgICAgICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJvb3RPYmplY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGhpcy5yb290T2JqZWN0KTtcbiAgICAgICAgdGhpcy5yb290RWxlbWVudCA9IG5ldyBKc29uRWxlbWVudCh0aGlzLnJvb3RPYmplY3QsIHNjaGVtYSwgdmFsdWUsICgpID0+IHRoaXMub25VcGRhdGUoKSwgKCkgPT4gdGhpcy52YWxpZGF0ZSgpKTtcbiAgICAgICAgdGhpcy52YWxpZGF0ZSgpO1xuICAgIH1cbiAgICBoaWRlKCkge1xuICAgICAgICB0aGlzLmNvbnRhaW5lckVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIjtcbiAgICB9XG4gICAgc2V0VmFsaWRhdG9yKHZhbGlkYXRvcikge1xuICAgICAgICB0aGlzLnZhbGlkYXRvciA9IHZhbGlkYXRvcjtcbiAgICB9XG4gICAgZ2V0VmFsdWUoKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgcmV0dXJuIChfYSA9IHRoaXMucm9vdEVsZW1lbnQpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5nZXRWYWx1ZSgpO1xuICAgIH1cbiAgICBvblVwZGF0ZSgpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoIXRoaXMucm9vdE9iamVjdClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgbGV0IG51bWJlciA9IDE7XG4gICAgICAgIChfYSA9IHRoaXMucm9vdE9iamVjdCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLnF1ZXJ5U2VsZWN0b3JBbGwoXCIubGluZS1udW1iZXJcIikuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgIGUuaW5uZXJUZXh0ID0gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBudW1iZXIrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudmFsaWRhdGUoKTtcbiAgICB9XG4gICAgdmFsaWRhdGUoKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHZhciBfYTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYSAmJiB0aGlzLmVycm9yTWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWxpZCA9IHRoaXMudmFsaWRhdG9yKHRoaXMuZ2V0VmFsdWUoKSwgdGhpcy5zY2hlbWEpO1xuICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JNZXNzYWdlcy5pbm5lckhUTUwgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmICghdmFsaWQudmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvck1lc3NhZ2VzLmlubmVySFRNTCA9ICgoX2EgPSB2YWxpZC5lcnJvcnMpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IFtdKS5tYXAoZSA9PiB0eXBlb2YgZSA9PT0gXCJzdHJpbmdcIiA/IGUgOiBlLm1lc3NhZ2UpLmpvaW4oXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcbiAgICB9XG4gICAgY3JlYXRlQ3NzKHBhcmVudCkge1xuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgc3R5bGUuaW5uZXJIVE1MID1cbiAgICAgICAgICAgIGBcbiAgICAgICAgICAgIC5qc29uLXRvb2wtYnRuXG4gICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IGJsYWNrIHNvbGlkO1xuICAgICAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC5qc29uLXRvb2wtYmxvY2sgPiAuanNvbi10b29sLWJ0biB7XG4gICAgICAgICAgICAgICAgbWFyZ2luLXRvcDogLTE3cHg7XG4gICAgICAgICAgICAgICAgbWFyZ2luLWxlZnQ6IC00MHB4O1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC5qc29uLXRvb2wtYmxvY2s6aG92ZXIgPiAuanNvbi10b29sLWJ0blxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAuanNvbi10b29sLXZhbHVlID4gLmpzb24tdG9vbC1idG4ge1xuICAgICAgICAgICAgICAgIG1hcmdpbi1sZWZ0OiAxMHB4O1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgICAgICAgICAgb3BhY2l0eSA6MDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAuanNvbi10b29sLXZhbHVlOmhvdmVyID4gLmpzb24tdG9vbC1idG5cbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG9wYWNpdHkgOjE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLmpzb24tdG9vbC1rZXkgPiAuanNvbi10b29sLWJ0bnMge1xuICAgICAgICAgICAgICAgIG1hcmdpbi1sZWZ0OiAtMzJweDtcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgICAgICAgICAgIHdpZHRoOiAzMnB4O1xuICAgICAgICAgICAgICAgIHRleHQtYWxpZ246IHJpZ2h0O1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLmpzb24tdG9vbC1rZXk6aG92ZXIgPiAuanNvbi10b29sLWJ0bnNcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDE7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAuanNvbi10b29sLWtleSA+IC5qc29uLXRvb2wtYnRucyA+IC5qc29uLXRvb2wtYnRuIHtcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgICAgICAgICAgICAgbWFyZ2luLXJpZ2h0OiAycHg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLmpzb24tdG9vbC12YWx1ZSA+IC5qc29uLXRvb2wtdHlwZVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmxvYXQ6cmlnaHQ7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMDtcbiAgICAgICAgICAgICAgICBwYWRkaW5nOjA7XG4gICAgICAgICAgICAgICAgbWFyZ2luOjA7XG4gICAgICAgICAgICAgICAgYm9yZGVyOjA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLmpzb24tdG9vbC12YWx1ZS5qc29uLXRvb2wtb2JqZWN0ID4gLmpzb24tdG9vbC10eXBlXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmbG9hdDpub25lO1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgICAgICAgICAgICBtYXJnaW4tbGVmdDogMTVweDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAuanNvbi10b29sLXZhbHVlOmhvdmVyID4gLmpzb24tdG9vbC10eXBlXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLmpzb24tdG9vbC1ibG9jay5vcGVuZWQgPiAuanNvbi10b29sLWtleSB7ZGlzcGxheTogYmxvY2t9XG4gICAgICAgICAgICAgIC5qc29uLXRvb2wtYmxvY2suY2xvc2VkID4gLmpzb24tdG9vbC1rZXkge2Rpc3BsYXk6IG5vbmV9XG5cbiAgICAgICAgICAgICAgLmxpbmUtbnVtYmVyXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICAgICAgICAgICAgbGVmdDogMDtcbiAgICAgICAgICAgICAgICB0ZXh0LWFsaWduOiByaWdodDtcbiAgICAgICAgICAgICAgICB3aWR0aDogMjBweDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAuanNvbi10b29sLXZhbHVlLmpzb24tdG9vbC1vYmplY3QgPiAubGluZS1udW1iZXJcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG1hcmdpbi10b3A6IC0xNXB4O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC5qc29uLXRvb2wgaW5wdXQsIC5qc29uLXRvb2wgc2VsZWN0LCAuanNvbi10b29sIHRleHRhcmVhXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBib3JkZXI6IDA7XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2VjZTllOTtcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgICAgIG1hcmdpbjogMXB4O1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAuanNvbi10b29sLWVycm9ycyB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiByZWQ7XG4gICAgICAgICAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmU7XG4gICAgICAgICAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUtaGVpZ2h0OiAyZW07XG4gICAgICAgICAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgICAgICAgICAgICAgICAgICBmb250LXNpemU6IDEuMmVtO1xuICAgICAgICAgICAgICAgIH1cbmA7XG4gICAgfVxufVxuZXhwb3J0cy5Kc29uVG9vbCA9IEpzb25Ub29sO1xuY2xhc3MgSnNvbkVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQsIHNjaGVtYSwgdmFsdWUsIG9uVXBkYXRlLCB2YWxpZGF0ZSkge1xuICAgICAgICB0aGlzLmFycmF5RWxlbWVudHMgPSBbXTtcbiAgICAgICAgdGhpcy5vYmplY3RFbGVtZW50cyA9IHt9O1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgICB0aGlzLnNldFN0eWxlKCk7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICB0aGlzLm9uVXBkYXRlID0gb25VcGRhdGU7XG4gICAgICAgIHRoaXMudmFsaWRhdGUgPSB2YWxpZGF0ZTtcbiAgICAgICAgdGhpcy5jdXJyZW50VmFsdWVzID0ge307XG4gICAgICAgIHRoaXMudHlwZXMgPSBzY2hlbWEgPyBKc29uRWxlbWVudC5nZXREZWZhdWx0QXZhaWxhYmxlVHlwZXMoc2NoZW1hKSA6IFtdO1xuICAgICAgICBjb25zdCBhY3R1YWxUeXBlID0gSnNvbkVsZW1lbnQuZ2V0VHlwZSh2YWx1ZSk7XG4gICAgICAgIHRoaXMuY3VycmVudFR5cGUgPSBcIlwiO1xuICAgICAgICBpZiAoYWN0dWFsVHlwZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VHlwZSA9IGFjdHVhbFR5cGU7XG4gICAgICAgICAgICB0aGlzLnR5cGVzLnB1c2goYWN0dWFsVHlwZSk7XG4gICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuc2NoZW1hKSB7XG4gICAgICAgICAgICBjb25zdCBkZWYgPSBKc29uRWxlbWVudC5nZXREZWZhdWx0VmFsdWUodGhpcy5zY2hlbWEpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VHlwZSA9IGRlZi50eXBlO1xuICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50VHlwZVZhbHVlKGRlZi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50eXBlcyA9IFsuLi5uZXcgU2V0KHRoaXMudHlwZXMpXTtcbiAgICAgICAgdGhpcy51cGRhdGVFbGVtZW50KCk7XG4gICAgfVxuICAgIHNldEN1cnJlbnRUeXBlVmFsdWUodmFsdWUpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50VmFsdWVzW3RoaXMuY3VycmVudFR5cGVdID0gdHlwZW9mIHZhbHVlICE9PSBcInVuZGVmaW5lZFwiID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh2YWx1ZSkpIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGhpcy52YWxpZGF0ZSlcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGUoKTtcbiAgICB9XG4gICAgc3RhdGljIGFkZERlc2NyaXB0aW9uKGVsZW1lbnQsIGRlc2NyaXB0aW9uLCBleGFtcGxlcykge1xuICAgICAgICBpZiAoZXhhbXBsZXMpIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uID0gYCR7ZGVzY3JpcHRpb24gPyBgJHtkZXNjcmlwdGlvbn1cXG5gIDogXCJcIn1FeGFtcGxlczpcXG4ke2V4YW1wbGVzLm1hcChlID0+IEpTT04uc3RyaW5naWZ5KGUpKS5qb2luKFwiLFxcblwiKX1gO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgZWxlbWVudC50aXRsZSA9IGRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS50ZXh0RGVjb3JhdGlvbiA9IFwidW5kZXJsaW5lIGRvdHRlZFwiO1xuICAgICAgICAgICAgZWxlbWVudC5zdHlsZS5jdXJzb3IgPSBcImhlbHBcIjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0aWMgZ2V0VHlwZSh2YWx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgcmV0dXJuIFwidW5kZWZpbmVkXCI7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiYXJyYXlcIjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0aWMgaXNJbnRlZ2VyKHNjaGVtYSkge1xuICAgICAgICBpZiAoIXNjaGVtYSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgY29uc3QgYXJyID0gQXJyYXkuaXNBcnJheShzY2hlbWEudHlwZSkgPyBzY2hlbWEudHlwZSA6IFtzY2hlbWEudHlwZV07XG4gICAgICAgIHJldHVybiBhcnIuaW5jbHVkZXMoXCJpbnRlZ2VyXCIpICYmICFhcnIuaW5jbHVkZXMoXCJudW1iZXJcIik7XG4gICAgfVxuICAgIHN0YXRpYyBnZXREZWZhdWx0QXZhaWxhYmxlVHlwZXMoc2NoZW1hKSB7XG4gICAgICAgIGxldCB0eXBlcyA9IEFycmF5LmlzQXJyYXkoc2NoZW1hLnR5cGUpID8gWy4uLnNjaGVtYS50eXBlXSA6IFtzY2hlbWEudHlwZV07XG4gICAgICAgIHR5cGVzID0gdHlwZXMubWFwKHQgPT4ge1xuICAgICAgICAgICAgaWYgKHQgPT09IFwiaW50ZWdlclwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm51bWJlclwiO1xuICAgICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgfVxuICAgIHN0YXRpYyBnZXREZWZhdWx0VmFsdWUoc2NoZW1hKSB7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVR5cGVzID0gdGhpcy5nZXREZWZhdWx0QXZhaWxhYmxlVHlwZXMoc2NoZW1hKTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWEuZGVmYXVsdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogdGhpcy5nZXRUeXBlKHNjaGVtYS5kZWZhdWx0KSwgdmFsdWU6IHNjaGVtYS5kZWZhdWx0IH07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2NoZW1hLmV4YW1wbGVzICYmIHNjaGVtYS5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyB0eXBlOiB0aGlzLmdldFR5cGUoc2NoZW1hLmV4YW1wbGVzWzBdKSwgdmFsdWU6IHNjaGVtYS5leGFtcGxlc1swXSB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogYXZhaWxhYmxlVHlwZXNbMF0sIHZhbHVlOiB0aGlzLmdldERlZmF1bHRWYWx1ZUZvclR5cGUoc2NoZW1hLCBhdmFpbGFibGVUeXBlc1swXSkgfTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0aWMgZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZShzY2hlbWEsIHR5cGUpIHtcbiAgICAgICAgdmFyIF9hLCBfYiwgX2M7XG4gICAgICAgIGlmICh0eXBlID09PSBcIm51bGxcIikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnRlZ2VyKHNjaGVtYSkgPyBNYXRoLmNlaWwoKF9hID0gc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLm1pbmltdW0pICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDApIDogKF9iID0gc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLm1pbmltdW0pICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKHNjaGVtYSA9PT0gbnVsbCB8fCBzY2hlbWEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHNjaGVtYS5lbnVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBzY2hlbWEuZW51bVswXTtcbiAgICAgICAgICAgIGlmICgoc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLmZvcm1hdCkgPT09IFwiY29sb3JcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIjMDAwMDAwXCI7XG4gICAgICAgICAgICBpZiAoKHNjaGVtYSA9PT0gbnVsbCB8fCBzY2hlbWEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHNjaGVtYS5mb3JtYXQpID09PSBcImRhdGVcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoKS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJhcnJheVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICAgICAgICBpZiAoc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJlcXVpcmVkIG9mIChfYyA9IHNjaGVtYS5yZXF1aXJlZCkgIT09IG51bGwgJiYgX2MgIT09IHZvaWQgMCA/IF9jIDogW10pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzY2hlbWEucHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShyZXF1aXJlZCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmID0gdGhpcy5nZXREZWZhdWx0VmFsdWUoc2NoZW1hLnByb3BlcnRpZXNbcmVxdWlyZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqW3JlcXVpcmVkXSA9IGRlZi52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9XG4gICAgfVxuICAgIHVwZGF0ZUVsZW1lbnQoKSB7XG4gICAgICAgIHZhciBfYSwgX2IsIF9jLCBfZCwgX2UsIF9mLCBfZywgX2gsIF9qLCBfaywgX2wsIF9tLCBfbywgX3AsIF9xLCBfciwgX3MsIF90LCBfdSwgX3YsIF93LCBfeCwgX3ksIF96LCBfMCwgXzEsIF8yO1xuICAgICAgICB0aGlzLm9iamVjdEVsZW1lbnRzID0ge307XG4gICAgICAgIHRoaXMuYXJyYXlFbGVtZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShcImpzb24tdG9vbC1vYmplY3RcIik7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQodGhpcy5jcmVhdGVMaW5lTnVtYmVyKCkpO1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5jdXJyZW50VHlwZTtcbiAgICAgICAgY29uc3QgdmFsID0gKF9hID0gdGhpcy5jdXJyZW50VmFsdWVzW3R5cGVdKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiAodGhpcy5jdXJyZW50VmFsdWVzW3R5cGVdID0gSnNvbkVsZW1lbnQuZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZSh0aGlzLnNjaGVtYSwgdHlwZSkpO1xuICAgICAgICBpZiAodGhpcy50eXBlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICAgICAgc2VsZWN0LmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtdHlwZVwiKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdCBvZiB0aGlzLnR5cGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgICAgICAgICAgICBvcHRpb24uaW5uZXJUZXh0ID0gdDtcbiAgICAgICAgICAgICAgICBvcHRpb24udmFsdWUgPSB0O1xuICAgICAgICAgICAgICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGVjdC52YWx1ZSA9IHRoaXMuY3VycmVudFR5cGU7XG4gICAgICAgICAgICBzZWxlY3Qub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VUeXBlKHNlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChzZWxlY3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKHRoaXMuY3JlYXRlTGluZU51bWJlcih0cnVlKSk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLW9iamVjdFwiKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoXCJ7XCIpO1xuICAgICAgICAgICAgY29uc3Qgb2JqZWN0ID0gdGhpcy5jcmVhdGVCbG9jaygpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChvYmplY3QpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChcIn1cIik7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKHRoaXMuY3JlYXRlTGluZU51bWJlcigpKTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIHZhbCAhPT0gbnVsbCAmJiB2YWwgIT09IHZvaWQgMCA/IHZhbCA6IHt9KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2JqID0gdGhpcy5jcmVhdGVPYmplY3RLZXlWYWx1ZVBhaXIoa2V5LCAoKF9iID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5wcm9wZXJ0aWVzKSA/IHRoaXMuc2NoZW1hLnByb3BlcnRpZXNba2V5XSA6IG51bGwsIHZhbFtrZXldKTtcbiAgICAgICAgICAgICAgICBvYmplY3QuYXBwZW5kKG9iaik7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgb2JqLnByZXBlbmQoYnV0dG9ucyk7XG4gICAgICAgICAgICAgICAgYnV0dG9ucy5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJ0bnNcIik7XG4gICAgICAgICAgICAgICAgaWYgKCgoX2MgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2MgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9jLnByb3BlcnRpZXMpICYmICF0aGlzLnNjaGVtYS5wcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlLmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtYnRuXCIpO1xuICAgICAgICAgICAgICAgICAgICByZW1vdmUuaW5uZXJUZXh0ID0gXCJYXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gdGhpcy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHZhbFtrZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50VHlwZVZhbHVlKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5hcHBlbmQocmVtb3ZlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoISgoX2UgPSAoX2QgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2QgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9kLnJlcXVpcmVkKSA9PT0gbnVsbCB8fCBfZSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2UuaW5jbHVkZXMoa2V5KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlLmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtYnRuXCIpO1xuICAgICAgICAgICAgICAgICAgICByZW1vdmUuaW5uZXJUZXh0ID0gXCLiiL1cIjtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdmFsW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUodmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRWxlbWVudCgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLmFwcGVuZChyZW1vdmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgoX2YgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2YgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9mLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnNjaGVtYS5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB2b2lkIDAgPyB2b2lkIDAgOiB2YWwuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKF9oID0gKF9nID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF9nID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfZy5yZXF1aXJlZCkgPT09IG51bGwgfHwgX2ggPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9oLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IHRoaXMuY3JlYXRlT2JqZWN0S2V5VmFsdWVQYWlyKGtleSwgdGhpcy5zY2hlbWEucHJvcGVydGllc1trZXldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5hcHBlbmQob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9iaiA9IHRoaXMuY3JlYXRlT2JqZWN0S2V5VmFsdWVQYWlyKGtleSwgdGhpcy5zY2hlbWEucHJvcGVydGllc1trZXldLCB1bmRlZmluZWQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFwcGVuZChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqLnN0eWxlLnRleHREZWNvcmF0aW9uID0gXCJsaW5lLXRocm91Z2ggMnB4XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iai5wcmVwZW5kKGJ1dHRvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJ0bnNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkLmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtYnRuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkLmlubmVyVGV4dCA9IFwi4omBXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGQub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2E7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChfYSA9IHRoaXMuc2NoZW1hKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EucHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSB0aGlzLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbFtrZXldID0gSnNvbkVsZW1lbnQuZ2V0RGVmYXVsdFZhbHVlKHRoaXMuc2NoZW1hLnByb3BlcnRpZXNba2V5XSkudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFR5cGVWYWx1ZSh2YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5hcHBlbmQoYWRkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImFycmF5XCIpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQodGhpcy5jcmVhdGVMaW5lTnVtYmVyKHRydWUpKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtb2JqZWN0XCIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChcIltcIik7XG4gICAgICAgICAgICBjb25zdCBhcnJheSA9IHRoaXMuY3JlYXRlQmxvY2soKTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoYXJyYXkpO1xuICAgICAgICAgICAgY29uc3QgYWRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGFkZC5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJ0blwiKTtcbiAgICAgICAgICAgIGFkZC5pbm5lclRleHQgPSBcIitcIjtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoYWRkKTtcbiAgICAgICAgICAgIGFkZC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBfYSwgX2I7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsID0gWy4uLnRoaXMuZ2V0VmFsdWUoKV07XG4gICAgICAgICAgICAgICAgaWYgKHZhbC5sZW5ndGggPT09ICgoX2EgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLm1heEl0ZW1zKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICgoX2IgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iLml0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZSA9IEpzb25FbGVtZW50LmdldERlZmF1bHRWYWx1ZSh0aGlzLnNjaGVtYS5pdGVtcykudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHZhbC5wdXNoKGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUodmFsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbGVtZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoXCJdXCIpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZCh0aGlzLmNyZWF0ZUxpbmVOdW1iZXIoKSk7XG4gICAgICAgICAgICBjb25zdCBhcnIgPSB2YWwgIT09IG51bGwgJiYgdmFsICE9PSB2b2lkIDAgPyB2YWwgOiBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gaTtcbiAgICAgICAgICAgICAgICBjb25zdCBvYmogPSB0aGlzLmNyZWF0ZU9iamVjdEtleVZhbHVlUGFpcihpLCAoKF9qID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF9qID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfai5pdGVtcykgPyB0aGlzLnNjaGVtYS5pdGVtcyA6IG51bGwsIHZhbFtpXSk7XG4gICAgICAgICAgICAgICAgYXJyYXkuYXBwZW5kKG9iaik7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgb2JqLnByZXBlbmQoYnV0dG9ucyk7XG4gICAgICAgICAgICAgICAgYnV0dG9ucy5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJ0bnNcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICByZW1vdmUuY2xhc3NMaXN0LmFkZChcImpzb24tdG9vbC1idG5cIik7XG4gICAgICAgICAgICAgICAgcmVtb3ZlLmlubmVyVGV4dCA9IFwiWFwiO1xuICAgICAgICAgICAgICAgIHJlbW92ZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX2E7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFyciA9IFsuLi50aGlzLmdldFZhbHVlKCldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gKChfYSA9IHRoaXMuc2NoZW1hKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EubWluSXRlbXMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICBhcnIuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFR5cGVWYWx1ZShhcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kKHJlbW92ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICAgICAgICAgIHVwLmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wtYnRuXCIpO1xuICAgICAgICAgICAgICAgIHVwLmlubmVyVGV4dCA9IFwi4ZCDXCI7XG4gICAgICAgICAgICAgICAgdXAub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyciA9IFsuLi50aGlzLmdldFZhbHVlKCldO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gYXJyLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgICAgICAgICBhcnIgPSBhcnIuc2xpY2UoMCwgaWR4IC0gMSkuY29uY2F0KGVsZW1lbnQpLmNvbmNhdChhcnIuc2xpY2UoaWR4IC0gMSkpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUoYXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbGVtZW50KCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBidXR0b25zLmFwcGVuZCh1cCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZG93biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgZG93bi5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJ0blwiKTtcbiAgICAgICAgICAgICAgICBkb3duLmlubmVyVGV4dCA9IFwi4ZCBXCI7XG4gICAgICAgICAgICAgICAgZG93bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXJyID0gWy4uLnRoaXMuZ2V0VmFsdWUoKV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBhcnIuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGFyciA9IGFyci5zbGljZSgwLCBpZHggKyAxKS5jb25jYXQoZWxlbWVudCkuY29uY2F0KGFyci5zbGljZShpZHggKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFR5cGVWYWx1ZShhcnIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVsZW1lbnQoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGJ1dHRvbnMuYXBwZW5kKGRvd24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICBjb25zdCBjaGVja2JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICAgICAgICAgIGNoZWNrYm94LnR5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgICAgICAgICBjaGVja2JveC5jaGVja2VkID0gdmFsO1xuICAgICAgICAgICAgY2hlY2tib3gub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50VHlwZVZhbHVlKGNoZWNrYm94LmNoZWNrZWQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoY2hlY2tib3gpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICgoX2sgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX2sgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9rLmVudW0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgWy4uLm5ldyBTZXQodGhpcy5zY2hlbWEuZW51bS5jb25jYXQodmFsKSldKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbi5pbm5lclRleHQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZWN0LnZhbHVlID0gdmFsO1xuICAgICAgICAgICAgICAgIHNlbGVjdC5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50VHlwZVZhbHVlKHNlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKHNlbGVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoKF9sID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF9sID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfbC5mb3JtYXQpID09PSBcInRleHRhcmVhXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IHZhbDtcbiAgICAgICAgICAgICAgICBpbnB1dC5taW5MZW5ndGggPSAoX28gPSAoX20gPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX20gPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9tLm1pbkxlbmd0aCkgIT09IG51bGwgJiYgX28gIT09IHZvaWQgMCA/IF9vIDogMDtcbiAgICAgICAgICAgICAgICBpbnB1dC5tYXhMZW5ndGggPSAoX3EgPSAoX3AgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX3AgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9wLm1heExlbmd0aCkgIT09IG51bGwgJiYgX3EgIT09IHZvaWQgMCA/IF9xIDogOTk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFR5cGVWYWx1ZShpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCgoX3IgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX3IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9yLmZvcm1hdCkgPT09IFwiZGF0ZVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9IFwiZGF0ZVwiO1xuICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX2EsIF9iO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUoKF9iID0gKF9hID0gaW5wdXQudmFsdWVBc0RhdGUpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS50b0RhdGVTdHJpbmcoKSkgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDogXCJcIik7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kKGlucHV0KTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZUFzRGF0ZSA9IG5ldyBEYXRlKHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gXCJ0ZXh0XCI7XG4gICAgICAgICAgICAgICAgaWYgKCgoX3MgPSB0aGlzLnNjaGVtYSkgPT09IG51bGwgfHwgX3MgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9zLmZvcm1hdCkgJiYgW1wicGFzc3dvcmRcIiwgXCJlbWFpbFwiLCBcImNvbG9yXCIsIFwidXJsXCJdLmluY2x1ZGVzKHRoaXMuc2NoZW1hLmZvcm1hdCkpXG4gICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSB0aGlzLnNjaGVtYS5mb3JtYXQ7XG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSB2YWw7XG4gICAgICAgICAgICAgICAgaW5wdXQubWluTGVuZ3RoID0gKF91ID0gKF90ID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF90ID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfdC5taW5MZW5ndGgpICE9PSBudWxsICYmIF91ICE9PSB2b2lkIDAgPyBfdSA6IDA7XG4gICAgICAgICAgICAgICAgaW5wdXQubWF4TGVuZ3RoID0gKF93ID0gKF92ID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF92ID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfdi5tYXhMZW5ndGgpICE9PSBudWxsICYmIF93ICE9PSB2b2lkIDAgPyBfdyA6IDk5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUoaW5wdXQudmFsdWUpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChpbnB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoXCJudWxsXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgICAgICAgICAgaW5wdXQudHlwZSA9IFwibnVtYmVyXCI7XG4gICAgICAgICAgICBpbnB1dC52YWx1ZSA9IHZhbC50b1N0cmluZygpO1xuICAgICAgICAgICAgaW5wdXQubWluID0gKF96ID0gKF95ID0gKF94ID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF94ID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfeC5taW5pbXVtKSA9PT0gbnVsbCB8fCBfeSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX3kudG9TdHJpbmcoKSkgIT09IG51bGwgJiYgX3ogIT09IHZvaWQgMCA/IF96IDogXCJcIjtcbiAgICAgICAgICAgIGlucHV0Lm1heCA9IChfMiA9IChfMSA9IChfMCA9IHRoaXMuc2NoZW1hKSA9PT0gbnVsbCB8fCBfMCA9PT0gdm9pZCAwID8gdm9pZCAwIDogXzAubWF4aW11bSkgPT09IG51bGwgfHwgXzEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF8xLnRvU3RyaW5nKCkpICE9PSBudWxsICYmIF8yICE9PSB2b2lkIDAgPyBfMiA6IFwiXCI7XG4gICAgICAgICAgICBpZiAoSnNvbkVsZW1lbnQuaXNJbnRlZ2VyKHRoaXMuc2NoZW1hKSlcbiAgICAgICAgICAgICAgICBpbnB1dC5zdGVwID0gXCIxXCI7XG4gICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUocGFyc2VGbG9hdChpbnB1dC52YWx1ZSkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmQoaW5wdXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZChgWyR7dHlwZX1dIDogJHt2YWx9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub25VcGRhdGUpXG4gICAgICAgICAgICB0aGlzLm9uVXBkYXRlKCk7XG4gICAgfVxuICAgIGNyZWF0ZUxpbmVOdW1iZXIob3ZlcnJpZGVNYXJnaW4gPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgbGluZU51bWJlci5jbGFzc0xpc3QuYWRkKFwibGluZS1udW1iZXJcIik7XG4gICAgICAgIGlmIChvdmVycmlkZU1hcmdpbilcbiAgICAgICAgICAgIGxpbmVOdW1iZXIuc3R5bGUubWFyZ2luVG9wID0gXCIwXCI7XG4gICAgICAgIHJldHVybiBsaW5lTnVtYmVyO1xuICAgIH1cbiAgICBjcmVhdGVCbG9jaygpIHtcbiAgICAgICAgY29uc3QgYmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBibG9jay5jbGFzc0xpc3QuYWRkKFwianNvbi10b29sLWJsb2NrXCIpO1xuICAgICAgICBibG9jay5zdHlsZS5wYWRkaW5nTGVmdCA9IFwiMjVweFwiO1xuICAgICAgICBibG9jay5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggZGFzaGVkIGJsYWNrXCI7XG4gICAgICAgIGJsb2NrLnN0eWxlLm1hcmdpbkxlZnQgPSBcIjNweFwiO1xuICAgICAgICBsZXQgb3BlbmVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNvbGxhcHNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgYmxvY2suYXBwZW5kKGNvbGxhcHNlKTtcbiAgICAgICAgY29sbGFwc2UuY2xhc3NMaXN0LmFkZChcImpzb24tdG9vbC1idG5cIik7XG4gICAgICAgIGNvbnN0IHRvZ2dsZSA9ICgpID0+IHtcbiAgICAgICAgICAgIG9wZW5lZCA9ICFvcGVuZWQ7XG4gICAgICAgICAgICBjb2xsYXBzZS5pbm5lclRleHQgPSBvcGVuZWQgPyBcIuGQr1wiIDogXCLhkLNcIjtcbiAgICAgICAgICAgIGJsb2NrLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuZWRcIiwgXCJjbG9zZWRcIik7XG4gICAgICAgICAgICBibG9jay5jbGFzc0xpc3QuYWRkKG9wZW5lZCA/IFwib3BlbmVkXCIgOiBcImNsb3NlZFwiKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29sbGFwc2Uub25jbGljayA9IHRvZ2dsZTtcbiAgICAgICAgdG9nZ2xlKCk7XG4gICAgICAgIHJldHVybiBibG9jaztcbiAgICB9XG4gICAgY3JlYXRlT2JqZWN0S2V5VmFsdWVQYWlyKGtleSwgc2NoZW1hLCB2YWx1ZSwgbm9WYWx1ZSA9IGZhbHNlKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxLZXkgPSBrZXk7XG4gICAgICAgIGlmICh0eXBlb2Yga2V5ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBrZXkgPSAoc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLnRpdGxlKSA/IGAke3NjaGVtYS50aXRsZX0gJHtrZXl9YCA6IGtleTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IChfYSA9IHNjaGVtYSA9PT0gbnVsbCB8fCBzY2hlbWEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHNjaGVtYS50aXRsZSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDoga2V5O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgIHRpdGxlLmlubmVyVGV4dCA9IGtleS50b1N0cmluZygpO1xuICAgICAgICBKc29uRWxlbWVudC5hZGREZXNjcmlwdGlvbih0aXRsZSwgc2NoZW1hID09PSBudWxsIHx8IHNjaGVtYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2NoZW1hLmRlc2NyaXB0aW9uLCBzY2hlbWEgPT09IG51bGwgfHwgc2NoZW1hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBzY2hlbWEuZXhhbXBsZXMpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kKHRpdGxlKTtcbiAgICAgICAgcGFyZW50LmNsYXNzTGlzdC5hZGQoXCJqc29uLXRvb2wta2V5XCIpO1xuICAgICAgICBwYXJlbnQuYXBwZW5kKFwiOiBcIik7XG4gICAgICAgIGlmICghbm9WYWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsdWVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBuZXcgSnNvbkVsZW1lbnQodmFsdWVFbGVtZW50LCBzY2hlbWEsIHZhbHVlLCAoKSA9PiB0aGlzLm9uVXBkYXRlICYmIHRoaXMub25VcGRhdGUoKSwgKCkgPT4gdGhpcy52YWxpZGF0ZSAmJiB0aGlzLnZhbGlkYXRlKCkpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFR5cGUgPT09IFwiYXJyYXlcIilcbiAgICAgICAgICAgICAgICB0aGlzLmFycmF5RWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuY3VycmVudFR5cGUgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RFbGVtZW50c1tvcmlnaW5hbEtleV0gPSBlbGVtZW50O1xuICAgICAgICAgICAgcGFyZW50LmFwcGVuZCh2YWx1ZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuICAgIGNoYW5nZVR5cGUodHlwZSkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHRoaXMuY3VycmVudFR5cGUgPSB0eXBlO1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudFZhbHVlcy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAoKF9hID0gdGhpcy5zY2hlbWEpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5kZWZhdWx0KSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBKc29uRWxlbWVudC5nZXRUeXBlKHRoaXMuc2NoZW1hLmRlZmF1bHQpID09PSB0eXBlKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFR5cGVWYWx1ZSh0aGlzLnNjaGVtYS5kZWZhdWx0KTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRUeXBlVmFsdWUoSnNvbkVsZW1lbnQuZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZSh0aGlzLnNjaGVtYSwgdHlwZSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudXBkYXRlRWxlbWVudCgpO1xuICAgIH1cbiAgICBzZXRTdHlsZSgpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLndoaXRlU3BhY2UgPSBcInByZVwiO1xuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChcImpzb24tdG9vbC12YWx1ZVwiKTtcbiAgICB9XG4gICAgZ2V0VmFsdWUoKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgbGV0IHZhbDtcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFR5cGUgPT09IFwiYXJyYXlcIikge1xuICAgICAgICAgICAgdmFsID0gdGhpcy5hcnJheUVsZW1lbnRzLm1hcChlID0+IGUuZ2V0VmFsdWUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGhpcy5jdXJyZW50VHlwZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLm9iamVjdEVsZW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSB0aGlzLm9iamVjdEVsZW1lbnRzW2tleV0uZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbCA9IG9iajtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhbCA9IChfYSA9IHRoaXMuY3VycmVudFZhbHVlc1t0aGlzLmN1cnJlbnRUeXBlXSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogSnNvbkVsZW1lbnQuZ2V0RGVmYXVsdFZhbHVlRm9yVHlwZSh0aGlzLnNjaGVtYSwgdGhpcy5jdXJyZW50VHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jdXJyZW50VmFsdWVzW3RoaXMuY3VycmVudFR5cGVdID0gdmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUpzb25Ub29sLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX19nZW5lcmF0b3IgPSAodGhpcyAmJiB0aGlzLl9fZ2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5BcGlVdGlscyA9IHZvaWQgMDtcbnZhciBBcGlVdGlscyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlVdGlscygpIHtcbiAgICB9XG4gICAgQXBpVXRpbHMucnVuID0gZnVuY3Rpb24gKHVybCwganNvbikge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmF3UmVzcG9uc2UsIGJvZHksIHN0YXR1cztcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9hLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuIFs0IC8qeWllbGQqLywgZmV0Y2godXJsLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShqc29uKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICByYXdSZXNwb25zZSA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIHJhd1Jlc3BvbnNlLmpzb24oKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHkgPSBfYS5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXMgPSByYXdSZXNwb25zZS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgeyBzdGF0dXM6IHN0YXR1cywgYm9keTogYm9keSB9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gQXBpVXRpbHM7XG59KCkpO1xuZXhwb3J0cy5BcGlVdGlscyA9IEFwaVV0aWxzO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19pbXBvcnREZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydERlZmF1bHQpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IFwiZGVmYXVsdFwiOiBtb2QgfTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlNjaGVtYSA9IHZvaWQgMDtcbnZhciB0c2NoXzEgPSByZXF1aXJlKFwidHNjaFwiKTtcbnZhciBhanZfMSA9IF9faW1wb3J0RGVmYXVsdChyZXF1aXJlKFwiYWp2XCIpKTtcbnZhciBTY2hlbWEgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2NoZW1hKHNjaGVtYUZpbGUsIHNjaGVtYUNvbnRlbnQsIG5hbWUsIGpzb25TY2hlbWEsIHRzY2gpIHtcbiAgICAgICAgdGhpcy5zY2hlbWFGaWxlID0gc2NoZW1hRmlsZTtcbiAgICAgICAgdGhpcy5zY2hlbWFDb250ZW50ID0gc2NoZW1hQ29udGVudDtcbiAgICAgICAgdGhpcy5yZWdleCA9IFNjaGVtYS5nZXRSZWdleChuYW1lKTtcbiAgICAgICAgdGhpcy5qc29uU2NoZW1hID0ganNvblNjaGVtYTtcbiAgICAgICAgdGhpcy50c2NoID0gdHNjaDtcbiAgICB9XG4gICAgU2NoZW1hLnByb3RvdHlwZS5nZXRTY2hlbWFGaWxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zY2hlbWFGaWxlO1xuICAgIH07XG4gICAgU2NoZW1hLnByb3RvdHlwZS5nZXRTY2hlbWFDb250ZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zY2hlbWFDb250ZW50O1xuICAgIH07XG4gICAgU2NoZW1hLnByb3RvdHlwZS5nZXRSZWdleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVnZXg7XG4gICAgfTtcbiAgICBTY2hlbWEucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCEhdGhpcy50c2NoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHNjaC52YWxpZGF0ZSh2YWx1ZSk7XG4gICAgICAgIGlmICghIXRoaXMuanNvblNjaGVtYSkge1xuICAgICAgICAgICAgdmFyIGFqdiA9IG5ldyBhanZfMS5kZWZhdWx0KCk7XG4gICAgICAgICAgICB2YXIgdmFsaWRhdGUgPSBhanYuY29tcGlsZSh0aGlzLmpzb25TY2hlbWEpO1xuICAgICAgICAgICAgdmFyIHZhbGlkID0gdmFsaWRhdGUodmFsdWUpO1xuICAgICAgICAgICAgdmFyIGVycm9ycyA9IHZhbGlkID8gW10gOiAoKF9hID0gdmFsaWRhdGUuZXJyb3JzKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiBbXSkubWFwKGZ1bmN0aW9uICh2KSB7IHZhciBfYTsgcmV0dXJuIFwiXCIuY29uY2F0KHYuZGF0YVBhdGgsIFwiIFwiKS5jb25jYXQoKF9hID0gdi5tZXNzYWdlKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiBcIlwiKTsgfSk7XG4gICAgICAgICAgICByZXR1cm4geyB2YWxpZDogISF2YWxpZCwgZXJyb3JzOiBlcnJvcnMgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZXJyb3JzOiBbXSB9O1xuICAgIH07XG4gICAgU2NoZW1hLnByb3RvdHlwZS5nZXRKc29uU2NoZW1hID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoISF0aGlzLnRzY2gpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50c2NoLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5qc29uU2NoZW1hO1xuICAgIH07XG4gICAgU2NoZW1hLnBhcnNlU2NoZW1hID0gZnVuY3Rpb24gKGZpbGUsIGNvbnRlbnQsIHJlc3VsdCkge1xuICAgICAgICBpZiAoIXJlc3VsdClcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgICB2YXIgYWRkSnNvblNjaGVtYSA9IGZ1bmN0aW9uIChuYW1lLCBqc29uU2NoZW1hKSB7IHJldHVybiBTY2hlbWEuYWRkSnNvblNjaGVtYShyZXN1bHQgIT09IG51bGwgJiYgcmVzdWx0ICE9PSB2b2lkIDAgPyByZXN1bHQgOiBbXSwgZmlsZSwgY29udGVudCwgbmFtZSwganNvblNjaGVtYSk7IH07XG4gICAgICAgIHZhciBhZGRUc2NoID0gZnVuY3Rpb24gKG5hbWUsIHRzY2gpIHsgcmV0dXJuIFNjaGVtYS5hZGRUc2NoKHJlc3VsdCAhPT0gbnVsbCAmJiByZXN1bHQgIT09IHZvaWQgMCA/IHJlc3VsdCA6IFtdLCBmaWxlLCBjb250ZW50LCBuYW1lLCB0c2NoKTsgfTtcbiAgICAgICAgdmFyIHRzY2ggPSB0c2NoXzEudHNjaDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAgICAgZXZhbChjb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRXhjZXB0aW9uIGR1cmluZyBcIi5jb25jYXQoZmlsZSksIGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgICBTY2hlbWEuZ2V0UmVnZXggPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChcIl5cIiArIG5hbWUuc3BsaXQoXCIqXCIpXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpOyB9KVxuICAgICAgICAgICAgLmpvaW4oXCIuKlwiKSArIFwiJFwiKTtcbiAgICB9O1xuICAgIFNjaGVtYS5hZGRKc29uU2NoZW1hID0gZnVuY3Rpb24gKHNjaGVtYXMsIHNjaGVtYUZpbGUsIGNvbnRlbnQsIG5hbWUsIGpzb25TY2hlbWEpIHtcbiAgICAgICAgc2NoZW1hcy5wdXNoKG5ldyBTY2hlbWEoc2NoZW1hRmlsZSwgY29udGVudCwgbmFtZSwganNvblNjaGVtYSkpO1xuICAgIH07XG4gICAgU2NoZW1hLmFkZFRzY2ggPSBmdW5jdGlvbiAoc2NoZW1hcywgc2NoZW1hRmlsZSwgY29udGVudCwgbmFtZSwgdHNjaCkge1xuICAgICAgICBzY2hlbWFzLnB1c2gobmV3IFNjaGVtYShzY2hlbWFGaWxlLCBjb250ZW50LCBuYW1lLCB1bmRlZmluZWQsIHRzY2gpKTtcbiAgICB9O1xuICAgIHJldHVybiBTY2hlbWE7XG59KCkpO1xuZXhwb3J0cy5TY2hlbWEgPSBTY2hlbWE7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHRoaXMgJiYgdGhpcy5fX2dlbmVyYXRvcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuU2VydmVyVXRpbHMgPSB2b2lkIDA7XG52YXIgQXBpVXRpbHNfMSA9IHJlcXVpcmUoXCIuL0FwaVV0aWxzXCIpO1xudmFyIFNjaGVtYV8xID0gcmVxdWlyZShcIi4vU2NoZW1hXCIpO1xudmFyIFNlcnZlclV0aWxzID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNlcnZlclV0aWxzKCkge1xuICAgIH1cbiAgICBTZXJ2ZXJVdGlscy5saXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYS5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIEFwaVV0aWxzXzEuQXBpVXRpbHMucnVuKFwiL2FwaVwiLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZDogXCJsaXN0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gWzIgLypyZXR1cm4qLywgX2Euc2VudCgpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBTZXJ2ZXJVdGlscy5sb2FkID0gZnVuY3Rpb24gKHNjaGVtYSwganNvbikge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gWzQgLyp5aWVsZCovLCBBcGlVdGlsc18xLkFwaVV0aWxzLnJ1bihcIi9hcGlcIiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IFwibG9hZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb246IGpzb25cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuYm9keS5zY2hlbWFDb250ZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovLCByZXN1bHRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmJvZHkuc2NoZW1hID0gU2NoZW1hXzEuU2NoZW1hLnBhcnNlU2NoZW1hKHNjaGVtYSwgcmVzdWx0LmJvZHkuc2NoZW1hQ29udGVudClbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgcmVzdWx0XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBTZXJ2ZXJVdGlscy5zYXZlID0gZnVuY3Rpb24gKHNjaGVtYSwganNvbiwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gWzQgLyp5aWVsZCovLCBBcGlVdGlsc18xLkFwaVV0aWxzLnJ1bihcIi9hcGlcIiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IFwic2F2ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb246IGpzb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIFsyIC8qcmV0dXJuKi8sIF9hLnNlbnQoKV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIFNlcnZlclV0aWxzO1xufSgpKTtcbmV4cG9ydHMuU2VydmVyVXRpbHMgPSBTZXJ2ZXJVdGlscztcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX19nZW5lcmF0b3IgPSAodGhpcyAmJiB0aGlzLl9fZ2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5DbGllbnQgPSB2b2lkIDA7XG52YXIgU2VydmVyVXRpbHNfMSA9IHJlcXVpcmUoXCIuL1NlcnZlclV0aWxzXCIpO1xudmFyIEpzb25Ub29sXzEgPSByZXF1aXJlKFwianNvbi10b29sL2pzL0pzb25Ub29sXCIpO1xudmFyIENsaWVudCA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDbGllbnQoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMuc2NoZW1hcyA9IHt9O1xuICAgICAgICB0aGlzLnNjaGVtYSA9IG51bGw7XG4gICAgICAgIHRoaXMuanNvblRvb2wgPSBudWxsO1xuICAgICAgICB0aGlzLnNjaGVtYUZpbGUgPSBudWxsO1xuICAgICAgICB0aGlzLmpzb25GaWxlID0gbnVsbDtcbiAgICAgICAgdmFyIG1lbnUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI21lbnVcIik7XG4gICAgICAgIHRoaXMuanNvblRvb2xSb290ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNqc29uLXRvb2xcIik7XG4gICAgICAgIHRoaXMuc2VsZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcbiAgICAgICAgbWVudS5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdCk7XG4gICAgICAgIHRoaXMuc2VsZWN0Lm9uY2hhbmdlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gX3RoaXMub25GaWxlQ2hhbmdlKCk7IH07XG4gICAgICAgIHRoaXMuYnV0dG9ucyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBzYXZlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICAgICAgc2F2ZS5pbm5lclRleHQgPSBcIlNhdmUgY2hhbmdlc1wiO1xuICAgICAgICBzYXZlLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5zYXZlKCk7IH07XG4gICAgICAgIHZhciBjbG9zZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gICAgICAgIGNsb3NlLmlubmVyVGV4dCA9IFwiRGlzY2FyZCBjaGFuZ2VzXCI7XG4gICAgICAgIGNsb3NlLm9uY2xpY2sgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICB0aGlzLmJ1dHRvbnMuYXBwZW5kQ2hpbGQoc2F2ZSk7XG4gICAgICAgIHRoaXMuYnV0dG9ucy5hcHBlbmRDaGlsZChjbG9zZSk7XG4gICAgICAgIG1lbnUuYXBwZW5kQ2hpbGQodGhpcy5idXR0b25zKTtcbiAgICAgICAgdGhpcy5zZXRKc29uVG9vbFZpc2libGUoZmFsc2UpO1xuICAgIH1cbiAgICBDbGllbnQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNldEpzb25Ub29sVmlzaWJsZShmYWxzZSk7XG4gICAgfTtcbiAgICBDbGllbnQucHJvdG90eXBlLnNldEpzb25Ub29sVmlzaWJsZSA9IGZ1bmN0aW9uICh2aXNpYmxlKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgdGhpcy5zZWxlY3Quc3R5bGUuZGlzcGxheSA9ICF2aXNpYmxlID8gXCJcIiA6IFwibm9uZVwiO1xuICAgICAgICB0aGlzLmJ1dHRvbnMuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyBcIlwiIDogXCJub25lXCI7XG4gICAgICAgIGlmICghdmlzaWJsZSkge1xuICAgICAgICAgICAgKF9hID0gdGhpcy5qc29uVG9vbCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmhpZGUoKTtcbiAgICAgICAgICAgIHRoaXMubG9hZEZpbGVzKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENsaWVudC5wcm90b3R5cGUub25GaWxlQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUsIHNwbGl0LCBzY2hlbWEsIGpzb247XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnNlbGVjdC52YWx1ZTtcbiAgICAgICAgICAgICAgICBzcGxpdCA9IHZhbHVlLnNwbGl0KFwiQFwiKTtcbiAgICAgICAgICAgICAgICBzY2hlbWEgPSBzcGxpdFswXTtcbiAgICAgICAgICAgICAgICBqc29uID0gc3BsaXRbMV07XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkRmlsZShzY2hlbWEsIGpzb24pO1xuICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIENsaWVudC5wcm90b3R5cGUubG9hZEZpbGUgPSBmdW5jdGlvbiAoc2NoZW1hLCBqc29uKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQsIGpzb25TY2hlbWE7XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYS5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIFNlcnZlclV0aWxzXzEuU2VydmVyVXRpbHMubG9hZChzY2hlbWEsIGpzb24pXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5ib2R5LnNjaGVtYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZW1hID0gcmVzdWx0LmJvZHkuc2NoZW1hO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25TY2hlbWEgPSByZXN1bHQuYm9keS5zY2hlbWEuZ2V0SnNvblNjaGVtYSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc29uU2NoZW1hKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZW1hRmlsZSA9IHNjaGVtYTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5qc29uRmlsZSA9IGpzb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0SnNvblRvb2xWaXNpYmxlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmpzb25Ub29sID0gbmV3IEpzb25Ub29sXzEuSnNvblRvb2wodGhpcy5qc29uVG9vbFJvb3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmpzb25Ub29sLmxvYWQoanNvblNjaGVtYSwgcmVzdWx0LmJvZHkudmFsdWUsIGZ1bmN0aW9uICh2KSB7IHJldHVybiByZXN1bHQuYm9keS5zY2hlbWEudmFsaWRhdGUodik7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBDbGllbnQucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSwgcmVzdWx0O1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNjaGVtYSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuanNvblRvb2wpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmpzb25GaWxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zY2hlbWFGaWxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5qc29uVG9vbC5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNjaGVtYS52YWxpZGF0ZSh2YWx1ZSkudmFsaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi8sIGFsZXJ0KFwiUGxlYXNlIGZpeCBhbGwgZXJyb3JzIGJlZm9yZSBzYXZpbmchXCIpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIFNlcnZlclV0aWxzXzEuU2VydmVyVXRpbHMuc2F2ZSh0aGlzLnNjaGVtYUZpbGUsIHRoaXMuanNvbkZpbGUsIHZhbHVlKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEpzb25Ub29sVmlzaWJsZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGVydChcIkZhaWxlZCB0byBzYXZlOiBcIi5jb25jYXQocmVzdWx0LmJvZHkubXNnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgQ2xpZW50LnByb3RvdHlwZS5sb2FkRmlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQsIGRlZmF1bHRPcHRpb24sIHNjaGVtYSwgX2ksIF9hLCBmaWxlLCBvcHRpb247XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9iKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYi5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIFNlcnZlclV0aWxzXzEuU2VydmVyVXRpbHMubGlzdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gX2Iuc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgIT09IDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVtYXMgPSByZXN1bHQuYm9keS5zY2hlbWFzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRPcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE9wdGlvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0T3B0aW9uLnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRPcHRpb24uaW5uZXJUZXh0ID0gXCI9PUNob29zZSBmaWxlPT1cIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0LmFwcGVuZENoaWxkKGRlZmF1bHRPcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChzY2hlbWEgaW4gdGhpcy5zY2hlbWFzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChfaSA9IDAsIF9hID0gdGhpcy5zY2hlbWFzW3NjaGVtYV07IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUgPSBfYVtfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IFwiXCIuY29uY2F0KHNjaGVtYSwgXCJAXCIpLmNvbmNhdChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLmlubmVyVGV4dCA9IGZpbGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBDbGllbnQ7XG59KCkpO1xuZXhwb3J0cy5DbGllbnQgPSBDbGllbnQ7XG5uZXcgQ2xpZW50KCk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuVHNjaEFycmF5ID0gZXhwb3J0cy5Uc2NoT2JqZWN0ID0gZXhwb3J0cy5Uc2NoVW5pb24gPSBleHBvcnRzLlRzY2hVbmRlZmluZWQgPSBleHBvcnRzLlRzY2hOdWxsID0gZXhwb3J0cy5Uc2NoQm9vbGVhbiA9IGV4cG9ydHMuVHNjaE51bWJlciA9IGV4cG9ydHMuVHNjaFN0cmluZyA9IGV4cG9ydHMuVHNjaFR5cGUgPSB2b2lkIDA7XG5jbGFzcyBUc2NoVmFsaWRhdGlvbkVycm9yIHtcbiAgICBjb25zdHJ1Y3RvcihwYXRoLCBtZXNzYWdlKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMucGF0aFN0cmluZyA9IFRzY2hWYWxpZGF0aW9uRXJyb3IuZm9ybWF0UGF0aChwYXRoKTtcbiAgICAgICAgdGhpcy5yYXdNZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gYCR7dGhpcy5wYXRoU3RyaW5nfTogJHttZXNzYWdlfWA7XG4gICAgfVxuICAgIHN0YXRpYyBmb3JtYXRQYXRoKHBhdGgpIHtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiBcInJvb3RcIjtcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihcIi5cIik7XG4gICAgfVxufVxuY2xhc3MgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKHR5cGUpIHtcbiAgICAgICAgdGhpcy5fdHMgPSBudWxsOyAvL190cyBpcyBvbmx5IHVzZWQgYnkgVHlwZXNjcmlwdCBmb3IgdHlwZSBpbmZlcmVuY2UsIGFuZCBzbyBhY3R1YWxseSBkb2Vzbid0IG5lZWQgdG8gYmUgYXNzaWduZWRcbiAgICAgICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZGVzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICB0aGlzLl9kZWZhdWx0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZXhhbXBsZXMgPSBudWxsO1xuICAgIH1cbiAgICB1bmlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hVbmlvbih0aGlzLCBvdGhlcik7XG4gICAgfVxuICAgIG9wdGlvbmFsKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hVbmlvbih0aGlzLCBuZXcgVHNjaFVuZGVmaW5lZCgpKTtcbiAgICB9XG4gICAgbnVsbGFibGUoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFVuaW9uKHRoaXMsIG5ldyBUc2NoTnVsbCgpKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5uZXdJbnN0YW5jZSgpO1xuICAgICAgICBjbG9uZS5fdGl0bGUgPSB0aGlzLl90aXRsZTtcbiAgICAgICAgY2xvbmUuX2Rlc2NyaXB0aW9uID0gdGhpcy5fZGVzY3JpcHRpb247XG4gICAgICAgIGNsb25lLl9kZWZhdWx0ID0gdGhpcy5fZGVmYXVsdDtcbiAgICAgICAgY2xvbmUuX2V4YW1wbGVzID0gdGhpcy5fZXhhbXBsZXMgPyBbLi4udGhpcy5fZXhhbXBsZXNdIDogbnVsbDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICB0aXRsZSh0aXRsZSkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX3RpdGxlID0gdGl0bGU7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZGVzY3JpcHRpb24oZGVzY3JpcHRpbikge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2Rlc2NyaXB0aW9uID0gZGVzY3JpcHRpbjtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBkZWZhdWx0KGRlZmF1bHRWYWx1ZSkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2RlZmF1bHQgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZXhhbXBsZXMoZXhhbXBsZXMpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9leGFtcGxlcyA9IFsuLi5leGFtcGxlc107XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSB7XG4gICAgICAgICAgICBcInR5cGVcIjogdGhpcy5fdHlwZVxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5fdGl0bGUpXG4gICAgICAgICAgICBzY2hlbWEudGl0bGUgPSB0aGlzLl90aXRsZTtcbiAgICAgICAgaWYgKHRoaXMuX2Rlc2NyaXB0aW9uKVxuICAgICAgICAgICAgc2NoZW1hLmRlc2NyaXB0aW9uID0gdGhpcy5fZGVzY3JpcHRpb247XG4gICAgICAgIGlmICh0aGlzLl9kZWZhdWx0KVxuICAgICAgICAgICAgc2NoZW1hLmRlZmF1bHQgPSB0aGlzLl9kZWZhdWx0O1xuICAgICAgICBpZiAodGhpcy5fZXhhbXBsZXMpXG4gICAgICAgICAgICBzY2hlbWEuZXhhbXBsZXMgPSB0aGlzLl9leGFtcGxlcztcbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG4gICAgdmFsaWRhdGUoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgICAgIHRoaXMudmFsaWRhdGVJbnRlcm5hbChbXSwgaW5wdXQsIGVycm9ycyk7XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiBlcnJvcnMubGVuZ3RoID09IDAsIGVycm9ycyB9O1xuICAgIH1cbiAgICB2YWxpZGF0ZUludGVybmFsKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzQ29ycmVjdFR5cGUoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgaGFzIHRvIGJlIG9mIHR5cGUgJHt0aGlzLmdldFR5cGVOYW1lKCl9YCkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKTtcbiAgICB9XG4gICAgaXNPcHRpb25hbCgpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgaXNOdWxsYWJsZSgpIHsgcmV0dXJuIGZhbHNlOyB9XG59XG5leHBvcnRzLlRzY2hUeXBlID0gVHNjaFR5cGU7XG5jbGFzcyBUc2NoU3RyaW5nIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihcInN0cmluZ1wiKTtcbiAgICAgICAgdGhpcy5fZm9ybWF0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZW51bSA9IG51bGw7XG4gICAgICAgIHRoaXMuX21pbkxlbmd0aCA9IG51bGw7XG4gICAgICAgIHRoaXMuX21heExlbmd0aCA9IG51bGw7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hTdHJpbmcoKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2Zvcm1hdCA9IHRoaXMuX2Zvcm1hdDtcbiAgICAgICAgY2xvbmUuX2VudW0gPSB0aGlzLl9lbnVtO1xuICAgICAgICBjbG9uZS5fbWluTGVuZ3RoID0gdGhpcy5fbWluTGVuZ3RoO1xuICAgICAgICBjbG9uZS5fbWF4TGVuZ3RoID0gdGhpcy5fbWF4TGVuZ3RoO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gc3VwZXIuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQpXG4gICAgICAgICAgICBzY2hlbWEuZm9ybWF0ID0gdGhpcy5fZm9ybWF0O1xuICAgICAgICBpZiAodGhpcy5fZW51bSlcbiAgICAgICAgICAgIHNjaGVtYS5lbnVtID0gdGhpcy5fZW51bTtcbiAgICAgICAgaWYgKHRoaXMuX21pbkxlbmd0aClcbiAgICAgICAgICAgIHNjaGVtYS5taW5MZW5ndGggPSB0aGlzLl9taW5MZW5ndGg7XG4gICAgICAgIGlmICh0aGlzLl9tYXhMZW5ndGgpXG4gICAgICAgICAgICBzY2hlbWEubWF4TGVuZ3RoID0gdGhpcy5fbWF4TGVuZ3RoO1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICBtaW5MZW5ndGgobWluKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWluTGVuZ3RoID0gbWluO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIG1heExlbmd0aChtYXgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9tYXhMZW5ndGggPSBtYXg7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZW51bWVyYXRpb24oZW51bWVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9lbnVtID0gWy4uLmVudW1lcmF0aW9uXTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBmb3JtYXQoZm9ybWF0KSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZm9ybWF0ID0gZm9ybWF0O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGNvbG9yKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJjb2xvclwiKTtcbiAgICB9XG4gICAgZGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwiZGF0ZVwiKTtcbiAgICB9XG4gICAgZW1haWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcImVtYWlsXCIpO1xuICAgIH1cbiAgICBwYXNzd29yZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwicGFzc3dvcmRcIik7XG4gICAgfVxuICAgIHRleHRhcmVhKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJ0ZXh0YXJlYVwiKTtcbiAgICB9XG4gICAgdXJsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJ1cmxcIik7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJzdHJpbmdcIjtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBcInN0cmluZ1wiOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGlmICghIXRoaXMuX2VudW0gJiYgIXRoaXMuX2VudW0uaW5jbHVkZXMoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgaGFzIHRvIGJlIG9uZSBvZiB0aGUgZm9sbG93aW5nOiAke3RoaXMuX2VudW0uam9pbihcIiwgXCIpfWApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21pbkxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dC5sZW5ndGggPCB0aGlzLl9taW5MZW5ndGgpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGxvbmdlciB0aGFuICR7dGhpcy5fbWluTGVuZ3RofSBjaGFyYWN0ZXJzLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21heExlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dC5sZW5ndGggPiB0aGlzLl9tYXhMZW5ndGgpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIHNob3J0ZXIgdGhhbiAke3RoaXMuX21heExlbmd0aH0gY2hhcmFjdGVycy5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdCA9PT0gXCJjb2xvclwiICYmICEvXiM/WzAtOWEtZl17Myw2fSQvaS50ZXN0KGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYSBjb2xvciBoZXggY29kZS5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdCA9PT0gXCJkYXRlXCIgJiYgTnVtYmVyLmlzTmFOKERhdGUucGFyc2UoaW5wdXQpKSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYSBkYXRlLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZm9ybWF0ID09PSBcImVtYWlsXCIgJiYgIS9eKChbXjw+KClcXFtcXF1cXFxcLiw7Olxcc0BcIl0rKFxcLltePD4oKVxcW1xcXVxcXFwuLDs6XFxzQFwiXSspKil8KFwiLitcIikpQCgoXFxbWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfV0pfCgoW2EtekEtWlxcLTAtOV0rXFwuKStbYS16QS1aXXsyLH0pKSQvLnRlc3QoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhbiBlbWFpbC5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdCA9PT0gXCJ1cmxcIiAmJiAhL15odHRwcz86XFwvXFwvKD86d3d3XFwuKT9bLWEtekEtWjAtOUA6JS5fXFwrfiM9XXsxLDI1Nn1cXC5bYS16QS1aMC05KCldezEsNn1cXGIoPzpbLWEtekEtWjAtOSgpQDolX1xcKy5+Iz8mXFwvPV0qKSQvLnRlc3QoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhIFVSTC5gKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlRzY2hTdHJpbmcgPSBUc2NoU3RyaW5nO1xuY2xhc3MgVHNjaE51bWJlciBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoXCJudW1iZXJcIik7XG4gICAgICAgIHRoaXMuX2ludGVnZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fbWluID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWF4ID0gbnVsbDtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaE51bWJlcigpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5faW50ZWdlciA9IHRoaXMuX2ludGVnZXI7XG4gICAgICAgIGNsb25lLl9taW4gPSB0aGlzLl9taW47XG4gICAgICAgIGNsb25lLl9tYXggPSB0aGlzLl9tYXg7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgaW50ZWdlcigpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9pbnRlZ2VyID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBtaW4obWluKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWluID0gbWluO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIG1heChtYXgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9tYXggPSBtYXg7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBzdXBlci5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgaWYgKHRoaXMuX2ludGVnZXIpXG4gICAgICAgICAgICBzY2hlbWEudHlwZSA9IFwiaW50ZWdlclwiO1xuICAgICAgICBpZiAodGhpcy5fbWluICE9PSBudWxsKVxuICAgICAgICAgICAgc2NoZW1hLm1pbmltdW0gPSB0aGlzLl9taW47XG4gICAgICAgIGlmICh0aGlzLl9tYXggIT09IG51bGwpXG4gICAgICAgICAgICBzY2hlbWEubWF4aW11bSA9IHRoaXMuX21heDtcbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcIm51bWJlclwiO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIFwibnVtYmVyXCI7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuX2ludGVnZXIgJiYgIU51bWJlci5pc0ludGVnZXIoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgaGFzIHRvIGJlIGFuIGludGVnZXIuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWluID09PSBcIm51bWJlclwiICYmIGlucHV0IDwgdGhpcy5fbWluKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhdCBsZWFzdCAke3RoaXMuX21pbn0uYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWF4ID09PSBcIm51bWJlclwiICYmIGlucHV0ID4gdGhpcy5fbWF4KSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhdCBsZXNzIHRoYW4gJHt0aGlzLl9tYXh9LmApKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVHNjaE51bWJlciA9IFRzY2hOdW1iZXI7XG5jbGFzcyBUc2NoQm9vbGVhbiBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoXCJib29sZWFuXCIpO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoQm9vbGVhbigpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJib29sZWFuXCI7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gXCJib29sZWFuXCI7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICB9XG59XG5leHBvcnRzLlRzY2hCb29sZWFuID0gVHNjaEJvb2xlYW47XG5jbGFzcyBUc2NoTnVsbCBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoXCJudWxsXCIpO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoTnVsbCgpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0ID09PSBudWxsO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIFwibnVsbFwiOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoTnVsbCA9IFRzY2hOdWxsO1xuY2xhc3MgVHNjaFVuZGVmaW5lZCBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoXCJ1bmRlZmluZWRcIik7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hVbmRlZmluZWQoKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwidW5kZWZpbmVkXCI7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gXCJ1bmRlZmluZWRcIjsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgIH1cbn1cbmV4cG9ydHMuVHNjaFVuZGVmaW5lZCA9IFRzY2hVbmRlZmluZWQ7XG5jbGFzcyBUc2NoVW5pb24gZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IodHlwZTEsIHR5cGUyKSB7XG4gICAgICAgIHN1cGVyKGB1bmlvbl8ke3R5cGUxLl90eXBlfV8ke3R5cGUyLl90eXBlfWApO1xuICAgICAgICB0aGlzLnR5cGUxID0gdHlwZTE7XG4gICAgICAgIHRoaXMudHlwZTIgPSB0eXBlMjtcbiAgICB9XG4gICAgVHlwZTFJbnRlcm5hbCgpIHsgcmV0dXJuIHRoaXMudHlwZTE7IH1cbiAgICBUeXBlMkludGVybmFsKCkgeyByZXR1cm4gdGhpcy50eXBlMjsgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hVbmlvbih0aGlzLnR5cGUxLmNsb25lKCksIHRoaXMudHlwZTIuY2xvbmUoKSk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIGNsb25lLnR5cGUxID0gdGhpcy5UeXBlMUludGVybmFsKCkuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUudHlwZTIgPSB0aGlzLlR5cGUySW50ZXJuYWwoKS5jbG9uZSgpO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIF9hLCBfYiwgX2MsIF9kO1xuICAgICAgICBjb25zdCBzY2hlbWExID0gdGhpcy5UeXBlMUludGVybmFsKCkuX3R5cGUgPT09IFwidW5kZWZpbmVkXCIgPyB7fSA6IHRoaXMudHlwZTEuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIGNvbnN0IHNjaGVtYTIgPSB0aGlzLlR5cGUySW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJ1bmRlZmluZWRcIiA/IHt9IDogdGhpcy50eXBlMi5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgY29uc3QgY29tYmluZWQgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sIHNjaGVtYTEpLCBzY2hlbWEyKTtcbiAgICAgICAgY29tYmluZWQudHlwZSA9IFsuLi4oQXJyYXkuaXNBcnJheShzY2hlbWExLnR5cGUpID8gc2NoZW1hMS50eXBlIDogW3NjaGVtYTEudHlwZV0pLCAuLi4oQXJyYXkuaXNBcnJheShzY2hlbWEyLnR5cGUpID8gc2NoZW1hMi50eXBlIDogW3NjaGVtYTIudHlwZV0pXS5maWx0ZXIodCA9PiAhIXQgJiYgdCAhPT0gXCJ1bmRlZmluZWRcIik7XG4gICAgICAgIGlmIChjb21iaW5lZC50eXBlLmxlbmd0aCA8IDIpXG4gICAgICAgICAgICBjb21iaW5lZC50eXBlID0gY29tYmluZWQudHlwZVswXTtcbiAgICAgICAgaWYgKHNjaGVtYTEucHJvcGVydGllcyAmJiBzY2hlbWEyLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGNvbWJpbmVkLnByb3BlcnRpZXMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sICgoX2EgPSBzY2hlbWExLnByb3BlcnRpZXMpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IHt9KSksICgoX2IgPSBzY2hlbWEyLnByb3BlcnRpZXMpICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6IHt9KSk7XG4gICAgICAgICAgICBpZiAoISFzY2hlbWExLnJlcXVpcmVkICYmICEhc2NoZW1hMi5yZXF1aXJlZClcbiAgICAgICAgICAgICAgICBjb21iaW5lZC5yZXF1aXJlZCA9IHNjaGVtYTEucmVxdWlyZWQuZmlsdGVyKChmKSA9PiB7IHZhciBfYTsgcmV0dXJuIChfYSA9IHNjaGVtYTIucmVxdWlyZWQpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5pbmNsdWRlcyhmKTsgfSk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29tYmluZWQucmVxdWlyZWQgPSAoX2QgPSAoX2MgPSBzY2hlbWExLnJlcXVpcmVkKSAhPT0gbnVsbCAmJiBfYyAhPT0gdm9pZCAwID8gX2MgOiBzY2hlbWEyLnJlcXVpcmVkKSAhPT0gbnVsbCAmJiBfZCAhPT0gdm9pZCAwID8gX2QgOiBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fdGl0bGUpXG4gICAgICAgICAgICBjb21iaW5lZC50aXRsZSA9IHRoaXMuX3RpdGxlO1xuICAgICAgICBpZiAodGhpcy5fZGVzY3JpcHRpb24pXG4gICAgICAgICAgICBjb21iaW5lZC5kZXNjcmlwdGlvbiA9IHRoaXMuX2Rlc2NyaXB0aW9uO1xuICAgICAgICBpZiAodGhpcy5fZGVmYXVsdClcbiAgICAgICAgICAgIGNvbWJpbmVkLmRlZmF1bHQgPSB0aGlzLl9kZWZhdWx0O1xuICAgICAgICByZXR1cm4gY29tYmluZWQ7XG4gICAgfVxuICAgIGlzTnVsbGFibGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlR5cGUxSW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJudWxsXCIgfHwgdGhpcy5UeXBlMkludGVybmFsKCkuX3R5cGUgPT09IFwibnVsbFwiIHx8IHRoaXMuVHlwZTFJbnRlcm5hbCgpLmlzTnVsbGFibGUoKSB8fCB0aGlzLlR5cGUySW50ZXJuYWwoKS5pc051bGxhYmxlKCk7XG4gICAgfVxuICAgIGlzT3B0aW9uYWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLlR5cGUxSW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0aGlzLlR5cGUySW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0aGlzLlR5cGUxSW50ZXJuYWwoKS5pc09wdGlvbmFsKCkgfHwgdGhpcy5UeXBlMkludGVybmFsKCkuaXNPcHRpb25hbCgpO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLlR5cGUxSW50ZXJuYWwoKS5pc0NvcnJlY3RUeXBlKGlucHV0KSB8fCB0aGlzLlR5cGUySW50ZXJuYWwoKS5pc0NvcnJlY3RUeXBlKGlucHV0KTtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBgJHt0aGlzLnR5cGUxLmdldFR5cGVOYW1lKCl9IG9yICR7dGhpcy50eXBlMi5nZXRUeXBlTmFtZSgpfWA7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgaWYgKHRoaXMuVHlwZTFJbnRlcm5hbCgpLmlzQ29ycmVjdFR5cGUoaW5wdXQpKSB7XG4gICAgICAgICAgICB0aGlzLlR5cGUxSW50ZXJuYWwoKS52YWxpZGF0ZUludGVybmFsKHBhdGgsIGlucHV0LCBlcnJvcnMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLlR5cGUySW50ZXJuYWwoKS5pc0NvcnJlY3RUeXBlKGlucHV0KSkge1xuICAgICAgICAgICAgdGhpcy5UeXBlMkludGVybmFsKCkudmFsaWRhdGVJbnRlcm5hbChwYXRoLCBpbnB1dCwgZXJyb3JzKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVHNjaFVuaW9uID0gVHNjaFVuaW9uO1xuY2xhc3MgVHNjaE9iamVjdCBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcihzaGFwZSkge1xuICAgICAgICBzdXBlcihcIm9iamVjdFwiKTtcbiAgICAgICAgdGhpcy5zaGFwZSA9IHNoYXBlO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoT2JqZWN0KHRoaXMuc2hhcGUpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5zaGFwZSA9IHRoaXMuc2hhcGU7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBzdXBlci5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgc2NoZW1hLnJlcXVpcmVkID0gT2JqZWN0LmtleXModGhpcy5zaGFwZSkuZmlsdGVyKGsgPT4gIXRoaXMuc2hhcGVba10uaXNPcHRpb25hbCgpKTtcbiAgICAgICAgc2NoZW1hLnByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5zaGFwZSkge1xuICAgICAgICAgICAgc2NoZW1hLnByb3BlcnRpZXNba2V5XSA9IHRoaXMuc2hhcGVba2V5XS5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwib2JqZWN0XCIgJiYgaW5wdXQgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoaW5wdXQpO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIFwib2JqZWN0XCI7XG4gICAgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnNoYXBlKSB7XG4gICAgICAgICAgICBjb25zdCBjaGlsZCA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkSW50ZXJuYWwgPSBjaGlsZDtcbiAgICAgICAgICAgIGlmICghY2hpbGRJbnRlcm5hbC5pc09wdGlvbmFsKCkgJiYgIWlucHV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgUHJvcGVydHkgJHtrZXl9IG9mIHR5cGUgJHtjaGlsZEludGVybmFsLmdldFR5cGVOYW1lKCl9IGlzIHJlcXVpcmVkLmApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpbnB1dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRJbnRlcm5hbC52YWxpZGF0ZUludGVybmFsKFsuLi5wYXRoLCBrZXldLCBpbnB1dFtrZXldLCBlcnJvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoT2JqZWN0ID0gVHNjaE9iamVjdDtcbmNsYXNzIFRzY2hBcnJheSBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50VHlwZSkge1xuICAgICAgICBzdXBlcihcImFycmF5XCIpO1xuICAgICAgICB0aGlzLmVsZW1lbnRUeXBlID0gZWxlbWVudFR5cGU7XG4gICAgICAgIHRoaXMuX2Zvcm1hdCA9IG51bGw7XG4gICAgICAgIHRoaXMuX21pbkVsZW1lbnRDb3VudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX21heEVsZW1lbnRDb3VudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3VuaXF1ZSA9IGZhbHNlO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoQXJyYXkodGhpcy5lbGVtZW50VHlwZSk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIGNsb25lLmVsZW1lbnRUeXBlID0gdGhpcy5lbGVtZW50VHlwZTtcbiAgICAgICAgY2xvbmUuX2Zvcm1hdCA9IHRoaXMuX2Zvcm1hdDtcbiAgICAgICAgY2xvbmUuX3VuaXF1ZSA9IHRoaXMuX3VuaXF1ZTtcbiAgICAgICAgY2xvbmUuX21pbkVsZW1lbnRDb3VudCA9IHRoaXMuX21pbkVsZW1lbnRDb3VudDtcbiAgICAgICAgY2xvbmUuX21heEVsZW1lbnRDb3VudCA9IHRoaXMuX21heEVsZW1lbnRDb3VudDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHN1cGVyLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBzY2hlbWEuaXRlbXMgPSB0aGlzLmVsZW1lbnRUeXBlLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBpZiAodGhpcy5fZm9ybWF0KVxuICAgICAgICAgICAgc2NoZW1hLmZvcm1hdCA9IHRoaXMuX2Zvcm1hdDtcbiAgICAgICAgaWYgKHRoaXMuX3VuaXF1ZSlcbiAgICAgICAgICAgIHNjaGVtYS51bmlxdWVJdGVtcyA9IHRoaXMuX3VuaXF1ZTtcbiAgICAgICAgaWYgKHRoaXMuX21pbkVsZW1lbnRDb3VudClcbiAgICAgICAgICAgIHNjaGVtYS5taW5JdGVtcyA9IHRoaXMuX21pbkVsZW1lbnRDb3VudDtcbiAgICAgICAgaWYgKHRoaXMuX21heEVsZW1lbnRDb3VudClcbiAgICAgICAgICAgIHNjaGVtYS5tYXhJdGVtcyA9IHRoaXMuX21heEVsZW1lbnRDb3VudDtcbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG4gICAgdGFibGUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZm9ybWF0ID0gXCJ0YWJsZVwiO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIG1pbkVsZW1lbnRzKGNvdW50KSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWluRWxlbWVudENvdW50ID0gY291bnQ7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgbWF4RWxlbWVudHMoY291bnQpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9tYXhFbGVtZW50Q291bnQgPSBjb3VudDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICB1bmlxdWUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fdW5pcXVlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwib2JqZWN0XCIgJiYgaW5wdXQgIT09IG51bGwgJiYgQXJyYXkuaXNBcnJheShpbnB1dCk7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkge1xuICAgICAgICByZXR1cm4gYGFycmF5IG9mICR7dGhpcy5lbGVtZW50VHlwZS5nZXRUeXBlTmFtZSgpfWA7XG4gICAgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBjb25zdCBlbGVtZW50VHlwZUludGVybmFsID0gdGhpcy5lbGVtZW50VHlwZTtcbiAgICAgICAgY29uc3QgdXNlZCA9IG5ldyBTZXQoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9taW5FbGVtZW50Q291bnQgPT09IFwibnVtYmVyXCIgJiYgaW5wdXQubGVuZ3RoIDwgdGhpcy5fbWluRWxlbWVudENvdW50KSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgQXJyYXkgbXVzdCBjb250YWluIGF0IGxlYXN0ICR7dGhpcy5fbWluRWxlbWVudENvdW50fSBlbGVtZW50cy5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9tYXhFbGVtZW50Q291bnQgPT09IFwibnVtYmVyXCIgJiYgaW5wdXQubGVuZ3RoID4gdGhpcy5fbWF4RWxlbWVudENvdW50KSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgQXJyYXkgbXVzdCBjb250YWluIGF0IG1vc3QgJHt0aGlzLl9tYXhFbGVtZW50Q291bnR9IGVsZW1lbnRzLmApKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gaW5wdXRbaV07XG4gICAgICAgICAgICBlbGVtZW50VHlwZUludGVybmFsLnZhbGlkYXRlSW50ZXJuYWwoWy4uLnBhdGgsIGkudG9TdHJpbmcoKV0sIGVsZW1lbnQsIGVycm9ycyk7XG4gICAgICAgICAgICBpZiAodGhpcy5fdW5pcXVlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04uc3RyaW5naWZ5KGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmICh1c2VkLmhhcyhqc29uKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBcIkFsbCB2YWx1ZXMgaGF2ZSB0byBiZSB1bmlxdWUuXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdXNlZC5hZGQoanNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlRzY2hBcnJheSA9IFRzY2hBcnJheTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVRzY2hUeXBlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XG4gICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcbn0pIDogZnVuY3Rpb24obywgdikge1xuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcbn0pO1xudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLnRzY2ggPSB2b2lkIDA7XG5jb25zdCB0c2NoID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCIuL3RzY2hcIikpO1xuZXhwb3J0cy50c2NoID0gdHNjaDtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5hcnJheSA9IGV4cG9ydHMub2JqZWN0ID0gZXhwb3J0cy5ib29sZWFuID0gZXhwb3J0cy5udW1iZXIgPSBleHBvcnRzLnN0cmluZyA9IHZvaWQgMDtcbmNvbnN0IFRzY2hUeXBlXzEgPSByZXF1aXJlKFwiLi9Uc2NoVHlwZVwiKTtcbmZ1bmN0aW9uIHN0cmluZygpIHsgcmV0dXJuIG5ldyBUc2NoVHlwZV8xLlRzY2hTdHJpbmcoKTsgfVxuZXhwb3J0cy5zdHJpbmcgPSBzdHJpbmc7XG5mdW5jdGlvbiBudW1iZXIoKSB7IHJldHVybiBuZXcgVHNjaFR5cGVfMS5Uc2NoTnVtYmVyKCk7IH1cbmV4cG9ydHMubnVtYmVyID0gbnVtYmVyO1xuZnVuY3Rpb24gYm9vbGVhbigpIHsgcmV0dXJuIG5ldyBUc2NoVHlwZV8xLlRzY2hCb29sZWFuKCk7IH1cbmV4cG9ydHMuYm9vbGVhbiA9IGJvb2xlYW47XG5mdW5jdGlvbiBvYmplY3Qoc2hhcGUpIHtcbiAgICByZXR1cm4gbmV3IFRzY2hUeXBlXzEuVHNjaE9iamVjdChzaGFwZSk7XG59XG5leHBvcnRzLm9iamVjdCA9IG9iamVjdDtcbmZ1bmN0aW9uIGFycmF5KGVsZW1lbnRUeXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUc2NoVHlwZV8xLlRzY2hBcnJheShlbGVtZW50VHlwZSk7XG59XG5leHBvcnRzLmFycmF5ID0gYXJyYXk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD10c2NoLmpzLm1hcCIsIi8qKiBAbGljZW5zZSBVUkkuanMgdjQuNC4xIChjKSAyMDExIEdhcnkgQ291cnQuIExpY2Vuc2U6IGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC91cmktanMgKi9cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IGZhY3RvcnkoZXhwb3J0cykgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcblx0KGZhY3RvcnkoKGdsb2JhbC5VUkkgPSBnbG9iYWwuVVJJIHx8IHt9KSkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBtZXJnZSgpIHtcbiAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgc2V0cyA9IEFycmF5KF9sZW4pLCBfa2V5ID0gMDsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBzZXRzW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgIH1cblxuICAgIGlmIChzZXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgc2V0c1swXSA9IHNldHNbMF0uc2xpY2UoMCwgLTEpO1xuICAgICAgICB2YXIgeGwgPSBzZXRzLmxlbmd0aCAtIDE7XG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgc2V0c1t4XSA9IHNldHNbeF0uc2xpY2UoMSwgLTEpO1xuICAgICAgICB9XG4gICAgICAgIHNldHNbeGxdID0gc2V0c1t4bF0uc2xpY2UoMSk7XG4gICAgICAgIHJldHVybiBzZXRzLmpvaW4oJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzZXRzWzBdO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHN1YmV4cChzdHIpIHtcbiAgICByZXR1cm4gXCIoPzpcIiArIHN0ciArIFwiKVwiO1xufVxuZnVuY3Rpb24gdHlwZU9mKG8pIHtcbiAgICByZXR1cm4gbyA9PT0gdW5kZWZpbmVkID8gXCJ1bmRlZmluZWRcIiA6IG8gPT09IG51bGwgPyBcIm51bGxcIiA6IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5zcGxpdChcIiBcIikucG9wKCkuc3BsaXQoXCJdXCIpLnNoaWZ0KCkudG9Mb3dlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHRvVXBwZXJDYXNlKHN0cikge1xuICAgIHJldHVybiBzdHIudG9VcHBlckNhc2UoKTtcbn1cbmZ1bmN0aW9uIHRvQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIG9iaiAhPT0gdW5kZWZpbmVkICYmIG9iaiAhPT0gbnVsbCA/IG9iaiBpbnN0YW5jZW9mIEFycmF5ID8gb2JqIDogdHlwZW9mIG9iai5sZW5ndGggIT09IFwibnVtYmVyXCIgfHwgb2JqLnNwbGl0IHx8IG9iai5zZXRJbnRlcnZhbCB8fCBvYmouY2FsbCA/IFtvYmpdIDogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwob2JqKSA6IFtdO1xufVxuZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgc291cmNlKSB7XG4gICAgdmFyIG9iaiA9IHRhcmdldDtcbiAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIG9ialtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gYnVpbGRFeHBzKGlzSVJJKSB7XG4gICAgdmFyIEFMUEhBJCQgPSBcIltBLVphLXpdXCIsXG4gICAgICAgIENSJCA9IFwiW1xcXFx4MERdXCIsXG4gICAgICAgIERJR0lUJCQgPSBcIlswLTldXCIsXG4gICAgICAgIERRVU9URSQkID0gXCJbXFxcXHgyMl1cIixcbiAgICAgICAgSEVYRElHJCQgPSBtZXJnZShESUdJVCQkLCBcIltBLUZhLWZdXCIpLFxuICAgICAgICAvL2Nhc2UtaW5zZW5zaXRpdmVcbiAgICBMRiQkID0gXCJbXFxcXHgwQV1cIixcbiAgICAgICAgU1AkJCA9IFwiW1xcXFx4MjBdXCIsXG4gICAgICAgIFBDVF9FTkNPREVEJCA9IHN1YmV4cChzdWJleHAoXCIlW0VGZWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVbODlBLUZhLWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpKSxcbiAgICAgICAgLy9leHBhbmRlZFxuICAgIEdFTl9ERUxJTVMkJCA9IFwiW1xcXFw6XFxcXC9cXFxcP1xcXFwjXFxcXFtcXFxcXVxcXFxAXVwiLFxuICAgICAgICBTVUJfREVMSU1TJCQgPSBcIltcXFxcIVxcXFwkXFxcXCZcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcO1xcXFw9XVwiLFxuICAgICAgICBSRVNFUlZFRCQkID0gbWVyZ2UoR0VOX0RFTElNUyQkLCBTVUJfREVMSU1TJCQpLFxuICAgICAgICBVQ1NDSEFSJCQgPSBpc0lSSSA/IFwiW1xcXFx4QTAtXFxcXHUyMDBEXFxcXHUyMDEwLVxcXFx1MjAyOVxcXFx1MjAyRi1cXFxcdUQ3RkZcXFxcdUY5MDAtXFxcXHVGRENGXFxcXHVGREYwLVxcXFx1RkZFRl1cIiA6IFwiW11cIixcbiAgICAgICAgLy9zdWJzZXQsIGV4Y2x1ZGVzIGJpZGkgY29udHJvbCBjaGFyYWN0ZXJzXG4gICAgSVBSSVZBVEUkJCA9IGlzSVJJID8gXCJbXFxcXHVFMDAwLVxcXFx1RjhGRl1cIiA6IFwiW11cIixcbiAgICAgICAgLy9zdWJzZXRcbiAgICBVTlJFU0VSVkVEJCQgPSBtZXJnZShBTFBIQSQkLCBESUdJVCQkLCBcIltcXFxcLVxcXFwuXFxcXF9cXFxcfl1cIiwgVUNTQ0hBUiQkKSxcbiAgICAgICAgU0NIRU1FJCA9IHN1YmV4cChBTFBIQSQkICsgbWVyZ2UoQUxQSEEkJCwgRElHSVQkJCwgXCJbXFxcXCtcXFxcLVxcXFwuXVwiKSArIFwiKlwiKSxcbiAgICAgICAgVVNFUklORk8kID0gc3ViZXhwKHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOl1cIikpICsgXCIqXCIpLFxuICAgICAgICBERUNfT0NURVQkID0gc3ViZXhwKHN1YmV4cChcIjI1WzAtNV1cIikgKyBcInxcIiArIHN1YmV4cChcIjJbMC00XVwiICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIjFcIiArIERJR0lUJCQgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiWzEtOV1cIiArIERJR0lUJCQpICsgXCJ8XCIgKyBESUdJVCQkKSxcbiAgICAgICAgREVDX09DVEVUX1JFTEFYRUQkID0gc3ViZXhwKHN1YmV4cChcIjI1WzAtNV1cIikgKyBcInxcIiArIHN1YmV4cChcIjJbMC00XVwiICsgRElHSVQkJCkgKyBcInxcIiArIHN1YmV4cChcIjFcIiArIERJR0lUJCQgKyBESUdJVCQkKSArIFwifFwiICsgc3ViZXhwKFwiMD9bMS05XVwiICsgRElHSVQkJCkgKyBcInwwPzA/XCIgKyBESUdJVCQkKSxcbiAgICAgICAgLy9yZWxheGVkIHBhcnNpbmcgcnVsZXNcbiAgICBJUFY0QUREUkVTUyQgPSBzdWJleHAoREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkICsgXCJcXFxcLlwiICsgREVDX09DVEVUX1JFTEFYRUQkKSxcbiAgICAgICAgSDE2JCA9IHN1YmV4cChIRVhESUckJCArIFwiezEsNH1cIiksXG4gICAgICAgIExTMzIkID0gc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiICsgSDE2JCkgKyBcInxcIiArIElQVjRBRERSRVNTJCksXG4gICAgICAgIElQVjZBRERSRVNTMSQgPSBzdWJleHAoc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7Nn1cIiArIExTMzIkKSxcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICA2KCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1MyJCA9IHN1YmV4cChcIlxcXFw6XFxcXDpcIiArIHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezV9XCIgKyBMUzMyJCksXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgIFwiOjpcIiA1KCBoMTYgXCI6XCIgKSBsczMyXG4gICAgSVBWNkFERFJFU1MzJCA9IHN1YmV4cChzdWJleHAoSDE2JCkgKyBcIj9cXFxcOlxcXFw6XCIgKyBzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcIns0fVwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgICAgICAgICAgICAgICBoMTYgXSBcIjo6XCIgNCggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNCQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsMX1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7M31cIiArIExTMzIkKSxcbiAgICAgICAgLy9bICoxKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgMyggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNSQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsMn1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgc3ViZXhwKEgxNiQgKyBcIlxcXFw6XCIpICsgXCJ7Mn1cIiArIExTMzIkKSxcbiAgICAgICAgLy9bICoyKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgMiggaDE2IFwiOlwiICkgbHMzMlxuICAgIElQVjZBRERSRVNTNiQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsM31cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgSDE2JCArIFwiXFxcXDpcIiArIExTMzIkKSxcbiAgICAgICAgLy9bICozKCBoMTYgXCI6XCIgKSBoMTYgXSBcIjo6XCIgICAgaDE2IFwiOlwiICAgbHMzMlxuICAgIElQVjZBRERSRVNTNyQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsNH1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgTFMzMiQpLFxuICAgICAgICAvL1sgKjQoIGgxNiBcIjpcIiApIGgxNiBdIFwiOjpcIiAgICAgICAgICAgICAgbHMzMlxuICAgIElQVjZBRERSRVNTOCQgPSBzdWJleHAoc3ViZXhwKHN1YmV4cChIMTYkICsgXCJcXFxcOlwiKSArIFwiezAsNX1cIiArIEgxNiQpICsgXCI/XFxcXDpcXFxcOlwiICsgSDE2JCksXG4gICAgICAgIC8vWyAqNSggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiICAgICAgICAgICAgICBoMTZcbiAgICBJUFY2QUREUkVTUzkkID0gc3ViZXhwKHN1YmV4cChzdWJleHAoSDE2JCArIFwiXFxcXDpcIikgKyBcInswLDZ9XCIgKyBIMTYkKSArIFwiP1xcXFw6XFxcXDpcIiksXG4gICAgICAgIC8vWyAqNiggaDE2IFwiOlwiICkgaDE2IF0gXCI6OlwiXG4gICAgSVBWNkFERFJFU1MkID0gc3ViZXhwKFtJUFY2QUREUkVTUzEkLCBJUFY2QUREUkVTUzIkLCBJUFY2QUREUkVTUzMkLCBJUFY2QUREUkVTUzQkLCBJUFY2QUREUkVTUzUkLCBJUFY2QUREUkVTUzYkLCBJUFY2QUREUkVTUzckLCBJUFY2QUREUkVTUzgkLCBJUFY2QUREUkVTUzkkXS5qb2luKFwifFwiKSksXG4gICAgICAgIFpPTkVJRCQgPSBzdWJleHAoc3ViZXhwKFVOUkVTRVJWRUQkJCArIFwifFwiICsgUENUX0VOQ09ERUQkKSArIFwiK1wiKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIElQVjZBRERSWiQgPSBzdWJleHAoSVBWNkFERFJFU1MkICsgXCJcXFxcJTI1XCIgKyBaT05FSUQkKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIElQVjZBRERSWl9SRUxBWEVEJCA9IHN1YmV4cChJUFY2QUREUkVTUyQgKyBzdWJleHAoXCJcXFxcJTI1fFxcXFwlKD8hXCIgKyBIRVhESUckJCArIFwiezJ9KVwiKSArIFpPTkVJRCQpLFxuICAgICAgICAvL1JGQyA2ODc0LCB3aXRoIHJlbGF4ZWQgcGFyc2luZyBydWxlc1xuICAgIElQVkZVVFVSRSQgPSBzdWJleHAoXCJbdlZdXCIgKyBIRVhESUckJCArIFwiK1xcXFwuXCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCwgXCJbXFxcXDpdXCIpICsgXCIrXCIpLFxuICAgICAgICBJUF9MSVRFUkFMJCA9IHN1YmV4cChcIlxcXFxbXCIgKyBzdWJleHAoSVBWNkFERFJaX1JFTEFYRUQkICsgXCJ8XCIgKyBJUFY2QUREUkVTUyQgKyBcInxcIiArIElQVkZVVFVSRSQpICsgXCJcXFxcXVwiKSxcbiAgICAgICAgLy9SRkMgNjg3NFxuICAgIFJFR19OQU1FJCA9IHN1YmV4cChzdWJleHAoUENUX0VOQ09ERUQkICsgXCJ8XCIgKyBtZXJnZShVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCkpICsgXCIqXCIpLFxuICAgICAgICBIT1NUJCA9IHN1YmV4cChJUF9MSVRFUkFMJCArIFwifFwiICsgSVBWNEFERFJFU1MkICsgXCIoPyFcIiArIFJFR19OQU1FJCArIFwiKVwiICsgXCJ8XCIgKyBSRUdfTkFNRSQpLFxuICAgICAgICBQT1JUJCA9IHN1YmV4cChESUdJVCQkICsgXCIqXCIpLFxuICAgICAgICBBVVRIT1JJVFkkID0gc3ViZXhwKHN1YmV4cChVU0VSSU5GTyQgKyBcIkBcIikgKyBcIj9cIiArIEhPU1QkICsgc3ViZXhwKFwiXFxcXDpcIiArIFBPUlQkKSArIFwiP1wiKSxcbiAgICAgICAgUENIQVIkID0gc3ViZXhwKFBDVF9FTkNPREVEJCArIFwifFwiICsgbWVyZ2UoVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XFxcXEBdXCIpKSxcbiAgICAgICAgU0VHTUVOVCQgPSBzdWJleHAoUENIQVIkICsgXCIqXCIpLFxuICAgICAgICBTRUdNRU5UX05aJCA9IHN1YmV4cChQQ0hBUiQgKyBcIitcIiksXG4gICAgICAgIFNFR01FTlRfTlpfTkMkID0gc3ViZXhwKHN1YmV4cChQQ1RfRU5DT0RFRCQgKyBcInxcIiArIG1lcmdlKFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcQF1cIikpICsgXCIrXCIpLFxuICAgICAgICBQQVRIX0FCRU1QVFkkID0gc3ViZXhwKHN1YmV4cChcIlxcXFwvXCIgKyBTRUdNRU5UJCkgKyBcIipcIiksXG4gICAgICAgIFBBVEhfQUJTT0xVVEUkID0gc3ViZXhwKFwiXFxcXC9cIiArIHN1YmV4cChTRUdNRU5UX05aJCArIFBBVEhfQUJFTVBUWSQpICsgXCI/XCIpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX05PU0NIRU1FJCA9IHN1YmV4cChTRUdNRU5UX05aX05DJCArIFBBVEhfQUJFTVBUWSQpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX1JPT1RMRVNTJCA9IHN1YmV4cChTRUdNRU5UX05aJCArIFBBVEhfQUJFTVBUWSQpLFxuICAgICAgICAvL3NpbXBsaWZpZWRcbiAgICBQQVRIX0VNUFRZJCA9IFwiKD8hXCIgKyBQQ0hBUiQgKyBcIilcIixcbiAgICAgICAgUEFUSCQgPSBzdWJleHAoUEFUSF9BQkVNUFRZJCArIFwifFwiICsgUEFUSF9BQlNPTFVURSQgKyBcInxcIiArIFBBVEhfTk9TQ0hFTUUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBRVUVSWSQgPSBzdWJleHAoc3ViZXhwKFBDSEFSJCArIFwifFwiICsgbWVyZ2UoXCJbXFxcXC9cXFxcP11cIiwgSVBSSVZBVEUkJCkpICsgXCIqXCIpLFxuICAgICAgICBGUkFHTUVOVCQgPSBzdWJleHAoc3ViZXhwKFBDSEFSJCArIFwifFtcXFxcL1xcXFw/XVwiKSArIFwiKlwiKSxcbiAgICAgICAgSElFUl9QQVJUJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvXCIgKyBBVVRIT1JJVFkkICsgUEFUSF9BQkVNUFRZJCkgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBVUkkkID0gc3ViZXhwKFNDSEVNRSQgKyBcIlxcXFw6XCIgKyBISUVSX1BBUlQkICsgc3ViZXhwKFwiXFxcXD9cIiArIFFVRVJZJCkgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjXCIgKyBGUkFHTUVOVCQpICsgXCI/XCIpLFxuICAgICAgICBSRUxBVElWRV9QQVJUJCA9IHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvXCIgKyBBVVRIT1JJVFkkICsgUEFUSF9BQkVNUFRZJCkgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX05PU0NIRU1FJCArIFwifFwiICsgUEFUSF9FTVBUWSQpLFxuICAgICAgICBSRUxBVElWRSQgPSBzdWJleHAoUkVMQVRJVkVfUEFSVCQgKyBzdWJleHAoXCJcXFxcP1wiICsgUVVFUlkkKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCNcIiArIEZSQUdNRU5UJCkgKyBcIj9cIiksXG4gICAgICAgIFVSSV9SRUZFUkVOQ0UkID0gc3ViZXhwKFVSSSQgKyBcInxcIiArIFJFTEFUSVZFJCksXG4gICAgICAgIEFCU09MVVRFX1VSSSQgPSBzdWJleHAoU0NIRU1FJCArIFwiXFxcXDpcIiArIEhJRVJfUEFSVCQgKyBzdWJleHAoXCJcXFxcP1wiICsgUVVFUlkkKSArIFwiP1wiKSxcbiAgICAgICAgR0VORVJJQ19SRUYkID0gXCJeKFwiICsgU0NIRU1FJCArIFwiKVxcXFw6XCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXC9cXFxcLyhcIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPylcIikgKyBcIj8oXCIgKyBQQVRIX0FCRU1QVFkkICsgXCJ8XCIgKyBQQVRIX0FCU09MVVRFJCArIFwifFwiICsgUEFUSF9ST09UTEVTUyQgKyBcInxcIiArIFBBVEhfRU1QVFkkICsgXCIpXCIpICsgc3ViZXhwKFwiXFxcXD8oXCIgKyBRVUVSWSQgKyBcIilcIikgKyBcIj9cIiArIHN1YmV4cChcIlxcXFwjKFwiICsgRlJBR01FTlQkICsgXCIpXCIpICsgXCI/JFwiLFxuICAgICAgICBSRUxBVElWRV9SRUYkID0gXCJeKCl7MH1cIiArIHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvKFwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/KVwiKSArIFwiPyhcIiArIFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX05PU0NIRU1FJCArIFwifFwiICsgUEFUSF9FTVBUWSQgKyBcIilcIikgKyBzdWJleHAoXCJcXFxcPyhcIiArIFFVRVJZJCArIFwiKVwiKSArIFwiP1wiICsgc3ViZXhwKFwiXFxcXCMoXCIgKyBGUkFHTUVOVCQgKyBcIilcIikgKyBcIj8kXCIsXG4gICAgICAgIEFCU09MVVRFX1JFRiQgPSBcIl4oXCIgKyBTQ0hFTUUkICsgXCIpXFxcXDpcIiArIHN1YmV4cChzdWJleHAoXCJcXFxcL1xcXFwvKFwiICsgc3ViZXhwKFwiKFwiICsgVVNFUklORk8kICsgXCIpQFwiKSArIFwiPyhcIiArIEhPU1QkICsgXCIpXCIgKyBzdWJleHAoXCJcXFxcOihcIiArIFBPUlQkICsgXCIpXCIpICsgXCI/KVwiKSArIFwiPyhcIiArIFBBVEhfQUJFTVBUWSQgKyBcInxcIiArIFBBVEhfQUJTT0xVVEUkICsgXCJ8XCIgKyBQQVRIX1JPT1RMRVNTJCArIFwifFwiICsgUEFUSF9FTVBUWSQgKyBcIilcIikgKyBzdWJleHAoXCJcXFxcPyhcIiArIFFVRVJZJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgU0FNRURPQ19SRUYkID0gXCJeXCIgKyBzdWJleHAoXCJcXFxcIyhcIiArIEZSQUdNRU5UJCArIFwiKVwiKSArIFwiPyRcIixcbiAgICAgICAgQVVUSE9SSVRZX1JFRiQgPSBcIl5cIiArIHN1YmV4cChcIihcIiArIFVTRVJJTkZPJCArIFwiKUBcIikgKyBcIj8oXCIgKyBIT1NUJCArIFwiKVwiICsgc3ViZXhwKFwiXFxcXDooXCIgKyBQT1JUJCArIFwiKVwiKSArIFwiPyRcIjtcbiAgICByZXR1cm4ge1xuICAgICAgICBOT1RfU0NIRU1FOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15dXCIsIEFMUEhBJCQsIERJR0lUJCQsIFwiW1xcXFwrXFxcXC1cXFxcLl1cIiksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1VTRVJJTkZPOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJVxcXFw6XVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX0hPU1Q6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXFtcXFxcXVxcXFw6XVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1BBVEg6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXC9cXFxcOlxcXFxAXVwiLCBVTlJFU0VSVkVEJCQsIFNVQl9ERUxJTVMkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX1BBVEhfTk9TQ0hFTUU6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXlxcXFwlXFxcXC9cXFxcQF1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIE5PVF9RVUVSWTogbmV3IFJlZ0V4cChtZXJnZShcIlteXFxcXCVdXCIsIFVOUkVTRVJWRUQkJCwgU1VCX0RFTElNUyQkLCBcIltcXFxcOlxcXFxAXFxcXC9cXFxcP11cIiwgSVBSSVZBVEUkJCksIFwiZ1wiKSxcbiAgICAgICAgTk9UX0ZSQUdNRU5UOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJV1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQsIFwiW1xcXFw6XFxcXEBcXFxcL1xcXFw/XVwiKSwgXCJnXCIpLFxuICAgICAgICBFU0NBUEU6IG5ldyBSZWdFeHAobWVyZ2UoXCJbXl1cIiwgVU5SRVNFUlZFRCQkLCBTVUJfREVMSU1TJCQpLCBcImdcIiksXG4gICAgICAgIFVOUkVTRVJWRUQ6IG5ldyBSZWdFeHAoVU5SRVNFUlZFRCQkLCBcImdcIiksXG4gICAgICAgIE9USEVSX0NIQVJTOiBuZXcgUmVnRXhwKG1lcmdlKFwiW15cXFxcJV1cIiwgVU5SRVNFUlZFRCQkLCBSRVNFUlZFRCQkKSwgXCJnXCIpLFxuICAgICAgICBQQ1RfRU5DT0RFRDogbmV3IFJlZ0V4cChQQ1RfRU5DT0RFRCQsIFwiZ1wiKSxcbiAgICAgICAgSVBWNEFERFJFU1M6IG5ldyBSZWdFeHAoXCJeKFwiICsgSVBWNEFERFJFU1MkICsgXCIpJFwiKSxcbiAgICAgICAgSVBWNkFERFJFU1M6IG5ldyBSZWdFeHAoXCJeXFxcXFs/KFwiICsgSVBWNkFERFJFU1MkICsgXCIpXCIgKyBzdWJleHAoc3ViZXhwKFwiXFxcXCUyNXxcXFxcJSg/IVwiICsgSEVYRElHJCQgKyBcInsyfSlcIikgKyBcIihcIiArIFpPTkVJRCQgKyBcIilcIikgKyBcIj9cXFxcXT8kXCIpIC8vUkZDIDY4NzQsIHdpdGggcmVsYXhlZCBwYXJzaW5nIHJ1bGVzXG4gICAgfTtcbn1cbnZhciBVUklfUFJPVE9DT0wgPSBidWlsZEV4cHMoZmFsc2UpO1xuXG52YXIgSVJJX1BST1RPQ09MID0gYnVpbGRFeHBzKHRydWUpO1xuXG52YXIgc2xpY2VkVG9BcnJheSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gc2xpY2VJdGVyYXRvcihhcnIsIGkpIHtcbiAgICB2YXIgX2FyciA9IFtdO1xuICAgIHZhciBfbiA9IHRydWU7XG4gICAgdmFyIF9kID0gZmFsc2U7XG4gICAgdmFyIF9lID0gdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIF9pID0gYXJyW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3M7ICEoX24gPSAoX3MgPSBfaS5uZXh0KCkpLmRvbmUpOyBfbiA9IHRydWUpIHtcbiAgICAgICAgX2Fyci5wdXNoKF9zLnZhbHVlKTtcblxuICAgICAgICBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBfZCA9IHRydWU7XG4gICAgICBfZSA9IGVycjtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSkgX2lbXCJyZXR1cm5cIl0oKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChfZCkgdGhyb3cgX2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9hcnI7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGFyciwgaSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICAgIHJldHVybiBhcnI7XG4gICAgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHtcbiAgICAgIHJldHVybiBzbGljZUl0ZXJhdG9yKGFyciwgaSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlXCIpO1xuICAgIH1cbiAgfTtcbn0oKTtcblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxudmFyIHRvQ29uc3VtYWJsZUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgYXJyMltpXSA9IGFycltpXTtcblxuICAgIHJldHVybiBhcnIyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGFycik7XG4gIH1cbn07XG5cbi8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblxudmFyIG1heEludCA9IDIxNDc0ODM2NDc7IC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuLyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xudmFyIGJhc2UgPSAzNjtcbnZhciB0TWluID0gMTtcbnZhciB0TWF4ID0gMjY7XG52YXIgc2tldyA9IDM4O1xudmFyIGRhbXAgPSA3MDA7XG52YXIgaW5pdGlhbEJpYXMgPSA3MjtcbnZhciBpbml0aWFsTiA9IDEyODsgLy8gMHg4MFxudmFyIGRlbGltaXRlciA9ICctJzsgLy8gJ1xceDJEJ1xuXG4vKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xudmFyIHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vO1xudmFyIHJlZ2V4Tm9uQVNDSUkgPSAvW15cXDAtXFx4N0VdLzsgLy8gbm9uLUFTQ0lJIGNoYXJzXG52YXIgcmVnZXhTZXBhcmF0b3JzID0gL1tcXHgyRVxcdTMwMDJcXHVGRjBFXFx1RkY2MV0vZzsgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG4vKiogRXJyb3IgbWVzc2FnZXMgKi9cbnZhciBlcnJvcnMgPSB7XG5cdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG59O1xuXG4vKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG52YXIgYmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluO1xudmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbnZhciBzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLyoqXG4gKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cbiAqL1xuZnVuY3Rpb24gZXJyb3IkMSh0eXBlKSB7XG5cdHRocm93IG5ldyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG59XG5cbi8qKlxuICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuICogaXRlbS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHR2YXIgcmVzdWx0ID0gW107XG5cdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdHJlc3VsdFtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3Mgb3IgZW1haWxcbiAqIGFkZHJlc3Nlcy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG4gKiBjaGFyYWN0ZXIuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuICogZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdHZhciBwYXJ0cyA9IHN0cmluZy5zcGxpdCgnQCcpO1xuXHR2YXIgcmVzdWx0ID0gJyc7XG5cdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0Ly8gSW4gZW1haWwgYWRkcmVzc2VzLCBvbmx5IHRoZSBkb21haW4gbmFtZSBzaG91bGQgYmUgcHVueWNvZGVkLiBMZWF2ZVxuXHRcdC8vIHRoZSBsb2NhbCBwYXJ0IChpLmUuIGV2ZXJ5dGhpbmcgdXAgdG8gYEBgKSBpbnRhY3QuXG5cdFx0cmVzdWx0ID0gcGFydHNbMF0gKyAnQCc7XG5cdFx0c3RyaW5nID0gcGFydHNbMV07XG5cdH1cblx0Ly8gQXZvaWQgYHNwbGl0KHJlZ2V4KWAgZm9yIElFOCBjb21wYXRpYmlsaXR5LiBTZWUgIzE3LlxuXHRzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZWdleFNlcGFyYXRvcnMsICdcXHgyRScpO1xuXHR2YXIgbGFiZWxzID0gc3RyaW5nLnNwbGl0KCcuJyk7XG5cdHZhciBlbmNvZGVkID0gbWFwKGxhYmVscywgZm4pLmpvaW4oJy4nKTtcblx0cmV0dXJuIHJlc3VsdCArIGVuY29kZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcbiAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuICogbWF0Y2hpbmcgVVRGLTE2LlxuICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG4gKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG4gKiBAbmFtZSBkZWNvZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG4gKi9cbmZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdHZhciBvdXRwdXQgPSBbXTtcblx0dmFyIGNvdW50ZXIgPSAwO1xuXHR2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcblx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHR2YXIgdmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdC8vIEl0J3MgYSBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXIuXG5cdFx0XHR2YXIgZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7XG5cdFx0XHRcdC8vIExvdyBzdXJyb2dhdGUuXG5cdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBJdCdzIGFuIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZVxuXHRcdFx0XHQvLyBuZXh0IGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpci5cblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG91dHB1dDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG4gKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcbiAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG4gKiBAbmFtZSBlbmNvZGVcbiAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG4gKi9cbnZhciB1Y3MyZW5jb2RlID0gZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRyZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQuYXBwbHkoU3RyaW5nLCB0b0NvbnN1bWFibGVBcnJheShhcnJheSkpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG4gKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cbiAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcbiAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuICovXG52YXIgYmFzaWNUb0RpZ2l0ID0gZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRpZiAoY29kZVBvaW50IC0gMHgzMCA8IDB4MEEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHgxNjtcblx0fVxuXHRpZiAoY29kZVBvaW50IC0gMHg0MSA8IDB4MUEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHg0MTtcblx0fVxuXHRpZiAoY29kZVBvaW50IC0gMHg2MSA8IDB4MUEpIHtcblx0XHRyZXR1cm4gY29kZVBvaW50IC0gMHg2MTtcblx0fVxuXHRyZXR1cm4gYmFzZTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG4gKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG4gKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cbiAqL1xudmFyIGRpZ2l0VG9CYXNpYyA9IGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcbn07XG5cbi8qKlxuICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cbiAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgYWRhcHQgPSBmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0dmFyIGsgPSAwO1xuXHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdGZvciAoOyAvKiBubyBpbml0aWFsaXphdGlvbiAqL2RlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHR9XG5cdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuICogc3ltYm9scy5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuICovXG52YXIgZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdC8vIERvbid0IHVzZSBVQ1MtMi5cblx0dmFyIG91dHB1dCA9IFtdO1xuXHR2YXIgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cdHZhciBpID0gMDtcblx0dmFyIG4gPSBpbml0aWFsTjtcblx0dmFyIGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0dmFyIGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdGJhc2ljID0gMDtcblx0fVxuXG5cdGZvciAodmFyIGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdGVycm9yJDEoJ25vdC1iYXNpYycpO1xuXHRcdH1cblx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0fVxuXG5cdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRmb3IgKHZhciBpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7KSAvKiBubyBmaW5hbCBleHByZXNzaW9uICove1xuXG5cdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHR2YXIgb2xkaSA9IGk7XG5cdFx0Zm9yICh2YXIgdyA9IDEsIGsgPSBiYXNlOzsgLyogbm8gY29uZGl0aW9uICovayArPSBiYXNlKSB7XG5cblx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRlcnJvciQxKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdHZhciB0ID0gayA8PSBiaWFzID8gdE1pbiA6IGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXM7XG5cblx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdGVycm9yJDEoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblx0XHR9XG5cblx0XHR2YXIgb3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHR9XG5cblx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdGkgJT0gb3V0O1xuXG5cdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dC5cblx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cdH1cblxuXHRyZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQuYXBwbHkoU3RyaW5nLCBvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgKGUuZy4gYSBkb21haW4gbmFtZSBsYWJlbCkgdG8gYVxuICogUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuICovXG52YXIgZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdHZhciBvdXRwdXQgPSBbXTtcblxuXHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBhbiBhcnJheSBvZiBVbmljb2RlIGNvZGUgcG9pbnRzLlxuXHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdC8vIENhY2hlIHRoZSBsZW5ndGguXG5cdHZhciBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZS5cblx0dmFyIG4gPSBpbml0aWFsTjtcblx0dmFyIGRlbHRhID0gMDtcblx0dmFyIGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzLlxuXHR2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG5cdHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuXHR2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cblx0dHJ5IHtcblx0XHRmb3IgKHZhciBfaXRlcmF0b3IgPSBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcblx0XHRcdHZhciBfY3VycmVudFZhbHVlMiA9IF9zdGVwLnZhbHVlO1xuXG5cdFx0XHRpZiAoX2N1cnJlbnRWYWx1ZTIgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShfY3VycmVudFZhbHVlMikpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0X2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuXHRcdF9pdGVyYXRvckVycm9yID0gZXJyO1xuXHR9IGZpbmFsbHkge1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybikge1xuXHRcdFx0XHRfaXRlcmF0b3IucmV0dXJuKCk7XG5cdFx0XHR9XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuXHRcdFx0XHR0aHJvdyBfaXRlcmF0b3JFcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHR2YXIgYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXHR2YXIgaGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aDtcblxuXHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIHdpdGggYSBkZWxpbWl0ZXIgdW5sZXNzIGl0J3MgZW1wdHkuXG5cdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdH1cblxuXHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHR2YXIgbSA9IG1heEludDtcblx0XHR2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuXHRcdHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcblx0XHR2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGZvciAodmFyIF9pdGVyYXRvcjIgPSBpbnB1dFtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuXHRcdFx0XHR2YXIgY3VycmVudFZhbHVlID0gX3N0ZXAyLnZhbHVlO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvdy5cblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG5cdFx0XHRfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4pIHtcblx0XHRcdFx0XHRfaXRlcmF0b3IyLnJldHVybigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGZpbmFsbHkge1xuXHRcdFx0XHRpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG5cdFx0XHRcdFx0dGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0ZXJyb3IkMSgnb3ZlcmZsb3cnKTtcblx0XHR9XG5cblx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdG4gPSBtO1xuXG5cdFx0dmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24zID0gdHJ1ZTtcblx0XHR2YXIgX2RpZEl0ZXJhdG9yRXJyb3IzID0gZmFsc2U7XG5cdFx0dmFyIF9pdGVyYXRvckVycm9yMyA9IHVuZGVmaW5lZDtcblxuXHRcdHRyeSB7XG5cdFx0XHRmb3IgKHZhciBfaXRlcmF0b3IzID0gaW5wdXRbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDM7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgPSAoX3N0ZXAzID0gX2l0ZXJhdG9yMy5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMyA9IHRydWUpIHtcblx0XHRcdFx0dmFyIF9jdXJyZW50VmFsdWUgPSBfc3RlcDMudmFsdWU7XG5cblx0XHRcdFx0aWYgKF9jdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvciQxKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlci5cblx0XHRcdFx0XHR2YXIgcSA9IGRlbHRhO1xuXHRcdFx0XHRcdGZvciAodmFyIGsgPSBiYXNlOzsgLyogbm8gY29uZGl0aW9uICovayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR2YXIgdCA9IGsgPD0gYmlhcyA/IHRNaW4gOiBrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdHZhciBiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpKTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdF9kaWRJdGVyYXRvckVycm9yMyA9IHRydWU7XG5cdFx0XHRfaXRlcmF0b3JFcnJvcjMgPSBlcnI7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjMgJiYgX2l0ZXJhdG9yMy5yZXR1cm4pIHtcblx0XHRcdFx0XHRfaXRlcmF0b3IzLnJldHVybigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGZpbmFsbHkge1xuXHRcdFx0XHRpZiAoX2RpZEl0ZXJhdG9yRXJyb3IzKSB7XG5cdFx0XHRcdFx0dGhyb3cgX2l0ZXJhdG9yRXJyb3IzO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0KytkZWx0YTtcblx0XHQrK247XG5cdH1cblx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgb3IgYW4gZW1haWwgYWRkcmVzc1xuICogdG8gVW5pY29kZS4gT25seSB0aGUgUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBpbnB1dCB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLlxuICogaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuXG4gKiBjb252ZXJ0ZWQgdG8gVW5pY29kZS5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZWQgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0b1xuICogY29udmVydCB0byBVbmljb2RlLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG4gKiBzdHJpbmcuXG4gKi9cbnZhciB0b1VuaWNvZGUgPSBmdW5jdGlvbiB0b1VuaWNvZGUoaW5wdXQpIHtcblx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24gKHN0cmluZykge1xuXHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKSA/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSkgOiBzdHJpbmc7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3MgdG9cbiAqIFB1bnljb2RlLiBPbmx5IHRoZSBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLFxuICogaS5lLiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluXG4gKiBBU0NJSS5cbiAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvIGNvbnZlcnQsIGFzIGFcbiAqIFVuaWNvZGUgc3RyaW5nLlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZSBvclxuICogZW1haWwgYWRkcmVzcy5cbiAqL1xudmFyIHRvQVNDSUkgPSBmdW5jdGlvbiB0b0FTQ0lJKGlucHV0KSB7XG5cdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uIChzdHJpbmcpIHtcblx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZykgPyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKSA6IHN0cmluZztcblx0fSk7XG59O1xuXG4vKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuLyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xudmFyIHB1bnljb2RlID0ge1xuXHQvKipcbiAgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG4gICogQG1lbWJlck9mIHB1bnljb2RlXG4gICogQHR5cGUgU3RyaW5nXG4gICovXG5cdCd2ZXJzaW9uJzogJzIuMS4wJyxcblx0LyoqXG4gICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcbiAgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuICAqIEBzZWUgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuICAqIEBtZW1iZXJPZiBwdW55Y29kZVxuICAqIEB0eXBlIE9iamVjdFxuICAqL1xuXHQndWNzMic6IHtcblx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHR9LFxuXHQnZGVjb2RlJzogZGVjb2RlLFxuXHQnZW5jb2RlJzogZW5jb2RlLFxuXHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcbn07XG5cbi8qKlxuICogVVJJLmpzXG4gKlxuICogQGZpbGVvdmVydmlldyBBbiBSRkMgMzk4NiBjb21wbGlhbnQsIHNjaGVtZSBleHRlbmRhYmxlIFVSSSBwYXJzaW5nL3ZhbGlkYXRpbmcvcmVzb2x2aW5nIGxpYnJhcnkgZm9yIEphdmFTY3JpcHQuXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86Z2FyeS5jb3VydEBnbWFpbC5jb21cIj5HYXJ5IENvdXJ0PC9hPlxuICogQHNlZSBodHRwOi8vZ2l0aHViLmNvbS9nYXJ5Y291cnQvdXJpLWpzXG4gKi9cbi8qKlxuICogQ29weXJpZ2h0IDIwMTEgR2FyeSBDb3VydC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXQgbW9kaWZpY2F0aW9uLCBhcmVcbiAqIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuICpcbiAqICAgIDEuIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0IG9mXG4gKiAgICAgICBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gKlxuICogICAgMi4gUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3RcbiAqICAgICAgIG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGUgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzXG4gKiAgICAgICBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG4gKlxuICogVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBHQVJZIENPVVJUIGBgQVMgSVMnJyBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRFxuICogV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIEdBUlkgQ09VUlQgT1JcbiAqIENPTlRSSUJVVE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SXG4gKiBDT05TRVFVRU5USUFMIERBTUFHRVMgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SXG4gKiBTRVJWSUNFUzsgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OXG4gKiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HXG4gKiBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRISVMgU09GVFdBUkUsIEVWRU4gSUZcbiAqIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICpcbiAqIFRoZSB2aWV3cyBhbmQgY29uY2x1c2lvbnMgY29udGFpbmVkIGluIHRoZSBzb2Z0d2FyZSBhbmQgZG9jdW1lbnRhdGlvbiBhcmUgdGhvc2Ugb2YgdGhlXG4gKiBhdXRob3JzIGFuZCBzaG91bGQgbm90IGJlIGludGVycHJldGVkIGFzIHJlcHJlc2VudGluZyBvZmZpY2lhbCBwb2xpY2llcywgZWl0aGVyIGV4cHJlc3NlZFxuICogb3IgaW1wbGllZCwgb2YgR2FyeSBDb3VydC5cbiAqL1xudmFyIFNDSEVNRVMgPSB7fTtcbmZ1bmN0aW9uIHBjdEVuY0NoYXIoY2hyKSB7XG4gICAgdmFyIGMgPSBjaHIuY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgZSA9IHZvaWQgMDtcbiAgICBpZiAoYyA8IDE2KSBlID0gXCIlMFwiICsgYy50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtlbHNlIGlmIChjIDwgMTI4KSBlID0gXCIlXCIgKyBjLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO2Vsc2UgaWYgKGMgPCAyMDQ4KSBlID0gXCIlXCIgKyAoYyA+PiA2IHwgMTkyKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSArIFwiJVwiICsgKGMgJiA2MyB8IDEyOCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7ZWxzZSBlID0gXCIlXCIgKyAoYyA+PiAxMiB8IDIyNCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIiVcIiArIChjID4+IDYgJiA2MyB8IDEyOCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIiVcIiArIChjICYgNjMgfCAxMjgpLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuICAgIHJldHVybiBlO1xufVxuZnVuY3Rpb24gcGN0RGVjQ2hhcnMoc3RyKSB7XG4gICAgdmFyIG5ld1N0ciA9IFwiXCI7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBpbCA9IHN0ci5sZW5ndGg7XG4gICAgd2hpbGUgKGkgPCBpbCkge1xuICAgICAgICB2YXIgYyA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDEsIDIpLCAxNik7XG4gICAgICAgIGlmIChjIDwgMTI4KSB7XG4gICAgICAgICAgICBuZXdTdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgICAgICAgICAgIGkgKz0gMztcbiAgICAgICAgfSBlbHNlIGlmIChjID49IDE5NCAmJiBjIDwgMjI0KSB7XG4gICAgICAgICAgICBpZiAoaWwgLSBpID49IDYpIHtcbiAgICAgICAgICAgICAgICB2YXIgYzIgPSBwYXJzZUludChzdHIuc3Vic3RyKGkgKyA0LCAyKSwgMTYpO1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKChjICYgMzEpIDw8IDYgfCBjMiAmIDYzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3U3RyICs9IHN0ci5zdWJzdHIoaSwgNik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpICs9IDY7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA+PSAyMjQpIHtcbiAgICAgICAgICAgIGlmIChpbCAtIGkgPj0gOSkge1xuICAgICAgICAgICAgICAgIHZhciBfYyA9IHBhcnNlSW50KHN0ci5zdWJzdHIoaSArIDQsIDIpLCAxNik7XG4gICAgICAgICAgICAgICAgdmFyIGMzID0gcGFyc2VJbnQoc3RyLnN1YnN0cihpICsgNywgMiksIDE2KTtcbiAgICAgICAgICAgICAgICBuZXdTdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgoYyAmIDE1KSA8PCAxMiB8IChfYyAmIDYzKSA8PCA2IHwgYzMgJiA2Myk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1N0ciArPSBzdHIuc3Vic3RyKGksIDkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaSArPSA5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3U3RyICs9IHN0ci5zdWJzdHIoaSwgMyk7XG4gICAgICAgICAgICBpICs9IDM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1N0cjtcbn1cbmZ1bmN0aW9uIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBwcm90b2NvbCkge1xuICAgIGZ1bmN0aW9uIGRlY29kZVVucmVzZXJ2ZWQoc3RyKSB7XG4gICAgICAgIHZhciBkZWNTdHIgPSBwY3REZWNDaGFycyhzdHIpO1xuICAgICAgICByZXR1cm4gIWRlY1N0ci5tYXRjaChwcm90b2NvbC5VTlJFU0VSVkVEKSA/IHN0ciA6IGRlY1N0cjtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMuc2NoZW1lKSBjb21wb25lbnRzLnNjaGVtZSA9IFN0cmluZyhjb21wb25lbnRzLnNjaGVtZSkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKHByb3RvY29sLk5PVF9TQ0hFTUUsIFwiXCIpO1xuICAgIGlmIChjb21wb25lbnRzLnVzZXJpbmZvICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMudXNlcmluZm8gPSBTdHJpbmcoY29tcG9uZW50cy51c2VyaW5mbykucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShwcm90b2NvbC5OT1RfVVNFUklORk8sIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5ob3N0ICE9PSB1bmRlZmluZWQpIGNvbXBvbmVudHMuaG9zdCA9IFN0cmluZyhjb21wb25lbnRzLmhvc3QpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnRvTG93ZXJDYXNlKCkucmVwbGFjZShwcm90b2NvbC5OT1RfSE9TVCwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIGlmIChjb21wb25lbnRzLnBhdGggIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5wYXRoID0gU3RyaW5nKGNvbXBvbmVudHMucGF0aCkucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShjb21wb25lbnRzLnNjaGVtZSA/IHByb3RvY29sLk5PVF9QQVRIIDogcHJvdG9jb2wuTk9UX1BBVEhfTk9TQ0hFTUUsIHBjdEVuY0NoYXIpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKTtcbiAgICBpZiAoY29tcG9uZW50cy5xdWVyeSAhPT0gdW5kZWZpbmVkKSBjb21wb25lbnRzLnF1ZXJ5ID0gU3RyaW5nKGNvbXBvbmVudHMucXVlcnkpLnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UocHJvdG9jb2wuTk9UX1FVRVJZLCBwY3RFbmNDaGFyKS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCB0b1VwcGVyQ2FzZSk7XG4gICAgaWYgKGNvbXBvbmVudHMuZnJhZ21lbnQgIT09IHVuZGVmaW5lZCkgY29tcG9uZW50cy5mcmFnbWVudCA9IFN0cmluZyhjb21wb25lbnRzLmZyYWdtZW50KS5yZXBsYWNlKHByb3RvY29sLlBDVF9FTkNPREVELCBkZWNvZGVVbnJlc2VydmVkKS5yZXBsYWNlKHByb3RvY29sLk5PVF9GUkFHTUVOVCwgcGN0RW5jQ2hhcikucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpO1xuICAgIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBfc3RyaXBMZWFkaW5nWmVyb3Moc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eMCooLiopLywgXCIkMVwiKSB8fCBcIjBcIjtcbn1cbmZ1bmN0aW9uIF9ub3JtYWxpemVJUHY0KGhvc3QsIHByb3RvY29sKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBob3N0Lm1hdGNoKHByb3RvY29sLklQVjRBRERSRVNTKSB8fCBbXTtcblxuICAgIHZhciBfbWF0Y2hlcyA9IHNsaWNlZFRvQXJyYXkobWF0Y2hlcywgMiksXG4gICAgICAgIGFkZHJlc3MgPSBfbWF0Y2hlc1sxXTtcblxuICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgIHJldHVybiBhZGRyZXNzLnNwbGl0KFwiLlwiKS5tYXAoX3N0cmlwTGVhZGluZ1plcm9zKS5qb2luKFwiLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG59XG5mdW5jdGlvbiBfbm9ybWFsaXplSVB2Nihob3N0LCBwcm90b2NvbCkge1xuICAgIHZhciBtYXRjaGVzID0gaG9zdC5tYXRjaChwcm90b2NvbC5JUFY2QUREUkVTUykgfHwgW107XG5cbiAgICB2YXIgX21hdGNoZXMyID0gc2xpY2VkVG9BcnJheShtYXRjaGVzLCAzKSxcbiAgICAgICAgYWRkcmVzcyA9IF9tYXRjaGVzMlsxXSxcbiAgICAgICAgem9uZSA9IF9tYXRjaGVzMlsyXTtcblxuICAgIGlmIChhZGRyZXNzKSB7XG4gICAgICAgIHZhciBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQgPSBhZGRyZXNzLnRvTG93ZXJDYXNlKCkuc3BsaXQoJzo6JykucmV2ZXJzZSgpLFxuICAgICAgICAgICAgX2FkZHJlc3MkdG9Mb3dlckNhc2UkMiA9IHNsaWNlZFRvQXJyYXkoX2FkZHJlc3MkdG9Mb3dlckNhc2UkLCAyKSxcbiAgICAgICAgICAgIGxhc3QgPSBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQyWzBdLFxuICAgICAgICAgICAgZmlyc3QgPSBfYWRkcmVzcyR0b0xvd2VyQ2FzZSQyWzFdO1xuXG4gICAgICAgIHZhciBmaXJzdEZpZWxkcyA9IGZpcnN0ID8gZmlyc3Quc3BsaXQoXCI6XCIpLm1hcChfc3RyaXBMZWFkaW5nWmVyb3MpIDogW107XG4gICAgICAgIHZhciBsYXN0RmllbGRzID0gbGFzdC5zcGxpdChcIjpcIikubWFwKF9zdHJpcExlYWRpbmdaZXJvcyk7XG4gICAgICAgIHZhciBpc0xhc3RGaWVsZElQdjRBZGRyZXNzID0gcHJvdG9jb2wuSVBWNEFERFJFU1MudGVzdChsYXN0RmllbGRzW2xhc3RGaWVsZHMubGVuZ3RoIC0gMV0pO1xuICAgICAgICB2YXIgZmllbGRDb3VudCA9IGlzTGFzdEZpZWxkSVB2NEFkZHJlc3MgPyA3IDogODtcbiAgICAgICAgdmFyIGxhc3RGaWVsZHNTdGFydCA9IGxhc3RGaWVsZHMubGVuZ3RoIC0gZmllbGRDb3VudDtcbiAgICAgICAgdmFyIGZpZWxkcyA9IEFycmF5KGZpZWxkQ291bnQpO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGZpZWxkQ291bnQ7ICsreCkge1xuICAgICAgICAgICAgZmllbGRzW3hdID0gZmlyc3RGaWVsZHNbeF0gfHwgbGFzdEZpZWxkc1tsYXN0RmllbGRzU3RhcnQgKyB4XSB8fCAnJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNMYXN0RmllbGRJUHY0QWRkcmVzcykge1xuICAgICAgICAgICAgZmllbGRzW2ZpZWxkQ291bnQgLSAxXSA9IF9ub3JtYWxpemVJUHY0KGZpZWxkc1tmaWVsZENvdW50IC0gMV0sIHByb3RvY29sKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYWxsWmVyb0ZpZWxkcyA9IGZpZWxkcy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgZmllbGQsIGluZGV4KSB7XG4gICAgICAgICAgICBpZiAoIWZpZWxkIHx8IGZpZWxkID09PSBcIjBcIikge1xuICAgICAgICAgICAgICAgIHZhciBsYXN0TG9uZ2VzdCA9IGFjY1thY2MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RMb25nZXN0ICYmIGxhc3RMb25nZXN0LmluZGV4ICsgbGFzdExvbmdlc3QubGVuZ3RoID09PSBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBsYXN0TG9uZ2VzdC5sZW5ndGgrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7IGluZGV4OiBpbmRleCwgbGVuZ3RoOiAxIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgdmFyIGxvbmdlc3RaZXJvRmllbGRzID0gYWxsWmVyb0ZpZWxkcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYi5sZW5ndGggLSBhLmxlbmd0aDtcbiAgICAgICAgfSlbMF07XG4gICAgICAgIHZhciBuZXdIb3N0ID0gdm9pZCAwO1xuICAgICAgICBpZiAobG9uZ2VzdFplcm9GaWVsZHMgJiYgbG9uZ2VzdFplcm9GaWVsZHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdmFyIG5ld0ZpcnN0ID0gZmllbGRzLnNsaWNlKDAsIGxvbmdlc3RaZXJvRmllbGRzLmluZGV4KTtcbiAgICAgICAgICAgIHZhciBuZXdMYXN0ID0gZmllbGRzLnNsaWNlKGxvbmdlc3RaZXJvRmllbGRzLmluZGV4ICsgbG9uZ2VzdFplcm9GaWVsZHMubGVuZ3RoKTtcbiAgICAgICAgICAgIG5ld0hvc3QgPSBuZXdGaXJzdC5qb2luKFwiOlwiKSArIFwiOjpcIiArIG5ld0xhc3Quam9pbihcIjpcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdIb3N0ID0gZmllbGRzLmpvaW4oXCI6XCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh6b25lKSB7XG4gICAgICAgICAgICBuZXdIb3N0ICs9IFwiJVwiICsgem9uZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3SG9zdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG59XG52YXIgVVJJX1BBUlNFID0gL14oPzooW146XFwvPyNdKyk6KT8oPzpcXC9cXC8oKD86KFteXFwvPyNAXSopQCk/KFxcW1teXFwvPyNcXF1dK1xcXXxbXlxcLz8jOl0qKSg/OlxcOihcXGQqKSk/KSk/KFtePyNdKikoPzpcXD8oW14jXSopKT8oPzojKCg/Oi58XFxufFxccikqKSk/L2k7XG52YXIgTk9fTUFUQ0hfSVNfVU5ERUZJTkVEID0gXCJcIi5tYXRjaCgvKCl7MH0vKVsxXSA9PT0gdW5kZWZpbmVkO1xuZnVuY3Rpb24gcGFyc2UodXJpU3RyaW5nKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9O1xuXG4gICAgdmFyIGNvbXBvbmVudHMgPSB7fTtcbiAgICB2YXIgcHJvdG9jb2wgPSBvcHRpb25zLmlyaSAhPT0gZmFsc2UgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlID09PSBcInN1ZmZpeFwiKSB1cmlTdHJpbmcgPSAob3B0aW9ucy5zY2hlbWUgPyBvcHRpb25zLnNjaGVtZSArIFwiOlwiIDogXCJcIikgKyBcIi8vXCIgKyB1cmlTdHJpbmc7XG4gICAgdmFyIG1hdGNoZXMgPSB1cmlTdHJpbmcubWF0Y2goVVJJX1BBUlNFKTtcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICBpZiAoTk9fTUFUQ0hfSVNfVU5ERUZJTkVEKSB7XG4gICAgICAgICAgICAvL3N0b3JlIGVhY2ggY29tcG9uZW50XG4gICAgICAgICAgICBjb21wb25lbnRzLnNjaGVtZSA9IG1hdGNoZXNbMV07XG4gICAgICAgICAgICBjb21wb25lbnRzLnVzZXJpbmZvID0gbWF0Y2hlc1szXTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9IG1hdGNoZXNbNF07XG4gICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSBwYXJzZUludChtYXRjaGVzWzVdLCAxMCk7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBtYXRjaGVzWzZdIHx8IFwiXCI7XG4gICAgICAgICAgICBjb21wb25lbnRzLnF1ZXJ5ID0gbWF0Y2hlc1s3XTtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZnJhZ21lbnQgPSBtYXRjaGVzWzhdO1xuICAgICAgICAgICAgLy9maXggcG9ydCBudW1iZXJcbiAgICAgICAgICAgIGlmIChpc05hTihjb21wb25lbnRzLnBvcnQpKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gbWF0Y2hlc1s1XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vSUUgRklYIGZvciBpbXByb3BlciBSZWdFeHAgbWF0Y2hpbmdcbiAgICAgICAgICAgIC8vc3RvcmUgZWFjaCBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbXBvbmVudHMuc2NoZW1lID0gbWF0Y2hlc1sxXSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLnVzZXJpbmZvID0gdXJpU3RyaW5nLmluZGV4T2YoXCJAXCIpICE9PSAtMSA/IG1hdGNoZXNbM10gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLmhvc3QgPSB1cmlTdHJpbmcuaW5kZXhPZihcIi8vXCIpICE9PSAtMSA/IG1hdGNoZXNbNF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSBwYXJzZUludChtYXRjaGVzWzVdLCAxMCk7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBtYXRjaGVzWzZdIHx8IFwiXCI7XG4gICAgICAgICAgICBjb21wb25lbnRzLnF1ZXJ5ID0gdXJpU3RyaW5nLmluZGV4T2YoXCI/XCIpICE9PSAtMSA/IG1hdGNoZXNbN10gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb21wb25lbnRzLmZyYWdtZW50ID0gdXJpU3RyaW5nLmluZGV4T2YoXCIjXCIpICE9PSAtMSA/IG1hdGNoZXNbOF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAvL2ZpeCBwb3J0IG51bWJlclxuICAgICAgICAgICAgaWYgKGlzTmFOKGNvbXBvbmVudHMucG9ydCkpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzLnBvcnQgPSB1cmlTdHJpbmcubWF0Y2goL1xcL1xcLyg/Oi58XFxuKSpcXDooPzpcXC98XFw/fFxcI3wkKS8pID8gbWF0Y2hlc1s0XSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50cy5ob3N0KSB7XG4gICAgICAgICAgICAvL25vcm1hbGl6ZSBJUCBob3N0c1xuICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gX25vcm1hbGl6ZUlQdjYoX25vcm1hbGl6ZUlQdjQoY29tcG9uZW50cy5ob3N0LCBwcm90b2NvbCksIHByb3RvY29sKTtcbiAgICAgICAgfVxuICAgICAgICAvL2RldGVybWluZSByZWZlcmVuY2UgdHlwZVxuICAgICAgICBpZiAoY29tcG9uZW50cy5zY2hlbWUgPT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnRzLnVzZXJpbmZvID09PSB1bmRlZmluZWQgJiYgY29tcG9uZW50cy5ob3N0ID09PSB1bmRlZmluZWQgJiYgY29tcG9uZW50cy5wb3J0ID09PSB1bmRlZmluZWQgJiYgIWNvbXBvbmVudHMucGF0aCAmJiBjb21wb25lbnRzLnF1ZXJ5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJzYW1lLWRvY3VtZW50XCI7XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50cy5zY2hlbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29tcG9uZW50cy5yZWZlcmVuY2UgPSBcInJlbGF0aXZlXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50cy5mcmFnbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnJlZmVyZW5jZSA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucmVmZXJlbmNlID0gXCJ1cmlcIjtcbiAgICAgICAgfVxuICAgICAgICAvL2NoZWNrIGZvciByZWZlcmVuY2UgZXJyb3JzXG4gICAgICAgIGlmIChvcHRpb25zLnJlZmVyZW5jZSAmJiBvcHRpb25zLnJlZmVyZW5jZSAhPT0gXCJzdWZmaXhcIiAmJiBvcHRpb25zLnJlZmVyZW5jZSAhPT0gY29tcG9uZW50cy5yZWZlcmVuY2UpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiVVJJIGlzIG5vdCBhIFwiICsgb3B0aW9ucy5yZWZlcmVuY2UgKyBcIiByZWZlcmVuY2UuXCI7XG4gICAgICAgIH1cbiAgICAgICAgLy9maW5kIHNjaGVtZSBoYW5kbGVyXG4gICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1sob3B0aW9ucy5zY2hlbWUgfHwgY29tcG9uZW50cy5zY2hlbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKV07XG4gICAgICAgIC8vY2hlY2sgaWYgc2NoZW1lIGNhbid0IGhhbmRsZSBJUklzXG4gICAgICAgIGlmICghb3B0aW9ucy51bmljb2RlU3VwcG9ydCAmJiAoIXNjaGVtZUhhbmRsZXIgfHwgIXNjaGVtZUhhbmRsZXIudW5pY29kZVN1cHBvcnQpKSB7XG4gICAgICAgICAgICAvL2lmIGhvc3QgY29tcG9uZW50IGlzIGEgZG9tYWluIG5hbWVcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRzLmhvc3QgJiYgKG9wdGlvbnMuZG9tYWluSG9zdCB8fCBzY2hlbWVIYW5kbGVyICYmIHNjaGVtZUhhbmRsZXIuZG9tYWluSG9zdCkpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgVW5pY29kZSBJRE4gLT4gQVNDSUkgSUROXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5ob3N0ID0gcHVueWNvZGUudG9BU0NJSShjb21wb25lbnRzLmhvc3QucmVwbGFjZShwcm90b2NvbC5QQ1RfRU5DT0RFRCwgcGN0RGVjQ2hhcnMpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJIb3N0J3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gQVNDSUkgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb252ZXJ0IElSSSAtPiBVUklcbiAgICAgICAgICAgIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBVUklfUFJPVE9DT0wpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9ub3JtYWxpemUgZW5jb2RpbmdzXG4gICAgICAgICAgICBfbm9ybWFsaXplQ29tcG9uZW50RW5jb2RpbmcoY29tcG9uZW50cywgcHJvdG9jb2wpO1xuICAgICAgICB9XG4gICAgICAgIC8vcGVyZm9ybSBzY2hlbWUgc3BlY2lmaWMgcGFyc2luZ1xuICAgICAgICBpZiAoc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLnBhcnNlKSB7XG4gICAgICAgICAgICBzY2hlbWVIYW5kbGVyLnBhcnNlKGNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJVUkkgY2FuIG5vdCBiZSBwYXJzZWQuXCI7XG4gICAgfVxuICAgIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBfcmVjb21wb3NlQXV0aG9yaXR5KGNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcHJvdG9jb2wgPSBvcHRpb25zLmlyaSAhPT0gZmFsc2UgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgdmFyIHVyaVRva2VucyA9IFtdO1xuICAgIGlmIChjb21wb25lbnRzLnVzZXJpbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy51c2VyaW5mbyk7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiQFwiKTtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMuaG9zdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vbm9ybWFsaXplIElQIGhvc3RzLCBhZGQgYnJhY2tldHMgYW5kIGVzY2FwZSB6b25lIHNlcGFyYXRvciBmb3IgSVB2NlxuICAgICAgICB1cmlUb2tlbnMucHVzaChfbm9ybWFsaXplSVB2Nihfbm9ybWFsaXplSVB2NChTdHJpbmcoY29tcG9uZW50cy5ob3N0KSwgcHJvdG9jb2wpLCBwcm90b2NvbCkucmVwbGFjZShwcm90b2NvbC5JUFY2QUREUkVTUywgZnVuY3Rpb24gKF8sICQxLCAkMikge1xuICAgICAgICAgICAgcmV0dXJuIFwiW1wiICsgJDEgKyAoJDIgPyBcIiUyNVwiICsgJDIgOiBcIlwiKSArIFwiXVwiO1xuICAgICAgICB9KSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgY29tcG9uZW50cy5wb3J0ID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBjb21wb25lbnRzLnBvcnQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCI6XCIpO1xuICAgICAgICB1cmlUb2tlbnMucHVzaChTdHJpbmcoY29tcG9uZW50cy5wb3J0KSk7XG4gICAgfVxuICAgIHJldHVybiB1cmlUb2tlbnMubGVuZ3RoID8gdXJpVG9rZW5zLmpvaW4oXCJcIikgOiB1bmRlZmluZWQ7XG59XG5cbnZhciBSRFMxID0gL15cXC5cXC4/XFwvLztcbnZhciBSRFMyID0gL15cXC9cXC4oXFwvfCQpLztcbnZhciBSRFMzID0gL15cXC9cXC5cXC4oXFwvfCQpLztcbnZhciBSRFM1ID0gL15cXC8/KD86LnxcXG4pKj8oPz1cXC98JCkvO1xuZnVuY3Rpb24gcmVtb3ZlRG90U2VnbWVudHMoaW5wdXQpIHtcbiAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgd2hpbGUgKGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBpZiAoaW5wdXQubWF0Y2goUkRTMSkpIHtcbiAgICAgICAgICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZShSRFMxLCBcIlwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5tYXRjaChSRFMyKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKFJEUzIsIFwiL1wiKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5tYXRjaChSRFMzKSkge1xuICAgICAgICAgICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKFJEUzMsIFwiL1wiKTtcbiAgICAgICAgICAgIG91dHB1dC5wb3AoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dCA9PT0gXCIuXCIgfHwgaW5wdXQgPT09IFwiLi5cIikge1xuICAgICAgICAgICAgaW5wdXQgPSBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGltID0gaW5wdXQubWF0Y2goUkRTNSk7XG4gICAgICAgICAgICBpZiAoaW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgcyA9IGltWzBdO1xuICAgICAgICAgICAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2Uocy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGRvdCBzZWdtZW50IGNvbmRpdGlvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0LmpvaW4oXCJcIik7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZShjb21wb25lbnRzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHt9O1xuXG4gICAgdmFyIHByb3RvY29sID0gb3B0aW9ucy5pcmkgPyBJUklfUFJPVE9DT0wgOiBVUklfUFJPVE9DT0w7XG4gICAgdmFyIHVyaVRva2VucyA9IFtdO1xuICAgIC8vZmluZCBzY2hlbWUgaGFuZGxlclxuICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1sob3B0aW9ucy5zY2hlbWUgfHwgY29tcG9uZW50cy5zY2hlbWUgfHwgXCJcIikudG9Mb3dlckNhc2UoKV07XG4gICAgLy9wZXJmb3JtIHNjaGVtZSBzcGVjaWZpYyBzZXJpYWxpemF0aW9uXG4gICAgaWYgKHNjaGVtZUhhbmRsZXIgJiYgc2NoZW1lSGFuZGxlci5zZXJpYWxpemUpIHNjaGVtZUhhbmRsZXIuc2VyaWFsaXplKGNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgIGlmIChjb21wb25lbnRzLmhvc3QpIHtcbiAgICAgICAgLy9pZiBob3N0IGNvbXBvbmVudCBpcyBhbiBJUHY2IGFkZHJlc3NcbiAgICAgICAgaWYgKHByb3RvY29sLklQVjZBRERSRVNTLnRlc3QoY29tcG9uZW50cy5ob3N0KSkge31cbiAgICAgICAgLy9UT0RPOiBub3JtYWxpemUgSVB2NiBhZGRyZXNzIGFzIHBlciBSRkMgNTk1MlxuXG4gICAgICAgIC8vaWYgaG9zdCBjb21wb25lbnQgaXMgYSBkb21haW4gbmFtZVxuICAgICAgICBlbHNlIGlmIChvcHRpb25zLmRvbWFpbkhvc3QgfHwgc2NoZW1lSGFuZGxlciAmJiBzY2hlbWVIYW5kbGVyLmRvbWFpbkhvc3QpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgSUROIHZpYSBwdW55Y29kZVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHMuaG9zdCA9ICFvcHRpb25zLmlyaSA/IHB1bnljb2RlLnRvQVNDSUkoY29tcG9uZW50cy5ob3N0LnJlcGxhY2UocHJvdG9jb2wuUENUX0VOQ09ERUQsIHBjdERlY0NoYXJzKS50b0xvd2VyQ2FzZSgpKSA6IHB1bnljb2RlLnRvVW5pY29kZShjb21wb25lbnRzLmhvc3QpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJIb3N0J3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gXCIgKyAoIW9wdGlvbnMuaXJpID8gXCJBU0NJSVwiIDogXCJVbmljb2RlXCIpICsgXCIgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIH1cbiAgICAvL25vcm1hbGl6ZSBlbmNvZGluZ1xuICAgIF9ub3JtYWxpemVDb21wb25lbnRFbmNvZGluZyhjb21wb25lbnRzLCBwcm90b2NvbCk7XG4gICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlICE9PSBcInN1ZmZpeFwiICYmIGNvbXBvbmVudHMuc2NoZW1lKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMuc2NoZW1lKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goXCI6XCIpO1xuICAgIH1cbiAgICB2YXIgYXV0aG9yaXR5ID0gX3JlY29tcG9zZUF1dGhvcml0eShjb21wb25lbnRzLCBvcHRpb25zKTtcbiAgICBpZiAoYXV0aG9yaXR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMucmVmZXJlbmNlICE9PSBcInN1ZmZpeFwiKSB7XG4gICAgICAgICAgICB1cmlUb2tlbnMucHVzaChcIi8vXCIpO1xuICAgICAgICB9XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGF1dGhvcml0eSk7XG4gICAgICAgIGlmIChjb21wb25lbnRzLnBhdGggJiYgY29tcG9uZW50cy5wYXRoLmNoYXJBdCgwKSAhPT0gXCIvXCIpIHtcbiAgICAgICAgICAgIHVyaVRva2Vucy5wdXNoKFwiL1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5wYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIHMgPSBjb21wb25lbnRzLnBhdGg7XG4gICAgICAgIGlmICghb3B0aW9ucy5hYnNvbHV0ZVBhdGggJiYgKCFzY2hlbWVIYW5kbGVyIHx8ICFzY2hlbWVIYW5kbGVyLmFic29sdXRlUGF0aCkpIHtcbiAgICAgICAgICAgIHMgPSByZW1vdmVEb3RTZWdtZW50cyhzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXV0aG9yaXR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHMgPSBzLnJlcGxhY2UoL15cXC9cXC8vLCBcIi8lMkZcIik7IC8vZG9uJ3QgYWxsb3cgdGhlIHBhdGggdG8gc3RhcnQgd2l0aCBcIi8vXCJcbiAgICAgICAgfVxuICAgICAgICB1cmlUb2tlbnMucHVzaChzKTtcbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudHMucXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cmlUb2tlbnMucHVzaChcIj9cIik7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKGNvbXBvbmVudHMucXVlcnkpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50cy5mcmFnbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVyaVRva2Vucy5wdXNoKFwiI1wiKTtcbiAgICAgICAgdXJpVG9rZW5zLnB1c2goY29tcG9uZW50cy5mcmFnbWVudCk7XG4gICAgfVxuICAgIHJldHVybiB1cmlUb2tlbnMuam9pbihcIlwiKTsgLy9tZXJnZSB0b2tlbnMgaW50byBhIHN0cmluZ1xufVxuXG5mdW5jdGlvbiByZXNvbHZlQ29tcG9uZW50cyhiYXNlLCByZWxhdGl2ZSkge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiB7fTtcbiAgICB2YXIgc2tpcE5vcm1hbGl6YXRpb24gPSBhcmd1bWVudHNbM107XG5cbiAgICB2YXIgdGFyZ2V0ID0ge307XG4gICAgaWYgKCFza2lwTm9ybWFsaXphdGlvbikge1xuICAgICAgICBiYXNlID0gcGFyc2Uoc2VyaWFsaXplKGJhc2UsIG9wdGlvbnMpLCBvcHRpb25zKTsgLy9ub3JtYWxpemUgYmFzZSBjb21wb25lbnRzXG4gICAgICAgIHJlbGF0aXZlID0gcGFyc2Uoc2VyaWFsaXplKHJlbGF0aXZlLCBvcHRpb25zKSwgb3B0aW9ucyk7IC8vbm9ybWFsaXplIHJlbGF0aXZlIGNvbXBvbmVudHNcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgaWYgKCFvcHRpb25zLnRvbGVyYW50ICYmIHJlbGF0aXZlLnNjaGVtZSkge1xuICAgICAgICB0YXJnZXQuc2NoZW1lID0gcmVsYXRpdmUuc2NoZW1lO1xuICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSByZWxhdGl2ZS5hdXRob3JpdHk7XG4gICAgICAgIHRhcmdldC51c2VyaW5mbyA9IHJlbGF0aXZlLnVzZXJpbmZvO1xuICAgICAgICB0YXJnZXQuaG9zdCA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgIHRhcmdldC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWxhdGl2ZS5wYXRoIHx8IFwiXCIpO1xuICAgICAgICB0YXJnZXQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVsYXRpdmUudXNlcmluZm8gIT09IHVuZGVmaW5lZCB8fCByZWxhdGl2ZS5ob3N0ICE9PSB1bmRlZmluZWQgfHwgcmVsYXRpdmUucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSByZWxhdGl2ZS5hdXRob3JpdHk7XG4gICAgICAgICAgICB0YXJnZXQudXNlcmluZm8gPSByZWxhdGl2ZS51c2VyaW5mbztcbiAgICAgICAgICAgIHRhcmdldC5ob3N0ID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgICAgIHRhcmdldC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAgICAgICAgIHRhcmdldC5wYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocmVsYXRpdmUucGF0aCB8fCBcIlwiKTtcbiAgICAgICAgICAgIHRhcmdldC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFyZWxhdGl2ZS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBiYXNlLnBhdGg7XG4gICAgICAgICAgICAgICAgaWYgKHJlbGF0aXZlLnF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gYmFzZS5xdWVyeTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZWxhdGl2ZS5wYXRoLmNoYXJBdCgwKSA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhyZWxhdGl2ZS5wYXRoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGJhc2UudXNlcmluZm8gIT09IHVuZGVmaW5lZCB8fCBiYXNlLmhvc3QgIT09IHVuZGVmaW5lZCB8fCBiYXNlLnBvcnQgIT09IHVuZGVmaW5lZCkgJiYgIWJhc2UucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBcIi9cIiArIHJlbGF0aXZlLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWJhc2UucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSByZWxhdGl2ZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnBhdGggPSBiYXNlLnBhdGguc2xpY2UoMCwgYmFzZS5wYXRoLmxhc3RJbmRleE9mKFwiL1wiKSArIDEpICsgcmVsYXRpdmUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQucGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHRhcmdldC5wYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGFyZ2V0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL3RhcmdldC5hdXRob3JpdHkgPSBiYXNlLmF1dGhvcml0eTtcbiAgICAgICAgICAgIHRhcmdldC51c2VyaW5mbyA9IGJhc2UudXNlcmluZm87XG4gICAgICAgICAgICB0YXJnZXQuaG9zdCA9IGJhc2UuaG9zdDtcbiAgICAgICAgICAgIHRhcmdldC5wb3J0ID0gYmFzZS5wb3J0O1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldC5zY2hlbWUgPSBiYXNlLnNjaGVtZTtcbiAgICB9XG4gICAgdGFyZ2V0LmZyYWdtZW50ID0gcmVsYXRpdmUuZnJhZ21lbnQ7XG4gICAgcmV0dXJuIHRhcmdldDtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShiYXNlVVJJLCByZWxhdGl2ZVVSSSwgb3B0aW9ucykge1xuICAgIHZhciBzY2hlbWVsZXNzT3B0aW9ucyA9IGFzc2lnbih7IHNjaGVtZTogJ251bGwnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBzZXJpYWxpemUocmVzb2x2ZUNvbXBvbmVudHMocGFyc2UoYmFzZVVSSSwgc2NoZW1lbGVzc09wdGlvbnMpLCBwYXJzZShyZWxhdGl2ZVVSSSwgc2NoZW1lbGVzc09wdGlvbnMpLCBzY2hlbWVsZXNzT3B0aW9ucywgdHJ1ZSksIHNjaGVtZWxlc3NPcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKHVyaSwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgdXJpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHVyaSA9IHNlcmlhbGl6ZShwYXJzZSh1cmksIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVPZih1cmkpID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHVyaSA9IHBhcnNlKHNlcmlhbGl6ZSh1cmksIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaTtcbn1cblxuZnVuY3Rpb24gZXF1YWwodXJpQSwgdXJpQiwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgdXJpQSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB1cmlBID0gc2VyaWFsaXplKHBhcnNlKHVyaUEsIG9wdGlvbnMpLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVPZih1cmlBKSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB1cmlBID0gc2VyaWFsaXplKHVyaUEsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHVyaUIgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdXJpQiA9IHNlcmlhbGl6ZShwYXJzZSh1cmlCLCBvcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlT2YodXJpQikgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdXJpQiA9IHNlcmlhbGl6ZSh1cmlCLCBvcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIHVyaUEgPT09IHVyaUI7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUNvbXBvbmVudChzdHIsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gc3RyICYmIHN0ci50b1N0cmluZygpLnJlcGxhY2UoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaXJpID8gVVJJX1BST1RPQ09MLkVTQ0FQRSA6IElSSV9QUk9UT0NPTC5FU0NBUEUsIHBjdEVuY0NoYXIpO1xufVxuXG5mdW5jdGlvbiB1bmVzY2FwZUNvbXBvbmVudChzdHIsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gc3RyICYmIHN0ci50b1N0cmluZygpLnJlcGxhY2UoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaXJpID8gVVJJX1BST1RPQ09MLlBDVF9FTkNPREVEIDogSVJJX1BST1RPQ09MLlBDVF9FTkNPREVELCBwY3REZWNDaGFycyk7XG59XG5cbnZhciBoYW5kbGVyID0ge1xuICAgIHNjaGVtZTogXCJodHRwXCIsXG4gICAgZG9tYWluSG9zdDogdHJ1ZSxcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICAvL3JlcG9ydCBtaXNzaW5nIGhvc3RcbiAgICAgICAgaWYgKCFjb21wb25lbnRzLmhvc3QpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMuZXJyb3IgPSBjb21wb25lbnRzLmVycm9yIHx8IFwiSFRUUCBVUklzIG11c3QgaGF2ZSBhIGhvc3QuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfSxcbiAgICBzZXJpYWxpemU6IGZ1bmN0aW9uIHNlcmlhbGl6ZShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBzZWN1cmUgPSBTdHJpbmcoY29tcG9uZW50cy5zY2hlbWUpLnRvTG93ZXJDYXNlKCkgPT09IFwiaHR0cHNcIjtcbiAgICAgICAgLy9ub3JtYWxpemUgdGhlIGRlZmF1bHQgcG9ydFxuICAgICAgICBpZiAoY29tcG9uZW50cy5wb3J0ID09PSAoc2VjdXJlID8gNDQzIDogODApIHx8IGNvbXBvbmVudHMucG9ydCA9PT0gXCJcIikge1xuICAgICAgICAgICAgY29tcG9uZW50cy5wb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIC8vbm9ybWFsaXplIHRoZSBlbXB0eSBwYXRoXG4gICAgICAgIGlmICghY29tcG9uZW50cy5wYXRoKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSBcIi9cIjtcbiAgICAgICAgfVxuICAgICAgICAvL05PVEU6IFdlIGRvIG5vdCBwYXJzZSBxdWVyeSBzdHJpbmdzIGZvciBIVFRQIFVSSXNcbiAgICAgICAgLy9hcyBXV1cgRm9ybSBVcmwgRW5jb2RlZCBxdWVyeSBzdHJpbmdzIGFyZSBwYXJ0IG9mIHRoZSBIVE1MNCsgc3BlYyxcbiAgICAgICAgLy9hbmQgbm90IHRoZSBIVFRQIHNwZWMuXG4gICAgICAgIHJldHVybiBjb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBoYW5kbGVyJDEgPSB7XG4gICAgc2NoZW1lOiBcImh0dHBzXCIsXG4gICAgZG9tYWluSG9zdDogaGFuZGxlci5kb21haW5Ib3N0LFxuICAgIHBhcnNlOiBoYW5kbGVyLnBhcnNlLFxuICAgIHNlcmlhbGl6ZTogaGFuZGxlci5zZXJpYWxpemVcbn07XG5cbmZ1bmN0aW9uIGlzU2VjdXJlKHdzQ29tcG9uZW50cykge1xuICAgIHJldHVybiB0eXBlb2Ygd3NDb21wb25lbnRzLnNlY3VyZSA9PT0gJ2Jvb2xlYW4nID8gd3NDb21wb25lbnRzLnNlY3VyZSA6IFN0cmluZyh3c0NvbXBvbmVudHMuc2NoZW1lKS50b0xvd2VyQ2FzZSgpID09PSBcIndzc1wiO1xufVxuLy9SRkMgNjQ1NVxudmFyIGhhbmRsZXIkMiA9IHtcbiAgICBzY2hlbWU6IFwid3NcIixcbiAgICBkb21haW5Ib3N0OiB0cnVlLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciB3c0NvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuICAgICAgICAvL2luZGljYXRlIGlmIHRoZSBzZWN1cmUgZmxhZyBpcyBzZXRcbiAgICAgICAgd3NDb21wb25lbnRzLnNlY3VyZSA9IGlzU2VjdXJlKHdzQ29tcG9uZW50cyk7XG4gICAgICAgIC8vY29uc3RydWN0IHJlc291Y2UgbmFtZVxuICAgICAgICB3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lID0gKHdzQ29tcG9uZW50cy5wYXRoIHx8ICcvJykgKyAod3NDb21wb25lbnRzLnF1ZXJ5ID8gJz8nICsgd3NDb21wb25lbnRzLnF1ZXJ5IDogJycpO1xuICAgICAgICB3c0NvbXBvbmVudHMucGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgd3NDb21wb25lbnRzLnF1ZXJ5ID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gd3NDb21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUod3NDb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIC8vbm9ybWFsaXplIHRoZSBkZWZhdWx0IHBvcnRcbiAgICAgICAgaWYgKHdzQ29tcG9uZW50cy5wb3J0ID09PSAoaXNTZWN1cmUod3NDb21wb25lbnRzKSA/IDQ0MyA6IDgwKSB8fCB3c0NvbXBvbmVudHMucG9ydCA9PT0gXCJcIikge1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy9lbnN1cmUgc2NoZW1lIG1hdGNoZXMgc2VjdXJlIGZsYWdcbiAgICAgICAgaWYgKHR5cGVvZiB3c0NvbXBvbmVudHMuc2VjdXJlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5zY2hlbWUgPSB3c0NvbXBvbmVudHMuc2VjdXJlID8gJ3dzcycgOiAnd3MnO1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnNlY3VyZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL3JlY29uc3RydWN0IHBhdGggZnJvbSByZXNvdXJjZSBuYW1lXG4gICAgICAgIGlmICh3c0NvbXBvbmVudHMucmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICB2YXIgX3dzQ29tcG9uZW50cyRyZXNvdXJjID0gd3NDb21wb25lbnRzLnJlc291cmNlTmFtZS5zcGxpdCgnPycpLFxuICAgICAgICAgICAgICAgIF93c0NvbXBvbmVudHMkcmVzb3VyYzIgPSBzbGljZWRUb0FycmF5KF93c0NvbXBvbmVudHMkcmVzb3VyYywgMiksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF93c0NvbXBvbmVudHMkcmVzb3VyYzJbMF0sXG4gICAgICAgICAgICAgICAgcXVlcnkgPSBfd3NDb21wb25lbnRzJHJlc291cmMyWzFdO1xuXG4gICAgICAgICAgICB3c0NvbXBvbmVudHMucGF0aCA9IHBhdGggJiYgcGF0aCAhPT0gJy8nID8gcGF0aCA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHdzQ29tcG9uZW50cy5xdWVyeSA9IHF1ZXJ5O1xuICAgICAgICAgICAgd3NDb21wb25lbnRzLnJlc291cmNlTmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICAvL2ZvcmJpZCBmcmFnbWVudCBjb21wb25lbnRcbiAgICAgICAgd3NDb21wb25lbnRzLmZyYWdtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gd3NDb21wb25lbnRzO1xuICAgIH1cbn07XG5cbnZhciBoYW5kbGVyJDMgPSB7XG4gICAgc2NoZW1lOiBcIndzc1wiLFxuICAgIGRvbWFpbkhvc3Q6IGhhbmRsZXIkMi5kb21haW5Ib3N0LFxuICAgIHBhcnNlOiBoYW5kbGVyJDIucGFyc2UsXG4gICAgc2VyaWFsaXplOiBoYW5kbGVyJDIuc2VyaWFsaXplXG59O1xuXG52YXIgTyA9IHt9O1xudmFyIGlzSVJJID0gdHJ1ZTtcbi8vUkZDIDM5ODZcbnZhciBVTlJFU0VSVkVEJCQgPSBcIltBLVphLXowLTlcXFxcLVxcXFwuXFxcXF9cXFxcflwiICsgKGlzSVJJID8gXCJcXFxceEEwLVxcXFx1MjAwRFxcXFx1MjAxMC1cXFxcdTIwMjlcXFxcdTIwMkYtXFxcXHVEN0ZGXFxcXHVGOTAwLVxcXFx1RkRDRlxcXFx1RkRGMC1cXFxcdUZGRUZcIiA6IFwiXCIpICsgXCJdXCI7XG52YXIgSEVYRElHJCQgPSBcIlswLTlBLUZhLWZdXCI7IC8vY2FzZS1pbnNlbnNpdGl2ZVxudmFyIFBDVF9FTkNPREVEJCA9IHN1YmV4cChzdWJleHAoXCIlW0VGZWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVbODlBLUZhLWZdXCIgKyBIRVhESUckJCArIFwiJVwiICsgSEVYRElHJCQgKyBIRVhESUckJCkgKyBcInxcIiArIHN1YmV4cChcIiVcIiArIEhFWERJRyQkICsgSEVYRElHJCQpKTsgLy9leHBhbmRlZFxuLy9SRkMgNTMyMiwgZXhjZXB0IHRoZXNlIHN5bWJvbHMgYXMgcGVyIFJGQyA2MDY4OiBAIDogLyA/ICMgWyBdICYgOyA9XG4vL2NvbnN0IEFURVhUJCQgPSBcIltBLVphLXowLTlcXFxcIVxcXFwjXFxcXCRcXFxcJVxcXFwmXFxcXCdcXFxcKlxcXFwrXFxcXC1cXFxcL1xcXFw9XFxcXD9cXFxcXlxcXFxfXFxcXGBcXFxce1xcXFx8XFxcXH1cXFxcfl1cIjtcbi8vY29uc3QgV1NQJCQgPSBcIltcXFxceDIwXFxcXHgwOV1cIjtcbi8vY29uc3QgT0JTX1FURVhUJCQgPSBcIltcXFxceDAxLVxcXFx4MDhcXFxceDBCXFxcXHgwQ1xcXFx4MEUtXFxcXHgxRlxcXFx4N0ZdXCI7ICAvLyglZDEtOCAvICVkMTEtMTIgLyAlZDE0LTMxIC8gJWQxMjcpXG4vL2NvbnN0IFFURVhUJCQgPSBtZXJnZShcIltcXFxceDIxXFxcXHgyMy1cXFxceDVCXFxcXHg1RC1cXFxceDdFXVwiLCBPQlNfUVRFWFQkJCk7ICAvLyVkMzMgLyAlZDM1LTkxIC8gJWQ5My0xMjYgLyBvYnMtcXRleHRcbi8vY29uc3QgVkNIQVIkJCA9IFwiW1xcXFx4MjEtXFxcXHg3RV1cIjtcbi8vY29uc3QgV1NQJCQgPSBcIltcXFxceDIwXFxcXHgwOV1cIjtcbi8vY29uc3QgT0JTX1FQJCA9IHN1YmV4cChcIlxcXFxcXFxcXCIgKyBtZXJnZShcIltcXFxceDAwXFxcXHgwRFxcXFx4MEFdXCIsIE9CU19RVEVYVCQkKSk7ICAvLyVkMCAvIENSIC8gTEYgLyBvYnMtcXRleHRcbi8vY29uc3QgRldTJCA9IHN1YmV4cChzdWJleHAoV1NQJCQgKyBcIipcIiArIFwiXFxcXHgwRFxcXFx4MEFcIikgKyBcIj9cIiArIFdTUCQkICsgXCIrXCIpO1xuLy9jb25zdCBRVU9URURfUEFJUiQgPSBzdWJleHAoc3ViZXhwKFwiXFxcXFxcXFxcIiArIHN1YmV4cChWQ0hBUiQkICsgXCJ8XCIgKyBXU1AkJCkpICsgXCJ8XCIgKyBPQlNfUVAkKTtcbi8vY29uc3QgUVVPVEVEX1NUUklORyQgPSBzdWJleHAoJ1xcXFxcIicgKyBzdWJleHAoRldTJCArIFwiP1wiICsgUUNPTlRFTlQkKSArIFwiKlwiICsgRldTJCArIFwiP1wiICsgJ1xcXFxcIicpO1xudmFyIEFURVhUJCQgPSBcIltBLVphLXowLTlcXFxcIVxcXFwkXFxcXCVcXFxcJ1xcXFwqXFxcXCtcXFxcLVxcXFxeXFxcXF9cXFxcYFxcXFx7XFxcXHxcXFxcfVxcXFx+XVwiO1xudmFyIFFURVhUJCQgPSBcIltcXFxcIVxcXFwkXFxcXCVcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcLVxcXFwuMC05XFxcXDxcXFxcPkEtWlxcXFx4NUUtXFxcXHg3RV1cIjtcbnZhciBWQ0hBUiQkID0gbWVyZ2UoUVRFWFQkJCwgXCJbXFxcXFxcXCJcXFxcXFxcXF1cIik7XG52YXIgU09NRV9ERUxJTVMkJCA9IFwiW1xcXFwhXFxcXCRcXFxcJ1xcXFwoXFxcXClcXFxcKlxcXFwrXFxcXCxcXFxcO1xcXFw6XFxcXEBdXCI7XG52YXIgVU5SRVNFUlZFRCA9IG5ldyBSZWdFeHAoVU5SRVNFUlZFRCQkLCBcImdcIik7XG52YXIgUENUX0VOQ09ERUQgPSBuZXcgUmVnRXhwKFBDVF9FTkNPREVEJCwgXCJnXCIpO1xudmFyIE5PVF9MT0NBTF9QQVJUID0gbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBBVEVYVCQkLCBcIltcXFxcLl1cIiwgJ1tcXFxcXCJdJywgVkNIQVIkJCksIFwiZ1wiKTtcbnZhciBOT1RfSEZOQU1FID0gbmV3IFJlZ0V4cChtZXJnZShcIlteXVwiLCBVTlJFU0VSVkVEJCQsIFNPTUVfREVMSU1TJCQpLCBcImdcIik7XG52YXIgTk9UX0hGVkFMVUUgPSBOT1RfSEZOQU1FO1xuZnVuY3Rpb24gZGVjb2RlVW5yZXNlcnZlZChzdHIpIHtcbiAgICB2YXIgZGVjU3RyID0gcGN0RGVjQ2hhcnMoc3RyKTtcbiAgICByZXR1cm4gIWRlY1N0ci5tYXRjaChVTlJFU0VSVkVEKSA/IHN0ciA6IGRlY1N0cjtcbn1cbnZhciBoYW5kbGVyJDQgPSB7XG4gICAgc2NoZW1lOiBcIm1haWx0b1wiLFxuICAgIHBhcnNlOiBmdW5jdGlvbiBwYXJzZSQkMShjb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBtYWlsdG9Db21wb25lbnRzID0gY29tcG9uZW50cztcbiAgICAgICAgdmFyIHRvID0gbWFpbHRvQ29tcG9uZW50cy50byA9IG1haWx0b0NvbXBvbmVudHMucGF0aCA/IG1haWx0b0NvbXBvbmVudHMucGF0aC5zcGxpdChcIixcIikgOiBbXTtcbiAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5wYXRoID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobWFpbHRvQ29tcG9uZW50cy5xdWVyeSkge1xuICAgICAgICAgICAgdmFyIHVua25vd25IZWFkZXJzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgaGVhZGVycyA9IHt9O1xuICAgICAgICAgICAgdmFyIGhmaWVsZHMgPSBtYWlsdG9Db21wb25lbnRzLnF1ZXJ5LnNwbGl0KFwiJlwiKTtcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwLCB4bCA9IGhmaWVsZHMubGVuZ3RoOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgICAgIHZhciBoZmllbGQgPSBoZmllbGRzW3hdLnNwbGl0KFwiPVwiKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGhmaWVsZFswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidG9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0FkZHJzID0gaGZpZWxkWzFdLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIF94ID0gMCwgX3hsID0gdG9BZGRycy5sZW5ndGg7IF94IDwgX3hsOyArK194KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8ucHVzaCh0b0FkZHJzW194XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN1YmplY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWx0b0NvbXBvbmVudHMuc3ViamVjdCA9IHVuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFsxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImJvZHlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWx0b0NvbXBvbmVudHMuYm9keSA9IHVuZXNjYXBlQ29tcG9uZW50KGhmaWVsZFsxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHVua25vd25IZWFkZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnNbdW5lc2NhcGVDb21wb25lbnQoaGZpZWxkWzBdLCBvcHRpb25zKV0gPSB1bmVzY2FwZUNvbXBvbmVudChoZmllbGRbMV0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVua25vd25IZWFkZXJzKSBtYWlsdG9Db21wb25lbnRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICB9XG4gICAgICAgIG1haWx0b0NvbXBvbmVudHMucXVlcnkgPSB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAodmFyIF94MiA9IDAsIF94bDIgPSB0by5sZW5ndGg7IF94MiA8IF94bDI7ICsrX3gyKSB7XG4gICAgICAgICAgICB2YXIgYWRkciA9IHRvW194Ml0uc3BsaXQoXCJAXCIpO1xuICAgICAgICAgICAgYWRkclswXSA9IHVuZXNjYXBlQ29tcG9uZW50KGFkZHJbMF0pO1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnVuaWNvZGVTdXBwb3J0KSB7XG4gICAgICAgICAgICAgICAgLy9jb252ZXJ0IFVuaWNvZGUgSUROIC0+IEFTQ0lJIElETlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZHJbMV0gPSBwdW55Y29kZS50b0FTQ0lJKHVuZXNjYXBlQ29tcG9uZW50KGFkZHJbMV0sIG9wdGlvbnMpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbHRvQ29tcG9uZW50cy5lcnJvciA9IG1haWx0b0NvbXBvbmVudHMuZXJyb3IgfHwgXCJFbWFpbCBhZGRyZXNzJ3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gQVNDSUkgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhZGRyWzFdID0gdW5lc2NhcGVDb21wb25lbnQoYWRkclsxXSwgb3B0aW9ucykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvW194Ml0gPSBhZGRyLmpvaW4oXCJAXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYWlsdG9Db21wb25lbnRzO1xuICAgIH0sXG4gICAgc2VyaWFsaXplOiBmdW5jdGlvbiBzZXJpYWxpemUkJDEobWFpbHRvQ29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgY29tcG9uZW50cyA9IG1haWx0b0NvbXBvbmVudHM7XG4gICAgICAgIHZhciB0byA9IHRvQXJyYXkobWFpbHRvQ29tcG9uZW50cy50byk7XG4gICAgICAgIGlmICh0bykge1xuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDAsIHhsID0gdG8ubGVuZ3RoOyB4IDwgeGw7ICsreCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FkZHIgPSBTdHJpbmcodG9beF0pO1xuICAgICAgICAgICAgICAgIHZhciBhdElkeCA9IHRvQWRkci5sYXN0SW5kZXhPZihcIkBcIik7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2FsUGFydCA9IHRvQWRkci5zbGljZSgwLCBhdElkeCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgZGVjb2RlVW5yZXNlcnZlZCkucmVwbGFjZShQQ1RfRU5DT0RFRCwgdG9VcHBlckNhc2UpLnJlcGxhY2UoTk9UX0xPQ0FMX1BBUlQsIHBjdEVuY0NoYXIpO1xuICAgICAgICAgICAgICAgIHZhciBkb21haW4gPSB0b0FkZHIuc2xpY2UoYXRJZHggKyAxKTtcbiAgICAgICAgICAgICAgICAvL2NvbnZlcnQgSUROIHZpYSBwdW55Y29kZVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbiA9ICFvcHRpb25zLmlyaSA/IHB1bnljb2RlLnRvQVNDSUkodW5lc2NhcGVDb21wb25lbnQoZG9tYWluLCBvcHRpb25zKS50b0xvd2VyQ2FzZSgpKSA6IHB1bnljb2RlLnRvVW5pY29kZShkb21haW4pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5lcnJvciA9IGNvbXBvbmVudHMuZXJyb3IgfHwgXCJFbWFpbCBhZGRyZXNzJ3MgZG9tYWluIG5hbWUgY2FuIG5vdCBiZSBjb252ZXJ0ZWQgdG8gXCIgKyAoIW9wdGlvbnMuaXJpID8gXCJBU0NJSVwiIDogXCJVbmljb2RlXCIpICsgXCIgdmlhIHB1bnljb2RlOiBcIiArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRvW3hdID0gbG9jYWxQYXJ0ICsgXCJAXCIgKyBkb21haW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnRzLnBhdGggPSB0by5qb2luKFwiLFwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGVycyA9IG1haWx0b0NvbXBvbmVudHMuaGVhZGVycyA9IG1haWx0b0NvbXBvbmVudHMuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgaWYgKG1haWx0b0NvbXBvbmVudHMuc3ViamVjdCkgaGVhZGVyc1tcInN1YmplY3RcIl0gPSBtYWlsdG9Db21wb25lbnRzLnN1YmplY3Q7XG4gICAgICAgIGlmIChtYWlsdG9Db21wb25lbnRzLmJvZHkpIGhlYWRlcnNbXCJib2R5XCJdID0gbWFpbHRvQ29tcG9uZW50cy5ib2R5O1xuICAgICAgICB2YXIgZmllbGRzID0gW107XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gaGVhZGVycykge1xuICAgICAgICAgICAgaWYgKGhlYWRlcnNbbmFtZV0gIT09IE9bbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBmaWVsZHMucHVzaChuYW1lLnJlcGxhY2UoUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKS5yZXBsYWNlKE5PVF9IRk5BTUUsIHBjdEVuY0NoYXIpICsgXCI9XCIgKyBoZWFkZXJzW25hbWVdLnJlcGxhY2UoUENUX0VOQ09ERUQsIGRlY29kZVVucmVzZXJ2ZWQpLnJlcGxhY2UoUENUX0VOQ09ERUQsIHRvVXBwZXJDYXNlKS5yZXBsYWNlKE5PVF9IRlZBTFVFLCBwY3RFbmNDaGFyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpZWxkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudHMucXVlcnkgPSBmaWVsZHMuam9pbihcIiZcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gICAgfVxufTtcblxudmFyIFVSTl9QQVJTRSA9IC9eKFteXFw6XSspXFw6KC4qKS87XG4vL1JGQyAyMTQxXG52YXIgaGFuZGxlciQ1ID0ge1xuICAgIHNjaGVtZTogXCJ1cm5cIixcbiAgICBwYXJzZTogZnVuY3Rpb24gcGFyc2UkJDEoY29tcG9uZW50cywgb3B0aW9ucykge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IGNvbXBvbmVudHMucGF0aCAmJiBjb21wb25lbnRzLnBhdGgubWF0Y2goVVJOX1BBUlNFKTtcbiAgICAgICAgdmFyIHVybkNvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuICAgICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICAgICAgdmFyIHNjaGVtZSA9IG9wdGlvbnMuc2NoZW1lIHx8IHVybkNvbXBvbmVudHMuc2NoZW1lIHx8IFwidXJuXCI7XG4gICAgICAgICAgICB2YXIgbmlkID0gbWF0Y2hlc1sxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIG5zcyA9IG1hdGNoZXNbMl07XG4gICAgICAgICAgICB2YXIgdXJuU2NoZW1lID0gc2NoZW1lICsgXCI6XCIgKyAob3B0aW9ucy5uaWQgfHwgbmlkKTtcbiAgICAgICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1t1cm5TY2hlbWVdO1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cy5uaWQgPSBuaWQ7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLm5zcyA9IG5zcztcbiAgICAgICAgICAgIHVybkNvbXBvbmVudHMucGF0aCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChzY2hlbWVIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgdXJuQ29tcG9uZW50cyA9IHNjaGVtZUhhbmRsZXIucGFyc2UodXJuQ29tcG9uZW50cywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cm5Db21wb25lbnRzLmVycm9yID0gdXJuQ29tcG9uZW50cy5lcnJvciB8fCBcIlVSTiBjYW4gbm90IGJlIHBhcnNlZC5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJuQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplJCQxKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNjaGVtZSA9IG9wdGlvbnMuc2NoZW1lIHx8IHVybkNvbXBvbmVudHMuc2NoZW1lIHx8IFwidXJuXCI7XG4gICAgICAgIHZhciBuaWQgPSB1cm5Db21wb25lbnRzLm5pZDtcbiAgICAgICAgdmFyIHVyblNjaGVtZSA9IHNjaGVtZSArIFwiOlwiICsgKG9wdGlvbnMubmlkIHx8IG5pZCk7XG4gICAgICAgIHZhciBzY2hlbWVIYW5kbGVyID0gU0NIRU1FU1t1cm5TY2hlbWVdO1xuICAgICAgICBpZiAoc2NoZW1lSGFuZGxlcikge1xuICAgICAgICAgICAgdXJuQ29tcG9uZW50cyA9IHNjaGVtZUhhbmRsZXIuc2VyaWFsaXplKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB1cmlDb21wb25lbnRzID0gdXJuQ29tcG9uZW50cztcbiAgICAgICAgdmFyIG5zcyA9IHVybkNvbXBvbmVudHMubnNzO1xuICAgICAgICB1cmlDb21wb25lbnRzLnBhdGggPSAobmlkIHx8IG9wdGlvbnMubmlkKSArIFwiOlwiICsgbnNzO1xuICAgICAgICByZXR1cm4gdXJpQ29tcG9uZW50cztcbiAgICB9XG59O1xuXG52YXIgVVVJRCA9IC9eWzAtOUEtRmEtZl17OH0oPzpcXC1bMC05QS1GYS1mXXs0fSl7M31cXC1bMC05QS1GYS1mXXsxMn0kLztcbi8vUkZDIDQxMjJcbnZhciBoYW5kbGVyJDYgPSB7XG4gICAgc2NoZW1lOiBcInVybjp1dWlkXCIsXG4gICAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKHVybkNvbXBvbmVudHMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHV1aWRDb21wb25lbnRzID0gdXJuQ29tcG9uZW50cztcbiAgICAgICAgdXVpZENvbXBvbmVudHMudXVpZCA9IHV1aWRDb21wb25lbnRzLm5zcztcbiAgICAgICAgdXVpZENvbXBvbmVudHMubnNzID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIW9wdGlvbnMudG9sZXJhbnQgJiYgKCF1dWlkQ29tcG9uZW50cy51dWlkIHx8ICF1dWlkQ29tcG9uZW50cy51dWlkLm1hdGNoKFVVSUQpKSkge1xuICAgICAgICAgICAgdXVpZENvbXBvbmVudHMuZXJyb3IgPSB1dWlkQ29tcG9uZW50cy5lcnJvciB8fCBcIlVVSUQgaXMgbm90IHZhbGlkLlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dWlkQ29tcG9uZW50cztcbiAgICB9LFxuICAgIHNlcmlhbGl6ZTogZnVuY3Rpb24gc2VyaWFsaXplKHV1aWRDb21wb25lbnRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciB1cm5Db21wb25lbnRzID0gdXVpZENvbXBvbmVudHM7XG4gICAgICAgIC8vbm9ybWFsaXplIFVVSURcbiAgICAgICAgdXJuQ29tcG9uZW50cy5uc3MgPSAodXVpZENvbXBvbmVudHMudXVpZCB8fCBcIlwiKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gdXJuQ29tcG9uZW50cztcbiAgICB9XG59O1xuXG5TQ0hFTUVTW2hhbmRsZXIuc2NoZW1lXSA9IGhhbmRsZXI7XG5TQ0hFTUVTW2hhbmRsZXIkMS5zY2hlbWVdID0gaGFuZGxlciQxO1xuU0NIRU1FU1toYW5kbGVyJDIuc2NoZW1lXSA9IGhhbmRsZXIkMjtcblNDSEVNRVNbaGFuZGxlciQzLnNjaGVtZV0gPSBoYW5kbGVyJDM7XG5TQ0hFTUVTW2hhbmRsZXIkNC5zY2hlbWVdID0gaGFuZGxlciQ0O1xuU0NIRU1FU1toYW5kbGVyJDUuc2NoZW1lXSA9IGhhbmRsZXIkNTtcblNDSEVNRVNbaGFuZGxlciQ2LnNjaGVtZV0gPSBoYW5kbGVyJDY7XG5cbmV4cG9ydHMuU0NIRU1FUyA9IFNDSEVNRVM7XG5leHBvcnRzLnBjdEVuY0NoYXIgPSBwY3RFbmNDaGFyO1xuZXhwb3J0cy5wY3REZWNDaGFycyA9IHBjdERlY0NoYXJzO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuZXhwb3J0cy5yZW1vdmVEb3RTZWdtZW50cyA9IHJlbW92ZURvdFNlZ21lbnRzO1xuZXhwb3J0cy5zZXJpYWxpemUgPSBzZXJpYWxpemU7XG5leHBvcnRzLnJlc29sdmVDb21wb25lbnRzID0gcmVzb2x2ZUNvbXBvbmVudHM7XG5leHBvcnRzLnJlc29sdmUgPSByZXNvbHZlO1xuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemU7XG5leHBvcnRzLmVxdWFsID0gZXF1YWw7XG5leHBvcnRzLmVzY2FwZUNvbXBvbmVudCA9IGVzY2FwZUNvbXBvbmVudDtcbmV4cG9ydHMudW5lc2NhcGVDb21wb25lbnQgPSB1bmVzY2FwZUNvbXBvbmVudDtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXVyaS5hbGwuanMubWFwXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvd3d3L2luZGV4LnRzXCIpO1xuIiwiIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9