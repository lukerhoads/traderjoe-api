import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { pairByAddress, poolByPair, poolsQuery } from '../queries'
import { PriceController } from './price'
import { Address } from '../constants'
import { TimePeriod } from '../types/time-period'

export class PoolController {
    private chefGraphClient: ApolloClient<NormalizedCacheObject>
    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController
    
    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    constructor(
        priceController: PriceController,
        masterChefGraphUrl: string, 
        exchangeGraphUrl: string, 
        refreshInterval: number
    ) {
        this.chefGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: masterChefGraphUrl,
            cache: new InMemoryCache()
        })
        this.exchangeGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: exchangeGraphUrl,
            cache: new InMemoryCache()
        })
        this.priceController = priceController
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
    }

    async init() {
        this.hardRefreshInterval = setInterval(async () => {

        }, this.refreshInterval)
    }

    async topPairAddresses() {
        const {
            data: { pools },
        } = await this.chefGraphClient.query({
            query: poolsQuery,
        });

        return pools.map((pool: { pair: string }) => pool.pair)
    }

    // Model this after bank market apr
    async getPoolApr(pairAddress: string, timePeriod: TimePeriod) {
        const joePrice = await this.priceController.getPrice(Address.JOE_ADDRESS, false)

        const {
            data: { pools },
        } = await this.chefGraphClient.query({
            query: poolByPair,
            variables: { pair: pairAddress }
        })

        const {
            data: { pairs },
        } = await this.exchangeGraphClient.query({
            query: pairByAddress,
            variables: { id: pairAddress }
        })

        const pool = pools[0]
        const pair = pairs[0]

        const balance = Number(pool.balance) / 1e18
        const totalSupply = Number(pair.totalSupply) 
        const reserveUSD = Number(pair.reserveUSD)
        const allocPoint = Number(pool.allocPoint)
        const totalAllocPoint = Number(pool.totalAllocPoint)
        const joePerSec = Number(pool.owner.joePerSec)
        const balanceUSD = ((balance / totalSupply) * reserveUSD)
        const rewardPerSec = ((allocPoint / totalAllocPoint) * joePerSec)

        const roiPerSec = (rewardPerSec * joePrice.toNumber()) / balanceUSD
        switch (timePeriod) {
            case "1s": 
                return roiPerSec
            case "1h":
                return roiPerSec * 3600
            case "1d":
                return roiPerSec * 3600 * 24
            case "1m":
                return roiPerSec * 3600 * 24 * 30
            case "1y":
                return roiPerSec * 3600 * 24 * 30 * 12
        }
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/:poolId/liquidity', async (req, res, next) => {
            const poolId = req.params.poolId.toLowerCase()
        })

        // Query params for period
        router.get('/:poolId/volume', async (req, res, next) => {
            const poolId = req.params.poolId.toLowerCase()
            const period = req.query.period
        })

        router.get('/:poolId/fees', async (req, res, next) => {
            const poolId = req.params.poolId.toLowerCase()
            const period = req.query.period
        })

        router.get('/:poolId/apr', async (req, res, next) => {
            const poolId = req.params.poolId.toLowerCase()
            const period = req.query.period
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
