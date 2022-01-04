import { BigNumber, ethers } from 'ethers'
import express from 'express'
import { Address } from '../constants'

import BankerJoeContractABI from '../../abi/BankerJoe.json'
import { formatRes } from '../util/format_res'

const hardRefreshInterval = 60000

const BankerJoeContract = new ethers.Contract(
    Address.TOTALSUPPLYANDBORROW_ADDRESS,
    BankerJoeContractABI
)

export class BankerController {
    private hardRefreshInterval: NodeJS.Timer

    private totalSupply: BigNumber
    private totalBorrow: BigNumber

    constructor() {
        this.hardRefreshInterval = setInterval(() => {})
        this.totalSupply = BigNumber.from("0")
        this.totalBorrow = BigNumber.from("0")
    }

    async init() {
        this.hardRefreshInterval = setInterval(async () => {
            const supplyAndBorrow = await BankerJoeContract.getTotalSupplyAndTotalBorrow();
            this.totalSupply = supplyAndBorrow[0]
            this.totalBorrow = supplyAndBorrow[1]
        }, hardRefreshInterval)
    }

    get apiRouter() {
        const router = express.Router()

        router.get('/supply', async (req, res, next) => {
            res.send(formatRes(this.totalSupply.toString()))
        })

        router.get('/borrow', async (req, res, next) => {
            res.send(formatRes(this.totalBorrow.toString()))
        })

        return router
    }

    async close() {
        clearInterval(this.hardRefreshInterval)
    }
}
