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
} from './routes'

const swaggerDoc = YAML.load('./openapi.yaml')

export class Server {
    protected config: Config
    protected app: express.Application
    protected httpServer?: http.Server

    protected controllers: Controller[]

    constructor() {
        this.config = new Config()
        this.app = express()
        this.controllers = []
    }

    // Registers all middleware and routers the app uses
    public async init() {
        this.setupDocs()
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: true }))

        this.app.get(
            '/ping',
            (req: Request, res: Response, next: NextFunction) => {
                res.send('Pong')
            }
        )

        const versionRouter = express.Router()

        const supplyController = new SupplyController(
            this.config.opCfg
        )
        await supplyController.init()
        versionRouter.use('/supply', supplyController.apiRouter)
        this.controllers.push(supplyController)

        const priceController = new PriceController(
            this.config.opCfg
        )
        await priceController.init()
        versionRouter.use('/price', priceController.apiRouter)
        this.controllers.push(priceController)

        const nftController = new NFTController()
        await nftController.init()
        versionRouter.use('/nft', nftController.apiRouter)
        this.controllers.push(nftController)

        const pairController = new PairController(
            this.config.opCfg,
            priceController,
        )
        await pairController.init()
        versionRouter.use('/pairs', pairController.apiRouter)
        this.controllers.push(pairController)

        const poolController = new PoolController(
            this.config.opCfg,
            priceController,
        )
        await poolController.init()
        versionRouter.use('/pools', poolController.apiRouter)
        this.controllers.push(poolController)

        const bankerController = new BankerController(
            this.config.opCfg,
            priceController,
        )
        await bankerController.init()
        versionRouter.use('/markets', bankerController.apiRouter)
        this.controllers.push(bankerController)

        const metricsController = new MetricsController(
            this.config.opCfg,
            priceController,
        )
        await metricsController.init()
        versionRouter.use('/metrics', metricsController.apiRouter)
        this.controllers.push(metricsController)

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
