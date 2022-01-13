import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { pairByAddress, pairTimeTravelQuery, poolsQuery } from '../queries'
import { PriceController } from './price'
import { Address, BigNumberMantissa, FEE_RATE } from '../constants'
import { TimePeriod } from '../types'
import { Contract, ethers } from 'ethers'
import { getRandomProvider } from '../provider'
import { bnStringToDecimal, formatRes, getBlocks, getMantissaBigNumber, stringToBn } from '../util'

import JoePairABI from '../../abi/JoePair.json'
import ERC20ABI from '../../abi/ERC20.json'

export class PairController {
    private chefGraphClient: ApolloClient<NormalizedCacheObject>
    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController
    private pairContract: Contract
    private tokenContract: Contract
    
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
        this.pairContract = new ethers.Contract(
            Address.WAVAX_USDC_ADDRESS,
            JoePairABI,
            getRandomProvider()
        )
        this.tokenContract = new ethers.Contract(
            Address.WAVAX_ADDRESS,
            ERC20ABI,
            getRandomProvider()
        )
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

    async getPairLiquidity(pairAddress: string) {
        // Somehow validate that pairAddress is a valid pair
        const customContract = this.pairContract.attach(pairAddress)
        const reserves = await customContract.getReserves()

        const token0 = await customContract.token0()
        const token1 = await customContract.token1()

        const token0Contract = this.tokenContract.attach(token0)
        const token1Contract = this.tokenContract.attach(token1)

        const token0Decimals = await token0Contract.decimals()
        const token1Decimals = await token1Contract.decimals()

        const token0Price = await this.priceController.getPrice(token0, false)
        const token1Price = await this.priceController.getPrice(token1, false)

        const token0Tvl = reserves[0].mul(token0Price).div(getMantissaBigNumber(token0Decimals))
        const token1Tvl = reserves[1].mul(token1Price).div(getMantissaBigNumber(token1Decimals))

        return token0Tvl.add(token1Tvl)
    }

    // Need to make this contract stuff
    async getPairVolume(pairAddress: string, period: TimePeriod = "1d") {
        const { data: pairData } = await this.exchangeGraphClient.query({
            query: pairByAddress,
            variables: {
                id: pairAddress,
            }
        })

        const pair = pairData.pair
        const blocks = await getBlocks(period)
        if (!blocks.length) {
            throw new Error("No data for that time period")
        }

        const blockNumber = Number(blocks[0].number)
        const { data: { pair: periodPair }} = await this.exchangeGraphClient.query({
            query: pairTimeTravelQuery,
            variables: {
                block: {
                    number: blockNumber
                },
                pairAddress: pairAddress,
            },
            fetchPolicy: "no-cache"
        })

        const volumeUSD = pair.volumeUSD === "0" ? pair.untrackedVolumeUSD : pair.volumeUSD
        const periodVolumeUSD = periodPair.volumeUSD === "0" ? periodPair.untrackedVolumeUSD : periodPair.volumeUSD

        const volumeUSDBn = stringToBn(volumeUSD, 18)
        const periodVolumeUSDBn = stringToBn(periodVolumeUSD, 18)

        return volumeUSDBn.sub(periodVolumeUSDBn)
    }

    async getPairFees(pairAddress: string, period: TimePeriod = "1d") {
        const pairVolume = await this.getPairVolume(pairAddress, period)
        return pairVolume.mul(FEE_RATE).div(BigNumberMantissa)
    }

    // These all depend on the period over which we are collecting data.
    // Perhaps add up to four months? This would make it more historically accurate but 
    // then again would not be future-proof because many pools were just getting started 
    // then
    async getPairApr(pairAddress: string, period: TimePeriod = "1d") {
        // Move away from 1d hardcode
        const pairFees = await this.getPairFees(pairAddress, period)
        const pairLiquidity = await this.getPairLiquidity(pairAddress)
        // Scale factor is 12 right now, this means that
        // we only fetch one month fees right now (because Avalanche has not been live for over a year)
        // return pairFees.mul(365).div(pairLiquidityNumber)
        return pairFees.mul(BigNumberMantissa).div(pairLiquidity)
    }

    // Testing out another method here (from analytics)
    async getPairAprGraph(pairAddress: string, period: TimePeriod = "1d") {
        // This is unnecessary, find how to optimize this with cache
        const { data: pairData } = await this.exchangeGraphClient.query({
            query: pairByAddress,
            variables: {
                id: pairAddress,
            }
        })

        const pair = pairData.pair
        const periodFees = await this.getPairFees(pairAddress, period)
        const reserveUSD = stringToBn(pair.reserveUSD, 18)
        return periodFees.mul(BigNumberMantissa).div(reserveUSD)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/:pairAddress/liquidity', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            try {
                const pairTvl = await this.getPairLiquidity(pairAddress)
                const pairTvlString = pairTvl.toString()
                res.send(formatRes(bnStringToDecimal(pairTvlString, 18)))
            } catch (err) {
                next(err)
            }
        })

        // Query params for period
        router.get('/:pairAddress/volume', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            const period = req.query.period as TimePeriod
            try {
                const pairVolume = await this.getPairVolume(pairAddress, period)
                res.send(formatRes(pairVolume.toString()))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:pairAddress/fees', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            const period = req.query.period as TimePeriod
            try {
                const feesCollected = await this.getPairFees(pairAddress, period)
                res.send(formatRes(feesCollected.toString()))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:pairAddress/apr', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            const period = req.query.period as TimePeriod
            try {
                const poolApr = await this.getPairAprGraph(pairAddress, period)
                res.send(formatRes(bnStringToDecimal(poolApr.toString(), 18)))
            } catch (err) {
                next(err)
            }
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}