const io = require('socket.io')
const uuid = require('uuid')

const Helpers = require('./Helpers')
const { createLogger } = require('./Logger')
const Errors = require('./Errors')
const RoomPusher = require('./RoomPusher')
const { validate, generate } = require('./DataHelpers')

const SERVER_PORT = 8080
const MAX_NAME_LENGTH = 10


// Type defs
//=================================================

/**
 * @typedef {Object} RoomObj
 * @property {string} code the room code
 * @property {(Game|null)} gameInstance the game instance, if the game is started
 * @property {string} host the host socket ID
 * @property {Array.<string>} players the list of players' socket ID
 * @property {Object} settings the room custom settings
 */

/**
 * @typedef {Object} PlayerObj
 * @property {Socket} socket the player io socket object
 * @property {string} publicId the player public unique ID
 * @property {string} name the player name
 * @property {(string|null)} roomId the player room ID
 * @property {Boolean} online the player connection state
 * @property {Object} data the player custom data
 */


// Server
//=================================================

class Server
{
    //=====================
    // Public attributes
    //=====================

    /**
     * socket.io object
     * @type {io.Server}
     */
    io = null

    /**
     * Logger
     * @type {winston.Logger}
     */
    logger = null

    /**
     * @type {number}
     */
    minPlayers = 1

    /**
     * @type {number}
     */
    maxPlayers = 1

    /**
     * @type {any}
     */
    defaultPlayerData = {}

    /**
     * @type {any}
     */
    defaultRoomSettings = {}

    /**
     * @type {Function}
     */
    playerDataValidator = () => true

    /**
     * @type {Function}
     */
    roomSettingsValidator = () => true

    /**
     * @type {Function}
     */
    roomSettingsChecker = () => true

    /**
     * @type {number}
     */
    maxNameLength = 1

    //=====================
    // Private attributes
    //=====================

    /**
     * List of rooms
     * @type {Object.<string, RoomObj>}
     */
    #rooms = {}

    /**
     * List of players
     * @type {Object.<string, PlayerObj>}
     */
    #players = {}

    /**
     * The game class
     */
    #gameClass = null

    /**
     * List of game actions
     */
    #actions = []


    //=====================
    // Constructor
    //=====================

    constructor({
        gameClass,
        minPlayers,
        maxPlayers,
        defaultPlayerData = {},
        defaultRoomSettings = {},
        actions = [],
        logger: { level = 'info', defaultMeta = {} } = {},
        playerDataValidator = () => true,
        roomSettingsValidator = () => true,
        roomSettingsChecker = () => true,
        maxNameLength = MAX_NAME_LENGTH
    })
    {
        this.io = io({
            transports: [ 'websocket' ] // disable HTTP long-polling
        })
        this.#gameClass = gameClass
        this.#actions = actions
        this.minPlayers = minPlayers
        this.maxPlayers = maxPlayers
        this.defaultPlayerData = defaultPlayerData
        this.defaultRoomSettings = defaultRoomSettings
        this.playerDataValidator = playerDataValidator
        this.roomSettingsValidator = roomSettingsValidator
        this.roomSettingsChecker = roomSettingsChecker
        this.maxNameLength = maxNameLength
        this.logger = createLogger({ level, defaultMeta })
    }

    //=====================
    // Public methods
    //=====================

