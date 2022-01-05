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
        await this.queryBalances()
        this.hardRefreshInterval = setInterval(async () => {
            await this.queryBalances()
        }, this.refreshInterval)
    }

    async queryBalances() {
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

    get apiRouter() {
        const router = express.Router()

        router.get('/supply', async (req, res, next) => {
            res.send(formatRes(this.totalSupply.toString()))
        })

        router.get('/borrow', async (req, res, next) => {
            res.send(formatRes(this.totalBorrow.toString()))
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
