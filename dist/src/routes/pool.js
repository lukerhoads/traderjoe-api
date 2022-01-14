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
exports.PoolController = void 0;
const express_1 = __importDefault(require("express"));
const core_1 = require("@apollo/client/core");
const ethers_1 = require("ethers");
const constants_1 = require("../constants");
const provider_1 = require("../provider");
const queries_1 = require("../queries");
const util_1 = require("../util");
const MasterChef_json_1 = __importDefault(require("../../abi/MasterChef.json"));
const JoePair_json_1 = __importDefault(require("../../abi/JoePair.json"));
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
const SimpleRewarder_json_1 = __importDefault(require("../../abi/SimpleRewarder.json"));
const JoeFactory_json_1 = __importDefault(require("../../abi/JoeFactory.json"));
const JoeLPToken_json_1 = __importDefault(require("../../abi/JoeLPToken.json"));
const MasterChefContract = new ethers_1.ethers.Contract(constants_1.Address.JOE_MASTER_CHEF_ADDRESS, MasterChef_json_1.default, (0, provider_1.getRandomProvider)());
const JoeFactoryContract = new ethers_1.ethers.Contract(constants_1.Address.JOE_FACTORY_ADDRESS, JoeFactory_json_1.default, (0, provider_1.getRandomProvider)());
class PoolController {
    constructor(config, priceController) {
        this.cachedPairLiquidity = {};
        this.cachedPoolApr = {};
        this.cachedPoolBonusApr = {};
        this.cachedPoolTvl = {};
        this.priceController = priceController;
        this.masterChefGraphClient = new core_1.ApolloClient({
            uri: config.masterChefGraphUrl,
            cache: new core_1.InMemoryCache(),
        });
        this.pairContract = new ethers_1.ethers.Contract(constants_1.Address.WAVAX_USDC_ADDRESS, JoePair_json_1.default, (0, provider_1.getRandomProvider)());
        this.tokenContract = new ethers_1.ethers.Contract(constants_1.Address.WAVAX_ADDRESS, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
        this.rewardContract = new ethers_1.ethers.Contract(constants_1.Address.GOHM_REWARD_ADDRESS, SimpleRewarder_json_1.default, (0, provider_1.getRandomProvider)());
        this.config = config;
        this.hardRefreshInterval = setInterval(() => { });
        this.temporalRefreshInterval = setInterval(() => { });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                this.cachedPoolTvl = {};
                this.cachedPairLiquidity = {};
            }), this.config.poolRefreshTimeout);
            this.temporalRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                this.cachedPoolApr = {};
                this.cachedPoolBonusApr = {};
            }), this.config.temporalRefreshTimeout);
        });
    }
    getPoolByPair(pair) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: pools } = yield this.masterChefGraphClient.query({
                query: queries_1.poolByPair,
                variables: { pair },
            });
            return pools[0];
        });
    }
    getPoolById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { pools }, } = yield this.masterChefGraphClient.query({
                query: queries_1.poolById,
                variables: { id },
            });
            return pools[0];
        });
    }
    // Gets pool pair (only pair) directly through contract. Most likely slower than GraphQL, but would switch this to completely contract dependent.
    getPoolPairByIdContract(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const poolInfo = yield MasterChefContract.poolInfo(id);
            const lpTokenContract = new ethers_1.ethers.Contract(poolInfo[0], JoeLPToken_json_1.default, (0, provider_1.getRandomProvider)());
            const token0 = yield lpTokenContract.token0();
            const token1 = yield lpTokenContract.token1();
            const pair = yield JoeFactoryContract.getPair(token0, token1);
            return pair;
        });
    }
    getPairTotalSupply(pair) {
        return __awaiter(this, void 0, void 0, function* () {
            const customContract = this.pairContract.attach(pair);
            const totalSupply = yield customContract.totalSupply();
            const balance = yield customContract.balanceOf(constants_1.Address.JOE_MASTER_CHEF_ADDRESS);
            return {
                totalSupply,
                balance,
            };
        });
    }
    getPairLiquidity(pairAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPairLiquidity[pairAddress]) {
                return this.cachedPairLiquidity[pairAddress];
            }
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
    // mixing graphql with contracts, prefer to go either or because of consistency and optimization
    // Please revisit all of this in the optimization run
    getPoolApr(poolId, samplePeriod = '1y') {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPoolApr[poolId]) {
                if (this.cachedPoolApr[poolId].period != samplePeriod) {
                    return (0, util_1.convertPeriod)(this.cachedPoolApr[poolId], samplePeriod);
                }
                return this.cachedPoolApr[poolId].period;
            }
            const joePrice = yield this.priceController.getPrice(constants_1.Address.JOE_ADDRESS, false);
            const totalAllocPoint = yield MasterChefContract.totalAllocPoint();
            const joePerSec = yield MasterChefContract.joePerSec();
            const poolInfo = yield MasterChefContract.poolInfo(poolId);
            const allocPoint = poolInfo[3];
            // BalanceUSD represents the liquidity of the pool
            const balanceUSD = yield this.getPoolTvl(poolId);
            // Multiply joePerSec by allocPoint / totalAllocPoint ratio
            const rewardsPerSec = allocPoint.mul(joePerSec).div(totalAllocPoint);
            // Get it in dollar amounts and divide by balanceUSD to get percentage
            const roiPerSec = rewardsPerSec.mul(joePrice).div(balanceUSD);
            const rate = (0, util_1.secondsToPeriod)(roiPerSec, samplePeriod);
            this.cachedPoolApr[poolId] = { samplePeriod, rate };
            return rate;
        });
    }
    getPair(token0, token1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (token0 > token1) {
                return yield JoeFactoryContract.getPair(token0, token1);
            }
            else {
                return yield JoeFactoryContract.getPair(token1, token0);
            }
        });
    }
    getPoolTvl(poolId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPoolTvl[poolId]) {
                return this.cachedPoolTvl[poolId];
            }
            const pool = yield this.getPoolById(poolId);
            // TotalSupply and balance represents underlying LP token totalSupply and balance of
            // MasterChef contract
            const { totalSupply, balance } = yield this.getPairTotalSupply(pool.pair);
            // Reserve represents the liquidity of the underlying pair
            const reserveUSD = yield this.getPairLiquidity(pool.pair);
            // BalanceUSD represents the liquidity of the pool
            const balanceUSD = balance.mul(reserveUSD).div(totalSupply);
            this.cachedPoolTvl[poolId] = balanceUSD;
            return balanceUSD;
        });
    }
    getPoolBonus(poolId, samplePeriod = '1y') {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cachedPoolBonusApr[poolId]) {
                if (this.cachedPoolApr[poolId].period != samplePeriod) {
                    return (0, util_1.convertPeriod)(this.cachedPoolApr[poolId], samplePeriod);
                }
                return this.cachedPoolApr[poolId].rate;
            }
            const poolInfo = yield MasterChefContract.poolInfo(poolId);
            const rewarderAddress = poolInfo[4];
            const customRewarderContract = this.rewardContract.attach(rewarderAddress);
            const rewardToken = yield customRewarderContract.rewardToken();
            const tokenPerSec = yield customRewarderContract.tokenPerSec();
            // Get reward token price
            const rewardTokenPrice = yield this.priceController.getPrice(rewardToken, false);
            // Get pool tvl, or balanceUSD
            const balanceUSD = yield this.getPoolTvl(poolId);
            // Get it in dollar amounts and divide by balanceUSD to get percentage
            const roiPerSec = tokenPerSec.mul(rewardTokenPrice).div(balanceUSD);
            let rate = (0, util_1.secondsToPeriod)(roiPerSec, samplePeriod);
            this.cachedPoolBonusApr[poolId] = { samplePeriod, rate };
            return rate;
        });
    }
    get apiRouter() {
        // Test pool id: 3
        // Test pool pair: 0x62cf16bf2bc053e7102e2ac1dee5029b94008d99
        const router = express_1.default.Router();
        router.get('/:poolId/liquidity', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const poolId = req.params.poolId;
            try {
                const poolTvl = yield this.getPoolTvl(poolId);
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(poolTvl.toString(), 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/:poolId/apr', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const poolId = req.params.poolId;
            const samplePeriod = req.query.period;
            try {
                const poolApr = yield this.getPoolApr(poolId, samplePeriod);
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(poolApr.toString(), 18)));
            }
            catch (err) {
                next(err);
            }
        }));
        router.get('/:poolId/apr/bonus', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const poolId = req.params.poolId;
            const samplePeriod = req.query.period;
            try {
                const poolApr = yield this.getPoolBonus(poolId, samplePeriod);
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
            clearInterval(this.temporalRefreshInterval);
        });
    }
}
exports.PoolController = PoolController;
//# sourceMappingURL=pool.js.map