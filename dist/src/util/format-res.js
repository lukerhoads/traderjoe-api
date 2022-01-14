"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRes = void 0;
const config_1 = require("../config");
const formatRes = (data, error) => {
    return {
        data: data,
        status: {
            timestamp: Date.now().toString(),
            error_code: error === null || error === void 0 ? void 0 : error.errorCode,
            error_message: error === null || error === void 0 ? void 0 : error.errorMessage,
            error_trace: config_1.isProd ? error === null || error === void 0 ? void 0 : error.errorTrace : undefined,
        },
    };
};
exports.formatRes = formatRes;
//# sourceMappingURL=format-res.js.map