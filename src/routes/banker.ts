import { BigNumber, Contract, ethers } from 'ethers'
import express from 'express'
import {
    Address,
    BigNumberMantissa,
    BigNumberZero,
    CachePrefix,
} from '../constants'
import { getRandomProvider } from '../provider'
import { PriceController } from './price'
import {
    getMantissaBigNumber,
    bnStringToDecimal,
    formatRes,
    rateToYear,
    validateAddress,
} from '../util'
import { OpConfig } from '../config'
import { Controller } from './controller'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'
import ERC20ABI from '../../abi/ERC20.json'
import { Cache } from '../cache'
import { getCacheKey } from '../util/cache-key'

const JoetrollerContract = new ethers.Contract(
    Address.JOETROLLER_ADDRESS,
    JoetrollerABI,
    getRandomProvider()
)

export class BankerController implements Controller {
    private config: OpConfig
    private cache: Cache

    private jTokenContract: Contract
    private underlyingContract: Contract
    private priceController: PriceController

    private markets: string[] = []

    private hardRefreshInterval: NodeJS.Timer

    private totalSupply: BigNumber = BigNumber.from('0')
    private totalBorrow: BigNumber = BigNumber.from('0')

    // private cachedMarketSupply: { [address: string]: BigNumber } = {}
    // private cachedMarketBorrow: { [address: string]: BigNumber } = {}

    // private cachedUserSupply: { [address: string]: BigNumber } = {}
    // private cachedUserBorrow: { [address: string]: BigNumber } = {}

    // private cachedMarketSupplyApy: { [address: string]: BigNumber } = {}
    // private cachedMarketBorrowApy: { [address: string]: BigNumber } = {}

    // private cachedUserNetApy: { [address: string]: BigNumber } = {}

    constructor(
        config: OpConfig,
        cache: Cache,
        priceController: PriceController
    ) {
        this.config = config
        this.cache = cache
        this.priceController = priceController
        this.jTokenContract = new ethers.Contract(
            Address.JAVAX_ADDRESS,
            JTokenABI,
            getRandomProvider()
        )
        this.underlyingContract = new ethers.Contract(
            Address.WAVAX_ADDRESS,
            ERC20ABI,
            getRandomProvider()
        )
        this.hardRefreshInterval = setInterval(() => {})
    }

    public async init() {
        const markets = await JoetrollerContract.getAllMarkets()
        this.markets = markets.map((market: string) => market.toLowerCase())
        await this.resetTotals()
        this.hardRefreshInterval = setInterval(async () => {
            this.clearCache()
            await this.resetTotals()
        }, this.config.bankRefreshTimeout)
    }

    private clearCache() {
        // this.cachedMarketSupply = {}
        // this.cachedMarketBorrow = {}
        // this.cachedUserSupply = {}
        // this.cachedUserBorrow = {}
        // this.cachedMarketSupplyApy = {}
        // this.cachedMarketBorrowApy = {}
        // this.cachedUserNetApy = {}
    }

    protected async resetTotals() {
        let tempTotalSupply = BigNumber.from('0')
        let tempTotalBorrow = BigNumber.from('0')
        await Promise.all(
            this.markets.map(async (market: string) => {
                const supplyByMarket = await this.getSupplyByMarket(market)
                const borrowByMarket = await this.getBorrowByMarket(market)
                tempTotalSupply = tempTotalSupply.add(supplyByMarket)
                tempTotalBorrow = tempTotalBorrow.add(borrowByMarket)
            })
        )

        this.totalSupply = tempTotalSupply
        this.totalBorrow = tempTotalBorrow
    }