    /**
     * Run the server
     * @param {object} options server options
     *      - {Number} port: the port to run the server on
     */
    run({ port = SERVER_PORT, httpServer = null } = {})
    {
        // Init Helpers
        Helpers.init({ io: this.io, players: this.#players, rooms: this.#rooms, logger: this.logger })

        // IO connection event
        this.io.on('connection', (socket) =>
        {
            // Connect
            Helpers.connect(socket)

            // Default actions
            socket.on('createRoom', this.createRoom(socket))
            socket.on('joinRoom', this.joinRoom(socket))
            socket.on('leaveRoom', this.leaveRoom(socket))
            socket.on('getRoom', this.getRoom(socket))
            socket.on('setPlayer', this.setPlayer(socket))
            socket.on('getPlayerData', this.getPlayerData(socket))
            socket.on('setRoomSettings', this.setRoomSettings(socket))
            socket.on('startGame', this.startGame(socket))

            // Custom actions
            this.#actions.forEach(({ name, inputValidator }) =>
            {
                socket.on(name, this.customAction(socket, name, inputValidator))
            })

            // Disconnect
            socket.on('disconnect', () => { Helpers.disconnect(socket) })
        })

        // Open HTTP server
        if (httpServer)
        {
            // Attach the given server
            this.io.attach(httpServer)

            // Launch server
            httpServer.listen(port)

            // Log port
            this.logger.server(`HTTP server running at localhost:${port}/`)
        }
        else
        {
            // Standalone mode
            this.io.listen(port)

            // Log port
            this.logger.server(`WebSocket server running at localhost:${port}/`)
        }

    }


    //=====================
    // Private methods
    //=====================

    #getPlayer(socket)
    {
        return this.#players[socket.id]
    }

    #getPlayerRoom(socket)
    {
        return this.#rooms[this.#players[socket.id].roomId]
    }

    /**
     * Get the player's current room if any
     */
    #getRoomIdFromCode(code)
    {
        const roomIds = Object.keys(this.#rooms)
        for (const roomId of roomIds) {
            if (this.#rooms[roomId].code === code) {
                return roomId
            }
        }
        return null
    }

    #setPlayerData(socket, data)
    {
        // Store the player data
        this.#players[socket.id].data = data
    }

    #setPlayerName(socket, name)
    {
        // Store the player name
        const playerName = name.slice(0, this.maxNameLength)
        this.#players[socket.id].name = playerName
    }

    #formatPlayer(playerId, fields)
    {
        const roomPlayer = this.#players[playerId]
        if (roomPlayer)
        {
            return fields.reduce((acc, field) =>
            {
                if (Object.prototype.hasOwnProperty.call(roomPlayer, field))
                {
                    acc[field] = roomPlayer[field]
                }
                return acc
            }, {})
        }
        else
        {
            return null
        }
    }

    #formatPlayers(playerIds, fields)
    {
        return playerIds.map((playerId) => this.#formatPlayer(playerId, fields)).filter(Boolean)
    }


    //===============================
    // Private default IO handlers
    //===============================

    createRoom(socket)
    {
        return ({ playerName, playerData, roomSettings } = {}) =>
        {
            this.logger.info('requesting to create a room.', { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check if not already in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (playerRoom)
            {
                return Helpers.replyError(socket, 'createRoom', Errors.alreadyInRoom)
            }

            // Validate the user inputs
            if (!validate.playerName(playerName))
            {
                return Helpers.replyError(socket, 'createRoom', Errors.invalid.playerName)
            }
            if (playerData !== undefined && !this.playerDataValidator(playerData))
            {
                return Helpers.replyError(socket, 'createRoom', Errors.invalid.playerData)
            }
            if (roomSettings !== undefined && !this.roomSettingsValidator(roomSettings))
            {
                return Helpers.replyError(socket, 'createRoom', Errors.invalid.roomSettings)
            }

            // Create the room
            const roomId = `room_${uuid.v4()}`
            const roomCode = generate.roomCode()

            this.#rooms[roomId] = {
                code: roomCode,
                gameInstance: null,
                host: socket.id,
                players: [socket.id],
                settings: (roomSettings !== undefined) ? roomSettings : this.defaultRoomSettings
            }

            // Server log
            this.logger.room(`Room created with code : ${roomCode}`, { room: roomId })

            // Join the room
            player.roomId = roomId

            // Make the host join the io room
            socket.join(roomId)

            // Update host name & data
            this.#setPlayerName(socket, playerName)
            this.#setPlayerData(socket, (playerData !== undefined) ? playerData : this.defaultPlayerData)

            // Reply
            return Helpers.reply(socket, 'createRoom')
        }
    }

    /**
     * @emits roomUpdated
     */
    joinRoom(socket)
    {
        return ({ playerName, playerData, roomCode } = {}) =>
        {
            this.logger.info(`requesting to join a room the room with code ${roomCode}`, { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check if not already in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (playerRoom)
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.alreadyInRoom)
            }

            // Validate the user inputs
            if (!validate.playerName(playerName))
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.invalid.playerName)
            }
            if (playerData !== undefined && !this.playerDataValidator(playerData))
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.invalid.playerData)
            }
            if (!validate.code(roomCode))
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.invalid.code)
            }

