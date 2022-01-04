import * as http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import { SupplyController } from './routes/supply'
import Config from './config'
import { Controller } from './routes/controller'
import { PriceController } from './routes/price'
import { NFTController } from './routes/nft'
import { BankerController } from './routes/banker'
import { MetricsController } from './routes/metrics'


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
        this.app.get('/ping', (req: Request, res: Response, next: NextFunction) => {
            res.send('Pong')
        })

        const versionRouter = express.Router()

        const supplyController = new SupplyController()
        await supplyController.init()
        versionRouter.use('/supply', supplyController.apiRouter)
        this.controllers.push(supplyController)

        const priceController = new PriceController()
        await priceController.init()
        versionRouter.use('/price', priceController.apiRouter)
        this.controllers.push(priceController)

        const nftController = new NFTController()
        await nftController.init()
        versionRouter.use('/nft', nftController.apiRouter)
        this.controllers.push(nftController)

        const bankerController = new BankerController()
        await bankerController.init()
        versionRouter.use('/lending', bankerController.apiRouter)
        this.controllers.push(bankerController)

        const metricsController = new MetricsController()
        await metricsController.init()
        versionRouter.use('/metrics', metricsController.apiRouter)
        this.controllers.push(metricsController)    
    
        this.app.use(this.config.config.version, versionRouter)
    }

    // Starts the server
    public async start(port: number) {
        this.httpServer = this.app.listen(port, () => {
            console.log('Listening on port ', port)
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
        this.app.use(
            '/docs',
            swaggerUi.serve,
            swaggerUi.setup(undefined, {
                swaggerOptions: {
                    url: './swagger.yaml',
                },
            })
        )
    }
}
