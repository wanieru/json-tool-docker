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
exports.Client = void 0;
var ServerUtils_1 = require("./ServerUtils");
var JsonTool_1 = require("json-tool/js/JsonTool");
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
