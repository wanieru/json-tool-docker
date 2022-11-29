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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
var FsWrap_1 = require("./Utils/FsWrap");
var tsch_1 = require("tsch");
var Schema = /** @class */ (function () {
    function Schema(schemaFile, name, jsonSchema, tsch) {
        this.schemaFile = schemaFile;
        this.regex = Schema.getRegex(name);
        this.jsonSchema = jsonSchema;
        this.tsch = tsch;
    }
    Schema.prototype.getSchemaFile = function () {
        return this.schemaFile;
    };
    Schema.prototype.getJsons = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, FsWrap_1.FsWrap.getAllFilesInDir("./jsons", this.regex)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Schema.prototype.getJson = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var json, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, FsWrap_1.FsWrap.loadFile(file)];
                    case 1:
                        json = _a.sent();
                        return [2 /*return*/, JSON.parse(json)];
                    case 2:
                        e_1 = _a.sent();
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Schema.prototype.setJson = function (file, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getJsons()];
                    case 1:
                        if (!(_a.sent()).includes(file))
                            return [2 /*return*/];
                        return [4 /*yield*/, FsWrap_1.FsWrap.saveFile(file, JSON.stringify(value, null, 3))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
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
    Schema.getSchemas = function (files) {
        return __awaiter(this, void 0, void 0, function () {
            var result, schemaFiles;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = [];
                        return [4 /*yield*/, FsWrap_1.FsWrap.getAllFilesInDir("./schemas", /\.js$/)];
                    case 1:
                        schemaFiles = _a.sent();
                        if (!!files) {
                            schemaFiles = schemaFiles.filter(function (s) { return files.includes(s); });
                        }
                        return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                                var _loop_1, _i, schemaFiles_1, file;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _loop_1 = function (file) {
                                                var addJsonSchema, addTsch, tsch, content;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            addJsonSchema = function (name, jsonSchema) { return Schema.addJsonSchema(result, file, name, jsonSchema); };
                                                            addTsch = function (name, tsch) { return Schema.addTsch(result, file, name, tsch); };
                                                            tsch = tsch_1.tsch;
                                                            return [4 /*yield*/, FsWrap_1.FsWrap.loadFile(file)];
                                                        case 1:
                                                            content = _b.sent();
                                                            try {
                                                                "use strict";
                                                                eval(content);
                                                            }
                                                            catch (e) {
                                                                console.warn("Exception during ".concat(file), e);
                                                            }
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            _i = 0, schemaFiles_1 = schemaFiles;
                                            _a.label = 1;
                                        case 1:
                                            if (!(_i < schemaFiles_1.length)) return [3 /*break*/, 4];
                                            file = schemaFiles_1[_i];
                                            return [5 /*yield**/, _loop_1(file)];
                                        case 2:
                                            _a.sent();
                                            _a.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); })()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    Schema.getRegex = function (name) {
        return new RegExp("^" + name.split("*")
            .map(function (s) { return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); })
            .join(".*") + "$");
    };
    Schema.addJsonSchema = function (schemas, schemaFile, name, jsonSchema) {
        schemas.push(new Schema(schemaFile, name, jsonSchema));
    };
    Schema.addTsch = function (schemas, schemaFile, name, tsch) {
        schemas.push(new Schema(schemaFile, name, undefined, tsch));
    };
    return Schema;
}());
exports.Schema = Schema;
