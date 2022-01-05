// TVL, APR, APY

import { BigNumber } from 'ethers'
import express from 'express'

const hardRefreshInterval = 60000

export class MetricsController {
    private hardRefreshInterval: NodeJS.Timer

    private tvl: BigNumber
    private apr: BigNumber
    private apy: BigNumber

    constructor() {
        this.hardRefreshInterval = setInterval(() => {})
        this.tvl = BigNumber.from('0')
        this.apr = BigNumber.from('0')
        this.apy = BigNumber.from('0')
    }

    async init() {
        this.hardRefreshInterval = setInterval(() => {}, hardRefreshInterval)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/tvl', async (req, res, next) => {})

        router.get('/apr', async (req, res, next) => {})

        router.get('/apy', async (req, res, next) => {})

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
