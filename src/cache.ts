import { BigNumber } from 'ethers'
import { PeriodRate, TimePeriod } from './types'
import Redis from 'ioredis'
import { appLogger } from './logger'

export interface CacheConfig {
    redisHost: string
    redisPort: number
    redisPassword: string
    defaultExpiry: number
}

export class Cache {
    protected config: CacheConfig
    protected redisClient: Redis.Redis

    constructor(config: CacheConfig) {
        this.config = config
        this.redisClient = new Redis({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword,
        })

        // this.redisClient = new Redis(`redis://${config.redisHost}:${config.redisPort}/0`)

        this.redisClient.on("error", (err: Error) => {
            throw err
        })

        this.redisClient.on("ready", () => {
            appLogger.info("Redis client ready")
        })

        if (!this.redisClient) {
            throw new Error(
                `Redis could not connect to ${config.redisHost}:${config.redisPort}`
            )
        }
    }

    public async init() {
        if (this.redisClient.status != "connecting") {
            await this.redisClient.connect()
        }
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
