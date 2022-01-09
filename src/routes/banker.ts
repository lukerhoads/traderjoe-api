import { BigNumber, Contract, ethers } from 'ethers'
import express from 'express'
import { TimePeriod } from '../types'
import { Address, BigNumberMantissa, BigNumberZero } from '../constants'
import { getRandomProvider } from '../provider'
import { PriceController } from './price'
import { getMantissaBigNumber, bnStringToDecimal, formatRes } from '../util'

import JoetrollerABI from '../../abi/Joetroller.json'
import JTokenABI from '../../abi/JToken.json'
import ERC20ABI from '../../abi/ERC20.json'

const JoetrollerContract = new ethers.Contract(
    Address.JOETROLLER_ADDRESS,
    JoetrollerABI,
    getRandomProvider()
)

export interface PeriodApy {
    period: TimePeriod
    rate: BigNumber
}

export class BankerController {
    private jTokenContract: Contract
    private underlyingContract: Contract
    private priceController: PriceController

    private markets: string[]

    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private totalSupply: BigNumber
    private totalBorrow: BigNumber

    private cachedMarketSupply: { [address: string]: BigNumber }
    private cachedMarketBorrow: { [address: string]: BigNumber }

    private cachedUserSupply: { [address: string]: BigNumber }
    private cachedUserBorrow: { [address: string]: BigNumber }

    private cachedMarketSupplyApy: { [address: string]: PeriodApy }
    private cachedMarketBorrowApy: { [address: string]: PeriodApy }

    private cachedUserNetApy: { [address: string]: BigNumber }

    constructor(
        priceController: PriceController,
        refreshInterval: number
    ) {
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
        this.markets = []
        this.priceController = priceController
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.totalSupply = BigNumber.from("0")
        this.totalBorrow = BigNumber.from("0")
        this.cachedMarketBorrow = {} 
        this.cachedMarketSupply = {}
        this.cachedUserBorrow = {}
        this.cachedUserSupply = {}
        this.cachedMarketSupplyApy = {}
        this.cachedMarketBorrowApy = {}
        this.cachedUserNetApy = {}
    }

    async init() {
        const markets = await JoetrollerContract.getAllMarkets()
        this.markets = markets.map((market: string) => market.toLowerCase())
        await this.resetTotals()
        this.hardRefreshInterval = setInterval(async () => {
            await this.resetTotals()
        }, this.refreshInterval)
    }

    async resetTotals() {
        let tempTotalSupply = BigNumber.from("0")
        let tempTotalBorrow = BigNumber.from("0")
        await Promise.all(this.markets.map(async (market: string) => {
            const supplyByMarket = await this.getSupplyByMarket(market)
            const borrowByMarket = await this.getBorrowByMarket(market)
            tempTotalSupply = tempTotalSupply.add(supplyByMarket)
            tempTotalBorrow = tempTotalBorrow.add(borrowByMarket)
        }))

        this.totalSupply = tempTotalSupply
        this.totalBorrow = tempTotalBorrow
    }

