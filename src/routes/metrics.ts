import { BigNumber, ethers } from 'ethers'
import express from 'express'
import {
    ApolloClient,
    InMemoryCache,
    NormalizedCacheObject,
} from '@apollo/client/core'
import { getExchangeTvlQuery } from '../queries'
import { Address } from '../constants'
import { getRandomProvider } from '../provider'
import { formatRes } from '../util/format-res'
import { PriceController } from './price'
import { parseUnits } from '@ethersproject/units'
import { getMantissaBigNumber, bnStringToDecimal } from '../util'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'
import { TimePeriod } from '../types'
import { OpConfig } from '../config'

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
    async init() {
        // Setup HARD subscriptions to avoid hard refreshes
        await this.resetMetrics()

        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.config.metricsRefreshTimeout)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/tvl', async (req, res, next) => {
            const tvlString = this.tvl.toString()
            res.send(formatRes(bnStringToDecimal(tvlString, 18)))
        })

        // TODO
        router.get('/volume', async (req, res, next) => {
            const period = req.query.period as TimePeriod
            const volume = this.getVolume(period)
            res.send(formatRes(bnStringToDecimal(volume.toString(), 18)))
        })

        return router
    }

    async resetMetrics() {
        const [tvl] = await Promise.all([this.getTvl()])

        this.tvl = tvl
    }

    // Adds exchange and bank TVL
    async getTvl() {
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

    async getVolume(period: TimePeriod) {
        return BigNumber.from('0')
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
