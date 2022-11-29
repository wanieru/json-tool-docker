/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/www/ApiUtils.ts":
/*!*****************************!*\
  !*** ./src/www/ApiUtils.ts ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports) {


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
                            return [2 /*return*/, null];
                        result.body.schema = Schema_1.Schema.parseSchema(schema, result.body.schemaContent)[0];
                        return [2 /*return*/];
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
var Client = /** @class */ (function () {
    function Client() {
        this.schemas = {};
        var menu = document.querySelector("#menu");
        this.select = document.createElement("select");
        menu.appendChild(this.select);
        this.loadFiles();
    }
    Client.prototype.loadFiles = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, _i, _a, files, _b, files_1, file, option;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, ServerUtils_1.ServerUtils.list()];
                    case 1:
                        result = _c.sent();
                        if (result.status !== 200)
                            return [2 /*return*/];
                        console.log(result);
                        this.schemas = result.body.schemas;
                        this.select.innerHTML = "";
                        for (_i = 0, _a = Object.values(this.schemas); _i < _a.length; _i++) {
                            files = _a[_i];
                            for (_b = 0, files_1 = files; _b < files_1.length; _b++) {
                                file = files_1[_b];
                                option = document.createElement("option");
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
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/www/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LDBDQUEwQyw0QkFBNEI7QUFDdEUsQ0FBQztBQUNEO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELFlBQVk7QUFDWiwwQkFBMEIsbUJBQU8sQ0FBQyxnREFBUTtBQUMxQyxZQUFZO0FBQ1o7Ozs7Ozs7Ozs7QUM1QmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsYUFBYSxHQUFHLGNBQWMsR0FBRyxlQUFlLEdBQUcsY0FBYyxHQUFHLGNBQWM7QUFDbEYsbUJBQW1CLG1CQUFPLENBQUMsd0RBQVk7QUFDdkMsb0JBQW9CO0FBQ3BCLGNBQWM7QUFDZCxvQkFBb0I7QUFDcEIsY0FBYztBQUNkLHFCQUFxQjtBQUNyQixlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjs7Ozs7O1VDbEJBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUV0QkE7VUFDQTtVQUNBO1VBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vc3JjL3d3dy9BcGlVdGlscy50cyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyLy4vc3JjL3d3dy9TY2hlbWEudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL3NyYy93d3cvU2VydmVyVXRpbHMudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL3NyYy93d3cvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvVHNjaFR5cGUuanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvaW5kZXguanMiLCJ3ZWJwYWNrOi8vanNvbi10b29sLWRvY2tlci8uL25vZGVfbW9kdWxlcy90c2NoL2Rpc3QvdHNjaC5qcyIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2pzb24tdG9vbC1kb2NrZXIvd2VicGFjay9iZWZvcmUtc3RhcnR1cCIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyL3dlYnBhY2svc3RhcnR1cCIsIndlYnBhY2s6Ly9qc29uLXRvb2wtZG9ja2VyL3dlYnBhY2svYWZ0ZXItc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHRoaXMgJiYgdGhpcy5fX2dlbmVyYXRvcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xuICAgICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuQXBpVXRpbHMgPSB2b2lkIDA7XG52YXIgQXBpVXRpbHMgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQXBpVXRpbHMoKSB7XG4gICAgfVxuICAgIEFwaVV0aWxzLnJ1biA9IGZ1bmN0aW9uICh1cmwsIGpzb24pIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHJhd1Jlc3BvbnNlLCBib2R5LCBzdGF0dXM7XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYS5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIGZldGNoKHVybCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoanNvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmF3UmVzcG9uc2UgPSBfYS5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCByYXdSZXNwb25zZS5qc29uKCldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5ID0gX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzID0gcmF3UmVzcG9uc2Uuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsyIC8qcmV0dXJuKi8sIHsgc3RhdHVzOiBzdGF0dXMsIGJvZHk6IGJvZHkgfV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIEFwaVV0aWxzO1xufSgpKTtcbmV4cG9ydHMuQXBpVXRpbHMgPSBBcGlVdGlscztcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5TY2hlbWEgPSB2b2lkIDA7XG52YXIgdHNjaF8xID0gcmVxdWlyZShcInRzY2hcIik7XG52YXIgU2NoZW1hID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFNjaGVtYShzY2hlbWFGaWxlLCBzY2hlbWFDb250ZW50LCBuYW1lLCBqc29uU2NoZW1hLCB0c2NoKSB7XG4gICAgICAgIHRoaXMuc2NoZW1hRmlsZSA9IHNjaGVtYUZpbGU7XG4gICAgICAgIHRoaXMuc2NoZW1hQ29udGVudCA9IHNjaGVtYUNvbnRlbnQ7XG4gICAgICAgIHRoaXMucmVnZXggPSBTY2hlbWEuZ2V0UmVnZXgobmFtZSk7XG4gICAgICAgIHRoaXMuanNvblNjaGVtYSA9IGpzb25TY2hlbWE7XG4gICAgICAgIHRoaXMudHNjaCA9IHRzY2g7XG4gICAgfVxuICAgIFNjaGVtYS5wcm90b3R5cGUuZ2V0U2NoZW1hRmlsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NoZW1hRmlsZTtcbiAgICB9O1xuICAgIFNjaGVtYS5wcm90b3R5cGUuZ2V0U2NoZW1hQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NoZW1hQ29udGVudDtcbiAgICB9O1xuICAgIFNjaGVtYS5wcm90b3R5cGUuZ2V0UmVnZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2V4O1xuICAgIH07XG4gICAgU2NoZW1hLnByb3RvdHlwZS52YWxpZGF0ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoISF0aGlzLnRzY2gpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50c2NoLnZhbGlkYXRlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGVycm9yczogW10gfTtcbiAgICB9O1xuICAgIFNjaGVtYS5wcm90b3R5cGUuZ2V0SnNvblNjaGVtYSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCEhdGhpcy50c2NoKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHNjaC5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuanNvblNjaGVtYTtcbiAgICB9O1xuICAgIFNjaGVtYS5wYXJzZVNjaGVtYSA9IGZ1bmN0aW9uIChmaWxlLCBjb250ZW50LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpXG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcbiAgICAgICAgdmFyIGFkZEpzb25TY2hlbWEgPSBmdW5jdGlvbiAobmFtZSwganNvblNjaGVtYSkgeyByZXR1cm4gU2NoZW1hLmFkZEpzb25TY2hlbWEocmVzdWx0ICE9PSBudWxsICYmIHJlc3VsdCAhPT0gdm9pZCAwID8gcmVzdWx0IDogW10sIGZpbGUsIGNvbnRlbnQsIG5hbWUsIGpzb25TY2hlbWEpOyB9O1xuICAgICAgICB2YXIgYWRkVHNjaCA9IGZ1bmN0aW9uIChuYW1lLCB0c2NoKSB7IHJldHVybiBTY2hlbWEuYWRkVHNjaChyZXN1bHQgIT09IG51bGwgJiYgcmVzdWx0ICE9PSB2b2lkIDAgPyByZXN1bHQgOiBbXSwgZmlsZSwgY29udGVudCwgbmFtZSwgdHNjaCk7IH07XG4gICAgICAgIHZhciB0c2NoID0gdHNjaF8xLnRzY2g7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgICAgIGV2YWwoY29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkV4Y2VwdGlvbiBkdXJpbmcgXCIuY29uY2F0KGZpbGUpLCBlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gICAgU2NoZW1hLmdldFJlZ2V4ID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoXCJeXCIgKyBuYW1lLnNwbGl0KFwiKlwiKVxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAocykgeyByZXR1cm4gcy5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTsgfSlcbiAgICAgICAgICAgIC5qb2luKFwiLipcIikgKyBcIiRcIik7XG4gICAgfTtcbiAgICBTY2hlbWEuYWRkSnNvblNjaGVtYSA9IGZ1bmN0aW9uIChzY2hlbWFzLCBzY2hlbWFGaWxlLCBjb250ZW50LCBuYW1lLCBqc29uU2NoZW1hKSB7XG4gICAgICAgIHNjaGVtYXMucHVzaChuZXcgU2NoZW1hKHNjaGVtYUZpbGUsIGNvbnRlbnQsIG5hbWUsIGpzb25TY2hlbWEpKTtcbiAgICB9O1xuICAgIFNjaGVtYS5hZGRUc2NoID0gZnVuY3Rpb24gKHNjaGVtYXMsIHNjaGVtYUZpbGUsIGNvbnRlbnQsIG5hbWUsIHRzY2gpIHtcbiAgICAgICAgc2NoZW1hcy5wdXNoKG5ldyBTY2hlbWEoc2NoZW1hRmlsZSwgY29udGVudCwgbmFtZSwgdW5kZWZpbmVkLCB0c2NoKSk7XG4gICAgfTtcbiAgICByZXR1cm4gU2NoZW1hO1xufSgpKTtcbmV4cG9ydHMuU2NoZW1hID0gU2NoZW1hO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfX2dlbmVyYXRvciA9ICh0aGlzICYmIHRoaXMuX19nZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBib2R5KSB7XG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xuICAgIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlNlcnZlclV0aWxzID0gdm9pZCAwO1xudmFyIEFwaVV0aWxzXzEgPSByZXF1aXJlKFwiLi9BcGlVdGlsc1wiKTtcbnZhciBTY2hlbWFfMSA9IHJlcXVpcmUoXCIuL1NjaGVtYVwiKTtcbnZhciBTZXJ2ZXJVdGlscyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTZXJ2ZXJVdGlscygpIHtcbiAgICB9XG4gICAgU2VydmVyVXRpbHMubGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gWzQgLyp5aWVsZCovLCBBcGlVdGlsc18xLkFwaVV0aWxzLnJ1bihcIi9hcGlcIiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IFwibGlzdFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9KV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIFsyIC8qcmV0dXJuKi8sIF9hLnNlbnQoKV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU2VydmVyVXRpbHMubG9hZCA9IGZ1bmN0aW9uIChzY2hlbWEsIGpzb24pIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9hLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuIFs0IC8qeWllbGQqLywgQXBpVXRpbHNfMS5BcGlVdGlscy5ydW4oXCIvYXBpXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kOiBcImxvYWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWE6IHNjaGVtYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uOiBqc29uXG4gICAgICAgICAgICAgICAgICAgICAgICB9KV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LmJvZHkuc2NoZW1hQ29udGVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgbnVsbF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuYm9keS5zY2hlbWEgPSBTY2hlbWFfMS5TY2hlbWEucGFyc2VTY2hlbWEoc2NoZW1hLCByZXN1bHQuYm9keS5zY2hlbWFDb250ZW50KVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBTZXJ2ZXJVdGlscy5zYXZlID0gZnVuY3Rpb24gKHNjaGVtYSwganNvbiwgdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gWzQgLyp5aWVsZCovLCBBcGlVdGlsc18xLkFwaVV0aWxzLnJ1bihcIi9hcGlcIiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmQ6IFwic2F2ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYTogc2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb246IGpzb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIFsyIC8qcmV0dXJuKi8sIF9hLnNlbnQoKV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIFNlcnZlclV0aWxzO1xufSgpKTtcbmV4cG9ydHMuU2VydmVyVXRpbHMgPSBTZXJ2ZXJVdGlscztcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG52YXIgX19nZW5lcmF0b3IgPSAodGhpcyAmJiB0aGlzLl9fZ2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5DbGllbnQgPSB2b2lkIDA7XG52YXIgU2VydmVyVXRpbHNfMSA9IHJlcXVpcmUoXCIuL1NlcnZlclV0aWxzXCIpO1xudmFyIENsaWVudCA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDbGllbnQoKSB7XG4gICAgICAgIHRoaXMuc2NoZW1hcyA9IHt9O1xuICAgICAgICB2YXIgbWVudSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWVudVwiKTtcbiAgICAgICAgdGhpcy5zZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBtZW51LmFwcGVuZENoaWxkKHRoaXMuc2VsZWN0KTtcbiAgICAgICAgdGhpcy5sb2FkRmlsZXMoKTtcbiAgICB9XG4gICAgQ2xpZW50LnByb3RvdHlwZS5sb2FkRmlsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQsIF9pLCBfYSwgZmlsZXMsIF9iLCBmaWxlc18xLCBmaWxlLCBvcHRpb247XG4gICAgICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9jKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChfYy5sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBbNCAvKnlpZWxkKi8sIFNlcnZlclV0aWxzXzEuU2VydmVyVXRpbHMubGlzdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gX2Muc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgIT09IDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlbWFzID0gcmVzdWx0LmJvZHkuc2NoZW1hcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKF9pID0gMCwgX2EgPSBPYmplY3QudmFsdWVzKHRoaXMuc2NoZW1hcyk7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMgPSBfYVtfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChfYiA9IDAsIGZpbGVzXzEgPSBmaWxlczsgX2IgPCBmaWxlc18xLmxlbmd0aDsgX2IrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlID0gZmlsZXNfMVtfYl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5pbm5lclRleHQgPSBmaWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdC5hcHBlbmRDaGlsZChvcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gQ2xpZW50O1xufSgpKTtcbmV4cG9ydHMuQ2xpZW50ID0gQ2xpZW50O1xubmV3IENsaWVudCgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlRzY2hBcnJheSA9IGV4cG9ydHMuVHNjaE9iamVjdCA9IGV4cG9ydHMuVHNjaFVuaW9uID0gZXhwb3J0cy5Uc2NoVW5kZWZpbmVkID0gZXhwb3J0cy5Uc2NoTnVsbCA9IGV4cG9ydHMuVHNjaEJvb2xlYW4gPSBleHBvcnRzLlRzY2hOdW1iZXIgPSBleHBvcnRzLlRzY2hTdHJpbmcgPSBleHBvcnRzLlRzY2hUeXBlID0gdm9pZCAwO1xuY2xhc3MgVHNjaFZhbGlkYXRpb25FcnJvciB7XG4gICAgY29uc3RydWN0b3IocGF0aCwgbWVzc2FnZSkge1xuICAgICAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgICAgICB0aGlzLnBhdGhTdHJpbmcgPSBUc2NoVmFsaWRhdGlvbkVycm9yLmZvcm1hdFBhdGgocGF0aCk7XG4gICAgICAgIHRoaXMucmF3TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IGAke3RoaXMucGF0aFN0cmluZ306ICR7bWVzc2FnZX1gO1xuICAgIH1cbiAgICBzdGF0aWMgZm9ybWF0UGF0aChwYXRoKSB7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gXCJyb290XCI7XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oXCIuXCIpO1xuICAgIH1cbn1cbmNsYXNzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3Rvcih0eXBlKSB7XG4gICAgICAgIHRoaXMuX3RzID0gbnVsbDsgLy9fdHMgaXMgb25seSB1c2VkIGJ5IFR5cGVzY3JpcHQgZm9yIHR5cGUgaW5mZXJlbmNlLCBhbmQgc28gYWN0dWFsbHkgZG9lc24ndCBuZWVkIHRvIGJlIGFzc2lnbmVkXG4gICAgICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLl90aXRsZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX2Rlc2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZGVmYXVsdCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2V4YW1wbGVzID0gbnVsbDtcbiAgICB9XG4gICAgdW5pb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoVW5pb24odGhpcywgb3RoZXIpO1xuICAgIH1cbiAgICBvcHRpb25hbCgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoVW5pb24odGhpcywgbmV3IFRzY2hVbmRlZmluZWQoKSk7XG4gICAgfVxuICAgIG51bGxhYmxlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hVbmlvbih0aGlzLCBuZXcgVHNjaE51bGwoKSk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMubmV3SW5zdGFuY2UoKTtcbiAgICAgICAgY2xvbmUuX3RpdGxlID0gdGhpcy5fdGl0bGU7XG4gICAgICAgIGNsb25lLl9kZXNjcmlwdGlvbiA9IHRoaXMuX2Rlc2NyaXB0aW9uO1xuICAgICAgICBjbG9uZS5fZGVmYXVsdCA9IHRoaXMuX2RlZmF1bHQ7XG4gICAgICAgIGNsb25lLl9leGFtcGxlcyA9IHRoaXMuX2V4YW1wbGVzID8gWy4uLnRoaXMuX2V4YW1wbGVzXSA6IG51bGw7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgdGl0bGUodGl0bGUpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl90aXRsZSA9IHRpdGxlO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGRlc2NyaXB0aW9uKGRlc2NyaXB0aW4pIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW47XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZGVmYXVsdChkZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSB0aGlzLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9kZWZhdWx0ID0gZGVmYXVsdFZhbHVlO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGV4YW1wbGVzKGV4YW1wbGVzKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZXhhbXBsZXMgPSBbLi4uZXhhbXBsZXNdO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0ge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IHRoaXMuX3R5cGVcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuX3RpdGxlKVxuICAgICAgICAgICAgc2NoZW1hLnRpdGxlID0gdGhpcy5fdGl0bGU7XG4gICAgICAgIGlmICh0aGlzLl9kZXNjcmlwdGlvbilcbiAgICAgICAgICAgIHNjaGVtYS5kZXNjcmlwdGlvbiA9IHRoaXMuX2Rlc2NyaXB0aW9uO1xuICAgICAgICBpZiAodGhpcy5fZGVmYXVsdClcbiAgICAgICAgICAgIHNjaGVtYS5kZWZhdWx0ID0gdGhpcy5fZGVmYXVsdDtcbiAgICAgICAgaWYgKHRoaXMuX2V4YW1wbGVzKVxuICAgICAgICAgICAgc2NoZW1hLmV4YW1wbGVzID0gdGhpcy5fZXhhbXBsZXM7XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IFtdO1xuICAgICAgICB0aGlzLnZhbGlkYXRlSW50ZXJuYWwoW10sIGlucHV0LCBlcnJvcnMpO1xuICAgICAgICByZXR1cm4geyB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PSAwLCBlcnJvcnMgfTtcbiAgICB9XG4gICAgdmFsaWRhdGVJbnRlcm5hbChwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0NvcnJlY3RUeXBlKGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIGhhcyB0byBiZSBvZiB0eXBlICR7dGhpcy5nZXRUeXBlTmFtZSgpfWApKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycyk7XG4gICAgfVxuICAgIGlzT3B0aW9uYWwoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIGlzTnVsbGFibGUoKSB7IHJldHVybiBmYWxzZTsgfVxufVxuZXhwb3J0cy5Uc2NoVHlwZSA9IFRzY2hUeXBlO1xuY2xhc3MgVHNjaFN0cmluZyBleHRlbmRzIFRzY2hUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoXCJzdHJpbmdcIik7XG4gICAgICAgIHRoaXMuX2Zvcm1hdCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2VudW0gPSBudWxsO1xuICAgICAgICB0aGlzLl9taW5MZW5ndGggPSBudWxsO1xuICAgICAgICB0aGlzLl9tYXhMZW5ndGggPSBudWxsO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoU3RyaW5nKCk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIGNsb25lLl9mb3JtYXQgPSB0aGlzLl9mb3JtYXQ7XG4gICAgICAgIGNsb25lLl9lbnVtID0gdGhpcy5fZW51bTtcbiAgICAgICAgY2xvbmUuX21pbkxlbmd0aCA9IHRoaXMuX21pbkxlbmd0aDtcbiAgICAgICAgY2xvbmUuX21heExlbmd0aCA9IHRoaXMuX21heExlbmd0aDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHN1cGVyLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBpZiAodGhpcy5fZm9ybWF0KVxuICAgICAgICAgICAgc2NoZW1hLmZvcm1hdCA9IHRoaXMuX2Zvcm1hdDtcbiAgICAgICAgaWYgKHRoaXMuX2VudW0pXG4gICAgICAgICAgICBzY2hlbWEuZW51bSA9IHRoaXMuX2VudW07XG4gICAgICAgIGlmICh0aGlzLl9taW5MZW5ndGgpXG4gICAgICAgICAgICBzY2hlbWEubWluTGVuZ3RoID0gdGhpcy5fbWluTGVuZ3RoO1xuICAgICAgICBpZiAodGhpcy5fbWF4TGVuZ3RoKVxuICAgICAgICAgICAgc2NoZW1hLm1heExlbmd0aCA9IHRoaXMuX21heExlbmd0aDtcbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG4gICAgbWluTGVuZ3RoKG1pbikge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21pbkxlbmd0aCA9IG1pbjtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBtYXhMZW5ndGgobWF4KSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWF4TGVuZ3RoID0gbWF4O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGVudW1lcmF0aW9uKGVudW1lcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fZW51bSA9IFsuLi5lbnVtZXJhdGlvbl07XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZm9ybWF0KGZvcm1hdCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2Zvcm1hdCA9IGZvcm1hdDtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBjb2xvcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwiY29sb3JcIik7XG4gICAgfVxuICAgIGRhdGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcImRhdGVcIik7XG4gICAgfVxuICAgIGVtYWlsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXCJlbWFpbFwiKTtcbiAgICB9XG4gICAgcGFzc3dvcmQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcInBhc3N3b3JkXCIpO1xuICAgIH1cbiAgICB0ZXh0YXJlYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwidGV4dGFyZWFcIik7XG4gICAgfVxuICAgIHVybCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFwidXJsXCIpO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwic3RyaW5nXCI7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gXCJzdHJpbmdcIjsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgICAgICBpZiAoISF0aGlzLl9lbnVtICYmICF0aGlzLl9lbnVtLmluY2x1ZGVzKGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIGhhcyB0byBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzogJHt0aGlzLl9lbnVtLmpvaW4oXCIsIFwiKX1gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9taW5MZW5ndGggPT09IFwibnVtYmVyXCIgJiYgaW5wdXQubGVuZ3RoIDwgdGhpcy5fbWluTGVuZ3RoKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBsb25nZXIgdGhhbiAke3RoaXMuX21pbkxlbmd0aH0gY2hhcmFjdGVycy5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9tYXhMZW5ndGggPT09IFwibnVtYmVyXCIgJiYgaW5wdXQubGVuZ3RoID4gdGhpcy5fbWF4TGVuZ3RoKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVHNjaFZhbGlkYXRpb25FcnJvcihwYXRoLCBgVmFsdWUgbXVzdCBiZSBzaG9ydGVyIHRoYW4gJHt0aGlzLl9tYXhMZW5ndGh9IGNoYXJhY3RlcnMuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQgPT09IFwiY29sb3JcIiAmJiAhL14jP1swLTlhLWZdezMsNn0kL2kudGVzdChpbnB1dCkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGEgY29sb3IgaGV4IGNvZGUuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQgPT09IFwiZGF0ZVwiICYmIE51bWJlci5pc05hTihEYXRlLnBhcnNlKGlucHV0KSkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBUc2NoVmFsaWRhdGlvbkVycm9yKHBhdGgsIGBWYWx1ZSBtdXN0IGJlIGEgZGF0ZS5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdCA9PT0gXCJlbWFpbFwiICYmICEvXigoW148PigpXFxbXFxdXFxcXC4sOzpcXHNAXCJdKyhcXC5bXjw+KClcXFtcXF1cXFxcLiw7Olxcc0BcIl0rKSopfChcIi4rXCIpKUAoKFxcW1swLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfVxcLlswLTldezEsM31dKXwoKFthLXpBLVpcXC0wLTldK1xcLikrW2EtekEtWl17Mix9KSkkLy50ZXN0KGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYW4gZW1haWwuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9mb3JtYXQgPT09IFwidXJsXCIgJiYgIS9eaHR0cHM/OlxcL1xcLyg/Ond3d1xcLik/Wy1hLXpBLVowLTlAOiUuX1xcK34jPV17MSwyNTZ9XFwuW2EtekEtWjAtOSgpXXsxLDZ9XFxiKD86Wy1hLXpBLVowLTkoKUA6JV9cXCsufiM/JlxcLz1dKikkLy50ZXN0KGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYSBVUkwuYCkpO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoU3RyaW5nID0gVHNjaFN0cmluZztcbmNsYXNzIFRzY2hOdW1iZXIgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFwibnVtYmVyXCIpO1xuICAgICAgICB0aGlzLl9pbnRlZ2VyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX21pbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX21heCA9IG51bGw7XG4gICAgfVxuICAgIG5ld0luc3RhbmNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFRzY2hOdW1iZXIoKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2ludGVnZXIgPSB0aGlzLl9pbnRlZ2VyO1xuICAgICAgICBjbG9uZS5fbWluID0gdGhpcy5fbWluO1xuICAgICAgICBjbG9uZS5fbWF4ID0gdGhpcy5fbWF4O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGludGVnZXIoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5faW50ZWdlciA9IHRydWU7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgbWluKG1pbikge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21pbiA9IG1pbjtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBtYXgobWF4KSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWF4ID0gbWF4O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gc3VwZXIuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIGlmICh0aGlzLl9pbnRlZ2VyKVxuICAgICAgICAgICAgc2NoZW1hLnR5cGUgPSBcImludGVnZXJcIjtcbiAgICAgICAgaWYgKHRoaXMuX21pbiAhPT0gbnVsbClcbiAgICAgICAgICAgIHNjaGVtYS5taW5pbXVtID0gdGhpcy5fbWluO1xuICAgICAgICBpZiAodGhpcy5fbWF4ICE9PSBudWxsKVxuICAgICAgICAgICAgc2NoZW1hLm1heGltdW0gPSB0aGlzLl9tYXg7XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIGlzQ29ycmVjdFR5cGUoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gXCJudW1iZXJcIjtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBcIm51bWJlclwiOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnRlZ2VyICYmICFOdW1iZXIuaXNJbnRlZ2VyKGlucHV0KSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIGhhcyB0byBiZSBhbiBpbnRlZ2VyLmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21pbiA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dCA8IHRoaXMuX21pbikge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYXQgbGVhc3QgJHt0aGlzLl9taW59LmApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX21heCA9PT0gXCJudW1iZXJcIiAmJiBpbnB1dCA+IHRoaXMuX21heCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFZhbHVlIG11c3QgYmUgYXQgbGVzcyB0aGFuICR7dGhpcy5fbWF4fS5gKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlRzY2hOdW1iZXIgPSBUc2NoTnVtYmVyO1xuY2xhc3MgVHNjaEJvb2xlYW4gZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFwiYm9vbGVhblwiKTtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaEJvb2xlYW4oKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5wdXQgPT09IFwiYm9vbGVhblwiO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIFwiYm9vbGVhblwiOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoQm9vbGVhbiA9IFRzY2hCb29sZWFuO1xuY2xhc3MgVHNjaE51bGwgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFwibnVsbFwiKTtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaE51bGwoKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBpc0NvcnJlY3RUeXBlKGlucHV0KSB7XG4gICAgICAgIHJldHVybiBpbnB1dCA9PT0gbnVsbDtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7IHJldHVybiBcIm51bGxcIjsgfVxuICAgIHZhbGlkYXRlQ29ycmVjdFR5cGUocGF0aCwgaW5wdXQsIGVycm9ycykge1xuICAgIH1cbn1cbmV4cG9ydHMuVHNjaE51bGwgPSBUc2NoTnVsbDtcbmNsYXNzIFRzY2hVbmRlZmluZWQgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKFwidW5kZWZpbmVkXCIpO1xuICAgIH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoVW5kZWZpbmVkKCk7XG4gICAgfVxuICAgIGNsb25lKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHN1cGVyLmNsb25lKCk7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcInVuZGVmaW5lZFwiO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHsgcmV0dXJuIFwidW5kZWZpbmVkXCI7IH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICB9XG59XG5leHBvcnRzLlRzY2hVbmRlZmluZWQgPSBUc2NoVW5kZWZpbmVkO1xuY2xhc3MgVHNjaFVuaW9uIGV4dGVuZHMgVHNjaFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKHR5cGUxLCB0eXBlMikge1xuICAgICAgICBzdXBlcihgdW5pb25fJHt0eXBlMS5fdHlwZX1fJHt0eXBlMi5fdHlwZX1gKTtcbiAgICAgICAgdGhpcy50eXBlMSA9IHR5cGUxO1xuICAgICAgICB0aGlzLnR5cGUyID0gdHlwZTI7XG4gICAgfVxuICAgIFR5cGUxSW50ZXJuYWwoKSB7IHJldHVybiB0aGlzLnR5cGUxOyB9XG4gICAgVHlwZTJJbnRlcm5hbCgpIHsgcmV0dXJuIHRoaXMudHlwZTI7IH1cbiAgICBuZXdJbnN0YW5jZSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUc2NoVW5pb24odGhpcy50eXBlMS5jbG9uZSgpLCB0aGlzLnR5cGUyLmNsb25lKCkpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICBjbG9uZS50eXBlMSA9IHRoaXMuVHlwZTFJbnRlcm5hbCgpLmNsb25lKCk7XG4gICAgICAgIGNsb25lLnR5cGUyID0gdGhpcy5UeXBlMkludGVybmFsKCkuY2xvbmUoKTtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBnZXRKc29uU2NoZW1hUHJvcGVydHkoKSB7XG4gICAgICAgIHZhciBfYSwgX2IsIF9jLCBfZDtcbiAgICAgICAgY29uc3Qgc2NoZW1hMSA9IHRoaXMuVHlwZTFJbnRlcm5hbCgpLl90eXBlID09PSBcInVuZGVmaW5lZFwiID8ge30gOiB0aGlzLnR5cGUxLmdldEpzb25TY2hlbWFQcm9wZXJ0eSgpO1xuICAgICAgICBjb25zdCBzY2hlbWEyID0gdGhpcy5UeXBlMkludGVybmFsKCkuX3R5cGUgPT09IFwidW5kZWZpbmVkXCIgPyB7fSA6IHRoaXMudHlwZTIuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIGNvbnN0IGNvbWJpbmVkID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCBzY2hlbWExKSwgc2NoZW1hMik7XG4gICAgICAgIGNvbWJpbmVkLnR5cGUgPSBbLi4uKEFycmF5LmlzQXJyYXkoc2NoZW1hMS50eXBlKSA/IHNjaGVtYTEudHlwZSA6IFtzY2hlbWExLnR5cGVdKSwgLi4uKEFycmF5LmlzQXJyYXkoc2NoZW1hMi50eXBlKSA/IHNjaGVtYTIudHlwZSA6IFtzY2hlbWEyLnR5cGVdKV0uZmlsdGVyKHQgPT4gISF0ICYmIHQgIT09IFwidW5kZWZpbmVkXCIpO1xuICAgICAgICBpZiAoY29tYmluZWQudHlwZS5sZW5ndGggPCAyKVxuICAgICAgICAgICAgY29tYmluZWQudHlwZSA9IGNvbWJpbmVkLnR5cGVbMF07XG4gICAgICAgIGlmIChzY2hlbWExLnByb3BlcnRpZXMgJiYgc2NoZW1hMi5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBjb21iaW5lZC5wcm9wZXJ0aWVzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCAoKF9hID0gc2NoZW1hMS5wcm9wZXJ0aWVzKSAhPT0gbnVsbCAmJiBfYSAhPT0gdm9pZCAwID8gX2EgOiB7fSkpLCAoKF9iID0gc2NoZW1hMi5wcm9wZXJ0aWVzKSAhPT0gbnVsbCAmJiBfYiAhPT0gdm9pZCAwID8gX2IgOiB7fSkpO1xuICAgICAgICAgICAgaWYgKCEhc2NoZW1hMS5yZXF1aXJlZCAmJiAhIXNjaGVtYTIucmVxdWlyZWQpXG4gICAgICAgICAgICAgICAgY29tYmluZWQucmVxdWlyZWQgPSBzY2hlbWExLnJlcXVpcmVkLmZpbHRlcigoZikgPT4geyB2YXIgX2E7IHJldHVybiAoX2EgPSBzY2hlbWEyLnJlcXVpcmVkKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2EuaW5jbHVkZXMoZik7IH0pO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGNvbWJpbmVkLnJlcXVpcmVkID0gKF9kID0gKF9jID0gc2NoZW1hMS5yZXF1aXJlZCkgIT09IG51bGwgJiYgX2MgIT09IHZvaWQgMCA/IF9jIDogc2NoZW1hMi5yZXF1aXJlZCkgIT09IG51bGwgJiYgX2QgIT09IHZvaWQgMCA/IF9kIDogW107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX3RpdGxlKVxuICAgICAgICAgICAgY29tYmluZWQudGl0bGUgPSB0aGlzLl90aXRsZTtcbiAgICAgICAgaWYgKHRoaXMuX2Rlc2NyaXB0aW9uKVxuICAgICAgICAgICAgY29tYmluZWQuZGVzY3JpcHRpb24gPSB0aGlzLl9kZXNjcmlwdGlvbjtcbiAgICAgICAgaWYgKHRoaXMuX2RlZmF1bHQpXG4gICAgICAgICAgICBjb21iaW5lZC5kZWZhdWx0ID0gdGhpcy5fZGVmYXVsdDtcbiAgICAgICAgcmV0dXJuIGNvbWJpbmVkO1xuICAgIH1cbiAgICBpc051bGxhYmxlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5UeXBlMUludGVybmFsKCkuX3R5cGUgPT09IFwibnVsbFwiIHx8IHRoaXMuVHlwZTJJbnRlcm5hbCgpLl90eXBlID09PSBcIm51bGxcIiB8fCB0aGlzLlR5cGUxSW50ZXJuYWwoKS5pc051bGxhYmxlKCkgfHwgdGhpcy5UeXBlMkludGVybmFsKCkuaXNOdWxsYWJsZSgpO1xuICAgIH1cbiAgICBpc09wdGlvbmFsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5UeXBlMUludGVybmFsKCkuX3R5cGUgPT09IFwidW5kZWZpbmVkXCIgfHwgdGhpcy5UeXBlMkludGVybmFsKCkuX3R5cGUgPT09IFwidW5kZWZpbmVkXCIgfHwgdGhpcy5UeXBlMUludGVybmFsKCkuaXNPcHRpb25hbCgpIHx8IHRoaXMuVHlwZTJJbnRlcm5hbCgpLmlzT3B0aW9uYWwoKTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5UeXBlMUludGVybmFsKCkuaXNDb3JyZWN0VHlwZShpbnB1dCkgfHwgdGhpcy5UeXBlMkludGVybmFsKCkuaXNDb3JyZWN0VHlwZShpbnB1dCk7XG4gICAgfVxuICAgIGdldFR5cGVOYW1lKCkgeyByZXR1cm4gYCR7dGhpcy50eXBlMS5nZXRUeXBlTmFtZSgpfSBvciAke3RoaXMudHlwZTIuZ2V0VHlwZU5hbWUoKX1gOyB9XG4gICAgdmFsaWRhdGVDb3JyZWN0VHlwZShwYXRoLCBpbnB1dCwgZXJyb3JzKSB7XG4gICAgICAgIGlmICh0aGlzLlR5cGUxSW50ZXJuYWwoKS5pc0NvcnJlY3RUeXBlKGlucHV0KSkge1xuICAgICAgICAgICAgdGhpcy5UeXBlMUludGVybmFsKCkudmFsaWRhdGVJbnRlcm5hbChwYXRoLCBpbnB1dCwgZXJyb3JzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5UeXBlMkludGVybmFsKCkuaXNDb3JyZWN0VHlwZShpbnB1dCkpIHtcbiAgICAgICAgICAgIHRoaXMuVHlwZTJJbnRlcm5hbCgpLnZhbGlkYXRlSW50ZXJuYWwocGF0aCwgaW5wdXQsIGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnRzLlRzY2hVbmlvbiA9IFRzY2hVbmlvbjtcbmNsYXNzIFRzY2hPYmplY3QgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3Ioc2hhcGUpIHtcbiAgICAgICAgc3VwZXIoXCJvYmplY3RcIik7XG4gICAgICAgIHRoaXMuc2hhcGUgPSBzaGFwZTtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaE9iamVjdCh0aGlzLnNoYXBlKTtcbiAgICB9XG4gICAgY2xvbmUoKSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gc3VwZXIuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuc2hhcGUgPSB0aGlzLnNoYXBlO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIGdldEpzb25TY2hlbWFQcm9wZXJ0eSgpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gc3VwZXIuZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIHNjaGVtYS5yZXF1aXJlZCA9IE9iamVjdC5rZXlzKHRoaXMuc2hhcGUpLmZpbHRlcihrID0+ICF0aGlzLnNoYXBlW2tdLmlzT3B0aW9uYWwoKSk7XG4gICAgICAgIHNjaGVtYS5wcm9wZXJ0aWVzID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMuc2hhcGUpIHtcbiAgICAgICAgICAgIHNjaGVtYS5wcm9wZXJ0aWVzW2tleV0gPSB0aGlzLnNoYXBlW2tleV0uZ2V0SnNvblNjaGVtYVByb3BlcnR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcIm9iamVjdFwiICYmIGlucHV0ICE9PSBudWxsICYmICFBcnJheS5pc0FycmF5KGlucHV0KTtcbiAgICB9XG4gICAgZ2V0VHlwZU5hbWUoKSB7XG4gICAgICAgIHJldHVybiBcIm9iamVjdFwiO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5zaGFwZSkge1xuICAgICAgICAgICAgY29uc3QgY2hpbGQgPSB0aGlzLnNoYXBlW2tleV07XG4gICAgICAgICAgICBjb25zdCBjaGlsZEludGVybmFsID0gY2hpbGQ7XG4gICAgICAgICAgICBpZiAoIWNoaWxkSW50ZXJuYWwuaXNPcHRpb25hbCgpICYmICFpbnB1dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYFByb3BlcnR5ICR7a2V5fSBvZiB0eXBlICR7Y2hpbGRJbnRlcm5hbC5nZXRUeXBlTmFtZSgpfSBpcyByZXF1aXJlZC5gKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5wdXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNoaWxkSW50ZXJuYWwudmFsaWRhdGVJbnRlcm5hbChbLi4ucGF0aCwga2V5XSwgaW5wdXRba2V5XSwgZXJyb3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydHMuVHNjaE9iamVjdCA9IFRzY2hPYmplY3Q7XG5jbGFzcyBUc2NoQXJyYXkgZXh0ZW5kcyBUc2NoVHlwZSB7XG4gICAgY29uc3RydWN0b3IoZWxlbWVudFR5cGUpIHtcbiAgICAgICAgc3VwZXIoXCJhcnJheVwiKTtcbiAgICAgICAgdGhpcy5lbGVtZW50VHlwZSA9IGVsZW1lbnRUeXBlO1xuICAgICAgICB0aGlzLl9mb3JtYXQgPSBudWxsO1xuICAgICAgICB0aGlzLl9taW5FbGVtZW50Q291bnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9tYXhFbGVtZW50Q291bnQgPSBudWxsO1xuICAgICAgICB0aGlzLl91bmlxdWUgPSBmYWxzZTtcbiAgICB9XG4gICAgbmV3SW5zdGFuY2UoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHNjaEFycmF5KHRoaXMuZWxlbWVudFR5cGUpO1xuICAgIH1cbiAgICBjbG9uZSgpIHtcbiAgICAgICAgY29uc3QgY2xvbmUgPSBzdXBlci5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5lbGVtZW50VHlwZSA9IHRoaXMuZWxlbWVudFR5cGU7XG4gICAgICAgIGNsb25lLl9mb3JtYXQgPSB0aGlzLl9mb3JtYXQ7XG4gICAgICAgIGNsb25lLl91bmlxdWUgPSB0aGlzLl91bmlxdWU7XG4gICAgICAgIGNsb25lLl9taW5FbGVtZW50Q291bnQgPSB0aGlzLl9taW5FbGVtZW50Q291bnQ7XG4gICAgICAgIGNsb25lLl9tYXhFbGVtZW50Q291bnQgPSB0aGlzLl9tYXhFbGVtZW50Q291bnQ7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgZ2V0SnNvblNjaGVtYVByb3BlcnR5KCkge1xuICAgICAgICBjb25zdCBzY2hlbWEgPSBzdXBlci5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgc2NoZW1hLml0ZW1zID0gdGhpcy5lbGVtZW50VHlwZS5nZXRKc29uU2NoZW1hUHJvcGVydHkoKTtcbiAgICAgICAgaWYgKHRoaXMuX2Zvcm1hdClcbiAgICAgICAgICAgIHNjaGVtYS5mb3JtYXQgPSB0aGlzLl9mb3JtYXQ7XG4gICAgICAgIGlmICh0aGlzLl91bmlxdWUpXG4gICAgICAgICAgICBzY2hlbWEudW5pcXVlSXRlbXMgPSB0aGlzLl91bmlxdWU7XG4gICAgICAgIGlmICh0aGlzLl9taW5FbGVtZW50Q291bnQpXG4gICAgICAgICAgICBzY2hlbWEubWluSXRlbXMgPSB0aGlzLl9taW5FbGVtZW50Q291bnQ7XG4gICAgICAgIGlmICh0aGlzLl9tYXhFbGVtZW50Q291bnQpXG4gICAgICAgICAgICBzY2hlbWEubWF4SXRlbXMgPSB0aGlzLl9tYXhFbGVtZW50Q291bnQ7XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxuICAgIHRhYmxlKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX2Zvcm1hdCA9IFwidGFibGVcIjtcbiAgICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH1cbiAgICBtaW5FbGVtZW50cyhjb3VudCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX21pbkVsZW1lbnRDb3VudCA9IGNvdW50O1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfVxuICAgIG1heEVsZW1lbnRzKGNvdW50KSB7XG4gICAgICAgIGNvbnN0IGNsb25lID0gdGhpcy5jbG9uZSgpO1xuICAgICAgICBjbG9uZS5fbWF4RWxlbWVudENvdW50ID0gY291bnQ7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgdW5pcXVlKCkge1xuICAgICAgICBjb25zdCBjbG9uZSA9IHRoaXMuY2xvbmUoKTtcbiAgICAgICAgY2xvbmUuX3VuaXF1ZSA9IHRydWU7XG4gICAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9XG4gICAgaXNDb3JyZWN0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSBcIm9iamVjdFwiICYmIGlucHV0ICE9PSBudWxsICYmIEFycmF5LmlzQXJyYXkoaW5wdXQpO1xuICAgIH1cbiAgICBnZXRUeXBlTmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIGBhcnJheSBvZiAke3RoaXMuZWxlbWVudFR5cGUuZ2V0VHlwZU5hbWUoKX1gO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvcnJlY3RUeXBlKHBhdGgsIGlucHV0LCBlcnJvcnMpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudFR5cGVJbnRlcm5hbCA9IHRoaXMuZWxlbWVudFR5cGU7XG4gICAgICAgIGNvbnN0IHVzZWQgPSBuZXcgU2V0KCk7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWluRWxlbWVudENvdW50ID09PSBcIm51bWJlclwiICYmIGlucHV0Lmxlbmd0aCA8IHRoaXMuX21pbkVsZW1lbnRDb3VudCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYEFycmF5IG11c3QgY29udGFpbiBhdCBsZWFzdCAke3RoaXMuX21pbkVsZW1lbnRDb3VudH0gZWxlbWVudHMuYCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fbWF4RWxlbWVudENvdW50ID09PSBcIm51bWJlclwiICYmIGlucHV0Lmxlbmd0aCA+IHRoaXMuX21heEVsZW1lbnRDb3VudCkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgYEFycmF5IG11c3QgY29udGFpbiBhdCBtb3N0ICR7dGhpcy5fbWF4RWxlbWVudENvdW50fSBlbGVtZW50cy5gKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IGlucHV0W2ldO1xuICAgICAgICAgICAgZWxlbWVudFR5cGVJbnRlcm5hbC52YWxpZGF0ZUludGVybmFsKFsuLi5wYXRoLCBpLnRvU3RyaW5nKCldLCBlbGVtZW50LCBlcnJvcnMpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3VuaXF1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnN0cmluZ2lmeShlbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAodXNlZC5oYXMoanNvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFRzY2hWYWxpZGF0aW9uRXJyb3IocGF0aCwgXCJBbGwgdmFsdWVzIGhhdmUgdG8gYmUgdW5pcXVlLlwiKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHVzZWQuYWRkKGpzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0cy5Uc2NoQXJyYXkgPSBUc2NoQXJyYXk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1Uc2NoVHlwZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICBvW2syXSA9IG1ba107XG59KSk7XG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XG59KTtcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy50c2NoID0gdm9pZCAwO1xuY29uc3QgdHNjaCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiLi90c2NoXCIpKTtcbmV4cG9ydHMudHNjaCA9IHRzY2g7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuYXJyYXkgPSBleHBvcnRzLm9iamVjdCA9IGV4cG9ydHMuYm9vbGVhbiA9IGV4cG9ydHMubnVtYmVyID0gZXhwb3J0cy5zdHJpbmcgPSB2b2lkIDA7XG5jb25zdCBUc2NoVHlwZV8xID0gcmVxdWlyZShcIi4vVHNjaFR5cGVcIik7XG5mdW5jdGlvbiBzdHJpbmcoKSB7IHJldHVybiBuZXcgVHNjaFR5cGVfMS5Uc2NoU3RyaW5nKCk7IH1cbmV4cG9ydHMuc3RyaW5nID0gc3RyaW5nO1xuZnVuY3Rpb24gbnVtYmVyKCkgeyByZXR1cm4gbmV3IFRzY2hUeXBlXzEuVHNjaE51bWJlcigpOyB9XG5leHBvcnRzLm51bWJlciA9IG51bWJlcjtcbmZ1bmN0aW9uIGJvb2xlYW4oKSB7IHJldHVybiBuZXcgVHNjaFR5cGVfMS5Uc2NoQm9vbGVhbigpOyB9XG5leHBvcnRzLmJvb2xlYW4gPSBib29sZWFuO1xuZnVuY3Rpb24gb2JqZWN0KHNoYXBlKSB7XG4gICAgcmV0dXJuIG5ldyBUc2NoVHlwZV8xLlRzY2hPYmplY3Qoc2hhcGUpO1xufVxuZXhwb3J0cy5vYmplY3QgPSBvYmplY3Q7XG5mdW5jdGlvbiBhcnJheShlbGVtZW50VHlwZSkge1xuICAgIHJldHVybiBuZXcgVHNjaFR5cGVfMS5Uc2NoQXJyYXkoZWxlbWVudFR5cGUpO1xufVxuZXhwb3J0cy5hcnJheSA9IGFycmF5O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHNjaC5qcy5tYXAiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvd3d3L2luZGV4LnRzXCIpO1xuIiwiIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9