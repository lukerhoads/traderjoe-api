import express from 'express'
import { getRandomProvider } from '../provider'
import { Address, BigNumberMantissa } from '../constants'
import { BigNumber, Contract, ethers } from 'ethers'

import JoeBarContractABI from '../../abi/JoeBar.json'
import JoeFactoryABI from '../../abi/JoeFactory.json'
import ERC20 from '../../abi/ERC20.json'
import { formatRes } from '../util/format_res'

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
    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private pairs: { [address: string]: string }
    private decimals: { [address: string]: number }
    private contracts: { [address: string]: Contract }
    private cachedPrices: { [address: string]: BigNumber }

    constructor(refreshInterval: number) {
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.pairs = {}
        this.decimals = {}
        this.contracts = {}
        this.cachedPrices = {}
    }

    async init() {
        await this.getAvaxPrice()

        this.hardRefreshInterval = setInterval(async () => {
            // Set this to empty because these change often
            this.cachedPrices = {}
            await this.getAvaxPrice()
        }, this.refreshInterval)
    }

    get apiRouter() {
        const router = express.Router()

        // Query param or part of url?
        router.get('/usd/:tokenAddress', async (req, res, next) => {
            const tokenAddress = req.params.tokenAddress
            const tokenPrice = await this.getPrice(tokenAddress, false)
            res.send(formatRes(tokenPrice.toString()))
        })

        router.get('/avax/:tokenAddress', async (req, res, next) => {
            const tokenAddress = req.params.tokenAddress
            const tokenPrice = await this.getPrice(tokenAddress, true)
            res.send(formatRes(tokenPrice.toString()))
        })

        return router
    }

    protected async getPair(tokenAddress: string): Promise<string | undefined> {
        if (this.pairs[tokenAddress]) {
            return this.pairs[tokenAddress]
        }

        const pairAddress = await PriceController.getPairAddress(tokenAddress)
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

    protected async getAvaxPrice() {
        if (this.cachedPrices[Address.WAVAX_ADDRESS]) {
            return this.cachedPrices[Address.WAVAX_ADDRESS]
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

        const usdcPrice = reserves[0][1].mul(BigNumberMantissa).div(reserves[0][0])
        const usdtPrice = reserves[1][1].mul(BigNumberMantissa).div(reserves[1][0])
        
        const avaxPrice = usdcPrice.add(usdtPrice).div(BigNumber.from('2'))
        this.cachedPrices[Address.WAVAX_ADDRESS] = avaxPrice
        return avaxPrice
    }

    protected async getXJoePrice() {
        if (this.cachedPrices[Address.XJOE_ADDRESS]) {
            return this.cachedPrices[Address.WAVAX_ADDRESS]
        }

        const joeBalance = await JoeContract.balanceOf(Address.XJOE_ADDRESS)
        const totalSupply = await XJoeContract.totalSupply()
        const ratio = joeBalance.mul(BigNumberMantissa).div(totalSupply)
        const price = await this.getPrice(Address.JOE_ADDRESS, true)
        const parsedPrice = price.mul(ratio).div(BigNumberMantissa)
        this.cachedPrices[Address.XJOE_ADDRESS] = parsedPrice
        return parsedPrice
    }

    public async getPrice(
        tokenAddress: string,
        derived: boolean // whether or not to compare against AVAX
    ): Promise<BigNumber> {
        if (this.cachedPrices[tokenAddress] && tokenAddress !== Address.WAVAX_ADDRESS) {
            console.log("Cached price: ", this.cachedPrices[tokenAddress].toString())

            return derived ? 
                this.cachedPrices[tokenAddress] : 
                this.cachedPrices[tokenAddress].div(BigNumberMantissa)
                    .mul(await this.getAvaxPrice())
        }

        if (tokenAddress === Address.WAVAX_ADDRESS) {
            return this.getAvaxPrice()
        }

        if (tokenAddress === Address.XJOE_ADDRESS) {
            return this.getXJoePrice()
        }

        const pairAddress = await this.getPair(tokenAddress)
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

        // Gets price in AVAX
        const derivedPrice = reserve[0].mul(BigNumberMantissa).div(reserve[1])
        this.cachedPrices[tokenAddress] = derivedPrice
        if (derived) return derivedPrice
        const avaxPrice = await this.getAvaxPrice()
        const price = derivedPrice.div(BigNumberMantissa).mul(avaxPrice)
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
        let token0BalanceMultiplier = BigNumber.from("0")
        let token1BalanceMultiplier = BigNumber.from("0")

        if (decimals[0].toString() !== decimals[1].toString()) {
            if (decimals[0] > decimals[1]) {
                token1BalanceMultiplier = BigNumber.from(decimals[0] - decimals[1])
            } else {
                token0BalanceMultiplier = BigNumber.from(decimals[1] - decimals[0])
            }
        }

        const token0Contract = this.getContract(token0Address)
        const token0Balance = await token0Contract.balanceOf(pairAddress)
        const token1Contract = this.getContract(token1Address)
        const token1Balance = await token1Contract.balanceOf(pairAddress)

        const bn10 = BigNumber.from("10")
        return [
            token0Balance.mul(bn10.pow(token0BalanceMultiplier)),
            token1Balance.mul(bn10.pow(token1BalanceMultiplier)),
        ]
    }

    private static async getPairAddress(
        tokenAddress: string
    ): Promise<string | undefined> {
        if (tokenAddress) {
            if (tokenAddress > Address.WAVAX_ADDRESS) {
                return JoeFactoryContract.getPair(
                    tokenAddress,
                    Address.WAVAX_ADDRESS
                )
            } else {
                return JoeFactoryContract.getPair(
                    Address.WAVAX_ADDRESS,
                    tokenAddress
                )
            }
        }

        return undefined
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
