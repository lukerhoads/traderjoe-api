import express from "express"
import { getRandomProvider } from "../provider"
import { Address, BigNumberMantissa } from "../constants"
import { BigNumber, Contract, ethers } from "ethers"
import { decimalMultiplier } from "../util/decimal_multiplier"

import JoeBarContractABI from '../../abi/JoeBar.json'
import JoeFactoryABI from '../../abi/JoeToken.json'
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
    getRandomProvider(),
)

export class PriceController {
    private pairs: { [address: string]: string }
    private decimals: { [address: string]: number }
    private contracts: { [address: string]: Contract }
    private cachedPrices: { [address: string]: BigNumber }

    constructor() {
        this.pairs = {}
        this.decimals = {}
        this.contracts = {}
        this.cachedPrices = {}
    }

    async init() {

    }

    get apiRouter() {
        const router = express.Router()
        
        // Query param or part of url?
        router.get('/usd', (req, res, next) => {

        })

        router.get('/avax', (req, res, next) => {
            
        })

        return router 
    }

    protected async getPair(tokenAddress: string) {
        if (this.pairs[tokenAddress]) {
            return this.pairs[tokenAddress]
        }

        const pairAddress = await PriceController.getPairAddress(tokenAddress)
        if (pairAddress === Address.ZERO_ADDRESS) {
            return pairAddress
        }

        this.pairs[tokenAddress] = pairAddress
        return pairAddress
    }

    protected async getDecimals(tokenAddress: string) {
        if (this.decimals[tokenAddress]) {
            return this.decimals[tokenAddress]
        }

        const tokenContract = await this.getContract(tokenAddress)
        const decimals = await tokenContract.decimals()
        this.decimals[tokenAddress] = decimals
        return decimals
    }

    protected async getContract(tokenAddress: string) {
        if (this.contracts[tokenAddress]) {
            return this.contracts[tokenAddress]
        }

        const contract = new ethers.Contract(tokenAddress, ERC20, getRandomProvider())
        this.contracts[tokenAddress] = contract
        return contract
    }

    protected async getAvaxPrice() {
        if (this.cachedPrices[Address.WAVAX_ADDRESS]) {
            return this.cachedPrices[Address.WAVAX_ADDRESS]
        }

        const reserves = await Promise.all([
            this.getReserves(Address.WAVAX_ADDRESS, Address.USDC_ADDRESS, Address.WAVAX_USDC_ADDRESS),
            this.getReserves(Address.WAVAX_ADDRESS, Address.WAVAX_USDT_ADDRESS, Address.WAVAX_USDT_ADDRESS)
        ])

        const usdcPrice = reserves[0][1].mul(BigNumberMantissa).div(reserves[0][0])
        const usdtPrice = reserves[1][1].mul(BigNumberMantissa).div(reserves[1][0])
        const avaxPrice = usdcPrice.add(usdtPrice).div(BigNumber.from("2"))
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
        this.cachedPrices[Address.XJOE_ADDRESS] = 
    }

    protected async getPrice(token: string) {
        if (token === Address.WAVAX_ADDRESS) {
            return await this.getAvaxPrice()
        }

        if (token === Address.XJOE_ADDRESS) {
            return await this.getXJoePrice()
        }

        
    }

    protected async getReserves(token0Address: string, token1Address: string, pairAddress: string): Promise<BigNumber[]> {
        const decimals = await Promise.all([
            this.getDecimals(token0Address),
            this.getDecimals(token1Address)
        ])

        const token0Contract = await this.getContract(token0Address)
        const token0Balance = await token0Contract.balanceOf(pairAddress)
        const token1Contract = await this.getContract(token1Address)
        const token1Balance = await token1Contract.balanceOf(pairAddress)

        return [
            token0Balance.mul(decimalMultiplier(decimals[0])),
            token1Balance.mul(decimalMultiplier(decimals[1]))
        ]
    }

    protected static async getPairAddress(tokenAddress: string) {
        if (tokenAddress) {
            if (tokenAddress > Address.WAVAX_ADDRESS) {
                return JoeFactoryContract.getPair(tokenAddress, Address.WAVAX_ADDRESS)
            } else {
                return JoeFactoryContract.getPair(Address.WAVAX_ADDRESS, tokenAddress)
            }
        }
    
        return undefined
    }

    async close() {

    }
}