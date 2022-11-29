"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = void 0;
var Schemas = /** @class */ (function () {
    function Schemas() {
    }
    Schemas.load = function () {
        if (!!Schemas.schemas)
            return;
        Schemas.schemas = [];
    };
    Schemas.schemas = undefined;
    return Schemas;
}());
exports.Schemas = Schemas;
