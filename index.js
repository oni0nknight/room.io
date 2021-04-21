import { Server } from './lib/Server'
import { Conditions } from './lib/Conditions'

export function createServer()
{
    /**
     * Create the Server instance
     * @type {Server}
     */
    const server = new Server()

    return server
}

module.exports = { createServer, Conditions }