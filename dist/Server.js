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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
var express = __importStar(require("express"));
var hat_1 = __importDefault(require("hat"));
var SchemaUtils_1 = require("./SchemaUtils");
var Server = /** @class */ (function () {
    function Server(port) {
        var _this = this;
        this.express = express.default();
        this.express.use(express.json());
        this.express.listen(port, function () { return console.log("Listening on port ".concat(port)); });
        this.express.post('/api', function (req, res) { return _this.api(req, res); });
        this.express.use('/', express.static("www"));
        this.setupErrorHandlers();
    }
    Server.prototype.setupErrorHandlers = function () {
        this.express.use(function errorHandler(err, req, res, next) {
            var code = (0, hat_1.default)();
            console.error(code, "\n", err);
            res.status(400).send({ "message": "Something went wrong! Error code ".concat(code) });
        });
    };
    Server.prototype.api = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var json, no, ok, files, schemas, _i, schemas_1, schema, arr, jsons, _a, jsons_1, json_1, schemas, schema, value, schemas, schema;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        json = req.body;
                        no = function (json) {
                            if (json === void 0) { json = {}; }
                            res.status(400);
                            res.json(json);
                        };
                        ok = function (json) {
                            if (json === void 0) { json = {}; }
                            res.status(200);
                            res.json(json);
                        };
                        if (!json.command)
                            return [2 /*return*/, no({ msg: "Missing arg command!" })];
                        if (!(json.command === "list")) return [3 /*break*/, 6];
                        files = {};
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.getSchemas()];
                    case 1:
                        schemas = _b.sent();
                        _i = 0, schemas_1 = schemas;
                        _b.label = 2;
                    case 2:
                        if (!(_i < schemas_1.length)) return [3 /*break*/, 5];
                        schema = schemas_1[_i];
                        arr = [];
                        files[schema.getSchemaFile()] = arr;
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.getJsons(schema)];
                    case 3:
                        jsons = _b.sent();
                        for (_a = 0, jsons_1 = jsons; _a < jsons_1.length; _a++) {
                            json_1 = jsons_1[_a];
                            arr.push(json_1);
                        }
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, ok({ schemas: files })];
                    case 6:
                        if (!(json.command === "load")) return [3 /*break*/, 10];
                        if (typeof json.schema !== "string")
                            return [2 /*return*/, no()];
                        if (typeof json.json !== "string")
                            return [2 /*return*/, no()];
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.getSchemas([json.schema])];
                    case 7:
                        schemas = _b.sent();
                        if (schemas.length < 1)
                            return [2 /*return*/, no({ msg: "Unknown schema..." })];
                        schema = schemas[0];
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.hasJson(schema, json.json)];
                    case 8:
                        if (!(_b.sent()))
                            return [2 /*return*/, no({ msg: "Unknown json file..." })];
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.getJson(schema, json.json)];
                    case 9:
                        value = _b.sent();
                        return [2 /*return*/, ok({ schemaContent: schema.getSchemaContent(), value: value })];
                    case 10:
                        if (!(json.command === "save")) return [3 /*break*/, 14];
                        if (typeof json.schema !== "string")
                            return [2 /*return*/, no({ msg: "Missing arg schema" })];
                        if (typeof json.json !== "string")
                            return [2 /*return*/, no({ msg: "Missing arg string" })];
                        if (typeof json.value === "undefined")
                            return [2 /*return*/, no({ msg: "Missing arg value" })];
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.getSchemas([json.schema])];
                    case 11:
                        schemas = _b.sent();
                        if (schemas.length < 1)
                            return [2 /*return*/, no({ msg: "Unkonwn schema" })];
                        schema = schemas[0];
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.hasJson(schema, json.json)];
                    case 12:
                        if (!(_b.sent()))
                            return [2 /*return*/, no({ msg: "Unknown json file..." })];
                        if (!schema.validate(json.value).valid)
                            no({ msg: "Value isn't valid..." });
                        return [4 /*yield*/, SchemaUtils_1.SchemaUtils.setJson(schema, json.json, json.value)];
                    case 13:
                        _b.sent();
                        return [2 /*return*/, ok()];
                    case 14: return [2 /*return*/, no()];
                }
            });
        });
    };
    return Server;
}());
exports.Server = Server;
