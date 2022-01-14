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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplyController = void 0;
const ethers_1 = require("ethers");
const express_1 = __importDefault(require("express"));
const provider_1 = require("../provider");
const constants_1 = require("../constants");
const util_1 = require("../util");
const JoeToken_json_1 = __importDefault(require("../../abi/JoeToken.json"));
const JoeContract = new ethers_1.ethers.Contract(constants_1.Address.JOE_ADDRESS, JoeToken_json_1.default, (0, provider_1.getRandomProvider)());
const burnFilter = JoeContract.filters.Transfer(null, constants_1.Address.BURN_ADDRESS);
// I think there could be a better design for TVL, where we initially get it and then
// listen for Ethers events
class SupplyController {
    constructor(config) {
        this.config = config;
        this.hardRefreshInterval = setInterval(() => { });
        this.circulatingSupply = ethers_1.BigNumber.from('0');
        this.maxSupply = ethers_1.BigNumber.from('0');
        this.totalSupply = ethers_1.BigNumber.from('0');
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.resetMetrics();
            // Subscribe to burn events or other TVL changing events
            JoeContract.on(burnFilter, (from, to, value) => {
                const bnValue = ethers_1.BigNumber.from(value);
                this.totalSupply.sub(bnValue);
            });
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.resetMetrics();
            }), this.config.supplyRefreshTimeout);
        });
    }
    resetMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalSupply, maxSupply, circulatingSupply] = yield Promise.all([
                this.getTotalSupply(),
                this.getCirculatingSupply(),
                this.getMaxSupply(),
            ]);
            this.totalSupply = totalSupply;
            this.maxSupply = maxSupply;
            this.circulatingSupply = circulatingSupply;
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        // Deprecate this endpoint, completely pointless
        router.get('/circulating', (req, res, next) => {
            res.send((0, util_1.formatRes)(this.circulatingSupply.toString()));
        });
        router.get('/circulating-adjusted', (req, res, next) => {
            res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(this.circulatingSupply.toString(), 18)));
        });
        router.get('/total', (req, res, next) => {
            res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(this.totalSupply.toString(), 18)));
        });
        router.get('/max', (req, res, next) => {
            res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(this.maxSupply.toString(), 18)));
        });
        return router;
    }
    getTotalSupply() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalSupply = ethers_1.BigNumber.from(yield JoeContract.totalSupply());
            const burnSupply = ethers_1.BigNumber.from(yield JoeContract.balanceOf(constants_1.Address.BURN_ADDRESS));
            return totalSupply.sub(burnSupply);
        });
    }
    // This is capped at 500 million. Should we really re fetch this? If this changes, making
    // a simple change to the hardcoded value would probably be better.
    getMaxSupply() {
        return __awaiter(this, void 0, void 0, function* () {
            const maxSupply = yield JoeContract.maxSupply();
            return maxSupply;
        });
    }
    getCirculatingSupply() {
        return __awaiter(this, void 0, void 0, function* () {
            const teamTreasurySupply = yield Promise.all(constants_1.Address.TEAM_TREASURY_WALLETS.map((address) => JoeContract.balanceOf(address).then((balance) => balance)));
            const totalSupply = yield this.getTotalSupply();
            teamTreasurySupply.forEach((supply) => totalSupply.sub(supply));
            return totalSupply;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.hardRefreshInterval);
        });
    }
}
exports.SupplyController = SupplyController;
//# sourceMappingURL=supply.js.map