            // Check that the room exists
            const roomId = this.#getRoomIdFromCode(roomCode)
            if (!roomId)
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.roomNotFound)
            }

            // Check that the game instance is not started (still in lobby)
            const room = this.#rooms[roomId]
            if (room.gameInstance !== null)
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.gameAlreadyStarted)
            }

            // Check that the room is not full
            if (room.players.length >= this.maxPlayers)
            {
                return Helpers.replyError(socket, 'joinRoom', Errors.roomIsFull)
            }

            // Join the room
            player.roomId = roomId
            room.players.push(socket.id)

            // Join the io room
            socket.join(roomId)

            // Update player name & data
            this.#setPlayerName(socket, playerName)
            this.#setPlayerData(socket, (playerData !== undefined) ? playerData : this.defaultPlayerData)

            // Broadcast to others
            this.io.to(roomId).emit('roomUpdated')

            // Reply
            return Helpers.reply(socket, 'joinRoom')
        }
    }

    leaveRoom(socket)
    {
        return () =>
        {
            this.logger.info(`requesting to leave the room`, { socket: socket.id })

            // Get player room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'leaveRoom', Errors.notInRoom)
            }

            // Leave the room, but don't remove the player
            Helpers.leaveRoom(socket.id, false)

            // Reply
            return Helpers.reply(socket, 'leaveRoom')
        }
    }

    getRoom(socket)
    {
        return () =>
        {
            this.logger.info(`requesting the room infos`, { socket: socket.id })

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'getRoom', Errors.notInRoom)
            }

            // Send response
            const infos = {
                code: playerRoom.code,
                isHost: playerRoom.host === socket.id,
                players: playerRoom.players.map((playerId) =>
                {
                    const { name, data, publicId } = this.#players[playerId]
                    return { name, data, publicId }
                }),
                settings: playerRoom.settings
            }

            // Reply
            return Helpers.reply(socket, 'getRoom', infos)
        }
    }

    /**
     * @emits roomUpdated
     */
    setPlayer(socket)
    {
        return ({ playerName, playerData } = {}) =>
        {
            this.logger.info(`requesting to update player data`, { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'setPlayer', Errors.notInRoom)
            }

            // Check that the game is not already started
            if (playerRoom.gameInstance !== null)
            {
                return Helpers.replyError(socket, 'setPlayer', Errors.gameAlreadyStarted)
            }

            // Validate the user inputs
            if (playerName !== undefined && !validate.playerName(playerName))
            {
                return Helpers.replyError(socket, 'setPlayer', Errors.invalid.playerName)
            }
            if (playerData !== undefined && !this.playerDataValidator(playerData))
            {
                return Helpers.replyError(socket, 'startGame', Errors.invalid.playerData)
            }
            
            // Update player name & data
            if (playerName !== undefined)
            {
                this.#setPlayerName(socket, playerName)
            }
            if (playerData !== undefined)
            {
                this.#setPlayerData(socket, playerData)
            }

            // Broadcast to others
            this.io.to(player.roomId).emit('roomUpdated')

            // Reply
            return Helpers.reply(socket, 'setPlayer')
        }
    }

    getPlayerData(socket)
    {
        return () =>
        {
            this.logger.info(`requesting to get player data`, { socket: socket.id })

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'getPlayerData', Errors.notInRoom)
            }

            // Reply
            return Helpers.reply(socket, 'getPlayerData', this.#formatPlayer(socket.id, ['publicId', 'name', 'data']))
        }
    }

    /**
     * @emits roomUpdated
     */
    setRoomSettings(socket)
    {
        return (roomSettings) =>
        {
            this.logger.info(`requesting to update room infos.`, { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'setRoomSettings', Errors.notInRoom)
            }

            // Check that the player is the host
            const isHost = playerRoom.host === socket.id
            if (!isHost)
            {
                return Helpers.replyError(socket, 'setRoomSettings', Errors.notHost)
            }

            // Validate the user inputs
            if (!this.roomSettingsValidator(roomSettings))
            {
                return Helpers.replyError(socket, 'setRoomSettings', Errors.invalid.roomSettings)
            }

            // Store the data
            playerRoom.settings = roomSettings

            // Broadcast to others
            this.io.to(player.roomId).emit('roomUpdated')

            // Reply
            return Helpers.reply(socket, 'setRoomSettings')
        }
    }

    /**
     * @emits gameStarted
     */
    startGame(socket)
    {
        return () =>
        {
            this.logger.info(`requesting to start the game`, { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, 'startGame', Errors.notInRoom)
            }

            // Check that the player is the host
            const isHost = playerRoom.host === socket.id
            if (!isHost)
            {
                return Helpers.replyError(socket, 'startGame', Errors.notHost)
            }

            // Check that the game is not already started
            if (playerRoom.gameInstance !== null)
            {
                return Helpers.replyError(socket, 'startGame', Errors.gameAlreadyStarted)
            }

            // Check that the number of players is valid
            if (playerRoom.players.length < this.minPlayers || playerRoom.players.length > this.maxPlayers)
            {
                return Helpers.replyError(socket, 'startGame', Errors.wrongPlayerCount)
            }

            // Validate the room settings
            const formattedPlayers = this.#formatPlayers(playerRoom.players, ['publicId', 'name', 'data'])
            if (!this.roomSettingsChecker(playerRoom.settings, formattedPlayers))
            {
                return Helpers.replyError(socket, 'startGame', Errors.incompatibleSettings)
            }

            // Create the RoomPusher
            const playerSockets = playerRoom.players.reduce((acc, playerId) =>
            {
                const roomPlayer = this.#players[playerId]
                return { ...acc, [roomPlayer.publicId]: roomPlayer.socket }
            }, {})
            const roomPusher = new RoomPusher({
                io: this.io,
                roomId: player.roomId,
                sockets: playerSockets,
                logger: this.logger
            })

            // Create the game instance and init it
            playerRoom.gameInstance = new this.#gameClass()
            playerRoom.gameInstance.init({
                players: formattedPlayers,
                host: this.#players[playerRoom.host].publicId,
                settings: playerRoom.settings,
                roomId: player.roomId,
                roomPusher,
                logger: this.logger
            })

            // Server log
            this.logger.room(`Game started`, { room: player.roomId })

            // Broadcast to others
            this.io.to(player.roomId).emit('gameStarted')

            // Reply
            return Helpers.reply(socket, 'startGame')
        }
    }

    customAction(socket, name, inputValidator)
    {
        return (data) =>
        {
            this.logger.info(`sending custom action ${name}`, { socket: socket.id })

            // Get player
            const player = this.#getPlayer(socket)

            // Check that the player is in a room
            const playerRoom = this.#getPlayerRoom(socket)
            if (!playerRoom)
            {
                return Helpers.replyError(socket, name, Errors.notInRoom)
            }

            // Check that the game is started in that room
            if (!playerRoom.gameInstance)
            {
                return Helpers.replyError(socket, name, Errors.gameNotStarted)
            }

            // Validate user inputs
            if ((inputValidator instanceof Function) && !inputValidator(data))
            {
                return Helpers.replyError(socket, name, Errors.invalid.input)
            }

            // Check that the callback exists
            const callback = playerRoom.gameInstance[name]
            if (!(callback instanceof Function))
            {
                return Helpers.replyError(socket, name, Errors.missingCallback)
            }

            // Call the custom callback
            const cbReturn = callback.call(playerRoom.gameInstance, {
                playerId: player.publicId,
                data
            }) || {}

            if (cbReturn.error)
            {
                return Helpers.replyError(socket, name, cbReturn.error)
            }
            else
            {
                return Helpers.reply(socket, name, cbReturn.response)
            }
        }
    }

}

module.exports = Server