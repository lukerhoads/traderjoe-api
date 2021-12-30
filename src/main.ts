import express from 'express'
import { Server } from './server'

const port = 3000

const server = new Server()
server.init()

server.start(port)
