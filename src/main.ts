import { Server } from './server'
import express, { NextFunction, Request, Response } from 'express'

const port = 3000

const main = async () => {
    const server = new Server()
    await server.init()
    
    server.start(port)
}

main()
