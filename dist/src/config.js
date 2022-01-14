"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProd = void 0;
require("dotenv/config");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
exports.isProd = process.env.NODE_ENV === 'production';
const opConfig = {
    version: '/v1',
    lendingGraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending',
    exchangeGraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange',
    masterChefGraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/masterchefv3',
    supplyRefreshTimeout: 60000,
    priceRefreshTimeout: 60000,
    bankRefreshTimeout: 60000,
    metricsRefreshTimeout: 60000,
    poolRefreshTimeout: 60000,
    stakeRefreshTimeout: 60000,
    temporalRefreshTimeout: 9e4, // About a day
};
class Config {
    // Sensitive information declared here, with env variables
    constructor() {
        this.opConfig = opConfig;
        dotenv.config({ path: path.join(__dirname, '/.env') });
    }
    get opCfg() {
        return this.opConfig;
    }
    get config() {
        return Object.assign(Object.assign({}, this.opConfig), { host: process.env.HOST || 'localhost', port: parseInt(process.env.PORT || '') || 3000 });
    }
}
exports.default = Config;
//# sourceMappingURL=config.js.map