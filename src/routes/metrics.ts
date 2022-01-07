import { BigNumber, ethers } from 'ethers'
import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { getTvlQuery } from '../queries/metrics'
import { Address, BigNumberMantissa } from '../constants'
import { getRandomProvider } from '../provider'
import { formatRes } from '../util/format_res'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'
import { PriceController } from './price'

const JoetrollerContract = new ethers.Contract(
    Address.JOETROLLER_ADDRESS,
    JoetrollerABI,
    getRandomProvider()
)

const host = "localhost"

export class MetricsController {
    private graphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController

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
        await this.resetMetrics()
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.refreshInterval)
    }

    async resetMetrics() {
        const [tvl] = await Promise.all([
            this.getTvl(),
        ])

<<<<<<< HEAD
        this.tvl = tvl 
=======
        console.log(tvl.toString())

        // this.tvl = tvl 
        // this.apr = apr
        // this.apy = apy
>>>>>>> a785d70d7587966aaa270204438cc70c873518a6
    }

    async getTvl() {
        // Swap and Bank tvl
        const {
            data: { factories }
        } = await this.graphClient.query({
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
            const price = await this.priceController.getPrice(underlying, false)
            console.log("Underlying asset: ", underlying)
            console.log("Asset price: ", price.toString())
            console.log("Amount of asset: ", cash.toString())
            const usdPrice = cash.div(BigNumberMantissa).mul(price) // mul price
            console.log("usdprice: ", usdPrice.toString())
            totalCash.add(cash)
        }))

        // console.log("total: ", totalCash)
        return exchangeTvl.add(totalCash)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/tvl', async (req, res, next) => {
            res.send(formatRes(this.tvl.toString()))
        })
<<<<<<< HEAD
=======

        router.get('/apr', async (req, res, next) => {
            res.send(formatRes(this.apr.toString()))
        })

        router.get('/apy', async (req, res, next) => {
            res.send(formatRes(this.apy.toString()))
        })
>>>>>>> a785d70d7587966aaa270204438cc70c873518a6

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
