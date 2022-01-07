import 'cross-fetch/polyfill'
import { BigNumber } from 'ethers'
import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { formatRes } from '../util/format_res'
import { marketsQuery } from '../queries'

export interface Market {
    totalSupply: string 
    exchangeRate: string 
    totalBorrows: string
    underlyingPriceUSD: string  
}

export class BankerController {
    private graphClient: ApolloClient<NormalizedCacheObject>

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private totalSupply: BigNumber
    private totalBorrow: BigNumber

    constructor(lendingGraphUrl: string, refreshInterval: number) {
        this.graphClient = new ApolloClient<NormalizedCacheObject>({
            uri: lendingGraphUrl,
            cache: new InMemoryCache()
        })
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.totalSupply = BigNumber.from("0")
        this.totalBorrow = BigNumber.from("0")
    }

    async init() {
        await this.resetTotals()
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetTotals()
        }, this.refreshInterval)
    }

    async resetTotals() {
        const {
            data: { markets },
        } = await this.graphClient.query({
            query: marketsQuery
        })

        let tempTotalSupply = 0
        let tempTotalBorrow = 0
        markets.forEach((market: Market) => {
            tempTotalSupply += Math.floor(
                Number(market.totalSupply) * Number(market.exchangeRate) * Number(market.underlyingPriceUSD)
            )

            tempTotalBorrow += Math.floor(
                Number(market.totalBorrows) * Number(market.underlyingPriceUSD)
            )
        })

        this.totalSupply = BigNumber.from(tempTotalSupply)
        this.totalBorrow = BigNumber.from(tempTotalBorrow)
    }

    async getSupplyByMarket(token: string) {
        
    }

    async getBorrowByMarket(token: string) {

    }

    async getSupplyApyByMarket(token: string) {

    }

    async getBorrowApyByMarket(token: string) {

    }

    get apiRouter() {
        const router = express.Router()

        // Total supply and borrow across pools
        router.get('/supply', async (req, res, next) => {
            res.send(formatRes(this.totalSupply.toString()))
        })

        router.get('/borrow', async (req, res, next) => {
            res.send(formatRes(this.totalBorrow.toString()))
        })

        // Total supply and borrow across one pool
        router.get('/supply/:token', async (req, res, next) => {
            const token = req.params.token
            res.send(formatRes(this.getSupplyByMarket(token)))
        })

        router.get('/borrow/:token', async (req, res, next) => {
            const token = req.params.token
            res.send(formatRes(this.getBorrowByMarket(token)))
        })

        router.get('/supply/:token/apy', async (req, res, next) => {
            const token = req.params.token
            res.send(formatRes(this.getSupplyApyByMarket(token)))
        })

        router.get('/borrow/:token/apy', async (req, res, next) => {
            const token = req.params.token
            res.send(formatRes(this.getBorrowApyByMarket(token)))
        })

        // User rewards
        router.get('/:userId/supply', async (req, res, next) => {
        })

        router.get('/:userId/borrow', async (req, res, next) => {
        })

        router.get('/:userId/net', async (req, res, next) => {
        })

        router.get('/:userId/rewards', async (req, res, next) => {
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
