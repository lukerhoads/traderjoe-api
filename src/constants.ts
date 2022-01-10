import { BigNumber } from 'ethers'

export const BigNumberZero = BigNumber.from("0")
export const BigNumberMantissa = BigNumber.from('1000000000000000000')
export const BigNumber16 = BigNumber.from('10000000000000000')
export const BigNumber8 = BigNumber.from('100000000')
export const BigNumber6 = BigNumber.from('1000000')
export const BigNumber24 = BigNumber.from('1000000000000000000000000')

// Use this for testnet configuration
function getAddress() {
    return process.env.NETWORK === "mainnet" ? Address : TestnetAddress
}

export const FEE_RATE = 0.0025

export namespace Address {
    export const JOE_ADDRESS = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd'
    export const JOE_FACTORY_ADDRESS =
        '0x9ad6c38be94206ca50bb0d90783181662f0cfa10'
    export const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
    export const XJOE_ADDRESS = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33'
    export const USDC_ADDRESS = '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664'
    export const USDT_ADDRESS = '0xc7198437980c041c805a1edcba50c1ce5db95118'
    export const WAVAX_USDT_ADDRESS =
        '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256'
    export const WAVAX_USDC_ADDRESS =
        '0xa389f9430876455c36478deea9769b7ca4e3ddb1'
    export const TOTALSUPPLYANDBORROW_ADDRESS =
        '0x40ae0810eb5148c23bd0f574df2dc4dfd6a81c10'

    export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'
    export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

    export const TEAM_TREASURY_WALLETS = [
        '0xaff90532e2937ff290009521e7e120ed062d4f34', // 1st Team vesting contract
        '0xfea7879bf27b4461de9a9b8a03dbcc7f49c52bea', // 2nd Team vesting contract
        '0xc13b1c927565c5af8fcaf9ef7387172c447f6796', // Investor cliff contract
        '0x66fb02746d72bc640643fdba3aefe9c126f0aa4f', // Treasury wallet
        '0x15f08e8656fa6205b53819e36dcbec8f481da14c', // Team wallet
        '0x5d3e4c0fe11e0ae4c32f0ff74b4544c49538ac61', // Dev operational wallet
        '0x381f39231576f52185ede4b670bc39e9ff2aab96', // Investor wallet
        '0xd858ebaa943b4c2fb06ba0ba8920a132fd2410ee', // Multi-sig wallet
    ]

    export const JOETROLLER_ADDRESS = "0xdc13687554205e5b89ac783db14bb5bba4a1edac" // proxy
    export const JAVAX_ADDRESS = "0xc22f01ddc8010ee05574028528614634684ec29e"
}

export namespace TestnetAddress {
    export const JOE_ADDRESS = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd'
    export const JOE_FACTORY_ADDRESS =
        '0x9ad6c38be94206ca50bb0d90783181662f0cfa10'
    export const WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
    export const XJOE_ADDRESS = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33'
    export const USDC_ADDRESS = '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664'
    export const USDT_ADDRESS = '0xc7198437980c041c805a1edcba50c1ce5db95118'
    export const WAVAX_USDT_ADDRESS =
        '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256'
    export const WAVAX_USDC_ADDRESS =
        '0xa389f9430876455c36478deea9769b7ca4e3ddb1'
    export const TOTALSUPPLYANDBORROW_ADDRESS =
        '0x40ae0810eb5148c23bd0f574df2dc4dfd6a81c10'

    export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'
    export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

    export const TEAM_TREASURY_WALLETS = [
        '0xaff90532e2937ff290009521e7e120ed062d4f34', // 1st Team vesting contract
        '0xfea7879bf27b4461de9a9b8a03dbcc7f49c52bea', // 2nd Team vesting contract
        '0xc13b1c927565c5af8fcaf9ef7387172c447f6796', // Investor cliff contract
        '0x66fb02746d72bc640643fdba3aefe9c126f0aa4f', // Treasury wallet
        '0x15f08e8656fa6205b53819e36dcbec8f481da14c', // Team wallet
        '0x5d3e4c0fe11e0ae4c32f0ff74b4544c49538ac61', // Dev operational wallet
        '0x381f39231576f52185ede4b670bc39e9ff2aab96', // Investor wallet
        '0xd858ebaa943b4c2fb06ba0ba8920a132fd2410ee', // Multi-sig wallet
    ]

    export const JOETROLLER_ADDRESS = "0xdc13687554205e5b89ac783db14bb5bba4a1edac" // proxy
    export const JAVAX_ADDRESS = "0xc22f01ddc8010ee05574028528614634684ec29e"
}
