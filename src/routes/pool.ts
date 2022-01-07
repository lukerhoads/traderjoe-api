import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'

export interface Market {
    totalSupply: string 
    exchangeRate: string 
    totalBorrows: string
    underlyingPriceUSD: string  
}

export class PoolController {
    private graphClient: ApolloClient<NormalizedCacheObject>

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    constructor(lendingGraphUrl: string, refreshInterval: number) {
        this.graphClient = new ApolloClient<NormalizedCacheObject>({
            uri: lendingGraphUrl,
            cache: new InMemoryCache()
        })
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
    }

    async init() {
        this.hardRefreshInterval = setInterval(async () => {

        }, this.refreshInterval)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/:poolId/liquidity', async (req, res, next) => {
            const poolId = req.params.poolId
        })

        // Query params for period
        router.get('/:poolId/volume', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period
        })

        router.get('/:poolId/fees', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period
        })

        router.get('/:poolId/apr', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
