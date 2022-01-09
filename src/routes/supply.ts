import { BigNumber, ethers } from 'ethers'
import express from 'express'
import { getRandomProvider } from '../provider'
import { Address, BigNumberMantissa } from '../constants'
import { formatRes } from '../util'

import JoeContractABI from '../../abi/JoeToken.json'

const JoeContract = new ethers.Contract(
    Address.JOE_ADDRESS,
    JoeContractABI,
    getRandomProvider()
)

const burnFilter = JoeContract.filters.Transfer(null, Address.BURN_ADDRESS)

// I think there could be a better design for TVL, where we initially get it and then
// listen for Ethers events
export class SupplyController {
    private refreshInterval: number
    private hardRefreshInterval: NodeJS.Timer

    private circulatingSupply: BigNumber
    private maxSupply: BigNumber
    private totalSupply: BigNumber

    constructor(refreshInterval: number) {
        this.refreshInterval = refreshInterval
        this.hardRefreshInterval = setInterval(() => {})
        this.circulatingSupply = BigNumber.from('0')
        this.maxSupply = BigNumber.from('0')
        this.totalSupply = BigNumber.from('0')
    }

    async init() {
        await this.resetMetrics()

        // Subscribe to burn events or other TVL changing events
        JoeContract.on(burnFilter, (from, to, value) => {
            const bnValue = BigNumber.from(value)
            this.totalSupply.sub(bnValue)
        })

        this.hardRefreshInterval = setInterval(async () => {
            await this.resetMetrics()
        }, this.refreshInterval)
    }

    async resetMetrics() {
        const [totalSupply, maxSupply, circulatingSupply] = await Promise.all([
            this.getTotalSupply(),
            this.getCirculatingSupply(),
            this.getMaxSupply(),
        ])

        this.totalSupply = totalSupply
        this.maxSupply = maxSupply
        this.circulatingSupply = circulatingSupply
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/circulating', (req, res, next) => {
            res.send(formatRes(this.circulatingSupply.toString()))
        })

        router.get('/circulating-adjusted', (req, res, next) => {
            res.send(
                formatRes(
                    this.circulatingSupply.div(BigNumberMantissa).toString()
                )
            )
        })

        router.get('/total', (req, res, next) => {
            res.send(formatRes(this.totalSupply.toString()))
        })

        router.get('/max', (req, res, next) => {
            res.send(formatRes(this.maxSupply.toString()))
        })

        return router
    }

    protected async getTotalSupply() {
        const totalSupply = BigNumber.from(await JoeContract.totalSupply())
        const burnSupply = BigNumber.from(
            await JoeContract.balanceOf(Address.BURN_ADDRESS)
        )
        return totalSupply.sub(burnSupply)
    }

    // This is capped at 500 million. Should we really re fetch this? If this changes, making
    // a simple change to the hardcoded value would probably be better.
    protected async getMaxSupply() {
        const maxSupply = await JoeContract.maxSupply()
        return maxSupply
    }

    protected async getCirculatingSupply() {
        const teamTreasurySupply = await Promise.all(
            Address.TEAM_TREASURY_WALLETS.map((address) =>
                JoeContract.balanceOf(address).then(
                    (balance: BigNumber) => balance
                )
            )
        )
        const totalSupply = await this.getTotalSupply()
        teamTreasurySupply.forEach((supply) => totalSupply.sub(supply))
        return totalSupply
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
