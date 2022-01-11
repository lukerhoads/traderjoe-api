import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { Contract, ethers } from 'ethers'

import MasterChefABI from '../../abi/MasterChef.json'
import { Address } from '../constants'
import { getRandomProvider } from '../provider'
import { poolById, poolByPair } from '../queries'
import { PriceController } from './price'
import { formatRes, getMantissaBigNumber } from '../util'

import JoePairABI from '../../abi/JoePair.json'
import ERC20ABI from '../../abi/ERC20.json'
import { TimePeriod } from '../types'

const MasterChefContract = new ethers.Contract(
    Address.JOE_MASTER_CHEF_ADDRESS,
    MasterChefABI,
    getRandomProvider()
)

// Pool (or farm) controller. Where you stake your LP tokens
export class PoolController {
    private exchangeGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController
    private pairContract: Contract
    private tokenContract: Contract

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    constructor(priceController: PriceController, exchangeGraphUrl: string, refreshInterval: number) {
        this.priceController = priceController
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
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
    }

    async init() {
        this.hardRefreshInterval = setInterval(async () => {

        }, this.refreshInterval)
    }

    async getPoolByPair(pair: string) {
        const { data: pools } = await this.exchangeGraphClient.query({
            query: poolByPair,
            variables: { pair },
        })

        return pools[0]
    }

    async getPoolById(id: string) {
        const { data: pools } = await this.exchangeGraphClient.query({
            query: poolById,
            variables: { id },
        })

        return pools[0]
    }

    async getPairTotalSupply(pair: string) {
        const customContract = this.pairContract.attach(pair)
        const totalSupply = await customContract.totalSupply()
        return totalSupply
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

    async getPoolApr(poolId: string, period: TimePeriod = "1m") {
        const joePrice = await this.priceController.getPrice(Address.JOE_ADDRESS, false)
        const pool = await this.getPoolById(poolId)
        const totalAllocPoint = await MasterChefContract.totalAllocPoint()
        const poolInfo = await MasterChefContract.poolInfo(poolId)
        const joePerSec = await MasterChefContract.joePerSec()
        const totalSupply = await this.getPairTotalSupply(pool.pair)
        const reserveUSD = await this.getPairLiquidity(pool.pair)
        // mixing graphql with contracts, prefer to go either or because of consistency and optimization
        // Please revisit all of this in the optimization run
        const balance = pool.balance / 1e18
        const balanceUSD = (balance / totalSupply) * reserveUSD

        // poolInfo[3] = allocPoint
        const rewardsPerSec = ((poolInfo[3] / totalAllocPoint) * joePerSec)
        const roiPerSec = (rewardsPerSec * joePrice.toNumber()) / balanceUSD
        switch (period) {
            case "1s":
                return roiPerSec
            case "1m":
                return roiPerSec * 60
            case "1h":
                return roiPerSec * 60 * 60
            case "1d":
                return roiPerSec * 60 * 60 * 24
            case "1w": 
                return roiPerSec * 60 * 60 * 24 * 7
            case "1y":
                return roiPerSec * 60 * 60 * 24 * 365
        }
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/:poolId/weight', async (req, res, next) => {

        })

        // Query params for period
        router.get('/:poolId/tvl', async (req, res, next) => {

        })

        router.get('/:poolId/apr', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period as TimePeriod
            try {
                const poolApr = await this.getPoolApr(poolId, period)
                res.send(formatRes(poolApr))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:poolId/apr/bonus', async (req, res, next) => {
            
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
