import ethers, { providers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'

// Replace this with Moralis url
const DEFAULT_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc'
const DEFAULT_TESTNET_PROVIDER_URL =
    'https://api.avax-test.network/ext/bc/C/rpc'

const MAINNET_PROVIDERS: string[] = []
const TESTNET_PROVIDERS: string[] = []

export interface ClientPool {
    providers: JsonRpcProvider[]
}

const mainnetProviderPool: ClientPool = {
    providers: [],
}

const testnetProviderPool: ClientPool = {
    providers: [],
}

for (let provider of MAINNET_PROVIDERS) {
    mainnetProviderPool.providers.push(new providers.JsonRpcProvider(provider))
}

for (let provider of TESTNET_PROVIDERS) {
    testnetProviderPool.providers.push(new providers.JsonRpcProvider(provider))
}

// Remove when env is added
mainnetProviderPool.providers.push(
    new providers.JsonRpcProvider(DEFAULT_PROVIDER_URL)
)
testnetProviderPool.providers.push(
    new providers.JsonRpcProvider(DEFAULT_TESTNET_PROVIDER_URL)
)

export const getRandomProvider = (): JsonRpcProvider => {
    return process.env.NETWORK?.includes('mainnet')
        ? mainnetProviderPool.providers[
              ~~(mainnetProviderPool.providers.length * Math.random())
          ]
        : testnetProviderPool.providers[
              ~~(testnetProviderPool.providers.length * Math.random())
          ]
}
