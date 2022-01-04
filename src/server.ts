import * as http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import { SupplyController } from './routes/supply'
import Config from './config'
import { Controller } from './routes/controller'
import { PriceController } from './routes/price'

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
        this.app.get('/', (req: Request, res: Response, next: NextFunction) => {
            res.sendStatus(200)
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

        // Add rate limiting

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
                    url: '/swagger.json',
                },
            })
        )
    }
}
