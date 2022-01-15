import 'cross-fetch/polyfill'
import * as http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import Config from './config'
import YAML from 'yamljs'
import { formatRes } from './util/format-res'
import {
    PoolController,
    PairController,
    SupplyController,
    Controller,
    PriceController,
    NFTController,
    BankerController,
    MetricsController,
    StakeController,
} from './routes'
import { Logger } from './logger'
import { RateLimiter } from './rate-limiter'
import client from 'prom-client'
import { customMetrics, httpRequestTimer } from './metrics'
import responseTime from 'response-time'

const swaggerDoc = YAML.load('./openapi.yaml')

export class Server {
    protected config: Config
    protected app: express.Application
    protected httpServer?: http.Server
    protected promRegister: client.Registry
    // protected redisClient: ReturnType<typeof createClient>

    protected controllers: Controller[]

    constructor() {
        this.config = new Config()
        this.app = express()
        this.controllers = []
        this.promRegister = new client.Registry()
        client.AggregatorRegistry.setRegistries(this.promRegister)
        client.collectDefaultMetrics({
            prefix: 'node_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            register: this.promRegister,
        })
        for (let metric of customMetrics) {
            this.promRegister.registerMetric(metric)
        }
    }

    public async init() {
        this.setupDocs()
        this.app.set('trust proxy', true)
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: true }))
        this.app.use(Logger)

        this.app.get(
            '/ping',
            (req: Request, res: Response, next: NextFunction) => {
                res.send('Pong')
            }
        )

        this.app.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
            res.setHeader('Content-Type', this.promRegister.contentType)
            res.send(await this.promRegister.metrics())
        })

        const versionRouter = express.Router()
        const rateLimiter = new RateLimiter({
            redisHost: this.config.config.redisHost,
            redisPort: this.config.config.redisPort,
            per: this.config.opCfg.rateLimitBy,
            limit: this.config.opCfg.rateLimit,
            expire: this.config.opCfg.rateLimitExpire,
        })

        await rateLimiter.init()
        versionRouter.use(rateLimiter.getMiddleware()(this.config.opCfg.rateLimit, this.config.opCfg.rateLimitExpire))

        const supplyController = new SupplyController(this.config.opCfg)
        await supplyController.init()
        versionRouter.use('/supply', supplyController.apiRouter)
        this.controllers.push(supplyController)

        const priceController = new PriceController(this.config.opCfg)
        await priceController.init()
        versionRouter.use('/price', priceController.apiRouter)
        this.controllers.push(priceController)

        const nftController = new NFTController()
        await nftController.init()
        versionRouter.use('/nft', nftController.apiRouter)
        this.controllers.push(nftController)

        const pairController = new PairController(
            this.config.opCfg,
            priceController
        )
        await pairController.init()
        versionRouter.use('/pairs', pairController.apiRouter)
        this.controllers.push(pairController)

        const poolController = new PoolController(
            this.config.opCfg,
            priceController
        )
        await poolController.init()
        versionRouter.use('/pools', poolController.apiRouter)
        this.controllers.push(poolController)

        const bankerController = new BankerController(
            this.config.opCfg,
            priceController
        )
        await bankerController.init()
        versionRouter.use('/markets', bankerController.apiRouter)
        this.controllers.push(bankerController)

        const metricsController = new MetricsController(
            this.config.opCfg,
            priceController
        )
        await metricsController.init()
        versionRouter.use('/metrics', metricsController.apiRouter)
        this.controllers.push(metricsController)

        const stakeController = new StakeController(
            this.config.opCfg,
            metricsController,
            priceController
        )
        await stakeController.init()
        versionRouter.use('/staking', stakeController.apiRouter)
        this.controllers.push(stakeController)

        versionRouter.use(
            (err: Error, req: Request, res: Response, next: NextFunction) => {
                res.status(500).send(
                    formatRes(null, {
                        errorCode: 500,
                        errorMessage: err.toString(),
                        errorTrace: err.stack,
                    })
                )
            }
        )

        this.app.use(responseTime((req, res, time) => {
            httpRequestTimer.observe(time)
        }))
        this.app.use(this.config.config.version, versionRouter)
    }

    // Starts the server
    public async start() {
        this.httpServer = this.app.listen(this.config.config.port, () => {
            console.log('Listening on port ', this.config.config.port)
        })
    }

    public async stop() {
        if (!this.httpServer) {
            return
        }

        await Promise.all(
            this.controllers.map((controller) => controller.close())
        )
        this.httpServer.close((err) => {
            if (err) throw new Error(`Error closing server: ${err.stack}`)
        })
    }

    private async setupDocs() {
        this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
    }
}
