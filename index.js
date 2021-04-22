const Server = require('./lib/Server')

/**
 * @typedef {Object} SubscribeDescriptor
 * @property {string} name The subscribe name. The Game class must have a method with that name
 * @property {[Function]} inputValidator A validation function run on the user input
 */


/**
 * Create and return a Server instance
 * @param {Object} config config object for the server
 *      - gameClass: A Game class
 *      - {Array.<SubscribeDescriptor>} list of subscribes
 * @returns {Server} an instance of Server
 */
function createServer(config)
{
    /**
     * Create the Server instance
     * @type {Server}
     */
    const server = new Server(config)

    return server
}

module.exports = {
    createServer
}