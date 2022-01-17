const ethAddrRegexp = /^0x[a-fA-F0-9]{40}$/

const letterRegexp = /[a-zA-Z]/

export const validatePoolId = (poolId: string) => {
    if (ethAddrRegexp.test(poolId)) {
        return new Error('Pool ID not supposed to be an address')
    }

    if (letterRegexp.test(poolId)) {
        return new Error('Pool ID not supposed to contain letters')
    }

    return null
}

const periods = ['1s', '1m', '1h', '1w', '1d', '1mo', '1y']

export const validatePeriod = (period: string) => {
    return periods.includes(period)
}

export const validateAddress = (address: string) => {
    if (!ethAddrRegexp.test(address)) return new Error(`Address ${address} invalid`)
    return null
}