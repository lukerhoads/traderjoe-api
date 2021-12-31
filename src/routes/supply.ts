import { BigNumber, ethers } from 'ethers'
import JoeContractABI from '../../abi/JoeToken.json'
import { getRandomProvider } from '../provider'
import { Address } from '../constants'

const JoeContract = new ethers.Contract(JoeContractABI, Address.JOE_ADDRESS, getRandomProvider())
const minElapsedTime = 10000

export class SupplyController {
    private circulatingSupply: BigNumber
    private maxSupply: BigNumber
    private totalSupply: BigNumber

    constructor() {
        this.circulatingSupply = BigNumber.from(0)
        this.maxSupply = BigNumber.from(0)
        this.totalSupply = BigNumber.from(0)
    }

    async init() {
        this.circulatingSupply = await JoeContract.totalSupply()
        this.maxSupply = await JoeContract.maxSupply()
        this.totalSupply = await JoeContract.totalSupply()
    }

    
}