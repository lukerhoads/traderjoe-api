"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomProviderNetwork = exports.getRandomProvider = void 0;
const ethers_1 = require("ethers");
// Replace this with Moralis url
const DEFAULT_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc';
const DEFAULT_TESTNET_PROVIDER_URL = 'https://api.avax-test.network/ext/bc/C/rpc';
const MAINNET_PROVIDERS = [];
const TESTNET_PROVIDERS = [];
const providerPool = {
    providers: [],
};
const testnetProviderPool = {
    providers: [],
};
for (let provider of MAINNET_PROVIDERS) {
    providerPool.providers.push(new ethers_1.providers.JsonRpcProvider(provider));
}
for (let provider of TESTNET_PROVIDERS) {
    testnetProviderPool.providers.push(new ethers_1.providers.JsonRpcProvider(provider));
}
// Remove when env is added
providerPool.providers.push(new ethers_1.providers.JsonRpcProvider(DEFAULT_PROVIDER_URL));
testnetProviderPool.providers.push(new ethers_1.providers.JsonRpcProvider(DEFAULT_TESTNET_PROVIDER_URL));
// Check for mainnet/testnet, get providers accordingly
const getRandomProvider = () => {
    return providerPool.providers[~~(providerPool.providers.length * Math.random())];
};
exports.getRandomProvider = getRandomProvider;
// env sensitive
const getRandomProviderNetwork = () => {
    return process.env.NETWORK === 'mainnet'
        ? providerPool.providers[~~(providerPool.providers.length * Math.random())]
        : testnetProviderPool.providers[~~(testnetProviderPool.providers.length * Math.random())];
};
exports.getRandomProviderNetwork = getRandomProviderNetwork;
//# sourceMappingURL=provider.js.map