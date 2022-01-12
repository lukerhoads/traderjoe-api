import { BigNumber } from "ethers"
import e from "express"
import { getMantissaBigNumber } from "."

export const bnStringToDecimal = (numberVal: string, power: number) => {
    let before, after: string
    if (power >= numberVal.length || numberVal.startsWith("-")) {
        let adjustedLength = numberVal.length
        if (numberVal.startsWith("-")) {
            adjustedLength -= 1
            before = "-0"
        } else {
            before = "0"
        }
        after = "."
        if ((power - adjustedLength) > 0) {
            for (let i = 0; i < power - adjustedLength; i++) {
                after += "0"
            }
        }
        after += numberVal.replace('-', '')
        return before + after
    }
    after = "." + numberVal.slice(-power)
    before = numberVal.slice(0, -power)
    return before + after
}

// Takes a string, such as 84.0102019201830, and converts it to a BigNumber to the specified
// power. You must supply a power that is at least the precision of the given number. If it is
// not, power defaults to the precision of the number
export const stringToBn = (number: string, power?: number) => {
    let parts: string[] = []
    let localPower: number = 0

    if (power) {
        localPower = power
        if (number.includes(".")) {
            parts = number.split(".")
        } else {
            parts[0] = number.slice(0, -localPower)
            parts[1] = number.slice(-localPower)
        }
    } else {
        if (number.includes(".")) {
            parts = number.split(".")
            localPower = parts[1].length
        } else {
            parts[0] = number 
            parts[1] = "0"
        }
    }

    console.log(parts[0], parts[1])
    const initialBigNum = BigNumber.from(parts[0]).mul(getMantissaBigNumber(localPower))
    return initialBigNum.add(parts[1])
}
