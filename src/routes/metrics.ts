// TVL, APR, APY

import { BigNumber } from 'ethers'
import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { getTvlQuery } from '../queries/metrics'

export class MetricsController {
    private graphClient: ApolloClient<NormalizedCacheObject>

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private tvl: BigNumber
    private apr: BigNumber
    private apy: BigNumber

    constructor(exchangeGraphUrl: string, refreshInterval: number) {
        this.graphClient = new ApolloClient<NormalizedCacheObject>({
            uri: exchangeGraphUrl,
            cache: new InMemoryCache()
        })
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.tvl = BigNumber.from('0')
        this.apr = BigNumber.from('0')
        this.apy = BigNumber.from('0')
    }

    async init() {
        // Setup HARD subscriptions to avoid hard refreshes
        
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.refreshInterval)
    }

    async resetMetrics() {
        const [tvl, apr, apy] = await Promise.all([
            this.getTvl(),
            this.getApr(),
            this.getApy(),
        ])

        this.tvl = tvl 
        this.apr = apr
        this.apy = apy
    }

    async getTvl() {
        // Swap and Bank tvl
        const {
            data: { factories }
        } = await this.graphClient.query({
            query: getTvlQuery()
        })

        const exchangeTvl = factories.liquidityUSD
        
    }

    async getApr() {

    }

    async getApy() {

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