    async getSupplyByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error("Invalid market address provided.")
        }
        
        if (this.cachedMarketSupply[marketAddress]) {
            return this.cachedMarketSupply[marketAddress]
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const underlying = await customContract.underlying()
        const jTokenTotalSupply = await customContract.totalSupply()
        const exchangeRate = await customContract.exchangeRateStored()
        const underlyingPrice = await this.priceController.getPrice(underlying, false)
        
        const divideExp = (27 + exchangeRate.toString().length) - 18
        const divisor = getMantissaBigNumber(divideExp)
        const totalSupply = jTokenTotalSupply.mul(exchangeRate).mul(underlyingPrice)
        this.cachedMarketSupply[marketAddress] = totalSupply.div(divisor)
        
        // Get borrow too, so we don't have to re-attach for the next borrow request
        const totalBorrow = await customContract.totalBorrows()
        const adjustedBorrow = totalBorrow.mul(underlyingPrice).div(BigNumberMantissa)
        this.cachedMarketBorrow[marketAddress] = adjustedBorrow
        return totalSupply.div(divisor)
    }

    async getBorrowByMarket(marketAddress: string) {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error("Invalid market address provided.")
        }

        if (this.cachedMarketBorrow[marketAddress]) {
            return this.cachedMarketBorrow[marketAddress]
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const underlying = await customContract.underlying()
        const underlyingPrice = await this.priceController.getPrice(underlying, false)
        const totalBorrows = await customContract.totalBorrows()
        const adjustedBorrow = totalBorrows.mul(underlyingPrice).div(BigNumberMantissa)
        this.cachedMarketBorrow[marketAddress] = adjustedBorrow
        return adjustedBorrow
    }

    async getSupplyApyByMarket(marketAddress: string, period: TimePeriod = "1y") {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error("Invalid market address provided.")
        }

        if (this.cachedMarketSupplyApy[marketAddress] && this.cachedMarketSupplyApy[marketAddress].period === period) {
            return this.cachedMarketSupplyApy[marketAddress].rate
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const supplyRatePerSecond = await customContract.supplyRatePerSecond()
        let rate: BigNumber
        switch (period) {
            case "1s": 
                rate = supplyRatePerSecond
            case "1h":
                rate = supplyRatePerSecond.mul(3600)
            case "1d":
                rate = supplyRatePerSecond.mul(3600 * 24)
            case "1m":
                rate = supplyRatePerSecond.mul(3600 * 24 * 30)
            case "1y":
                rate = supplyRatePerSecond.mul(3600 * 24 * 30 * 12)
        }

        this.cachedMarketSupplyApy[marketAddress] = {period: period, rate}
        return rate
    }

    async getBorrowApyByMarket(marketAddress: string, period: TimePeriod = "1y") {
        if (!this.markets.includes(marketAddress.toLowerCase())) {
            throw new Error("Invalid market address provided.")
        }

        if (this.cachedMarketSupplyApy[marketAddress] && this.cachedMarketSupplyApy[marketAddress].period === period) {
            return this.cachedMarketSupplyApy[marketAddress].rate
        }

        const customContract = this.jTokenContract.attach(marketAddress)
        const borrowRatePerSecond = await customContract.borrowRatePerSecond()
        let rate: BigNumber
        switch (period) {
            case "1s": 
                rate = borrowRatePerSecond
            case "1h":
                rate = borrowRatePerSecond.mul(3600)
            case "1d":
                rate = borrowRatePerSecond.mul(3600 * 24)
            case "1m":
                rate = borrowRatePerSecond.mul(3600 * 24 * 30)
            case "1y":
                rate = borrowRatePerSecond.mul(3600 * 24 * 30 * 12)
        }

        this.cachedMarketBorrowApy[marketAddress] = {period: period, rate}
        return rate
    }

    async getUserSupply(user: string) {
        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error("User has not supplied any assets")
        }

        const totalSupplied = await Promise.all(assetsIn.map(async (asset: string) => {
            const customContract = this.jTokenContract.attach(asset)
            const suppliedAssets = await customContract.balanceOf(user)
            if (suppliedAssets.eq(BigNumberZero)) {
                return
            }

            const underlying = await customContract.underlying()
            const exchangeRate = await customContract.exchangeRateStored()
            const underlyingPrice = await this.priceController.getPrice(underlying, false)

            const divideExp = (27 + exchangeRate.toString().length) - 18
            const divisor = getMantissaBigNumber(divideExp)
            const totalSupply = suppliedAssets.mul(exchangeRate).mul(underlyingPrice)
            const totalSupplyConv = totalSupply.div(divisor)
            return totalSupplyConv
        }))

        let userSupply = BigNumber.from("0")
        for (let i = 0; i < totalSupplied.length; i++) {
            userSupply = userSupply.add(totalSupplied[i])
        }

        this.cachedUserSupply[user] = userSupply
        return userSupply
    }

    async getUserBorrow(user: string) {
        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error("User has not supplied any assets")
        }

        const totalBorrowed = await Promise.all(assetsIn.map(async (asset: string) => {
            const customContract = this.jTokenContract.attach(asset)
            const accountSnapshot = await customContract.getAccountSnapshot(user)
            const borrowedAssets = accountSnapshot[2]

            const underlying = await customContract.underlying()
            const underlyingPrice = await this.priceController.getPrice(underlying, false)
            const customUnderlyingContract = this.underlyingContract.attach(underlying)
            const underlyingDecimals = await customUnderlyingContract.decimals()

            const divisor = getMantissaBigNumber(underlyingDecimals)
            const totalBorrow = borrowedAssets.mul(underlyingPrice).div(divisor)
            return totalBorrow
        }))

        let userBorrow = BigNumber.from("0")
        for (let i = 0; i < totalBorrowed.length; i++) {
            userBorrow = userBorrow.add(totalBorrowed[i])
        }

        this.cachedUserBorrow[user] = userBorrow
        return userBorrow
    }

    async getUserNetApy(user: string, period: TimePeriod = "1y") {
        const assetsIn = await JoetrollerContract.getAssetsIn(user)
        if (!assetsIn) {
            throw new Error("User has not supplied any assets")
        }

        let netApy = BigNumber.from("0")
        const allApys = await Promise.all(assetsIn.map(async (asset: string) => {
            const customContract = this.jTokenContract.attach(asset)
            const accountSnapshot = await customContract.getAccountSnapshot(user)
            const borrowedAssets = accountSnapshot[2]
            if (borrowedAssets.toString() != "0") {
                const borrowApy = await this.getBorrowApyByMarket(asset, period)
                netApy = netApy.sub(borrowApy)
            }

            const suppliedAssets = await customContract.balanceOf(user)
            if (suppliedAssets.toString() != "0") {
                const supplyApy = await this.getSupplyApyByMarket(asset, period)
                netApy = netApy.add(supplyApy)
            }

            return netApy
        }))

        this.cachedUserNetApy[user] = netApy
        return netApy
    }

    get apiRouter() {
        const router = express.Router()

        // Total supply and borrow across pools
        router.get('/supply', async (req, res, next) => {
            res.send(formatRes(this.totalSupply.toString()))
        })

        router.get('/borrow', async (req, res, next) => {
            res.send(formatRes(this.totalBorrow.toString()))
        })

        // Total supply and borrow across one pool
        router.get('/supply/:marketAddress', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            try {
                const supplyByMarket = await this.getSupplyByMarket(marketAddress)
                const supplyByMarketString = supplyByMarket.toString()
                res.send(formatRes(bnStringToDecimal(supplyByMarketString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/borrow/:marketAddress', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            try {
                const borrowByMarket = await this.getBorrowByMarket(marketAddress)
                const borrowByMarketString = borrowByMarket.toString()
                res.send(formatRes(bnStringToDecimal(borrowByMarketString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/supply/:marketAddress/apy', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const period = req.query.period as TimePeriod

            try {
                const supplyApy = await this.getSupplyApyByMarket(marketAddress, period)
                const supplyApyString = supplyApy.toString()
                res.send(formatRes(bnStringToDecimal(supplyApyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/borrow/:marketAddress/apy', async (req, res, next) => {
            const marketAddress = req.params.marketAddress.toLowerCase()
            const period = req.query.period as TimePeriod

            try {
                const borrowApy = await this.getBorrowApyByMarket(marketAddress, period)
                const borrowApyString = borrowApy.toString()
                res.send(formatRes(bnStringToDecimal(borrowApyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        // Individual user rewards
        router.get('/supply/user/:userAddress', async (req, res, next) => {
            const user = req.params.userAddress.toLowerCase()
            try {
                const supply = await this.getUserSupply(user)
                const supplyString = supply.toString()
                res.send(formatRes(bnStringToDecimal(supplyString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/borrow/user/:userAddress', async (req, res, next) => {
            const user = req.params.userAddress.toLowerCase()
            try {
                const borrow = await this.getUserBorrow(user)
                const borrowString = borrow.toString()
                res.send(formatRes(bnStringToDecimal(borrowString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/:userAddress/net/apy', async (req, res, next) => {
            const userAddress = req.params.userAddress.toLowerCase()
            const period = req.query.period as TimePeriod

            try {
                const netApy = await this.getUserNetApy(userAddress, period)
                const netApyString = netApy.toString()
                res.send(formatRes(bnStringToDecimal(netApyString, 18)))
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
