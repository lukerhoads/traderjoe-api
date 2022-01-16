import { BigNumber } from 'ethers'
import { createClient } from 'redis'
import { PeriodRate, TimePeriod } from './types'

export interface CacheConfig {
    host: string
    port: number
    defaultExpiry: number
}

export class Cache {
    protected config: CacheConfig
    protected redisClient: ReturnType<typeof createClient>

    constructor(config: CacheConfig) {
        this.config = config
        this.redisClient = createClient({
            url: `redis://${config.host}:${config.port}`,
        })
    }

    public async getPeriodRate(key: string): Promise<PeriodRate | undefined> {
        const periodRateSerialized = await this.redisClient.get(key)
        if (!periodRateSerialized) return undefined
        const parsedPeriodRate = JSON.parse(periodRateSerialized)
        return {
            period: parsedPeriodRate.period as TimePeriod,
            rate: BigNumber.from(parsedPeriodRate.rate),
        }
    }

    public async setPeriodRate(
        key: string,
        value: PeriodRate,
        expiry?: number
    ) {
        const periodRateString = JSON.stringify({
            period: value.period,
            rate: value.rate.toHexString(),
        })
        await this.redisClient.set(key, periodRateString)
        await this.redisClient.expire(key, expiry || this.config.defaultExpiry)
    }

    public async getBn(key: string) {
        const bnHex = await this.redisClient.get(key)
        if (!bnHex) return undefined
        return BigNumber.from(bnHex)
    }

    public async setBn(key: string, value: BigNumber, expiry?: number) {
        const bnHex = value.toHexString()
        await this.redisClient.set(key, bnHex)
        await this.redisClient.expire(key, expiry || this.config.defaultExpiry)
    }

    public async del(key: string) {
        await this.redisClient.del(key)
    }
}
