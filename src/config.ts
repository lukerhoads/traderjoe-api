import 'dotenv/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

const opConfig = {
    version: '/v1',
    port: 3000,
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
