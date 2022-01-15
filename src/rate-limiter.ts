import { NextFunction, Request, Response } from 'express'
import { createClient } from 'redis'

export type RateLimitFilter = 'ip' | 'path'

export interface RateLimiterConfig {
    redisHost: string
    redisPort: number
    per: RateLimitFilter[]
    limit: number
    expire: number
}

// Per IP rate limiter
export class RateLimiter {
    private config: RateLimiterConfig
    private redisClient: ReturnType<typeof createClient>

    constructor(config: RateLimiterConfig) {
        this.config = config
        this.redisClient = createClient({
            url: `redis://${config.redisHost}:${config.redisPort}`,
        })

        if (!this.redisClient) {
            throw new Error(`Redis could not connect to ${config.redisHost}:${config.redisPort}`)
        }
    }

    public async init() {
        await this.redisClient.connect()
    }

    public getMiddleware() {
        if (this.config.per.length === 2) {
            return (limit: number, expire: number) => async (req: Request, res: Response, next: NextFunction) => {
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
            return (limit: number, expire: number) => async (req: Request, res: Response, next: NextFunction) => {
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
            return (limit: number, expire: number) => async (req: Request, res: Response, next: NextFunction) => {
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

        return (limit: number, expire: number) => async (req: Request, res: Response, next: NextFunction) => {
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