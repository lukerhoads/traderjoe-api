// TVL, APR, APY

import { BigNumber } from 'ethers'
import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { getTvlQuery } from '../queries/metrics'
import { formatRes } from '../util/format_res'

export class MetricsController {
    private graphClient: ApolloClient<NormalizedCacheObject>

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private tvl: BigNumber

    constructor(masterChefGraphUrl: string, refreshInterval: number) {
        this.graphClient = new ApolloClient<NormalizedCacheObject>({
            uri: masterChefGraphUrl,
            cache: new InMemoryCache()
        })
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.tvl = BigNumber.from('0')
    }

    async init() {
        // Setup HARD subscriptions to avoid hard refreshes
        
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.refreshInterval)
    }

    async resetMetrics() {
        const [tvl] = await Promise.all([
            this.getTvl(),
        ])

        this.tvl = tvl 
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

    get apiRouter() {
        const router = express.Router()

        router.get('/tvl', async (req, res, next) => {
            res.send(formatRes(this.tvl.toString()))
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
