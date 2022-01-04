import express from 'express'

export interface Controller {
    init(): Promise<void>
    get apiRouter(): express.Router
    close(): Promise<void>
}
