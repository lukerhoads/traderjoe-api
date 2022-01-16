import { Server } from './server'
import cluster from 'cluster'
import * as os from 'os'

const main = async () => {
    const server = new Server()
    await server.init()
    server.start()
}

if (process.env.MODE === 'multicore') {
    if (cluster.isPrimary) {
        const cores = os.cpus().length
        const availableCores =
            cores % 2 === 0 ? cores / 2 : Math.ceil(cores / 2)

        console.log('Available cores, ', cores, ', using ', availableCores)

        for (let i = 0; i < availableCores; i++) {
            cluster.fork()
        }

        cluster.on('exit', (worker) => {
            console.log('Worker ', worker.id, 'has exited.')
        })
    } else {
        main()
    }
} else {
    main()
}
