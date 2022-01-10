import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'

// Pool (or farm) controller. Where you stake your LP tokens
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

        router.get('/:poolId/weight', async (req, res, next) => {

        })

        // Query params for period
        router.get('/:poolId/tvl', async (req, res, next) => {

        })

        router.get('/:poolId/apr', async (req, res, next) => {
            
        })

        router.get('/:poolId/apr/bonus', async (req, res, next) => {
            
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
