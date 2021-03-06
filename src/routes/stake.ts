import { BigNumber, Contract, ethers } from 'ethers'
import express from 'express'
import { MetricsController, PriceController } from '.'
import { OpConfig } from '../config'
import { TimePeriod } from '../types'
import {
    formatRes,
    bnStringToDecimal,
    rateToYear,
    getCacheKey,
    validatePeriod,
} from '../util'
import { BigNumberMantissa, CachePrefix, STAKING_FEE_RATE } from '../constants'
import { getRandomProvider } from '../provider'
import { Address } from '../constants'
import { Cache } from '../cache'

import ERC20ABI from '../../abi/ERC20.json'

export class StakeController {
    private config: OpConfig
    private metricsController: MetricsController
    private priceController: PriceController
    private hardRefreshInterval: NodeJS.Timer
    private joeContract: Contract

    private cache: Cache
    // Sample periods all kept seperately
    private cachedStakingRewards: {
        period: TimePeriod
        rate: BigNumber
    }[] = []

    constructor(
        config: OpConfig,
        cache: Cache,
        metricsController: MetricsController,
        priceController: PriceController
    ) {
        this.config = config
        this.cache = cache
        this.metricsController = metricsController
        this.priceController = priceController
        this.joeContract = new ethers.Contract(
            Address.JOE_ADDRESS,
            ERC20ABI,
            getRandomProvider()
        )
        this.hardRefreshInterval = setInterval(() => {})
    }

    public async init() {
        this.hardRefreshInterval = setInterval(async () => {
            this.cachedStakingRewards = []
        }, this.config.stakeRefreshTimeout)
    }

    public async getTotalStaked() {
        const totalStaked = await this.joeContract.balanceOf(
            Address.XJOE_ADDRESS
        )
        return totalStaked
    }

    private stakingRewardsIncludesPeriod(period: TimePeriod) {
        for (let reward of this.cachedStakingRewards) {
            if (reward.period === period) {
                return reward
            }
        }

        return undefined
    }

    public async getStakingRewards(samplePeriod: TimePeriod) {
        const cachedStakeRewards = await this.cache.getPeriodRate(
            getCacheKey(CachePrefix.stake, samplePeriod, 'rewards')
        )
        if (cachedStakeRewards) return cachedStakeRewards.rate

        const periodVolume = await this.metricsController.getVolume(
            samplePeriod
        )
        const fees = periodVolume.mul(STAKING_FEE_RATE)
        const totalStaked = await this.getTotalStaked()
        const joePrice = await this.priceController.getPrice(
            Address.JOE_ADDRESS,
            false
        )
        const totalStakedUSD = totalStaked.mul(joePrice).div(BigNumberMantissa)
        const periodApr = {
            period: samplePeriod,
            rate: fees.mul(BigNumberMantissa).div(totalStakedUSD),
        }
        const rate = rateToYear(periodApr)
        await this.cache.setPeriodRate(
            getCacheKey(CachePrefix.stake, samplePeriod, 'rewards'),
            { period: samplePeriod, rate: rate },
            this.config.stakeRefreshTimeout
        )
        return rate
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/apr', async (req, res, next) => {
            const valid = validatePeriod(req.query.period as string)
            if (!valid) next('Invalid period: ' + req.query.period)
            const samplePeriod = req.query.period as TimePeriod
            try {
                const stakingApr = await this.getStakingRewards(samplePeriod)
                res.send(
                    formatRes(bnStringToDecimal(stakingApr.toString(), 18))
                )
            } catch (err) {
                next(err)
            }
        })

        return router
    }

    public async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
