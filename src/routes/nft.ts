import express from 'express'
import { formatRes } from '../util/format_res'

export class NFTController {
    constructor() {}

    async init() {}

    get apiRouter() {
        const router = express.Router()

        router.get('/hat/:id', (req, res, next) => {
            if (req.params.id) {
                res.send(formatRes({
                    name: "Joe Hat NFT"
                }))
            }

            res.send(formatRes({
                id: req.params.id,
                external_url: "https://api.traderjoexyz.com/nft/hat/" + req.params.id,
                name: "Joe Hat NFT #" + req.params.id,
                description: "Redeemed a real HAT and burned 1 $HAT",
                image: "https://ipfs.io/ipfs/QmaYPV2VKW5vHtD92m8h9Q4YFiukFx2fBWPAfCWKg6513s",
            }))
        })

        return router
    }

    async close() {}
}