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
exports.PairController = void 0;
const express_1 = __importDefault(require("express"));
const core_1 = require("@apollo/client/core");
const queries_1 = require("../queries");
const constants_1 = require("../constants");
const ethers_1 = require("ethers");
const provider_1 = require("../provider");
const util_1 = require("../util");
const JoePair_json_1 = __importDefault(require("../../abi/JoePair.json"));
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
class PairController {
    constructor(config, priceController) {
        this.config = config;
        this.priceController = priceController;
        this.chefGraphClient = new core_1.ApolloClient({
            uri: config.masterChefGraphUrl,
            cache: new core_1.InMemoryCache(),
        });
        this.exchangeGraphClient = new core_1.ApolloClient({
            uri: config.exchangeGraphUrl,
            cache: new core_1.InMemoryCache(),
        });
        this.pairContract = new ethers_1.ethers.Contract(constants_1.Address.WAVAX_USDC_ADDRESS, JoePair_json_1.default, (0, provider_1.getRandomProvider)());
        this.tokenContract = new ethers_1.ethers.Contract(constants_1.Address.WAVAX_ADDRESS, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
        this.hardRefreshInterval = setInterval(() => { });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () { }), this.config.poolRefreshTimeout);
        });
    }
    topPairAddresses() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { pools }, } = yield this.chefGraphClient.query({
                query: queries_1.poolsQuery,
            });
            return pools.map((pool) => pool.pair);
        });
    }
    getPairLiquidity(pairAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            // Somehow validate that pairAddress is a valid pair
            const customContract = this.pairContract.attach(pairAddress);
            const reserves = yield customContract.getReserves();
            const token0 = yield customContract.token0();
            const token1 = yield customContract.token1();
            const token0Contract = this.tokenContract.attach(token0);
            const token1Contract = this.tokenContract.attach(token1);
            const token0Decimals = yield token0Contract.decimals();
            const token1Decimals = yield token1Contract.decimals();
            const token0Price = yield this.priceController.getPrice(token0, false);
            const token1Price = yield this.priceController.getPrice(token1, false);
            const token0Tvl = reserves[0]
                .mul(token0Price)
                .div((0, util_1.getMantissaBigNumber)(token0Decimals));
            const token1Tvl = reserves[1]
                .mul(token1Price)
                .div((0, util_1.getMantissaBigNumber)(token1Decimals));
            return token0Tvl.add(token1Tvl);
        });
    }
    // Need to make this contract stuff
    getPairVolume(pairAddress, period = '1d') {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: pairData } = yield this.exchangeGraphClient.query({
                query: queries_1.pairByAddress,
                variables: {
                    id: pairAddress,
                },
            });
            const pair = pairData.pair;
            const blocks = yield (0, util_1.getBlocks)(period);
            if (!blocks.length) {
                throw new Error('No data for that time period');
            }
            const blockNumber = Number(blocks[0].number);
            const { data: { pair: periodPair }, } = yield this.exchangeGraphClient.query({
                query: queries_1.pairTimeTravelQuery,
                variables: {
                    block: {
                        number: blockNumber,
                    },
                    pairAddress: pairAddress,
                },
                fetchPolicy: 'no-cache',
            });
            const volumeUSD = pair.volumeUSD === '0' ? pair.untrackedVolumeUSD : pair.volumeUSD;
            const periodVolumeUSD = periodPair.volumeUSD === '0'
                ? periodPair.untrackedVolumeUSD
                : periodPair.volumeUSD;
            const volumeUSDBn = (0, util_1.stringToBn)(volumeUSD, 18);
            const periodVolumeUSDBn = (0, util_1.stringToBn)(periodVolumeUSD, 18);
            return volumeUSDBn.sub(periodVolumeUSDBn);
        });
    }
    getPairFees(pairAddress, period = '1d') {
        return __awaiter(this, void 0, void 0, function* () {
            const pairVolume = yield this.getPairVolume(pairAddress, period);
            return pairVolume.mul(constants_1.FEE_RATE).div(constants_1.BigNumberMantissa);
        });
    }
    getPairApr(pairAddress, samplePeriod = '1d') {
        return __awaiter(this, void 0, void 0, function* () {
            // Move away from 1d hardcode
            const pairFees = yield this.getPairFees(pairAddress, samplePeriod);
            const pairLiquidity = yield this.getPairLiquidity(pairAddress);
            // Scale factor is 12 right now, this means that
            // we only fetch one month fees right now (because Avalanche has not been live for over a year)
            // return pairFees.mul(365).div(pairLiquidityNumber)
            return pairFees.mul(constants_1.BigNumberMantissa).div(pairLiquidity);
        });
    }
    getPairAprGraph(pairAddress, samplePeriod = '1d') {
        return __awaiter(this, void 0, void 0, function* () {
            // This is unnecessary, find how to optimize this with cache
            const { data: pairData } = yield this.exchangeGraphClient.query({
                query: queries_1.pairByAddress,
                variables: {
                    id: pairAddress,
                },
            });
            const pair = pairData.pair;
            const periodFees = yield this.getPairFees(pairAddress, samplePeriod);
            const reserveUSD = (0, util_1.stringToBn)(pair.reserveUSD, 18);
            return periodFees.mul(constants_1.BigNumberMantissa).div(reserveUSD);
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        router.get('/:pairAddress/liquidity', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const pairAddress = req.params.pairAddress.toLowerCase();
            try {
                const pairTvl = yield this.getPairLiquidity(pairAddress);
                const pairTvlString = pairTvl.toString();
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(pairTvlString, 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        // Query params for period
        router.get('/:pairAddress/volume', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const pairAddress = req.params.pairAddress.toLowerCase();
            const period = req.query.period;
            try {
                const pairVolume = yield this.getPairVolume(pairAddress, period);
                res.send((0, util_1.formatRes)(pairVolume.toString()));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/:pairAddress/fees', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const pairAddress = req.params.pairAddress.toLowerCase();
            const period = req.query.period;
            try {
                const feesCollected = yield this.getPairFees(pairAddress, period);
                res.send((0, util_1.formatRes)(feesCollected.toString()));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/:pairAddress/apr', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const pairAddress = req.params.pairAddress.toLowerCase();
            const samplePeriod = req.query.period;
            try {
                const poolApr = yield this.getPairAprGraph(pairAddress, samplePeriod);
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(poolApr.toString(), 18)));
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
exports.PairController = PairController;
//# sourceMappingURL=pair.js.map