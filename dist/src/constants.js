"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestnetAddress = exports.MainnetAddress = exports.STAKING_FEE_RATE = exports.FEE_RATE = exports.Address = exports.getAddress = exports.BigNumber24 = exports.BigNumber6 = exports.BigNumber8 = exports.BigNumber16 = exports.BigNumberMantissa = exports.BigNumberZero = void 0;
const ethers_1 = require("ethers");
exports.BigNumberZero = ethers_1.BigNumber.from('0');
exports.BigNumberMantissa = ethers_1.BigNumber.from('1000000000000000000');
exports.BigNumber16 = ethers_1.BigNumber.from('10000000000000000');
exports.BigNumber8 = ethers_1.BigNumber.from('100000000');
exports.BigNumber6 = ethers_1.BigNumber.from('1000000');
exports.BigNumber24 = ethers_1.BigNumber.from('1000000000000000000000000');
// Use this for testnet configuration, but there is none yet
const getAddress = () => {
    // return process.env.NETWORK === 'mainnet' ? Address : TestnetAddress
    return exports.Address;
};
exports.getAddress = getAddress;
// export const Address = process.env.NETWORK == 'mainnet' ? MainnetAddress : TestnetAddress
exports.Address = MainnetAddress;
exports.FEE_RATE = ethers_1.BigNumber.from('2500000000000000');
exports.STAKING_FEE_RATE = ethers_1.BigNumber.from('500000000000000');
var MainnetAddress;
(function (MainnetAddress) {
    MainnetAddress.JOE_ADDRESS = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd';
    MainnetAddress.JOE_FACTORY_ADDRESS = '0x9ad6c38be94206ca50bb0d90783181662f0cfa10';
    MainnetAddress.WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
    MainnetAddress.XJOE_ADDRESS = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33';
    MainnetAddress.USDC_ADDRESS = '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664';
    MainnetAddress.USDT_ADDRESS = '0xc7198437980c041c805a1edcba50c1ce5db95118';
    MainnetAddress.WAVAX_USDT_ADDRESS = '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256';
    MainnetAddress.WAVAX_USDC_ADDRESS = '0xa389f9430876455c36478deea9769b7ca4e3ddb1';
    MainnetAddress.TOTALSUPPLYANDBORROW_ADDRESS = '0x40ae0810eb5148c23bd0f574df2dc4dfd6a81c10';
    MainnetAddress.BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
    MainnetAddress.ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    MainnetAddress.TEAM_TREASURY_WALLETS = [
        '0xaff90532e2937ff290009521e7e120ed062d4f34',
        '0xfea7879bf27b4461de9a9b8a03dbcc7f49c52bea',
        '0xc13b1c927565c5af8fcaf9ef7387172c447f6796',
        '0x66fb02746d72bc640643fdba3aefe9c126f0aa4f',
        '0x15f08e8656fa6205b53819e36dcbec8f481da14c',
        '0x5d3e4c0fe11e0ae4c32f0ff74b4544c49538ac61',
        '0x381f39231576f52185ede4b670bc39e9ff2aab96',
        '0xd858ebaa943b4c2fb06ba0ba8920a132fd2410ee', // Multi-sig wallet
    ];
    MainnetAddress.JOETROLLER_ADDRESS = '0xdc13687554205e5b89ac783db14bb5bba4a1edac'; // proxy
    MainnetAddress.JAVAX_ADDRESS = '0xc22f01ddc8010ee05574028528614634684ec29e';
    MainnetAddress.JOE_MASTER_CHEF_ADDRESS = '0x188bed1968b795d5c9022f6a0bb5931ac4c18f00';
    MainnetAddress.GOHM_REWARD_ADDRESS = '0x99ad2a9a0d4a15d861c0b60c7df8965d1b3e18d8';
})(MainnetAddress = exports.MainnetAddress || (exports.MainnetAddress = {}));
// No testnet documentation yet
var TestnetAddress;
(function (TestnetAddress) {
    TestnetAddress.JOE_ADDRESS = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd';
    TestnetAddress.JOE_FACTORY_ADDRESS = '0x9ad6c38be94206ca50bb0d90783181662f0cfa10';
    TestnetAddress.WAVAX_ADDRESS = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
    TestnetAddress.XJOE_ADDRESS = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33';
    TestnetAddress.USDC_ADDRESS = '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664';
    TestnetAddress.USDT_ADDRESS = '0xc7198437980c041c805a1edcba50c1ce5db95118';
    TestnetAddress.WAVAX_USDT_ADDRESS = '0xed8cbd9f0ce3c6986b22002f03c6475ceb7a6256';
    TestnetAddress.WAVAX_USDC_ADDRESS = '0xa389f9430876455c36478deea9769b7ca4e3ddb1';
    TestnetAddress.TOTALSUPPLYANDBORROW_ADDRESS = '0x40ae0810eb5148c23bd0f574df2dc4dfd6a81c10';
    TestnetAddress.BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
    TestnetAddress.ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    TestnetAddress.TEAM_TREASURY_WALLETS = [
        '0xaff90532e2937ff290009521e7e120ed062d4f34',
        '0xfea7879bf27b4461de9a9b8a03dbcc7f49c52bea',
        '0xc13b1c927565c5af8fcaf9ef7387172c447f6796',
        '0x66fb02746d72bc640643fdba3aefe9c126f0aa4f',
        '0x15f08e8656fa6205b53819e36dcbec8f481da14c',
        '0x5d3e4c0fe11e0ae4c32f0ff74b4544c49538ac61',
        '0x381f39231576f52185ede4b670bc39e9ff2aab96',
        '0xd858ebaa943b4c2fb06ba0ba8920a132fd2410ee', // Multi-sig wallet
    ];
    TestnetAddress.JOETROLLER_ADDRESS = '0xdc13687554205e5b89ac783db14bb5bba4a1edac'.toLowerCase(); // proxy
    TestnetAddress.JAVAX_ADDRESS = '0xc22f01ddc8010ee05574028528614634684ec29e'.toLowerCase();
    TestnetAddress.GOHM_REWARD_ADDRESS = '0x99ad2a9a0d4a15d861c0b60c7df8965d1b3e18d8';
})(TestnetAddress = exports.TestnetAddress || (exports.TestnetAddress = {}));
//# sourceMappingURL=constants.js.map