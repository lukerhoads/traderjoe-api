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
exports.StakeController = void 0;
const ethers_1 = require("ethers");
const express_1 = __importDefault(require("express"));
const util_1 = require("../util");
const constants_1 = require("../constants");
const provider_1 = require("../provider");
const constants_2 = require("../constants");
const ERC20_json_1 = __importDefault(require("../../abi/ERC20.json"));
class StakeController {
    constructor(config, metricsController, priceController) {
        // Sample periods all kept seperately
        this.cachedStakingRewards = [];
        this.config = config;
        this.metricsController = metricsController;
        this.priceController = priceController;
        this.joeContract = new ethers_1.ethers.Contract(constants_2.Address.JOE_ADDRESS, ERC20_json_1.default, (0, provider_1.getRandomProvider)());
        this.hardRefreshInterval = setInterval(() => { });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.hardRefreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                this.cachedStakingRewards = [];
            }), this.config.stakeRefreshTimeout);
        });
    }
    getTotalStaked() {
        return __awaiter(this, void 0, void 0, function* () {
            const totalStaked = yield this.joeContract.balanceOf(constants_2.Address.XJOE_ADDRESS);
            return totalStaked;
        });
    }
    stakingRewardsIncludesPeriod(period) {
        for (let reward of this.cachedStakingRewards) {
            if (reward.period === period) {
                return reward;
            }
        }
        return undefined;
    }
    getStakingRewards(samplePeriod) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedStakeRewards = this.stakingRewardsIncludesPeriod(samplePeriod);
            if (cachedStakeRewards) {
                return (0, util_1.rateToYear)(cachedStakeRewards.rate);
            }
            const periodVolume = yield this.metricsController.getVolume(samplePeriod);
            const fees = periodVolume.mul(constants_1.STAKING_FEE_RATE);
            const totalStaked = yield this.getTotalStaked();
            const joePrice = yield this.priceController.getPrice(constants_2.Address.JOE_ADDRESS, false);
            const totalStakedUSD = totalStaked.mul(joePrice).div(constants_1.BigNumberMantissa);
            const periodApr = {
                period: samplePeriod,
                rate: fees.mul(constants_1.BigNumberMantissa).div(totalStakedUSD),
            };
            this.cachedStakingRewards.push(periodApr);
            return (0, util_1.rateToYear)(periodApr);
        });
    }
    get apiRouter() {
        const router = express_1.default.Router();
        router.get('/apr', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const samplePeriod = req.query.period;
            try {
                const stakingApr = yield this.getStakingRewards(samplePeriod);
                res.send((0, util_1.formatRes)((0, util_1.bnStringToDecimal)(stakingApr.toString(), 18)));
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
exports.StakeController = StakeController;
//# sourceMappingURL=stake.js.map