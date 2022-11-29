"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
var tsch_1 = require("tsch");
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
