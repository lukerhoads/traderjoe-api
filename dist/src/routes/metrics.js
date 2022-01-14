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
exports.MetricsController = void 0;
const ethers_1 = require("ethers");
const express_1 = __importDefault(require("express"));
const core_1 = require("@apollo/client/core");
const queries_1 = require("../queries");
const constants_1 = require("../constants");
const provider_1 = require("../provider");
const units_1 = require("@ethersproject/units");
const util_1 = require("../util");
const Joetroller_json_1 = __importDefault(require("../../abi/Joetroller.json"));
const JToken_json_1 = __importDefault(require("../../abi/JToken.json"));
const JoetrollerContract = new ethers_1.ethers.Contract(constants_1.Address.JOETROLLER_ADDRESS, Joetroller_json_1.default, (0, provider_1.getRandomProvider)());
class MetricsController {
    constructor(config, priceController) {
        this.tvl = ethers_1.BigNumber.from('0');
        this.cachedVolume = {};
        this.config = config;
        this.exchangeGraphClient = new core_1.ApolloClient({
            uri: config.exchangeGraphUrl,
            cache: new core_1.InMemoryCache(),
        });
        this.priceController = priceController;
        this.hardRefreshInterval = setInterval(() => { });
    }
    // Event subscriptions
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.resetMetrics();
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.resetMetrics();
            }), this.config.metricsRefreshTimeout);
        });
    }
    resetMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [tvl] = yield Promise.all([this.getTvl()]);
            this.tvl = tvl;
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        router.get('/tvl', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const tvlString = this.tvl.toString();
            res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(tvlString, 18)));
        }));
        router.get('/volume', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const period = req.query.period;
            const volume = yield this.getVolume(period);
            res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(volume.toString(), 18)));
        }));
        return router;
    }
    getTvl() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { factories }, } = yield this.exchangeGraphClient.query({
                query: queries_1.getExchangeTvlQuery,
            });
            const split = factories[0].liquidityUSD.split('.');
            const divideExp = split[1].length - 18;
            const bnDivisor = (0, util_1.getMantissaBigNumber)(divideExp);
            const exchangeTvl = (0, units_1.parseUnits)(factories[0].liquidityUSD, split[1].length).div(bnDivisor);
            const markets = yield JoetrollerContract.getAllMarkets();
            const jTokenContract = new ethers_1.ethers.Contract(markets[0], JToken_json_1.default, (0, provider_1.getRandomProvider)());
            // const locked = BigNumber.from("0")
            const totalSupplies = yield Promise.all(markets.map((market) => __awaiter(this, void 0, void 0, function* () {
                const customContract = jTokenContract.attach(market);
                const underlying = yield customContract.underlying();
                const jTokenTotalSupply = yield customContract.totalSupply();
                const exchangeRate = yield customContract.exchangeRateStored();
                const underlyingPrice = yield this.priceController.getPrice(underlying, false);
                const divideExp = 27 + exchangeRate.toString().length - 18;
                const divisor = (0, util_1.getMantissaBigNumber)(divideExp);
                const totalSupply = jTokenTotalSupply
                    .mul(exchangeRate)
                    .mul(underlyingPrice);
                const totalSupplyConv = totalSupply.div(divisor);
                return totalSupplyConv;
            })));
            let marketTvl = ethers_1.BigNumber.from('0');
            for (let i = 0; i < totalSupplies.length; i++) {
                marketTvl = marketTvl.add(totalSupplies[i]);
            }
            return exchangeTvl.add(marketTvl);
        });
    }
    getVolume(period = '1d') {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedVolume[period]) {
                return this.cachedVolume[period];
            }
            if (period === '1d') {
                const { data: { dayDatas }, } = yield this.exchangeGraphClient.query({
                    query: queries_1.lastDayVolume,
                });
                return (0, util_1.stringToBn)(dayDatas[0].volumeUSD, 18);
            }
            let dayMultiplier = 1;
            switch (period) {
                case '1s':
                    throw new Error('Unable to get one second data');
                case '1m':
                    throw new Error('Unable to get one minute data');
                case '1h':
                    // This hourdata entity query isn't working
                    // const { data: { hourDatas } } = await this.exchangeGraphClient.query({
                    //     query: lastHourVolumeQuery,
                    // })
                    // return stringToBn(hourDatas[0].volumeUSD, 18)
                    throw new Error('Unable to get hour data');
                case '1w':
                    dayMultiplier = 7;
                case '1mo':
                    dayMultiplier = 30;
                case '1y':
                    dayMultiplier = 365;
            }
            const { data: { dayDatas }, } = yield this.exchangeGraphClient.query({
                query: queries_1.volumeOverTimeQuery,
                variables: { days: dayMultiplier },
            });
            let volumeSum = ethers_1.BigNumber.from('0');
            for (let dayData of dayDatas) {
                volumeSum = volumeSum.add((0, util_1.stringToBn)(dayData.volumeUSD, 18));
            }
            return volumeSum;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.hardRefreshInterval);
        });
    }
}
exports.MetricsController = MetricsController;
//# sourceMappingURL=metrics.js.map