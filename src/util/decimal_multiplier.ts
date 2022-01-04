import { BigNumber } from "ethers"

export const decimalMultiplier = (decimals: BigNumber) => {
    return BigNumber.from("10").pow(decimals)
}