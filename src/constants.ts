import { BigNumber } from 'ethers'

export const BigNumberMantissa = BigNumber.from('1000000000000000000')

export namespace Address {
    export const JOE_ADDRESS = '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd'
    export const JOE_FACTORY_ADDRESS =
        '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10'
    export const WAVAX_ADDRESS = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
    export const XJOE_ADDRESS = '0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33'
    export const USDC_ADDRESS = '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664'
    export const USDT_ADDRESS = '0xc7198437980c041c805A1EDcbA50c1Ce5db95118'
    export const WAVAX_USDT_ADDRESS =
        '0xeD8CBD9F0cE3C6986b22002F03c6475CEb7a6256'
    export const WAVAX_USDC_ADDRESS =
        '0xA389f9430876455C36478DeEa9769B7Ca4E3DDB1'
    export const TOTALSUPPLYANDBORROW_ADDRESS =
        '0x40ae0810EB5148c23Bd0F574DF2Dc4dFD6A81c10'

    export const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'
    export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

    export const TEAM_TREASURY_WALLETS = [
        '0xaFF90532E2937fF290009521e7e120ed062d4F34', // 1st Team vesting contract
        '0xFea7879Bf27B4461De9a9b8A03dBcc7f49C52bEa', // 2nd Team vesting contract
        '0xc13B1C927565C5AF8fcaF9eF7387172c447f6796', // Investor cliff contract
        '0x66Fb02746d72bC640643FdBa3aEFE9C126f0AA4f', // Treasury wallet
        '0x15f08E8656FA6205B53819e36dCBeC8f481Da14C', // Team wallet
        '0x5D3e4C0FE11e0aE4c32F0FF74B4544C49538AC61', // Dev operational wallet
        '0x381f39231576f52185EDE4b670bc39e9FF2Aab96', // Investor wallet
        '0xD858eBAa943b4C2fb06BA0Ba8920A132fd2410eE', // Multi-sig wallet
    ]

    export const JOETROLLER_ADDRESS = "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC" // proxy
}
