import express from 'express'
import { getRandomProvider } from '../provider'
import { Address, BigNumberMantissa, CachePrefix } from '../constants'
import { BigNumber, Contract, ethers } from 'ethers'
import { bnStringToDecimal, formatRes, getCacheKey, validateAddress } from '../util'
import { OpConfig } from '../config'
import { Cache } from '../cache'

import JoeBarContractABI from '../../abi/JoeBar.json'
import JoeFactoryABI from '../../abi/JoeFactory.json'
import ERC20 from '../../abi/ERC20.json'

const JoeFactoryContract = new ethers.Contract(
    Address.JOE_FACTORY_ADDRESS,
    JoeFactoryABI,
    getRandomProvider()
)

const XJoeContract = new ethers.Contract(
    Address.XJOE_ADDRESS,
    JoeBarContractABI,
    getRandomProvider()
)

const JoeContract = new ethers.Contract(
    Address.JOE_ADDRESS,
    ERC20,
    getRandomProvider()
)

export class PriceController {
    private config: OpConfig

    private cache: Cache
    private hardRefreshInterval: NodeJS.Timer

    // Not worth stuffing in redis
    private pairs: { [address: string]: string }
    private decimals: { [address: string]: number }
    private contracts: { [address: string]: Contract }

    constructor(config: OpConfig, cache: Cache) {
        this.config = config
        this.cache = cache
        this.hardRefreshInterval = setInterval(() => {})
        this.pairs = {}
        this.decimals = {}
        this.contracts = {}
    }

    async init() {
        await this.getAvaxPrice()

        this.hardRefreshInterval = setInterval(async () => {
            await this.getAvaxPrice()
        }, this.config.priceRefreshTimeout)
    }

    get apiRouter() {
        const router = express.Router()

        // Query param or part of url?
        router.get('/usd/:tokenAddress', async (req, res, next) => {
            const tokenAddress = req.params.tokenAddress.toLowerCase()
            const err = validateAddress(tokenAddress)
            if (err) next(err)
            try {
                const tokenPrice = await this.getPrice(tokenAddress, false)
                const tokenPriceString = tokenPrice.toString()
                res.send(formatRes(bnStringToDecimal(tokenPriceString, 18)))
            } catch (err) {
                next(err)
            }
        })

        router.get('/avax/:tokenAddress', async (req, res, next) => {
            const tokenAddress = req.params.tokenAddress.toLowerCase()
            const err = validateAddress(tokenAddress)
            if (err) next(err)
            try {
                const tokenPrice = await this.getPrice(tokenAddress, true)
                const tokenPriceString = tokenPrice.toString()
                res.send(formatRes(bnStringToDecimal(tokenPriceString, 18)))
            } catch (err) {
                next(err)
            }
        })

        return router
    }

    protected async getAvaxPair(
        tokenAddress: string
    ): Promise<string | undefined> {
        if (this.pairs[tokenAddress]) {
            return this.pairs[tokenAddress]
        }

        const pairAddress = await PriceController.getPairAddress(
            tokenAddress,
            Address.WAVAX_ADDRESS
        )
        if (!pairAddress || pairAddress === Address.ZERO_ADDRESS) {
            return undefined
        }

        this.pairs[tokenAddress] = pairAddress
        return pairAddress
    }

    protected async getDecimals(tokenAddress: string) {
        if (this.decimals[tokenAddress]) {
            return this.decimals[tokenAddress]
        }

        const tokenContract = this.getContract(tokenAddress)
        const decimals = await tokenContract.decimals()
        this.decimals[tokenAddress] = decimals
        return decimals
    }

    protected getContract(tokenAddress: string) {
        if (this.contracts[tokenAddress]) {
            return this.contracts[tokenAddress]
        }

        const contract = new ethers.Contract(
            tokenAddress,
            ERC20,
            getRandomProvider()
        )
        this.contracts[tokenAddress] = contract
        return contract
    }