    protected async getSupplyByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error('Invalid market address provided.')
        }

        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'supplyByMarket')
        )
        if (cachedValue) {
            return cachedValue
        }

        const customContract = this.jTokenContract.attach(marketAddress)
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
        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'supplyByMarket'),
            totalSupply.div(divisor),
            this.config.bankRefreshTimeout
        )

        // Get borrow too, so we don't have to re-attach for the next borrow request
        const totalBorrow = await customContract.totalBorrows()
        const adjustedBorrow = totalBorrow
            .mul(underlyingPrice)
            .div(BigNumberMantissa)
        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'supplyByMarket'),
            adjustedBorrow,
            this.config.bankRefreshTimeout
        )
        return totalSupply.div(divisor)
    }

    protected async getBorrowByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error('Invalid market address provided.')
        }

        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'borrowByMarket')
        )
        if (cachedValue) {
            return cachedValue
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const underlying = await customContract.underlying()
        const underlyingPrice = await this.priceController.getPrice(
            underlying,
            false
        )
        const totalBorrows = await customContract.totalBorrows()
        const adjustedBorrow = totalBorrows
            .mul(underlyingPrice)
            .div(BigNumberMantissa)
        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'borrowByMarket'),
            adjustedBorrow,
            this.config.bankRefreshTimeout
        )
        return adjustedBorrow
    }

    protected async getSupplyApyByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error('Invalid market address provided.')
        }

        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'supplyApyByMarket')
        )
        if (cachedValue) {
            return cachedValue
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const supplyRatePerSecond = await customContract.supplyRatePerSecond()
        let rate = rateToYear({
            period: '1s',
            rate: supplyRatePerSecond,
        })
        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'supplyApyByMarket'),
            rate,
            this.config.bankRefreshTimeout
        )
        return rate
    }

    protected async getBorrowApyByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error('Invalid market address provided.')
        }

        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'borrowApyByMarket')
        )
        if (cachedValue) {
            return cachedValue
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const borrowRatePerSecond = await customContract.borrowRatePerSecond()
        let rate = rateToYear({
            period: '1s',
            rate: borrowRatePerSecond,
        })
        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, marketAddress, 'borrowApyByMarket'),
            rate,
            this.config.bankRefreshTimeout
        )
        return rate
    }

    protected async getUserSupply(user: string) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, user, 'userSupply')
        )
        if (cachedValue) {
            return cachedValue
        }

        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error('User has not supplied any assets')
        }

        const totalSupplied = await Promise.all(
            assetsIn.map(async (asset: string) => {
                const customContract = this.jTokenContract.attach(asset)
                const suppliedAssets = await customContract.balanceOf(user)
                if (suppliedAssets.eq(BigNumberZero)) {
                    return
                }

                const underlying = await customContract.underlying()
                const exchangeRate = await customContract.exchangeRateStored()
                const underlyingPrice = await this.priceController.getPrice(
                    underlying,
                    false
                )

                const divideExp = 27 + exchangeRate.toString().length - 18
                const divisor = getMantissaBigNumber(divideExp)
                const totalSupply = suppliedAssets
                    .mul(exchangeRate)
                    .mul(underlyingPrice)
                const totalSupplyConv = totalSupply.div(divisor)
                return totalSupplyConv
            })
        )

        let userSupply = BigNumber.from('0')
        for (let i = 0; i < totalSupplied.length; i++) {
            userSupply = userSupply.add(totalSupplied[i])
        }

        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, user, 'userSupply'),
            userSupply,
            this.config.bankRefreshTimeout
        )
        return userSupply
    }

    protected async getUserBorrow(user: string) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, user, 'userBorrow')
        )
        if (cachedValue) {
            return cachedValue
        }

        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error('User has not borrowed any assets')
        }

        const totalBorrowed = await Promise.all(
            assetsIn.map(async (asset: string) => {
                const customContract = this.jTokenContract.attach(asset)
                const accountSnapshot = await customContract.getAccountSnapshot(
                    user
                )
                const borrowedAssets = accountSnapshot[2]

                const underlying = await customContract.underlying()
                const underlyingPrice = await this.priceController.getPrice(
                    underlying,
                    false
                )
                const customUnderlyingContract =
                    this.underlyingContract.attach(underlying)
                const underlyingDecimals =
                    await customUnderlyingContract.decimals()

                const divisor = getMantissaBigNumber(underlyingDecimals)
                const totalBorrow = borrowedAssets
                    .mul(underlyingPrice)
                    .div(divisor)
                return totalBorrow
            })
        )

        let userBorrow = BigNumber.from('0')
        for (let i = 0; i < totalBorrowed.length; i++) {
            userBorrow = userBorrow.add(totalBorrowed[i])
        }

        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, user, 'userBorrow'),
            userBorrow,
            this.config.bankRefreshTimeout
        )
        return userBorrow
    }

    protected async getUserNetApy(user: string) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.banker, user, 'userNetApy')
        )
        if (cachedValue) {
            return cachedValue
        }

        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error('User is not invested in any markets')
        }

        const allApys = await Promise.all(
            assetsIn.map(async (asset: string) => {
                let assetNetApy = BigNumber.from('0')
                const customContract = this.jTokenContract.attach(asset)
                const accountSnapshot = await customContract.getAccountSnapshot(
                    user
                )
                const borrowedAssets = accountSnapshot[2]
                if (!borrowedAssets.isZero()) {
                    const borrowApy = await this.getBorrowApyByMarket(asset)
                    assetNetApy = assetNetApy.sub(borrowApy)
                }

                const suppliedAssets = await customContract.balanceOf(user)
                if (!suppliedAssets.isZero()) {
                    const supplyApy = await this.getSupplyApyByMarket(asset)
                    assetNetApy = assetNetApy.add(supplyApy)
                }

                return assetNetApy
            })
        )

        let netApy = BigNumber.from('0')
        for (let i = 0; i < allApys.length; i++) {
            netApy = netApy.add(allApys[i])
        }

        await this.cache.setBn(
            getCacheKey(CachePrefix.banker, user, 'userNetApy'),
            netApy,
            this.config.bankRefreshTimeout
        )
        return netApy
    }

    get apiRouter() {
        const router = express.Router()

        // Total supply and borrow across pools
        router.get('/supply', async (req, res, next) => {
            res.send(
                formatRes(bnStringToDecimal(this.totalSupply.toString(), 18))
            )
        })

        router.get('/borrow', async (req, res, next) => {
            res.send(
                formatRes(bnStringToDecimal(this.totalBorrow.toString(), 18))
            )
        })

        // Total supply and borrow across one pool
        router.get('/supply/:marketAddress', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const err = validateAddress(marketAddress)
            if (err) next(err)
            try {
                const supplyByMarket = await this.getSupplyByMarket(
                    marketAddress
                )
                const supplyByMarketString = supplyByMarket.toString()
                res.send(formatRes(bnStringToDecimal(supplyByMarketString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/borrow/:marketAddress', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const err = validateAddress(marketAddress)
            if (err) next(err)
            try {
                const borrowByMarket = await this.getBorrowByMarket(
                    marketAddress
                )
                const borrowByMarketString = borrowByMarket.toString()
                res.send(formatRes(bnStringToDecimal(borrowByMarketString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/supply/:marketAddress/apy', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const err = validateAddress(marketAddress)
            if (err) next(err)
            try {
                const supplyApy = await this.getSupplyApyByMarket(marketAddress)
                const supplyApyString = supplyApy.toString()
                res.send(formatRes(bnStringToDecimal(supplyApyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        // Supply and borrow APY for a single market
        router.get('/borrow/:marketAddress/apy', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const err = validateAddress(marketAddress)
            if (err) next(err)
            try {
                const borrowApy = await this.getBorrowApyByMarket(marketAddress)
                const borrowApyString = borrowApy.toString()
                res.send(formatRes(bnStringToDecimal(borrowApyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/supply/user/:userAddress', async (req, res, next) => {
            const user = req.params.userAddress.toLowerCase()
            const err = validateAddress(user)
            if (err) next(err)
            try {
                const supply = await this.getUserSupply(user)
                const supplyString = supply.toString()
                res.send(formatRes(bnStringToDecimal(supplyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        // Supply and borrow APY for an individual user
        router.get('/borrow/user/:userAddress', async (req, res, next) => {
            const user = req.params.userAddress.toLowerCase()
            const err = validateAddress(user)
            if (err) next(err)
            try {
                const borrow = await this.getUserBorrow(user)
                const borrowString = borrow.toString()
                res.send(formatRes(bnStringToDecimal(borrowString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:userAddress/net/apy', async (req, res, next) => {
            const user = req.params.userAddress.toLowerCase()
            const err = validateAddress(user)
            if (err) next(err)
            try {
                const netApy = await this.getUserNetApy(user)
                const netApyString = netApy.toString()
                res.send(formatRes(bnStringToDecimal(netApyString, 18)))
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
