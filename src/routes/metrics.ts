import { BigNumber, ethers } from 'ethers'
import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { getTvlQuery, pairByAddress, poolByPair, poolsQuery } from '../queries/metrics'
import { Address, BigNumberMantissa } from '../constants'
import { getRandomProvider } from '../provider'
import { formatRes } from '../util/format_res'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'
import { PriceController } from './price'
import { TimePeriod } from '../types/time-period'

const JoetrollerContract = new ethers.Contract(
    Address.JOETROLLER_ADDRESS,
    JoetrollerABI,
    getRandomProvider()
)

export class MetricsController {
    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private chefGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private tvl: BigNumber
    private apr: BigNumber
    private apy: BigNumber

    constructor(
        priceController: PriceController,
        exchangeGraphUrl: string, 
        masterChefGraphUrl: string, 
        refreshInterval: number
    ) {
        this.exchangeGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: exchangeGraphUrl,
            cache: new InMemoryCache()
        })
        this.chefGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: masterChefGraphUrl,
            cache: new InMemoryCache()
        })
        this.priceController = priceController
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.tvl = BigNumber.from('0')
        this.apr = BigNumber.from('0')
        this.apy = BigNumber.from('0')
    }

    async init() {
        // Setup HARD subscriptions to avoid hard refreshes
        await this.resetMetrics()
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.refreshInterval)
    }

    async resetMetrics() {
        const [tvl] = await Promise.all([
            this.getTvl(),
        ])

        const topPairAddresses = await this.topPairAddresses()
        // console.log(tvl.toString())
        await this.getPoolApr(topPairAddresses[topPairAddresses.length - 1])

        this.tvl = tvl 
    }

    async getTvl() {
        // Swap and Bank tvl
        const {
            data: { factories }
        } = await this.exchangeGraphClient.query({
            query: await getTvlQuery()
        })

        const exchangeTvl = BigNumber.from(Math.floor(Number(factories[0].liquidityUSD)))
        const markets = await JoetrollerContract.getAllMarkets()
        const jTokenContract = new ethers.Contract(
            markets[0],
            JTokenABI,
            getRandomProvider()
        )
        const totalCash = BigNumber.from("0")
        await Promise.all(markets.map(async (market: string, index: number) => {
            if (index > 0) {
                return
            }

            const customContract = jTokenContract.attach(market)
            const cash = await customContract.getCash()
            const underlying = await customContract.underlying()
            // Get price another way
            const price = await this.priceController.getPrice(underlying, false)
            const usdPrice = cash.div(BigNumberMantissa).mul(price) // mul price
            totalCash.add(usdPrice)
        }))

        return exchangeTvl.add(totalCash)
    }

    async topPairAddresses() {
        const {
            data: { pools },
        } = await this.chefGraphClient.query({
            query: poolsQuery,
        });

        return pools.map((pool: { pair: string }) => pool.pair)
    }

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
        console.log("joepersec ", joePerSec)
        const balanceUSD = ((balance / totalSupply) * reserveUSD)
        const rewardPerSec = ((allocPoint / totalAllocPoint) * joePerSec)
        console.log("Reward per sec", rewardPerSec)

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

        router.get('/tvl', async (req, res, next) => {
            res.send(formatRes(this.tvl.toString()))
        })

        // Query parameter of time period
        router.get('/apr/pool/:pairAddress', async (req, res, next) => {
            const pairAddress = req.params.pairAddress
            const timePeriod = req.query.period as TimePeriod
            if (!timePeriod) {
                next("Time period not valid")
            }

            const apr = await this.getPoolApr(pairAddress, timePeriod)
            res.send(formatRes(apr.toString()))
        })

        router.get('/apr/farm', async (req, res, next) => {
            const timePeriod = req.query.period 
        })

        router.get('/apr/market/:token', async (req, res, next) => {
            const token = req.params.token
            const timePeriod = req.query.period 
        })

        router.get('/apy/market/:token', async (req, res, next) => {
            const token = req.params.token
            const timePeriod = req.query.period 
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
