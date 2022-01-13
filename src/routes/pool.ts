import express from 'express'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import { BigNumber, Contract, ethers } from 'ethers'

import { Address, BigNumberMantissa } from '../constants'
import { getRandomProvider } from '../provider'
import { poolById, poolByPair } from '../queries'
import { PriceController } from './price'
import { bnStringToDecimal, formatRes, getMantissaBigNumber, stringToBn,  convertPeriod, secondsToPeriod } from '../util'
import { TimePeriod } from '../types'
import { PeriodRate } from './banker'

import MasterChefABI from '../../abi/MasterChef.json'
import JoePairABI from '../../abi/JoePair.json'
import ERC20ABI from '../../abi/ERC20.json'
import RewarderABI from '../../abi/SimpleRewarder.json'
import JoeFactoryABI from '../../abi/JoeFactory.json'
import JoeLPTokenABI from '../../abi/JoeLPToken.json'

const MasterChefContract = new ethers.Contract(
    Address.JOE_MASTER_CHEF_ADDRESS,
    MasterChefABI,
    getRandomProvider()
)

const JoeFactoryContract = new ethers.Contract(
    Address.JOE_FACTORY_ADDRESS,
    JoeFactoryABI,
    getRandomProvider()
)

// Pool (or farm) controller. Where you stake your LP tokens
export class PoolController {
    // This masterchef stuff is still abstract to get from contracts
    private masterChefGraphClient: ApolloClient<NormalizedCacheObject>
    private priceController: PriceController
    private pairContract: Contract
    private tokenContract: Contract
    private rewardContract: Contract

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer
    private temporalRefreshInterval: NodeJS.Timer

    private cachedPoolApr: { [address: string]: PeriodRate } // should we store everything as 1s?
    private cachedPoolBonusApr: { [address: string]: PeriodRate }
    private cachedPoolTvl: { [address: string]: BigNumber }

