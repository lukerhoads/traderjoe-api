import pino from 'pino'
import logger from 'pino-http'
import pretty from 'pino-pretty'
import { isProd } from './config'

const prettyOpts = pretty({
    colorize: true,
})

export const appLogger = isProd ? pino() : pino(prettyOpts)

export const loggerMiddleware = logger({
    logger: appLogger,
    customLogLevel: (res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn'
        } else if (res.statusCode >= 500 || err) {
            return 'error'
        } else if (res.statusCode >= 300 && res.statusCode < 400) {
            return 'silent'
        }
        return 'info'
    },
})
