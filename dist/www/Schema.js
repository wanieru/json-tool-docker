"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
var tsch_1 = require("tsch");
var ajv_1 = __importDefault(require("ajv"));
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
