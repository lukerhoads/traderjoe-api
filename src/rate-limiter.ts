import { NextFunction, Request, Response } from 'express'
import Redis from 'ioredis'
import { appLogger } from './logger'

export type RateLimitFilter = 'ip' | 'path'

export interface RateLimiterConfig {
    redisHost: string
    redisPort: number
    redisPassword: string
    per: RateLimitFilter[]
    limit: number
    expire: number
}

// Per IP rate limiter
export class RateLimiter {
    private config: RateLimiterConfig
    private redisClient: Redis.Redis

    constructor(config: RateLimiterConfig) {
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

    public getMiddleware() {
        if (this.config.per.length === 2) {
            return (limit: number, expire: number) =>
                async (req: Request, res: Response, next: NextFunction) => {
                    const ip = req.ip
                    const path = req.path
                    const key = `ratelimit:${ip}:${path}`
                    try {
                        const cacheRes = await this.redisClient.incr(key)
                        if (cacheRes > limit) {
                            res.status(429).send('Rate limited')
                            return
                        }
                    } catch (err) {
                        next(err)
                    }

                    await this.redisClient.expire(key, expire)
                    next()
                }
        }

        if (this.config.per.includes('ip')) {
            return (limit: number, expire: number) =>
                async (req: Request, res: Response, next: NextFunction) => {
                    const ip = req.ip
                    const key = `ratelimit:${ip}`
                    try {
                        const cacheRes = await this.redisClient.incr(key)
                        if (cacheRes > limit) {
                            res.status(429).send('Rate limited')
                            return
                        }
                    } catch (err) {
                        next(err)
                    }

                    await this.redisClient.expire(key, expire)
                    next()
                }
        }

        if (this.config.per.includes('path')) {
            return (limit: number, expire: number) =>
                async (req: Request, res: Response, next: NextFunction) => {
                    const path = req.path
                    const key = `ratelimit:${path}`
                    try {
                        const cacheRes = await this.redisClient.incr(key)
                        if (cacheRes > limit) {
                            res.status(429).send('Rate limited')
                            return
                        }
                    } catch (err) {
                        next(err)
                    }

                    await this.redisClient.expire(key, expire)
                    next()
                }
        }

        return (limit: number, expire: number) =>
            async (req: Request, res: Response, next: NextFunction) => {
                const ip = req.ip
                const key = `ratelimit:${ip}`
                try {
                    const cacheRes = await this.redisClient.incr(key)
                    if (cacheRes > limit) {
                        res.status(429).send('Rate limited')
                        return
                    }
                } catch (err) {
                    next(err)
                }

                await this.redisClient.expire(key, expire)
                next()
            }
    }
}
