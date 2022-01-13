import express from 'express'

// Admin routes to set config such as refreshinterval
export class AdminController {
    constructor() {}

    async init() {}

    get apiRouter() {
        const router = express.Router() 

        return router
    }

    async close() {}
}