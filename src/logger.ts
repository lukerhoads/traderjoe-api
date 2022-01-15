import pino from 'pino'
import logger from 'pino-http'

export const Logger = logger({
    logger: pino(),
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