    public async getAvaxPrice() {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.price, Address.WAVAX_ADDRESS, 'price')
        )
        if (cachedValue) {
            return cachedValue
        }

        const reserves = await Promise.all([
            this.getReserves(
                Address.WAVAX_ADDRESS,
                Address.USDC_ADDRESS,
                Address.WAVAX_USDC_ADDRESS
            ),
            this.getReserves(
                Address.WAVAX_ADDRESS,
                Address.USDT_ADDRESS,
                Address.WAVAX_USDT_ADDRESS
            ),
        ])

        const usdcPrice = reserves[0][1]
            .mul(BigNumberMantissa)
            .div(reserves[0][0])
        const usdtPrice = reserves[1][1]
            .mul(BigNumberMantissa)
            .div(reserves[1][0])

        const avaxPrice = usdcPrice.add(usdtPrice).div(BigNumber.from('2'))
        await this.cache.setBn(
            getCacheKey(CachePrefix.price, Address.WAVAX_ADDRESS, 'price'),
            avaxPrice,
            this.config.priceRefreshTimeout
        )
        return avaxPrice
    }

    public async getXJoePrice(derived: boolean) {
        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.price, Address.XJOE_ADDRESS, 'price')
        )
        if (cachedValue) {
            return cachedValue
        }

        const joeBalance = await JoeContract.balanceOf(Address.XJOE_ADDRESS)
        const totalSupply = await XJoeContract.totalSupply()
        const ratio = totalSupply.mul(BigNumberMantissa).div(joeBalance)
        const joePrice = await this.getPrice(Address.JOE_ADDRESS, derived)
        const xJoePrice = joePrice.mul(ratio).div(BigNumberMantissa)
        await this.cache.setBn(
            getCacheKey(CachePrefix.price, Address.XJOE_ADDRESS, 'price'),
            xJoePrice,
            this.config.priceRefreshTimeout
        )
        return xJoePrice
    }

    public async getPrice(
        tokenAddress: string,
        derived: boolean // whether or not to compare against AVAX
    ): Promise<BigNumber> {
        tokenAddress = tokenAddress.toLowerCase()
        if (tokenAddress === Address.WAVAX_ADDRESS) {
            return this.getAvaxPrice()
        }

        if (tokenAddress === Address.XJOE_ADDRESS) {
            return this.getXJoePrice(derived)
        }

        const cachedValue = await this.cache.getBn(
            getCacheKey(CachePrefix.price, tokenAddress, 'price')
        )
        if (cachedValue) {
            if (derived) return cachedValue

            const avaxPrice = await this.getAvaxPrice()
            return cachedValue.mul(avaxPrice).div(BigNumberMantissa)
        }

        const pairAddress = await this.getAvaxPair(tokenAddress)
        if (!pairAddress) {
            throw new Error(
                `Error given address ${tokenAddress}, isn't paired with WAVAX on TraderJoe`
            )
        }

        // Gets price in AVAX
        const reserve = await this.getReserves(
            Address.WAVAX_ADDRESS,
            tokenAddress,
            pairAddress
        )

        // Gets JOE price in AVAX
        const derivedPrice = reserve[0].mul(BigNumberMantissa).div(reserve[1])
        await this.cache.setBn(
            getCacheKey(CachePrefix.price, tokenAddress, 'price'),
            derivedPrice,
            this.config.priceRefreshTimeout
        )
        if (derived) return derivedPrice
        const avaxPrice = await this.getAvaxPrice()
        // DerivedPrice is relative to AVAX, avaxPrice is amount of dollars in an avax
        const price = derivedPrice.mul(avaxPrice).div(BigNumberMantissa)
        return price
    }

    protected async getReserves(
        token0Address: string,
        token1Address: string,
        pairAddress: string
    ): Promise<BigNumber[]> {
        const decimals = await Promise.all([
            this.getDecimals(token0Address),
            this.getDecimals(token1Address),
        ])

        // Fix code quality here
        let token0BalanceMultiplier = BigNumber.from('0')
        let token1BalanceMultiplier = BigNumber.from('0')

        if (decimals[0].toString() !== decimals[1].toString()) {
            if (decimals[0] > decimals[1]) {
                token1BalanceMultiplier = BigNumber.from(
                    decimals[0] - decimals[1]
                )
            } else {
                token0BalanceMultiplier = BigNumber.from(
                    decimals[1] - decimals[0]
                )
            }
        }

        const token0Contract = this.getContract(token0Address)
        const token0Balance = await token0Contract.balanceOf(pairAddress)
        const token1Contract = this.getContract(token1Address)
        const token1Balance = await token1Contract.balanceOf(pairAddress)

        const bn10 = BigNumber.from('10')
        return [
            token0Balance.mul(bn10.pow(token0BalanceMultiplier)),
            token1Balance.mul(bn10.pow(token1BalanceMultiplier)),
        ]
    }

    private static async getPairAddress(
        token0: string,
        token1: string
    ): Promise<string | undefined> {
        if (token0 && token1) {
            if (token0 > token1) {
                return JoeFactoryContract.getPair(token0, token1)
            } else {
                return JoeFactoryContract.getPair(token1, token0)
            }
        }

        return undefined
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
