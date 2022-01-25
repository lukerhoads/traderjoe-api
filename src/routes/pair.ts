import express from 'express'
import {
    ApolloClient,
    InMemoryCache,
    NormalizedCacheObject,
} from '@apollo/client/core'
import { pairByAddress, pairTimeTravelQuery, poolsQuery } from '../queries'
import { PriceController } from './price'
import { Address, BigNumberMantissa, CachePrefix, FEE_RATE } from '../constants'
import { TimePeriod } from '../types'
import { Contract, ethers } from 'ethers'
import { getRandomProvider } from '../provider'
import {
    bnStringToDecimal,
    formatRes,
    getBlocks,
    getCacheKey,
    getMantissaBigNumber,
    stringToBn,
    validateAddress,
    validatePeriod,
} from '../util'
import { OpConfig } from '../config'
import { Cache } from '../cache'

import JoePairABI from '../../abi/JoePair.json'
import ERC20ABI from '../../abi/ERC20.json'

export class PairController {
    private config: OpConfig

    private cache: Cache
    private chefGraphClient: ApolloClient<NormalizedCacheObject>
    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController
    private pairContract: Contract
    private tokenContract: Contract

    private hardRefreshInterval: NodeJS.Timer

    constructor(
        config: OpConfig,
        cache: Cache,
        priceController: PriceController
    ) {
        this.config = config
        this.cache = cache
        this.priceController = priceController
        this.chefGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: config.masterChefGraphUrl,
            cache: new InMemoryCache(),
        })
        this.exchangeGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: config.exchangeGraphUrl,
            cache: new InMemoryCache(),
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
        this.hardRefreshInterval = setInterval(() => {})
    }

    public async init() {
        this.hardRefreshInterval = setInterval(async () => {},
        this.config.poolRefreshTimeout)
    }

    protected async topPairAddresses() {
        const {
            data: { pools },
        } = await this.chefGraphClient.query({
            query: poolsQuery,
        })

        return pools.map((pool: { pair: string }) => pool.pair)
    }

    protected async getPairLiquidity(pairAddress: string) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.pair, pairAddress, 'liquidity')
        )
        if (cachedValue) return cachedValue

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

        const token0Tvl = reserves[0]
            .mul(token0Price)
            .div(getMantissaBigNumber(token0Decimals))
        const token1Tvl = reserves[1]
            .mul(token1Price)
            .div(getMantissaBigNumber(token1Decimals))

        const liquidity = token0Tvl.add(token1Tvl)
        await this.cache.setBn(
            getCacheKey(CachePrefix.pair, pairAddress, 'liquidity'),
            liquidity,
            this.config.pairRefreshTimeout
        )
        return liquidity
    }

    // Need to make this contract stuff
    protected async getPairVolume(
        pairAddress: string,
        period: TimePeriod = '1d'
    ) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.pair, period, pairAddress, 'volume')
        )
        if (cachedValue) return cachedValue

        const { data: pairData } = await this.exchangeGraphClient.query({
            query: pairByAddress,
            variables: {
                id: pairAddress,
            },
        })

        const pair = pairData.pair
        const blocks = await getBlocks(period)
        if (!blocks.length) {
            throw new Error('No data for that time period')
        }

        const blockNumber = Number(blocks[0].number)
        const {
            data: { pair: periodPair },
        } = await this.exchangeGraphClient.query({
            query: pairTimeTravelQuery,
            variables: {
                block: {
                    number: blockNumber,
                },
                pairAddress: pairAddress,
            },
            fetchPolicy: 'no-cache',
        })

        const volumeUSD =
            pair.volumeUSD === '0' ? pair.untrackedVolumeUSD : pair.volumeUSD
        const periodVolumeUSD =
            periodPair.volumeUSD === '0'
                ? periodPair.untrackedVolumeUSD
                : periodPair.volumeUSD

        const volumeUSDBn = stringToBn(volumeUSD, 18)
        const periodVolumeUSDBn = stringToBn(periodVolumeUSD, 18)
        const volume = volumeUSDBn.sub(periodVolumeUSDBn)
        await this.cache.setBn(
            getCacheKey(CachePrefix.pair, period, pairAddress, 'volume'),
            volume,
            this.config.pairRefreshTimeout
        )
        return volume
    }

    protected async getPairFees(
        pairAddress: string,
        period: TimePeriod = '1d'
    ) {
        const pairVolume = await this.getPairVolume(pairAddress, period)
        return pairVolume.mul(FEE_RATE).div(BigNumberMantissa)
    }

    protected async getPairApr(
        pairAddress: string,
        samplePeriod: TimePeriod = '1d'
    ) {
        // Move away from 1d hardcode
        const pairFees = await this.getPairFees(pairAddress, samplePeriod)
        const pairLiquidity = await this.getPairLiquidity(pairAddress)
        // Scale factor is 12 right now, this means that
        // we only fetch one month fees right now (because Avalanche has not been live for over a year)
        // return pairFees.mul(365).div(pairLiquidityNumber)
        return pairFees.mul(BigNumberMantissa).div(pairLiquidity)
    }

    protected async getPairAprGraph(
        pairAddress: string,
        samplePeriod: TimePeriod = '1d'
    ) {
        // This is unnecessary, find how to optimize this with cache
        const { data: pairData } = await this.exchangeGraphClient.query({
            query: pairByAddress,
            variables: {
                id: pairAddress,
            },
        })

        const pair = pairData.pair
        const periodFees = await this.getPairFees(pairAddress, samplePeriod)
        const reserveUSD = stringToBn(pair.reserveUSD, 18)
        return periodFees.mul(BigNumberMantissa).div(reserveUSD)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/:pairAddress/liquidity', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            const err = validateAddress(pairAddress)
            if (err) next(err)
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
            const err = validateAddress(pairAddress)
            if (err) next(err)
            const valid = validatePeriod(req.query.period as string)
            if (!valid) next('Invalid period: ' + req.query.period)
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
            const err = validateAddress(pairAddress)
            if (err) next(err)
            const valid = validatePeriod(req.query.period as string)
            if (!valid) next('Invalid period: ' + req.query.period)
            const period = req.query.period as TimePeriod
            try {
                const feesCollected = await this.getPairFees(
                    pairAddress,
                    period
                )
                res.send(formatRes(feesCollected.toString()))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:pairAddress/apr', async (req, res, next) => {
            const pairAddress = req.params.pairAddress.toLowerCase()
            const err = validateAddress(pairAddress)
            if (err) next(err)
            const valid = validatePeriod(req.query.period as string)
            if (!valid) next('Invalid period: ' + req.query.period)
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

    public async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
