import 'dotenv/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

export const isProd = process.env.NODE_ENV === 'production'

const opConfig = {
    version: '/v1',
    port: 3000,
    lendingGraphUrl:
        'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/lending',
}

class Config {
    constructor() {
        dotenv.config({ path: path.join(__dirname, '/.env') })
    }

    get config() {
        return {
            ...opConfig,
        }
    }
}

export default Config
