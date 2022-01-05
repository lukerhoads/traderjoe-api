import ethers, { providers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'

const DEFAULT_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc' // Obviously slow, replace in prod

export interface ClientPool {
    providers: JsonRpcProvider[]
}

const providerPool: ClientPool = {
    providers: [],
}

providerPool.providers.push(new providers.JsonRpcProvider(DEFAULT_PROVIDER_URL))

export const getRandomProvider = (): JsonRpcProvider => {
    return providerPool.providers[
        ~~(providerPool.providers.length * Math.random())
    ]
}
