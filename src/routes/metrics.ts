import { BigNumber, ethers } from 'ethers'
import express from 'express'
import {
    ApolloClient,
    InMemoryCache,
    NormalizedCacheObject,
} from '@apollo/client/core'
import { getExchangeTvlQuery, lastDayVolume, lastHourVolumeQuery, volumeOverTimeQuery } from '../queries'
import { Address } from '../constants'
import { getRandomProvider } from '../provider'
import { PriceController } from './price'
import { parseUnits } from '@ethersproject/units'
import { getMantissaBigNumber, bnStringToDecimal, formatRes, stringToBn } from '../util'
import { TimePeriod } from '../types'
import { OpConfig } from '../config'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'

const JoetrollerContract = new ethers.Contract(
    Address.JOETROLLER_ADDRESS,
    JoetrollerABI,
    getRandomProvider()
)

export class MetricsController {
    private config: OpConfig

    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController

    private hardRefreshInterval: NodeJS.Timer

    private tvl: BigNumber = BigNumber.from('0')

    private cachedVolume: { [key in TimePeriod]?: BigNumber } = {}

    constructor(config: OpConfig, priceController: PriceController) {
        this.config = config
        this.exchangeGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: config.exchangeGraphUrl,
            cache: new InMemoryCache(),
        })
        this.priceController = priceController
        this.hardRefreshInterval = setInterval(() => {})
    }

    // Event subscriptions
    public async init() {
        await this.resetMetrics()

        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.config.metricsRefreshTimeout)
    }

    protected async resetMetrics() {
        const [tvl] = await Promise.all([this.getTvl()])

        this.tvl = tvl
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/tvl', async (req, res, next) => {
            const tvlString = this.tvl.toString()
            res.send(formatRes(bnStringToDecimal(tvlString, 18)))
        })

        router.get('/volume', async (req, res, next) => {
            const period = req.query.period as TimePeriod
            const volume = await this.getVolume(period)
            res.send(formatRes(bnStringToDecimal(volume.toString(), 18)))
        })

        return router
    }

    protected async getTvl() {
        const {
            data: { factories },
        } = await this.exchangeGraphClient.query({
            query: getExchangeTvlQuery,
        })

        const split = factories[0].liquidityUSD.split('.')
        const divideExp = split[1].length - 18
        const bnDivisor = getMantissaBigNumber(divideExp)
        const exchangeTvl = parseUnits(
            factories[0].liquidityUSD,
            split[1].length
        ).div(bnDivisor)
        const markets = await JoetrollerContract.getAllMarkets()
        const jTokenContract = new ethers.Contract(
            markets[0],
            JTokenABI,
            getRandomProvider()
        )
        // const locked = BigNumber.from("0")
        const totalSupplies = await Promise.all(
            markets.map(async (market: string) => {
                const customContract = jTokenContract.attach(market)
                const underlying = await customContract.underlying()
                const jTokenTotalSupply = await customContract.totalSupply()
                const exchangeRate = await customContract.exchangeRateStored()
                const underlyingPrice = await this.priceController.getPrice(
                    underlying,
                    false
                )

                const divideExp = 27 + exchangeRate.toString().length - 18
                const divisor = getMantissaBigNumber(divideExp)
                const totalSupply = jTokenTotalSupply
                    .mul(exchangeRate)
                    .mul(underlyingPrice)
                const totalSupplyConv = totalSupply.div(divisor)
                return totalSupplyConv
            })
        )

        let marketTvl = BigNumber.from('0')
        for (let i = 0; i < totalSupplies.length; i++) {
            marketTvl = marketTvl.add(totalSupplies[i])
        }

        return exchangeTvl.add(marketTvl)
    }

    public async getVolume(period: TimePeriod = "1d") {
        if (this.cachedVolume[period]) {
            return this.cachedVolume[period]!
        }

        if (period === "1d") {
            const { data: { dayDatas } } = await this.exchangeGraphClient.query({
                query: lastDayVolume,
            }) 

            return stringToBn(dayDatas[0].volumeUSD, 18)
        }

        let dayMultiplier = 1
        switch (period) {
            case "1s":
                throw new Error("Unable to get one second data")
            case "1m":
                throw new Error("Unable to get one minute data")
            case "1h":
                // This hourdata entity query isn't working
                // const { data: { hourDatas } } = await this.exchangeGraphClient.query({
                //     query: lastHourVolumeQuery,
                // })

                // return stringToBn(hourDatas[0].volumeUSD, 18)
                throw new Error("Unable to get hour data")
            case "1w":
                dayMultiplier = 7
            case "1mo":
                dayMultiplier = 30
            case "1y":
                dayMultiplier = 365
        }

        const { data: { dayDatas } } = await this.exchangeGraphClient.query({
            query: volumeOverTimeQuery,
            variables: { days: dayMultiplier } 
        })

        let volumeSum = BigNumber.from("0")
        for (let dayData of dayDatas) {
            volumeSum = volumeSum.add(stringToBn(dayData.volumeUSD, 18))
        }

        return volumeSum
    }

    public async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
