const Server = require('./lib/Server')

/**
 * @typedef {Object} SubscribeDescriptor
 * @property {string} name The subscribe name. The Game class must have a method with that name
 * @property {[Function]} inputValidator A validation function run on the user input
 */

/**
 * @typedef {Object} ServerConfig
 * @property {any} gameClass A gamer.io Game class
 * @property {number} minPlayers The minimum number (included) of players to start the game
 * @property {number} maxPlayers The maximum number (included) of players to start the game
 * @property {Array.<SubscribeDescriptor>} subscribes List of subscribes
 * @property {[Function]} playerDataValidator Function to validate the player data
 * @property {[Function]} roomSettingsValidator Function to validate the room settings
 * @property {[Function]} roomSettingsChecker Function to check the room settings compatibility
 * @property {[('default'|'all'|'error')]} logLevel Level of server logs
 * @property {[number]} maxNameLength Maximum number of characters for player names
 */

/**
 * Create and return a Server instance
 * @param {ServerConfig} config config object for the server
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