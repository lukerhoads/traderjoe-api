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
exports.PriceController = void 0;
const express_1 = __importDefault(require("express"));
const provider_1 = require("../provider");
const constants_1 = require("../constants");
const ethers_1 = require("ethers");
const JoeBar_json_1 = __importDefault(require("../../abi/JoeBar.json"));
const JoeFactory_json_1 = __importDefault(require("../../abi/JoeFactory.json"));
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
const util_1 = require("../util");
const JoeFactoryContract = new ethers_1.ethers.Contract(constants_1.Address.JOE_FACTORY_ADDRESS, JoeFactory_json_1.default, (0, provider_1.getRandomProvider)());
const XJoeContract = new ethers_1.ethers.Contract(constants_1.Address.XJOE_ADDRESS, JoeBar_json_1.default, (0, provider_1.getRandomProvider)());
const JoeContract = new ethers_1.ethers.Contract(constants_1.Address.JOE_ADDRESS, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
class PriceController {
    constructor(config) {
        this.config = config;
        this.hardRefreshInterval = setInterval(() => { });
        this.pairs = {};
        this.decimals = {};
        this.contracts = {};
        this.cachedPrices = {};
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getAvaxPrice();
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                // Set this to empty because these change often
                this.cachedPrices = {};
                yield this.getAvaxPrice();
            }), this.config.priceRefreshTimeout);
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        // Query param or part of url?
        router.get('/usd/:tokenAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const tokenAddress = req.params.tokenAddress.toLowerCase();
            try {
                const tokenPrice = yield this.getPrice(tokenAddress, false);
                const tokenPriceString = tokenPrice.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(tokenPriceString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/avax/:tokenAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const tokenAddress = req.params.tokenAddress.toLowerCase();
            try {
                const tokenPrice = yield this.getPrice(tokenAddress, true);
                const tokenPriceString = tokenPrice.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(tokenPriceString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        return router;
    }
    getAvaxPair(tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pairs[tokenAddress]) {
                return this.pairs[tokenAddress];
            }
            const pairAddress = yield PriceController.getPairAddress(tokenAddress, constants_1.Address.WAVAX_ADDRESS);
            if (!pairAddress || pairAddress === constants_1.Address.ZERO_ADDRESS) {
                return undefined;
            }
            this.pairs[tokenAddress] = pairAddress;
            return pairAddress;
        });
    }
    getDecimals(tokenAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.decimals[tokenAddress]) {
                return this.decimals[tokenAddress];
            }
            const tokenContract = this.getContract(tokenAddress);
            const decimals = yield tokenContract.decimals();
            this.decimals[tokenAddress] = decimals;
            return decimals;
        });
    }
    getContract(tokenAddress) {
        if (this.contracts[tokenAddress]) {
            return this.contracts[tokenAddress];
        }
        const contract = new ethers_1.ethers.Contract(tokenAddress, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
        this.contracts[tokenAddress] = contract;
        return contract;
    }
    getAvaxPrice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPrices[constants_1.Address.WAVAX_ADDRESS]) {
                return this.cachedPrices[constants_1.Address.WAVAX_ADDRESS];
            }
            const reserves = yield Promise.all([
                this.getReserves(constants_1.Address.WAVAX_ADDRESS, constants_1.Address.USDC_ADDRESS, constants_1.Address.WAVAX_USDC_ADDRESS),
                this.getReserves(constants_1.Address.WAVAX_ADDRESS, constants_1.Address.USDT_ADDRESS, constants_1.Address.WAVAX_USDT_ADDRESS),
            ]);
            const usdcPrice = reserves[0][1]
                .mul(constants_1.BigNumberMantissa)
                .div(reserves[0][0]);
            const usdtPrice = reserves[1][1]
                .mul(constants_1.BigNumberMantissa)
                .div(reserves[1][0]);
            const avaxPrice = usdcPrice.add(usdtPrice).div(ethers_1.BigNumber.from('2'));
            this.cachedPrices[constants_1.Address.WAVAX_ADDRESS] = avaxPrice;
            return avaxPrice;
        });
    }
    getXJoePrice(derived) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPrices[constants_1.Address.XJOE_ADDRESS]) {
                return this.cachedPrices[constants_1.Address.XJOE_ADDRESS];
            }
            const joeBalance = yield JoeContract.balanceOf(constants_1.Address.XJOE_ADDRESS);
            const totalSupply = yield XJoeContract.totalSupply();
            const ratio = totalSupply.mul(constants_1.BigNumberMantissa).div(joeBalance);
            const joePrice = yield this.getPrice(constants_1.Address.JOE_ADDRESS, derived);
            const xJoePrice = joePrice.mul(ratio).div(constants_1.BigNumberMantissa);
            this.cachedPrices[constants_1.Address.XJOE_ADDRESS] = xJoePrice;
            return xJoePrice;
        });
    }
    getPrice(tokenAddress, derived // whether or not to compare against AVAX
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            tokenAddress = tokenAddress.toLowerCase();
            if (tokenAddress === constants_1.Address.WAVAX_ADDRESS) {
                return this.getAvaxPrice();
            }
            if (tokenAddress === constants_1.Address.XJOE_ADDRESS) {
                return this.getXJoePrice(derived);
            }
            if (this.cachedPrices[tokenAddress]) {
                if (derived) {
                    return this.cachedPrices[tokenAddress];
                }
                const avaxPrice = yield this.getAvaxPrice();
                return this.cachedPrices[tokenAddress]
                    .mul(avaxPrice)
                    .div(constants_1.BigNumberMantissa);
            }
            const pairAddress = yield this.getAvaxPair(tokenAddress);
            if (!pairAddress) {
                throw new Error(`Error given address ${tokenAddress}, isn't paired with WAVAX on TraderJoe`);
            }
            // Gets price in AVAX
            const reserve = yield this.getReserves(constants_1.Address.WAVAX_ADDRESS, tokenAddress, pairAddress);
            // Gets JOE price in AVAX
            const derivedPrice = reserve[0].mul(constants_1.BigNumberMantissa).div(reserve[1]);
            this.cachedPrices[tokenAddress] = derivedPrice;
            if (derived)
                return derivedPrice;
            const avaxPrice = yield this.getAvaxPrice();
            // DerivedPrice is relative to AVAX, avaxPrice is amount of dollars in an avax
            const price = derivedPrice.mul(avaxPrice).div(constants_1.BigNumberMantissa);
            return price;
        });
    }
    getReserves(token0Address, token1Address, pairAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const decimals = yield Promise.all([
                this.getDecimals(token0Address),
                this.getDecimals(token1Address),
            ]);
            // Fix code quality here
            let token0BalanceMultiplier = ethers_1.BigNumber.from('0');
            let token1BalanceMultiplier = ethers_1.BigNumber.from('0');
            if (decimals[0].toString() !== decimals[1].toString()) {
                if (decimals[0] > decimals[1]) {
                    token1BalanceMultiplier = ethers_1.BigNumber.from(decimals[0] - decimals[1]);
                }
                else {
                    token0BalanceMultiplier = ethers_1.BigNumber.from(decimals[1] - decimals[0]);
                }
            }
            const token0Contract = this.getContract(token0Address);
            const token0Balance = yield token0Contract.balanceOf(pairAddress);
            const token1Contract = this.getContract(token1Address);
            const token1Balance = yield token1Contract.balanceOf(pairAddress);
            const bn10 = ethers_1.BigNumber.from('10');
            return [
                token0Balance.mul(bn10.pow(token0BalanceMultiplier)),
                token1Balance.mul(bn10.pow(token1BalanceMultiplier)),
            ];
        });
    }
    static getPairAddress(token0, token1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (token0 && token1) {
                if (token0 > token1) {
                    return JoeFactoryContract.getPair(token0, token1);
                }
                else {
                    return JoeFactoryContract.getPair(token1, token0);
                }
            }
            return undefined;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.hardRefreshInterval);
        });
    }
}
exports.PriceController = PriceController;
//# sourceMappingURL=price.js.map