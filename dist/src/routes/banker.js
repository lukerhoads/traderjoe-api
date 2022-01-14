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
exports.BankerController = void 0;
const ethers_1 = require("ethers");
const express_1 = __importDefault(require("express"));
const constants_1 = require("../constants");
const provider_1 = require("../provider");
const util_1 = require("../util");
const Joetroller_json_1 = __importDefault(require("../../abi/Joetroller.json"));
const JToken_json_1 = __importDefault(require("../../abi/JToken.json"));
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
const JoetrollerContract = new ethers_1.ethers.Contract(constants_1.Address.JOETROLLER_ADDRESS, Joetroller_json_1.default, (0, provider_1.getRandomProvider)());
class BankerController {
    constructor(config, priceController) {
        this.markets = [];
        this.totalSupply = ethers_1.BigNumber.from('0');
        this.totalBorrow = ethers_1.BigNumber.from('0');
        this.cachedMarketSupply = {};
        this.cachedMarketBorrow = {};
        this.cachedUserSupply = {};
        this.cachedUserBorrow = {};
        this.cachedMarketSupplyApy = {};
        this.cachedMarketBorrowApy = {};
        this.cachedUserNetApy = {};
        this.config = config;
        this.priceController = priceController;
        this.jTokenContract = new ethers_1.ethers.Contract(constants_1.Address.JAVAX_ADDRESS, JToken_json_1.default, (0, provider_1.getRandomProvider)());
        this.underlyingContract = new ethers_1.ethers.Contract(constants_1.Address.WAVAX_ADDRESS, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
        this.hardRefreshInterval = setInterval(() => { });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const markets = yield JoetrollerContract.getAllMarkets();
            this.markets = markets.map((market) => market.toLowerCase());
            yield this.resetTotals();
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                this.clearCache();
                yield this.resetTotals();
            }), this.config.bankRefreshTimeout);
        });
    }
    clearCache() {
        this.cachedMarketSupply = {};
        this.cachedMarketBorrow = {};
        this.cachedUserSupply = {};
        this.cachedUserBorrow = {};
        this.cachedMarketSupplyApy = {};
        this.cachedMarketBorrowApy = {};
        this.cachedUserNetApy = {};
    }
    resetTotals() {
        return __awaiter(this, void 0, void 0, function* () {
            let tempTotalSupply = ethers_1.BigNumber.from('0');
            let tempTotalBorrow = ethers_1.BigNumber.from('0');
            yield Promise.all(this.markets.map((market) => __awaiter(this, void 0, void 0, function* () {
                const supplyByMarket = yield this.getSupplyByMarket(market);
                const borrowByMarket = yield this.getBorrowByMarket(market);
                tempTotalSupply = tempTotalSupply.add(supplyByMarket);
                tempTotalBorrow = tempTotalBorrow.add(borrowByMarket);
            })));
            this.totalSupply = tempTotalSupply;
            this.totalBorrow = tempTotalBorrow;
        });
    }
    getSupplyByMarket(marketAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.markets.includes(marketAddress.toLowerCase())) {
                throw new Error('Invalid market address provided.');
            }
            if (this.cachedMarketSupply[marketAddress]) {
                return this.cachedMarketSupply[marketAddress];
            }
            const customContract = this.jTokenContract.attach(marketAddress);
            const underlying = yield customContract.underlying();
            const jTokenTotalSupply = yield customContract.totalSupply();
            const exchangeRate = yield customContract.exchangeRateStored();
            const underlyingPrice = yield this.priceController.getPrice(underlying, false);
            const divideExp = 27 + exchangeRate.toString().length - 18;
            const divisor = (0, util_1.getMantissaBigNumber)(divideExp);
            const totalSupply = jTokenTotalSupply
                .mul(exchangeRate)
                .mul(underlyingPrice);
            this.cachedMarketSupply[marketAddress] = totalSupply.div(divisor);
            // Get borrow too, so we don't have to re-attach for the next borrow request
            const totalBorrow = yield customContract.totalBorrows();
            const adjustedBorrow = totalBorrow
                .mul(underlyingPrice)
                .div(constants_1.BigNumberMantissa);
            this.cachedMarketBorrow[marketAddress] = adjustedBorrow;
            return totalSupply.div(divisor);
        });
    }
    getBorrowByMarket(marketAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.markets.includes(marketAddress.toLowerCase())) {
                throw new Error('Invalid market address provided.');
            }
            if (this.cachedMarketBorrow[marketAddress]) {
                return this.cachedMarketBorrow[marketAddress];
            }
            const customContract = this.jTokenContract.attach(marketAddress);
            const underlying = yield customContract.underlying();
            const underlyingPrice = yield this.priceController.getPrice(underlying, false);
            const totalBorrows = yield customContract.totalBorrows();
            const adjustedBorrow = totalBorrows
                .mul(underlyingPrice)
                .div(constants_1.BigNumberMantissa);
            this.cachedMarketBorrow[marketAddress] = adjustedBorrow;
            return adjustedBorrow;
        });
    }
    getSupplyApyByMarket(marketAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.markets.includes(marketAddress.toLowerCase())) {
                throw new Error('Invalid market address provided.');
            }
            if (this.cachedMarketSupplyApy[marketAddress]) {
                return this.cachedMarketSupplyApy[marketAddress];
            }
            const customContract = this.jTokenContract.attach(marketAddress);
            const supplyRatePerSecond = yield customContract.supplyRatePerSecond();
            let rate = (0, util_1.rateToYear)({
                period: '1s',
                rate: supplyRatePerSecond,
            });
            this.cachedMarketSupplyApy[marketAddress] = rate;
            return rate;
        });
    }
    getBorrowApyByMarket(marketAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.markets.includes(marketAddress.toLowerCase())) {
                throw new Error('Invalid market address provided.');
            }
            if (this.cachedMarketBorrowApy[marketAddress]) {
                return this.cachedMarketBorrowApy[marketAddress];
            }
            const customContract = this.jTokenContract.attach(marketAddress);
            const borrowRatePerSecond = yield customContract.borrowRatePerSecond();
            let apr = (0, util_1.rateToYear)({
                period: '1s',
                rate: borrowRatePerSecond,
            });
            this.cachedMarketBorrowApy[marketAddress] = apr;
            return apr;
        });
    }
    getUserSupply(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedUserSupply[user]) {
                return this.cachedUserSupply[user];
            }
            const assetsIn = yield JoetrollerContract.getAssetsIn(user);
            if (!assetsIn) {
                throw new Error('User has not supplied any assets');
            }
            const totalSupplied = yield Promise.all(assetsIn.map((asset) => __awaiter(this, void 0, void 0, function* () {
                const customContract = this.jTokenContract.attach(asset);
                const suppliedAssets = yield customContract.balanceOf(user);
                if (suppliedAssets.eq(constants_1.BigNumberZero)) {
                    return;
                }
                const underlying = yield customContract.underlying();
                const exchangeRate = yield customContract.exchangeRateStored();
                const underlyingPrice = yield this.priceController.getPrice(underlying, false);
                const divideExp = 27 + exchangeRate.toString().length - 18;
                const divisor = (0, util_1.getMantissaBigNumber)(divideExp);
                const totalSupply = suppliedAssets
                    .mul(exchangeRate)
                    .mul(underlyingPrice);
                const totalSupplyConv = totalSupply.div(divisor);
                return totalSupplyConv;
            })));
            let userSupply = ethers_1.BigNumber.from('0');
            for (let i = 0; i < totalSupplied.length; i++) {
                userSupply = userSupply.add(totalSupplied[i]);
            }
            this.cachedUserSupply[user] = userSupply;
            return userSupply;
        });
    }
    getUserBorrow(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedUserBorrow[user]) {
                return this.cachedUserBorrow[user];
            }
            const assetsIn = yield JoetrollerContract.getAssetsIn(user);
            if (!assetsIn) {
                throw new Error('User has not borrowed any assets');
            }
            const totalBorrowed = yield Promise.all(assetsIn.map((asset) => __awaiter(this, void 0, void 0, function* () {
                const customContract = this.jTokenContract.attach(asset);
                const accountSnapshot = yield customContract.getAccountSnapshot(user);
                const borrowedAssets = accountSnapshot[2];
                const underlying = yield customContract.underlying();
                const underlyingPrice = yield this.priceController.getPrice(underlying, false);
                const customUnderlyingContract = this.underlyingContract.attach(underlying);
                const underlyingDecimals = yield customUnderlyingContract.decimals();
                const divisor = (0, util_1.getMantissaBigNumber)(underlyingDecimals);
                const totalBorrow = borrowedAssets
                    .mul(underlyingPrice)
                    .div(divisor);
                return totalBorrow;
            })));
            let userBorrow = ethers_1.BigNumber.from('0');
            for (let i = 0; i < totalBorrowed.length; i++) {
                userBorrow = userBorrow.add(totalBorrowed[i]);
            }
            this.cachedUserBorrow[user] = userBorrow;
            return userBorrow;
        });
    }
    getUserNetApy(user, period = '1y') {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedUserNetApy[user]) {
                return this.cachedUserNetApy[user];
            }
            const assetsIn = yield JoetrollerContract.getAssetsIn(user);
            if (!assetsIn) {
                throw new Error('User is not invested in any markets');
            }
            const allApys = yield Promise.all(assetsIn.map((asset) => __awaiter(this, void 0, void 0, function* () {
                const customContract = this.jTokenContract.attach(asset);
                const accountSnapshot = yield customContract.getAccountSnapshot(user);
                const borrowedAssets = accountSnapshot[2];
                if (!borrowedAssets.isZero()) {
                    const borrowApy = yield this.getBorrowApyByMarket(asset, period);
                    netApy = netApy.sub(borrowApy);
                }
                const suppliedAssets = yield customContract.balanceOf(user);
                if (!suppliedAssets.isZero()) {
                    const supplyApy = yield this.getSupplyApyByMarket(asset, period);
                    netApy = netApy.add(supplyApy);
                }
                return netApy;
            })));
            let netApy = ethers_1.BigNumber.from('0');
            for (let i = 0; i < allApys.length; i++) {
                netApy = netApy.add(allApys[i]);
            }
            this.cachedUserNetApy[user] = netApy;
            return netApy;
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        // Total supply and borrow across pools
        router.get('/supply', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            res.send((0, util_1.formatRes)(this.totalSupply.toString()));
        }));
        router.get('/borrow', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            res.send((0, util_1.formatRes)(this.totalBorrow.toString()));
        }));
        // Total supply and borrow across one pool
        router.get('/supply/:marketAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const marketAddress = req.params.marketAddress.toLowerCase();
            try {
                const supplyByMarket = yield this.getSupplyByMarket(marketAddress);
                const supplyByMarketString = supplyByMarket.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(supplyByMarketString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/borrow/:marketAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const marketAddress = req.params.marketAddress.toLowerCase();
            try {
                const borrowByMarket = yield this.getBorrowByMarket(marketAddress);
                const borrowByMarketString = borrowByMarket.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(borrowByMarketString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/supply/:marketAddress/apy', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const marketAddress = req.params.marketAddress.toLowerCase();
            const period = req.query.period;
            try {
                const supplyApy = yield this.getSupplyApyByMarket(marketAddress, period);
                const supplyApyString = supplyApy.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(supplyApyString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        // Supply and borrow APY for a single market
        router.get('/borrow/:marketAddress/apy', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const marketAddress = req.params.marketAddress.toLowerCase();
            const period = req.query.period;
            try {
                const borrowApy = yield this.getBorrowApyByMarket(marketAddress, period);
                const borrowApyString = borrowApy.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(borrowApyString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/supply/user/:userAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const user = req.params.userAddress.toLowerCase();
            try {
                const supply = yield this.getUserSupply(user);
                const supplyString = supply.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(supplyString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        // Supply and borrow APY for an individual user
        router.get('/borrow/user/:userAddress', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const user = req.params.userAddress.toLowerCase();
            try {
                const borrow = yield this.getUserBorrow(user);
                const borrowString = borrow.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(borrowString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/:userAddress/net/apy', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const userAddress = req.params.userAddress.toLowerCase();
            const period = req.query.period;
            try {
                const netApy = yield this.getUserNetApy(userAddress, period);
                const netApyString = netApy.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(netApyString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        return router;
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.hardRefreshInterval);
        });
    }
}
exports.BankerController = BankerController;
//# sourceMappingURL=banker.js.map