import 'dotenv/config'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { RateLimitFilter } from './rate-limiter'

export const isProd = process.env.NODE_ENV === 'production'

export interface OpConfig {
    version: string
    lendingGraphUrl: string
    exchangeGraphUrl: string
    masterChefGraphUrl: string

    supplyRefreshTimeout: number
    priceRefreshTimeout: number
    bankRefreshTimeout: number
    metricsRefreshTimeout: number
    poolRefreshTimeout: number
    stakeRefreshTimeout: number
    pairRefreshTimeout: number

    temporalRefreshTimeout: number

    rateLimitBy: RateLimitFilter[]
    rateLimit: number
    rateLimitExpire: number
}

const opConfig: OpConfig = {
    version: '/v1',
    lendingGraphUrl:
        'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending',
    exchangeGraphUrl:
        'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange',
    masterChefGraphUrl:
        'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/masterchefv3',

    supplyRefreshTimeout: 60000,
    priceRefreshTimeout: 60000,
    bankRefreshTimeout: 60000,
    metricsRefreshTimeout: 60000,
    poolRefreshTimeout: 60000,
    stakeRefreshTimeout: 60000,
    pairRefreshTimeout: 60000,

    temporalRefreshTimeout: 9e4, // About a day

    rateLimitBy: ['ip'],
    rateLimit: 100,
    rateLimitExpire: 3600, // one hour in seconds
}

export type AppConfig = OpConfig & {
    host: string
    port: number
    redisHost: string
    redisPort: number
    redisPassword: string
}

class Config {
    private opConfig: OpConfig

    // Sensitive information declared here, with env variables

    constructor() {
        this.opConfig = opConfig
        dotenv.config({ path: path.join(__dirname, '/.env') })
    }

    get opCfg(): OpConfig {
        return this.opConfig
    }

    get config(): AppConfig {
        return {
            ...this.opConfig,
            host: process.env.HOST || 'localhost',
            port: parseInt(process.env.PORT || '') || 3000,
            redisHost: process.env.REDIS_HOST?.split('"').join('') || 'redis',
            redisPort: parseInt(process.env.REDIS_PORT || '') || 6379,
            redisPassword: process.env.REDIS_PASS || '',
        }
    }
}

export default Config
