import { BigNumber } from 'ethers'

export const getMantissaBigNumber = (exp: number) => {
    let divisor = '1'
    for (let i = 0; i < exp; i++) divisor += '0'
    return BigNumber.from(divisor)
}
