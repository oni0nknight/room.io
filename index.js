const Server = require('./lib/Server')

/**
 * @typedef {Object} ActionDescriptor
 * @property {string} name The action name. The Game class must have a method with that name
 * @property {ValidationCallback} [inputValidator] A validation function run on the user input
 */

/**
 * @typedef {Object} LoggerConfig
 * @property {('server'|'room'|'error'|'warn'|'info'|'debug')} [level] Logger level
 * @property {object} [defaultMeta] Default added log metadata
 */

/**
 * This callback type is called `validationCallback` and is used to validate user inputs.
 * @callback ValidationCallback
 * @param {any} data Client input
 * @returns {Boolean} Whether the user input is valid
 */

/**
 * @typedef {Object} ServerConfig
 * @property {any} gameClass A room.io Game class
 * @property {number} minPlayers The minimum number (included) of players to start the game
 * @property {number} maxPlayers The maximum number (included) of players to start the game
 * @property {Array.<ActionDescriptor>} [actions=[]] List of game actions
 * @property {ValidationCallback} [playerDataValidator] Function to validate the player data
 * @property {ValidationCallback} [roomSettingsValidator] Function to validate the room settings
 * @property {ValidationCallback} [roomSettingsChecker] Function to check the room settings compatibility
 * @property {LoggerConfig} [logger] Logger configuration
 * @property {number} [maxNameLength=10] Maximum number of characters for player names
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