    constructor(priceController: PriceController, masterChefGraphUrl: string, refreshInterval: number) {
        this.priceController = priceController
        this.masterChefGraphClient = new ApolloClient<NormalizedCacheObject>({
            uri: masterChefGraphUrl,
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
        this.rewardContract = new ethers.Contract(
            Address.GOHM_REWARD_ADDRESS,
            RewarderABI,
            getRandomProvider()
        )
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.temporalRefreshInterval = setInterval(() => {})
        this.cachedPoolApr = {}
        this.cachedPoolBonusApr = {}
        this.cachedPoolTvl = {}
    }

    async init() {
        this.hardRefreshInterval = setInterval(async () => {
            this.cachedPoolTvl = {}
        }, this.refreshInterval)

        this.temporalRefreshInterval = setInterval(async () => {
            this.cachedPoolApr = {}
            this.cachedPoolBonusApr = {}
        }, 2e7) // abt 6 hours
    }

    async getPoolByPair(pair: string) {
        // Find how to get this through masterchef

        // To do this, you will need to get the pair LP token, get token0 and token1 from that, and plug those into
        // JoeFactory to get the pair address
        // Probably avoid this for speed issues but generally this is how to make this completely contract dependent
        const { data: pools } = await this.masterChefGraphClient.query({
            query: poolByPair,
            variables: { pair },
        })

        return pools[0]
    }

    async getPoolById(id: string) {
        const { data: { pools } } = await this.masterChefGraphClient.query({
            query: poolById,
            variables: { id },
        })

        return pools[0]
    }

    // Gets pool pair (only pair) directly through contract. Most likely slower than GraphQL, but would switch this to completely contract dependent.
    async getPoolPairByIdContract(id: string) {
        const poolInfo = await MasterChefContract.poolInfo(id)

        const lpTokenContract = new ethers.Contract(
            poolInfo[0],
            JoeLPTokenABI,
            getRandomProvider()
        )

        const token0 = await lpTokenContract.token0()
        const token1 = await lpTokenContract.token1()
        const pair = await JoeFactoryContract.getPair(token0, token1)
        return pair
    }

    // Gets totalSupply of joe LP token
    // Example: https://snowtrace.io/token/0x62cf16bf2bc053e7102e2ac1dee5029b94008d99#readContract
    async getPairTotalSupply(pair: string) {
        const customContract = this.pairContract.attach(pair)
        const totalSupply = await customContract.totalSupply()
        const balance = await customContract.balanceOf(Address.JOE_MASTER_CHEF_ADDRESS)
        return {
            totalSupply,
            balance
        }
    }

    async getPairLiquidity(pairAddress: string) {
        // Somehow validate that pairAddress is a valid pair

        // Cache

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

    // mixing graphql with contracts, prefer to go either or because of consistency and optimization
    // Please revisit all of this in the optimization run
    async getPoolApr(poolId: string, period: TimePeriod = "1y") {
        if (this.cachedPoolApr[poolId]) {
            if (this.cachedPoolApr[poolId].period != period) {
                return convertPeriod(this.cachedPoolApr[poolId], period)
            }

            return this.cachedPoolApr[poolId].period
        }

        const joePrice = await this.priceController.getPrice(Address.JOE_ADDRESS, false)

        const totalAllocPoint = await MasterChefContract.totalAllocPoint()
        const joePerSec = await MasterChefContract.joePerSec()
        const poolInfo = await MasterChefContract.poolInfo(poolId)

        const allocPoint = poolInfo[3]

        // BalanceUSD represents the liquidity of the pool
        const balanceUSD = await this.getPoolTvl(poolId)

        // Multiply joePerSec by allocPoint / totalAllocPoint ratio
        const rewardsPerSec = allocPoint.mul(joePerSec).div(totalAllocPoint)
        
        // Get it in dollar amounts and divide by balanceUSD to get percentage
        const roiPerSec = rewardsPerSec.mul(joePrice).div(balanceUSD)

        const rate = secondsToPeriod(roiPerSec, period)
        this.cachedPoolApr[poolId] = {period, rate}
        return rate
    }

    async getPair(token0: string, token1: string) {
        if (token0 > token1) {
            return await JoeFactoryContract.getPair(token0, token1)
        } else {
            return await JoeFactoryContract.getPair(token1, token0)
        }
    }

    async getPoolTvl(poolId: string) {
        if (this.cachedPoolTvl[poolId]) {
            return this.cachedPoolTvl[poolId]
        }

        const pool = await this.getPoolById(poolId)

        // TotalSupply and balance represents underlying LP token totalSupply and balance of
        // MasterChef contract
        const { totalSupply, balance } = await this.getPairTotalSupply(pool.pair)

        // Reserve represents the liquidity of the underlying pair
        const reserveUSD = await this.getPairLiquidity(pool.pair)

        // BalanceUSD represents the liquidity of the pool
        const balanceUSD = balance.mul(reserveUSD).div(totalSupply)

        this.cachedPoolTvl[poolId] = balanceUSD
        return balanceUSD
    }

    async getPoolBonus(poolId: string, period: TimePeriod = "1y") {
        if (this.cachedPoolBonusApr[poolId]) {
            if (this.cachedPoolApr[poolId].period != period) {
                return convertPeriod(this.cachedPoolApr[poolId], period)
            }

            return this.cachedPoolApr[poolId].rate
        }

        const poolInfo = await MasterChefContract.poolInfo(poolId)
        const rewarderAddress = poolInfo[4]
        
        const customRewarderContract = this.rewardContract.attach(rewarderAddress)
        const rewardToken = await customRewarderContract.rewardToken()
        const tokenPerSec = await customRewarderContract.tokenPerSec()

        // Get reward token price
        const rewardTokenPrice = await this.priceController.getPrice(rewardToken, false)

        // Get pool tvl, or balanceUSD
        const balanceUSD = await this.getPoolTvl(poolId)

        // Get it in dollar amounts and divide by balanceUSD to get percentage
        const roiPerSec = tokenPerSec.mul(rewardTokenPrice).div(balanceUSD)

        let rate = secondsToPeriod(roiPerSec, period)
        this.cachedPoolBonusApr[poolId] = {period, rate}
        return rate
    }

    get apiRouter() {
        // Test pool id: 3
        // Test pool pair: 0x62cf16bf2bc053e7102e2ac1dee5029b94008d99
        const router = express.Router()

        // Maybe change to /liquidity
        router.get('/:poolId/tvl', async (req, res, next) => {
            const poolId = req.params.poolId
            try {
                const poolTvl = await this.getPoolTvl(poolId)
                res.send(formatRes(bnStringToDecimal(poolTvl.toString(), 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:poolId/apr', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period as TimePeriod
            try {
                const poolApr = await this.getPoolApr(poolId, period)
                res.send(formatRes(bnStringToDecimal(poolApr.toString(), 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:poolId/apr/bonus', async (req, res, next) => {
            const poolId = req.params.poolId
            const period = req.query.period as TimePeriod
            try {
                const poolApr = await this.getPoolBonus(poolId, period)
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
