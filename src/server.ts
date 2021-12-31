import * as http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'

export class Server {
    protected app: express.Application
    protected httpServer?: http.Server

    constructor() {
        this.app = express()
    }

    // Registers all middleware and routers the app uses
    public async init() {
        this.setupDocs()
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: true }))

        this.app.get('/', (req: Request, res: Response, next: NextFunction) => {
            res.sendStatus(200)
        })

        // Add versioning
        // base: ${url}/${version}/${service}
        // Add rate limiting
    }

    // Starts the server
    public async start(port: number) {
        this.httpServer = this.app.listen(port, () => {
            console.log("Listening on port ", port)
        })
    }

    public async stop() {
        if (!this.httpServer) {
            return 
        }

        this.httpServer.close((err) => {
            if (err) throw new Error(`Error closing server: ${err.stack}`)
        })
    }

    private async setupDocs() {
        // this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, {
        //     swaggerOptions: {
        //         url: '/swagger.json'
        //     }
        // }))
    }
}