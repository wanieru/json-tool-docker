/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/www/Schema.ts":
/*!***************************!*\
  !*** ./src/www/Schema.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Schema = void 0;
var tsch_1 = __webpack_require__(/*! tsch */ "./node_modules/tsch/dist/index.js");
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
        if (!!this.tsch)
            return this.tsch.validate(value);
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
        var addJsonSchema = function (name, jsonSchema) { return Schema.addJsonSchema(result !== null && result !== void 0 ? result : [], content, file, name, jsonSchema); };
        var addTsch = function (name, tsch) { return Schema.addTsch(result !== null && result !== void 0 ? result : [], content, file, name, tsch); };
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

/***/ "./node_modules/tsch/dist/TschType.js":
/*!********************************************!*\
  !*** ./node_modules/tsch/dist/TschType.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {


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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!**************************!*\
  !*** ./src/www/index.ts ***!
  \**************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
var Schema_1 = __webpack_require__(/*! ./Schema */ "./src/www/Schema.ts");
alert("Hello World");
console.log(Schema_1.Schema.parseSchema("hello world", "console.log(\"Hello world from parsed schema!\");"));

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7Ozs7Ozs7Ozs7QUMzZWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsb0NBQW9DO0FBQ25EO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBLENBQUM7QUFDRDtBQUNBLDBDQUEwQyw0QkFBNEI7QUFDdEUsQ0FBQztBQUNEO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELFlBQVk7QUFDWiwwQkFBMEIsbUJBQU8sQ0FBQyxnREFBUTtBQUMxQyxZQUFZO0FBQ1o7Ozs7Ozs7Ozs7QUM1QmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsYUFBYSxHQUFHLGNBQWMsR0FBRyxlQUFlLEdBQUcsY0FBYyxHQUFHLGNBQWM7QUFDbEYsbUJBQW1CLG1CQUFPLENBQUMsd0RBQVk7QUFDdkMsb0JBQW9CO0FBQ3BCLGNBQWM7QUFDZCxvQkFBb0I7QUFDcEIsY0FBYztBQUNkLHFCQUFxQjtBQUNyQixlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjs7Ozs7O1VDbEJBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7Ozs7Ozs7QUN0QmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsZUFBZSxtQkFBTyxDQUFDLHFDQUFVO0FBQ2pDO0FBQ0EseUdBQXlHIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL3NyYy93d3cvU2NoZW1hLnRzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvdHNjaC9kaXN0L1RzY2hUeXBlLmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvdHNjaC9kaXN0L2luZGV4LmpzIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvLi9ub2RlX21vZHVsZXMvdHNjaC9kaXN0L3RzY2guanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vc3JjL3d3dy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuU2NoZW1hID0gdm9pZCAwO1xudmFyIHRzY2hfMSA9IHJlcXVpcmUoXCJ0c2NoXCIpO1xudmFyIFNjaGVtYSA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTY2hlbWEoc2NoZW1hRmlsZSwgc2NoZW1hQ29udGVudCwgbmFtZSwganNvblNjaGVtYSwgdHNjaCkge1xuICAgICAgICB0aGlzLnNjaGVtYUZpbGUgPSBzY2hlbWFGaWxlO1xuICAgICAgICB0aGlzLnNjaGVtYUNvbnRlbnQgPSBzY2hlbWFDb250ZW50O1xuICAgICAgICB0aGlzLnJlZ2V4ID0gU2NoZW1hLmdldFJlZ2V4KG5hbWUpO1xuICAgICAgICB0aGlzLmpzb25TY2hlbWEgPSBqc29uU2NoZW1hO1xuICAgICAgICB0aGlzLnRzY2ggPSB0c2NoO1xuICAgIH1cbiAgICBTY2hlbWEucHJvdG90eXBlLmdldFNjaGVtYUZpbGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjaGVtYUZpbGU7XG4gICAgfTtcbiAgICBTY2hlbWEucHJvdG90eXBlLmdldFNjaGVtYUNvbnRlbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjaGVtYUNvbnRlbnQ7XG4gICAgfTtcbiAgICBTY2hlbWEucHJvdG90eXBlLmdldFJlZ2V4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWdleDtcbiAgICB9O1xuICAgIFNjaGVtYS5wcm90b3R5cGUudmFsaWRhdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKCEhdGhpcy50c2NoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHNjaC52YWxpZGF0ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBlcnJvcnM6IFtdIH07XG4gICAgfTtcbiAgICBTY2hlbWEucHJvdG90eXBlLmdldEpzb25TY2hlbWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghIXRoaXMudHNjaClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRzY2guZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIHJldHVybiB0aGlzLmpzb25TY2hlbWE7XG4gICAgfTtcbiAgICBTY2hlbWEucGFyc2VTY2hlbWEgPSBmdW5jdGlvbiAoZmlsZSwgY29udGVudCwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVzdWx0KVxuICAgICAgICAgICAgcmVzdWx0ID0gW107XG4gICAgICAgIHZhciBhZGRKc29uU2NoZW1hID0gZnVuY3Rpb24gKG5hbWUsIGpzb25TY2hlbWEpIHsgcmV0dXJuIFNjaGVtYS5hZGRKc29uU2NoZW1hKHJlc3VsdCAhPT0gbnVsbCAmJiByZXN1bHQgIT09IHZvaWQgMCA/IHJlc3VsdCA6IFtdLCBjb250ZW50LCBmaWxlLCBuYW1lLCBqc29uU2NoZW1hKTsgfTtcbiAgICAgICAgdmFyIGFkZFRzY2ggPSBmdW5jdGlvbiAobmFtZSwgdHNjaCkgeyByZXR1cm4gU2NoZW1hLmFkZFRzY2gocmVzdWx0ICE9PSBudWxsICYmIHJlc3VsdCAhPT0gdm9pZCAwID8gcmVzdWx0IDogW10sIGNvbnRlbnQsIGZpbGUsIG5hbWUsIHRzY2gpOyB9O1xuICAgICAgICB2YXIgdHNjaCA9IHRzY2hfMS50c2NoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICAgICBldmFsKGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFeGNlcHRpb24gZHVyaW5nIFwiLmNvbmNhdChmaWxlKSwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICAgIFNjaGVtYS5nZXRSZWdleCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVnRXhwKFwiXlwiICsgbmFtZS5zcGxpdChcIipcIilcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHMucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7IH0pXG4gICAgICAgICAgICAuam9pbihcIi4qXCIpICsgXCIkXCIpO1xuICAgIH07XG4gICAgU2NoZW1hLmFkZEpzb25TY2hlbWEgPSBmdW5jdGlvbiAoc2NoZW1hcywgc2NoZW1hRmlsZSwgY29udGVudCwgbmFtZSwganNvblNjaGVtYSkge1xuICAgICAgICBzY2hlbWFzLnB1c2gobmV3IFNjaGVtYShzY2hlbWFGaWxlLCBjb250ZW50LCBuYW1lLCBqc29uU2NoZW1hKSk7XG4gICAgfTtcbiAgICBTY2hlbWEuYWRkVHNjaCA9IGZ1bmN0aW9uIChzY2hlbWFzLCBzY2hlbWFGaWxlLCBjb250ZW50LCBuYW1lLCB0c2NoKSB7XG4gICAgICAgIHNjaGVtYXMucHVzaChuZXcgU2NoZW1hKHNjaGVtYUZpbGUsIGNvbnRlbnQsIG5hbWUsIHVuZGVmaW5lZCwgdHNjaCkpO1xuICAgIH07XG4gICAgcmV0dXJuIFNjaGVtYTtcbn0oKSk7XG5leHBvcnRzLlNjaGVtYSA9IFNjaGVtYTtcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5Uc2NoQXJyYXkgPSBleHBvcnRzLlRzY2hPYmplY3QgPSBleHBvcnRzLlRzY2hVbmlvbiA9IGV4cG9ydHMuVHNjaFVuZGVmaW5lZCA9IGV4cG9ydHMuVHNjaE51bGwgPSBleHBvcnRzLlRzY2hCb29sZWFuID0gZXhwb3J0cy5Uc2NoTnVtYmVyID0gZXhwb3J0cy5Uc2NoU3RyaW5nID0gZXhwb3J0cy5Uc2NoVHlwZSA9IHZvaWQgMDtcbmNsYXNzIFRzY2hWYWxpZGF0aW9uRXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKHBhdGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5wYXRoU3RyaW5nID0gVHNjaFZhbGlkYXRpb25FcnJvci5mb3JtYXRQYXRoKHBhdGgpO1xuICAgICAgICB0aGlzLnJhd01lc3NhZ2UgPSBtZXNzYWdlO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBgJHt0aGlzLnBhdGhTdHJpbmd9OiAke21lc3NhZ2V9YDtcbiAgICB9XG4gICAgc3RhdGljIGZvcm1hdFBhdGgocGF0aCkge1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIFwicm9vdFwiO1xuICAgICAgICByZXR1cm4gcGF0aC5qb2luKFwiLlwiKTtcbiAgICB9XG59XG5jbGFzcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IodHlwZSkge1xuICAgICAgICB0aGlzLl90cyA9IG51bGw7IC8vX3RzIGlzIG9ubHkgdXNlZCBieSBUeXBlc2NyaXB0IGZvciB0eXBlIGluZmVyZW5jZSwgYW5kIHNvIGFjdHVhbGx5IGRvZXNuJ3QgbmVlZCB0byBiZSBhc3NpZ25lZFxuICAgICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5fdGl0bGUgPSBudWxsO1xuICAgICAgICB0aGlzLl9kZXNjcmlwdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX2RlZmF1bHQgPSBudWxsO1xuICAgICAgICB0aGlzLl9leGFtcGxlcyA9IG51bGw7XG4gICAgfVxuICAgIHVuaW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFVuaW9uKHRoaXMsIG90aGVyKTtcbiAgICB9XG4gICAgb3B0aW9uYWwoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFVuaW9uKHRoaXMsIG5ldyBUc2NoVW5kZWZpbmVkKCkpO1xuICAgIH1cbiAgICBudWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoVW5pb24odGhpcywgbmV3IFRzY2hOdWxsKCkpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLm5ld0luc3RhbmNlKCk7XG4gICAgICAgIGNsb25lLl90aXRsZSA9IHRoaXMuX3RpdGxlO1xuICAgICAgICBjbG9uZS5fZGVzY3JpcHRpb24gPSB0aGlzLl9kZXNjcmlwdGlvbjtcbiAgICAgICAgY2xvbmUuX2RlZmF1bHQgPSB0aGlzLl9kZWZhdWx0O1xuICAgICAgICBjbG9uZS5fZXhhbXBsZXMgPSB0aGlzLl9leGFtcGxlcyA/IFsuLi50aGlzLl9leGFtcGxlc10gOiBudWxsO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIHRpdGxlKHRpdGxlKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fdGl0bGUgPSB0aXRsZTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBkZXNjcmlwdGlvbihkZXNjcmlwdGluKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZGVzY3JpcHRpb24gPSBkZXNjcmlwdGluO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGRlZmF1bHQoZGVmYXVsdFZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZGVmYXVsdCA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBleGFtcGxlcyhleGFtcGxlcykge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2V4YW1wbGVzID0gWy4uLmV4YW1wbGVzXTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiB0aGlzLl90eXBlXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLl90aXRsZSlcbiAgICAgICAgICAgIHNjaGVtYS50aXRsZSA9IHRoaXMuX3RpdGxlO1xuICAgICAgICBpZiAodGhpcy5fZGVzY3JpcHRpb24pXG4gICAgICAgICAgICBzY2hlbWEuZGVzY3JpcHRpb24gPSB0aGlzLl9kZXNjcmlwdGlvbjtcbiAgICAgICAgaWYgKHRoaXMuX2RlZmF1bHQpXG4gICAgICAgICAgICBzY2hlbWEuZGVmYXVsdCA9IHRoaXMuX2RlZmF1bHQ7XG4gICAgICAgIGlmICh0aGlzLl9leGFtcGxlcylcbiAgICAgICAgICAgIHNjaGVtYS5leGFtcGxlcyA9IHRoaXMuX2V4YW1wbGVzO1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICB2YWxpZGF0ZShpbnB1dCkge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICAgICAgdGhpcy52YWxpZGF0ZUludGVybmFsKFtdLCBpbnB1dCwgZXJyb3JzKTtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT0gMCwgZXJyb3JzIH07XG4gICAgfVxuICAgIHZhbGlkYXRlSW50ZXJuYWwocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBpZiAoIXRoaXMuaXNDb3JyZWN0VHlwZShpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBoYXMgdG8gYmUgb2YgdHlwZSAke3RoaXMuZ2V0VHlwZU5hbWUoKX1gKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpO1xuICAgIH1cbiAgICBpc09wdGlvbmFsKCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICBpc051bGxhYmxlKCkgeyByZXR1cm4gZmFsc2U7IH1cbn1cbmV4cG9ydHMuVHNjaFR5cGUgPSBUc2NoVHlwZTtcbmNsYXNzIFRzY2hTdHJpbmcgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFwic3RyaW5nXCIpO1xuICAgICAgICB0aGlzLl9mb3JtYXQgPSBudWxsO1xuICAgICAgICB0aGlzLl9lbnVtID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWluTGVuZ3RoID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWF4TGVuZ3RoID0gbnVsbDtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFN0cmluZygpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZm9ybWF0ID0gdGhpcy5fZm9ybWF0O1xuICAgICAgICBjbG9uZS5fZW51bSA9IHRoaXMuX2VudW07XG4gICAgICAgIGNsb25lLl9taW5MZW5ndGggPSB0aGlzLl9taW5MZW5ndGg7XG4gICAgICAgIGNsb25lLl9tYXhMZW5ndGggPSB0aGlzLl9tYXhMZW5ndGg7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBzdXBlci5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdClcbiAgICAgICAgICAgIHNjaGVtYS5mb3JtYXQgPSB0aGlzLl9mb3JtYXQ7XG4gICAgICAgIGlmICh0aGlzLl9lbnVtKVxuICAgICAgICAgICAgc2NoZW1hLmVudW0gPSB0aGlzLl9lbnVtO1xuICAgICAgICBpZiAodGhpcy5fbWluTGVuZ3RoKVxuICAgICAgICAgICAgc2NoZW1hLm1pbkxlbmd0aCA9IHRoaXMuX21pbkxlbmd0aDtcbiAgICAgICAgaWYgKHRoaXMuX21heExlbmd0aClcbiAgICAgICAgICAgIHNjaGVtYS5tYXhMZW5ndGggPSB0aGlzLl9tYXhMZW5ndGg7XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIG1pbkxlbmd0aChtaW4pIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9taW5MZW5ndGggPSBtaW47XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgbWF4TGVuZ3RoKG1heCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21heExlbmd0aCA9IG1heDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBlbnVtZXJhdGlvbihlbnVtZXJhdGlvbikge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2VudW0gPSBbLi4uZW51bWVyYXRpb25dO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGZvcm1hdChmb3JtYXQpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9mb3JtYXQgPSBmb3JtYXQ7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgY29sb3IoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcImNvbG9yXCIpO1xuICAgIH1cbiAgICBkYXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJkYXRlXCIpO1xuICAgIH1cbiAgICBlbWFpbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwiZW1haWxcIik7XG4gICAgfVxuICAgIHBhc3N3b3JkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJwYXNzd29yZFwiKTtcbiAgICB9XG4gICAgdGV4dGFyZWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcInRleHRhcmVhXCIpO1xuICAgIH1cbiAgICB1cmwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcInVybFwiKTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIFwic3RyaW5nXCI7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgaWYgKCEhdGhpcy5fZW51bSAmJiAhdGhpcy5fZW51bS5pbmNsdWRlcyhpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBoYXMgdG8gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6ICR7dGhpcy5fZW51bS5qb2luKFwiLCBcIil9YCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWluTGVuZ3RoID09PSBcIm51bWJlclwiICYmIGlucHV0Lmxlbmd0aCA8IHRoaXMuX21pbkxlbmd0aCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgbG9uZ2VyIHRoYW4gJHt0aGlzLl9taW5MZW5ndGh9IGNoYXJhY3RlcnMuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWF4TGVuZ3RoID09PSBcIm51bWJlclwiICYmIGlucHV0Lmxlbmd0aCA+IHRoaXMuX21heExlbmd0aCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgc2hvcnRlciB0aGFuICR7dGhpcy5fbWF4TGVuZ3RofSBjaGFyYWN0ZXJzLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZm9ybWF0ID09PSBcImNvbG9yXCIgJiYgIS9eIz9bMC05YS1mXXszLDZ9JC9pLnRlc3QoaW5wdXQpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhIGNvbG9yIGhleCBjb2RlLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZm9ybWF0ID09PSBcImRhdGVcIiAmJiBOdW1iZXIuaXNOYU4oRGF0ZS5wYXJzZShpbnB1dCkpKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBhIGRhdGUuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQgPT09IFwiZW1haWxcIiAmJiAhL14oKFtePD4oKVxcW1xcXVxcXFwuLDs6XFxzQFwiXSsoXFwuW148PigpXFxbXFxdXFxcXC4sOzpcXHNAXCJdKykqKXwoXCIuK1wiKSlAKChcXFtbMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XSl8KChbYS16QS1aXFwtMC05XStcXC4pK1thLXpBLVpdezIsfSkpJC8udGVzdChpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGFuIGVtYWlsLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZm9ybWF0ID09PSBcInVybFwiICYmICEvXmh0dHBzPzpcXC9cXC8oPzp3d3dcXC4pP1stYS16QS1aMC05QDolLl9cXCt+Iz1dezEsMjU2fVxcLlthLXpBLVowLTkoKV17MSw2fVxcYig/OlstYS16QS1aMC05KClAOiVfXFwrLn4jPyZcXC89XSopJC8udGVzdChpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGEgVVJMLmApKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVHNjaFN0cmluZyA9IFRzY2hTdHJpbmc7XG5jbGFzcyBUc2NoTnVtYmVyIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihcIm51bWJlclwiKTtcbiAgICAgICAgdGhpcy5faW50ZWdlciA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9taW4gPSBudWxsO1xuICAgICAgICB0aGlzLl9tYXggPSBudWxsO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoTnVtYmVyKCk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9pbnRlZ2VyID0gdGhpcy5faW50ZWdlcjtcbiAgICAgICAgY2xvbmUuX21pbiA9IHRoaXMuX21pbjtcbiAgICAgICAgY2xvbmUuX21heCA9IHRoaXMuX21heDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBpbnRlZ2VyKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2ludGVnZXIgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIG1pbihtaW4pIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9taW4gPSBtaW47XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgbWF4KG1heCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHN1cGVyLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBpZiAodGhpcy5faW50ZWdlcilcbiAgICAgICAgICAgIHNjaGVtYS50eXBlID0gXCJpbnRlZ2VyXCI7XG4gICAgICAgIGlmICh0aGlzLl9taW4gIT09IG51bGwpXG4gICAgICAgICAgICBzY2hlbWEubWluaW11bSA9IHRoaXMuX21pbjtcbiAgICAgICAgaWYgKHRoaXMuX21heCAhPT0gbnVsbClcbiAgICAgICAgICAgIHNjaGVtYS5tYXhpbXVtID0gdGhpcy5fbWF4O1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwibnVtYmVyXCI7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gXCJudW1iZXJcIjsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBpZiAodGhpcy5faW50ZWdlciAmJiAhTnVtYmVyLmlzSW50ZWdlcihpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBoYXMgdG8gYmUgYW4gaW50ZWdlci5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9taW4gPT09IFwibnVtYmVyXCIgJiYgaW5wdXQgPCB0aGlzLl9taW4pIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGF0IGxlYXN0ICR7dGhpcy5fbWlufS5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9tYXggPT09IFwibnVtYmVyXCIgJiYgaW5wdXQgPiB0aGlzLl9tYXgpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGF0IGxlc3MgdGhhbiAke3RoaXMuX21heH0uYCkpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoTnVtYmVyID0gVHNjaE51bWJlcjtcbmNsYXNzIFRzY2hCb29sZWFuIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihcImJvb2xlYW5cIik7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hCb29sZWFuKCk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcImJvb2xlYW5cIjtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBcImJvb2xlYW5cIjsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgIH1cbn1cbmV4cG9ydHMuVHNjaEJvb2xlYW4gPSBUc2NoQm9vbGVhbjtcbmNsYXNzIFRzY2hOdWxsIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihcIm51bGxcIik7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hOdWxsKCk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gaW5wdXQgPT09IG51bGw7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gXCJudWxsXCI7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICB9XG59XG5leHBvcnRzLlRzY2hOdWxsID0gVHNjaE51bGw7XG5jbGFzcyBUc2NoVW5kZWZpbmVkIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcihcInVuZGVmaW5lZFwiKTtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFVuZGVmaW5lZCgpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJ1bmRlZmluZWRcIjtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBcInVuZGVmaW5lZFwiOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoVW5kZWZpbmVkID0gVHNjaFVuZGVmaW5lZDtcbmNsYXNzIFRzY2hVbmlvbiBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3Rvcih0eXBlMSwgdHlwZTIpIHtcbiAgICAgICAgc3VwZXIoYHVuaW9uXyR7dHlwZTEuX3R5cGV9XyR7dHlwZTIuX3R5cGV9YCk7XG4gICAgICAgIHRoaXMudHlwZTEgPSB0eXBlMTtcbiAgICAgICAgdGhpcy50eXBlMiA9IHR5cGUyO1xuICAgIH1cbiAgICBUeXBlMUludGVybmFsKCkgeyByZXR1cm4gdGhpcy50eXBlMTsgfVxuICAgIFR5cGUySW50ZXJuYWwoKSB7IHJldHVybiB0aGlzLnR5cGUyOyB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaFVuaW9uKHRoaXMudHlwZTEuY2xvbmUoKSwgdGhpcy50eXBlMi5jbG9uZSgpKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUudHlwZTEgPSB0aGlzLlR5cGUxSW50ZXJuYWwoKS5jbG9uZSgpO1xuICAgICAgICBjbG9uZS50eXBlMiA9IHRoaXMuVHlwZTJJbnRlcm5hbCgpLmNsb25lKCk7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICB2YXIgX2EsIF9iLCBfYywgX2Q7XG4gICAgICAgIGNvbnN0IHNjaGVtYTEgPSB0aGlzLlR5cGUxSW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJ1bmRlZmluZWRcIiA/IHt9IDogdGhpcy50eXBlMS5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgY29uc3Qgc2NoZW1hMiA9IHRoaXMuVHlwZTJJbnRlcm5hbCgpLl90eXBlID09PSBcInVuZGVmaW5lZFwiID8ge30gOiB0aGlzLnR5cGUyLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBjb25zdCBjb21iaW5lZCA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgc2NoZW1hMSksIHNjaGVtYTIpO1xuICAgICAgICBjb21iaW5lZC50eXBlID0gWy4uLihBcnJheS5pc0FycmF5KHNjaGVtYTEudHlwZSkgPyBzY2hlbWExLnR5cGUgOiBbc2NoZW1hMS50eXBlXSksIC4uLihBcnJheS5pc0FycmF5KHNjaGVtYTIudHlwZSkgPyBzY2hlbWEyLnR5cGUgOiBbc2NoZW1hMi50eXBlXSldLmZpbHRlcih0ID0+ICEhdCAmJiB0ICE9PSBcInVuZGVmaW5lZFwiKTtcbiAgICAgICAgaWYgKGNvbWJpbmVkLnR5cGUubGVuZ3RoIDwgMilcbiAgICAgICAgICAgIGNvbWJpbmVkLnR5cGUgPSBjb21iaW5lZC50eXBlWzBdO1xuICAgICAgICBpZiAoc2NoZW1hMS5wcm9wZXJ0aWVzICYmIHNjaGVtYTIucHJvcGVydGllcykge1xuICAgICAgICAgICAgY29tYmluZWQucHJvcGVydGllcyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgKChfYSA9IHNjaGVtYTEucHJvcGVydGllcykgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDoge30pKSwgKChfYiA9IHNjaGVtYTIucHJvcGVydGllcykgIT09IG51bGwgJiYgX2IgIT09IHZvaWQgMCA/IF9iIDoge30pKTtcbiAgICAgICAgICAgIGlmICghIXNjaGVtYTEucmVxdWlyZWQgJiYgISFzY2hlbWEyLnJlcXVpcmVkKVxuICAgICAgICAgICAgICAgIGNvbWJpbmVkLnJlcXVpcmVkID0gc2NoZW1hMS5yZXF1aXJlZC5maWx0ZXIoKGYpID0+IHsgdmFyIF9hOyByZXR1cm4gKF9hID0gc2NoZW1hMi5yZXF1aXJlZCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmluY2x1ZGVzKGYpOyB9KTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBjb21iaW5lZC5yZXF1aXJlZCA9IChfZCA9IChfYyA9IHNjaGVtYTEucmVxdWlyZWQpICE9PSBudWxsICYmIF9jICE9PSB2b2lkIDAgPyBfYyA6IHNjaGVtYTIucmVxdWlyZWQpICE9PSBudWxsICYmIF9kICE9PSB2b2lkIDAgPyBfZCA6IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl90aXRsZSlcbiAgICAgICAgICAgIGNvbWJpbmVkLnRpdGxlID0gdGhpcy5fdGl0bGU7XG4gICAgICAgIGlmICh0aGlzLl9kZXNjcmlwdGlvbilcbiAgICAgICAgICAgIGNvbWJpbmVkLmRlc2NyaXB0aW9uID0gdGhpcy5fZGVzY3JpcHRpb247XG4gICAgICAgIGlmICh0aGlzLl9kZWZhdWx0KVxuICAgICAgICAgICAgY29tYmluZWQuZGVmYXVsdCA9IHRoaXMuX2RlZmF1bHQ7XG4gICAgICAgIHJldHVybiBjb21iaW5lZDtcbiAgICB9XG4gICAgaXNOdWxsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuVHlwZTFJbnRlcm5hbCgpLl90eXBlID09PSBcIm51bGxcIiB8fCB0aGlzLlR5cGUySW50ZXJuYWwoKS5fdHlwZSA9PT0gXCJudWxsXCIgfHwgdGhpcy5UeXBlMUludGVybmFsKCkuaXNOdWxsYWJsZSgpIHx8IHRoaXMuVHlwZTJJbnRlcm5hbCgpLmlzTnVsbGFibGUoKTtcbiAgICB9XG4gICAgaXNPcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuVHlwZTFJbnRlcm5hbCgpLl90eXBlID09PSBcInVuZGVmaW5lZFwiIHx8IHRoaXMuVHlwZTJJbnRlcm5hbCgpLl90eXBlID09PSBcInVuZGVmaW5lZFwiIHx8IHRoaXMuVHlwZTFJbnRlcm5hbCgpLmlzT3B0aW9uYWwoKSB8fCB0aGlzLlR5cGUySW50ZXJuYWwoKS5pc09wdGlvbmFsKCk7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuVHlwZTFJbnRlcm5hbCgpLmlzQ29ycmVjdFR5cGUoaW5wdXQpIHx8IHRoaXMuVHlwZTJJbnRlcm5hbCgpLmlzQ29ycmVjdFR5cGUoaW5wdXQpO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIGAke3RoaXMudHlwZTEuZ2V0VHlwZU5hbWUoKX0gb3IgJHt0aGlzLnR5cGUyLmdldFR5cGVOYW1lKCl9YDsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBpZiAodGhpcy5UeXBlMUludGVybmFsKCkuaXNDb3JyZWN0VHlwZShpbnB1dCkpIHtcbiAgICAgICAgICAgIHRoaXMuVHlwZTFJbnRlcm5hbCgpLnZhbGlkYXRlSW50ZXJuYWwocGF0aCwgaW5wdXQsIGVycm9ycyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuVHlwZTJJbnRlcm5hbCgpLmlzQ29ycmVjdFR5cGUoaW5wdXQpKSB7XG4gICAgICAgICAgICB0aGlzLlR5cGUySW50ZXJuYWwoKS52YWxpZGF0ZUludGVybmFsKHBhdGgsIGlucHV0LCBlcnJvcnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoVW5pb24gPSBUc2NoVW5pb247XG5jbGFzcyBUc2NoT2JqZWN0IGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKHNoYXBlKSB7XG4gICAgICAgIHN1cGVyKFwib2JqZWN0XCIpO1xuICAgICAgICB0aGlzLnNoYXBlID0gc2hhcGU7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hPYmplY3QodGhpcy5zaGFwZSk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIGNsb25lLnNoYXBlID0gdGhpcy5zaGFwZTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHN1cGVyLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBzY2hlbWEucmVxdWlyZWQgPSBPYmplY3Qua2V5cyh0aGlzLnNoYXBlKS5maWx0ZXIoayA9PiAhdGhpcy5zaGFwZVtrXS5pc09wdGlvbmFsKCkpO1xuICAgICAgICBzY2hlbWEucHJvcGVydGllcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnNoYXBlKSB7XG4gICAgICAgICAgICBzY2hlbWEucHJvcGVydGllc1trZXldID0gdGhpcy5zaGFwZVtrZXldLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJvYmplY3RcIiAmJiBpbnB1dCAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShpbnB1dCk7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkge1xuICAgICAgICByZXR1cm4gXCJvYmplY3RcIjtcbiAgICB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMuc2hhcGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gdGhpcy5zaGFwZVtrZXldO1xuICAgICAgICAgICAgY29uc3QgY2hpbGRJbnRlcm5hbCA9IGNoaWxkO1xuICAgICAgICAgICAgaWYgKCFjaGlsZEludGVybmFsLmlzT3B0aW9uYWwoKSAmJiAhaW5wdXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBQcm9wZXJ0eSAke2tleX0gb2YgdHlwZSAke2NoaWxkSW50ZXJuYWwuZ2V0VHlwZU5hbWUoKX0gaXMgcmVxdWlyZWQuYCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlucHV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBjaGlsZEludGVybmFsLnZhbGlkYXRlSW50ZXJuYWwoWy4uLnBhdGgsIGtleV0sIGlucHV0W2tleV0sIGVycm9ycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlRzY2hPYmplY3QgPSBUc2NoT2JqZWN0O1xuY2xhc3MgVHNjaEFycmF5IGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRUeXBlKSB7XG4gICAgICAgIHN1cGVyKFwiYXJyYXlcIik7XG4gICAgICAgIHRoaXMuZWxlbWVudFR5cGUgPSBlbGVtZW50VHlwZTtcbiAgICAgICAgdGhpcy5fZm9ybWF0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWluRWxlbWVudENvdW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbWF4RWxlbWVudENvdW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fdW5pcXVlID0gZmFsc2U7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hBcnJheSh0aGlzLmVsZW1lbnRUeXBlKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuZWxlbWVudFR5cGUgPSB0aGlzLmVsZW1lbnRUeXBlO1xuICAgICAgICBjbG9uZS5fZm9ybWF0ID0gdGhpcy5fZm9ybWF0O1xuICAgICAgICBjbG9uZS5fdW5pcXVlID0gdGhpcy5fdW5pcXVlO1xuICAgICAgICBjbG9uZS5fbWluRWxlbWVudENvdW50ID0gdGhpcy5fbWluRWxlbWVudENvdW50O1xuICAgICAgICBjbG9uZS5fbWF4RWxlbWVudENvdW50ID0gdGhpcy5fbWF4RWxlbWVudENvdW50O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gc3VwZXIuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIHNjaGVtYS5pdGVtcyA9IHRoaXMuZWxlbWVudFR5cGUuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQpXG4gICAgICAgICAgICBzY2hlbWEuZm9ybWF0ID0gdGhpcy5fZm9ybWF0O1xuICAgICAgICBpZiAodGhpcy5fdW5pcXVlKVxuICAgICAgICAgICAgc2NoZW1hLnVuaXF1ZUl0ZW1zID0gdGhpcy5fdW5pcXVlO1xuICAgICAgICBpZiAodGhpcy5fbWluRWxlbWVudENvdW50KVxuICAgICAgICAgICAgc2NoZW1hLm1pbkl0ZW1zID0gdGhpcy5fbWluRWxlbWVudENvdW50O1xuICAgICAgICBpZiAodGhpcy5fbWF4RWxlbWVudENvdW50KVxuICAgICAgICAgICAgc2NoZW1hLm1heEl0ZW1zID0gdGhpcy5fbWF4RWxlbWVudENvdW50O1xuICAgICAgICByZXR1cm4gc2NoZW1hO1xuICAgIH1cbiAgICB0YWJsZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9mb3JtYXQgPSBcInRhYmxlXCI7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgbWluRWxlbWVudHMoY291bnQpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9taW5FbGVtZW50Q291bnQgPSBjb3VudDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBtYXhFbGVtZW50cyhjb3VudCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21heEVsZW1lbnRDb3VudCA9IGNvdW50O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIHVuaXF1ZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl91bmlxdWUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJvYmplY3RcIiAmJiBpbnB1dCAhPT0gbnVsbCAmJiBBcnJheS5pc0FycmF5KGlucHV0KTtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7XG4gICAgICAgIHJldHVybiBgYXJyYXkgb2YgJHt0aGlzLmVsZW1lbnRUeXBlLmdldFR5cGVOYW1lKCl9YDtcbiAgICB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRUeXBlSW50ZXJuYWwgPSB0aGlzLmVsZW1lbnRUeXBlO1xuICAgICAgICBjb25zdCB1c2VkID0gbmV3IFNldCgpO1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21pbkVsZW1lbnRDb3VudCA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dC5sZW5ndGggPCB0aGlzLl9taW5FbGVtZW50Q291bnQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBBcnJheSBtdXN0IGNvbnRhaW4gYXQgbGVhc3QgJHt0aGlzLl9taW5FbGVtZW50Q291bnR9IGVsZW1lbnRzLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21heEVsZW1lbnRDb3VudCA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dC5sZW5ndGggPiB0aGlzLl9tYXhFbGVtZW50Q291bnQpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBBcnJheSBtdXN0IGNvbnRhaW4gYXQgbW9zdCAke3RoaXMuX21heEVsZW1lbnRDb3VudH0gZWxlbWVudHMuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBpbnB1dFtpXTtcbiAgICAgICAgICAgIGVsZW1lbnRUeXBlSW50ZXJuYWwudmFsaWRhdGVJbnRlcm5hbChbLi4ucGF0aCwgaS50b1N0cmluZygpXSwgZWxlbWVudCwgZXJyb3JzKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl91bmlxdWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5zdHJpbmdpZnkoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKHVzZWQuaGFzKGpzb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIFwiQWxsIHZhbHVlcyBoYXZlIHRvIGJlIHVuaXF1ZS5cIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB1c2VkLmFkZChqc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVHNjaEFycmF5ID0gVHNjaEFycmF5O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9VHNjaFR5cGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMudHNjaCA9IHZvaWQgMDtcbmNvbnN0IHRzY2ggPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcIi4vdHNjaFwiKSk7XG5leHBvcnRzLnRzY2ggPSB0c2NoO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmFycmF5ID0gZXhwb3J0cy5vYmplY3QgPSBleHBvcnRzLmJvb2xlYW4gPSBleHBvcnRzLm51bWJlciA9IGV4cG9ydHMuc3RyaW5nID0gdm9pZCAwO1xuY29uc3QgVHNjaFR5cGVfMSA9IHJlcXVpcmUoXCIuL1RzY2hUeXBlXCIpO1xuZnVuY3Rpb24gc3RyaW5nKCkgeyByZXR1cm4gbmV3IFRzY2hUeXBlXzEuVHNjaFN0cmluZygpOyB9XG5leHBvcnRzLnN0cmluZyA9IHN0cmluZztcbmZ1bmN0aW9uIG51bWJlcigpIHsgcmV0dXJuIG5ldyBUc2NoVHlwZV8xLlRzY2hOdW1iZXIoKTsgfVxuZXhwb3J0cy5udW1iZXIgPSBudW1iZXI7XG5mdW5jdGlvbiBib29sZWFuKCkgeyByZXR1cm4gbmV3IFRzY2hUeXBlXzEuVHNjaEJvb2xlYW4oKTsgfVxuZXhwb3J0cy5ib29sZWFuID0gYm9vbGVhbjtcbmZ1bmN0aW9uIG9iamVjdChzaGFwZSkge1xuICAgIHJldHVybiBuZXcgVHNjaFR5cGVfMS5Uc2NoT2JqZWN0KHNoYXBlKTtcbn1cbmV4cG9ydHMub2JqZWN0ID0gb2JqZWN0O1xuZnVuY3Rpb24gYXJyYXkoZWxlbWVudFR5cGUpIHtcbiAgICByZXR1cm4gbmV3IFRzY2hUeXBlXzEuVHNjaEFycmF5KGVsZW1lbnRUeXBlKTtcbn1cbmV4cG9ydHMuYXJyYXkgPSBhcnJheTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRzY2guanMubWFwIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xudmFyIFNjaGVtYV8xID0gcmVxdWlyZShcIi4vU2NoZW1hXCIpO1xuYWxlcnQoXCJIZWxsbyBXb3JsZFwiKTtcbmNvbnNvbGUubG9nKFNjaGVtYV8xLlNjaGVtYS5wYXJzZVNjaGVtYShcImhlbGxvIHdvcmxkXCIsIFwiY29uc29sZS5sb2coXFxcIkhlbGxvIHdvcmxkIGZyb20gcGFyc2VkIHNjaGVtYSFcXFwiKTtcIikpO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9