import 'dotenv/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

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
}

const opConfig: OpConfig = {
    version: '/v1',
    lendingGraphUrl:
        'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending',
    exchangeGraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange',
    masterChefGraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/masterchefv3',
    
    supplyRefreshTimeout: 60000,
    priceRefreshTimeout: 60000,
    bankRefreshTimeout: 60000,
    metricsRefreshTimeout: 60000,
    poolRefreshTimeout: 60000,
}

export type AppConfig = OpConfig & {
    host: string 
    port: number 
}

class Config {
    private opConfig: OpConfig

    // Sensitive information declared here, with env variables

    constructor() {
        this.opConfig = opConfig
        dotenv.config({ path: path.join(__dirname, '/.env') })
    }

    get config(): AppConfig {
        return {
            ...this.opConfig,
            host: process.env.HOST || "localhost",
            port: parseInt(process.env.PORT || '') || 3000,
        }
    }


}

export default Config
