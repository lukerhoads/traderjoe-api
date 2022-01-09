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