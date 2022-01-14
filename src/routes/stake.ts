import { BigNumber, Contract, ethers } from 'ethers'
import express from 'express'
import { MetricsController } from '.'
import { OpConfig } from '../config'
import { PeriodRate, TimePeriod } from '../types'
import { formatRes, bnStringToDecimal } from '../util'
import { STAKING_FEE_RATE } from '../constants'
import { getRandomProvider } from '../provider'
import { Address } from '../constants'

import ERC20ABI from '../../abi/ERC20.json'

export class StakeController {
    private config: OpConfig
    private metricsController: MetricsController
    private hardRefreshInterval: NodeJS.Timer
    private joeContract: Contract

    private cachedStakingRewards?: PeriodRate

    constructor(config: OpConfig, metricsController: MetricsController) {
        this.config = config
        this.metricsController = metricsController
        this.joeContract = new ethers.Contract(
            Address.JOE_ADDRESS,
            ERC20ABI,
            getRandomProvider()
        )
        this.hardRefreshInterval = setInterval(() => {})
    }

    public async init() {
        this.hardRefreshInterval = setInterval(async () => {
            this.cachedStakingRewards = undefined
        }, this.config.stakeRefreshTimeout)
    }

    public async getTotalStaked() {
        const totalStaked = await this.joeContract.balanceOf(Address.XJOE_ADDRESS)
        return totalStaked
    }

    public async getStakingRewards(samplePeriod: TimePeriod = "1w") {
        if (this.cachedStakingRewards) {
            return this.cachedStakingRewards
        }

        const volume = await this.metricsController.getVolume(samplePeriod)
        const fees = volume.mul(STAKING_FEE_RATE)
        const totalStaked = await this.getTotalStaked()
        const joePrice = await this.priceController.getPrice(Address.JOE_ADDRESS, false)
    }



    get apiRouter() {
        const router = express.Router()

        router.get('/apr', async (req, res, next) => {
            const samplePeriod = req.query.period as TimePeriod
            try {
                const stakingApr = await this.getStakingRewards(samplePeriod)
                res.send(formatRes(bnStringToDecimal(stakingApr.toString(), 18)))
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
