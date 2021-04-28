const io = require('socket.io')
const uuid = require('uuid')

const Helpers = require('./Helpers')
const Logger = require('./Logger')
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

function Server({
    gameClass,
    minPlayers,
    maxPlayers,
    subscribes = [],
    logLevel = 'all',
    playerDataValidator = () => true,
    roomSettingsValidator = () => true,
    roomSettingsChecker = () => true,
    maxNameLength = MAX_NAME_LENGTH
})
{
    // Public variables
    //---------------------------

    /**
     * socket.io object
     * @type {io.Server}
     */
    this.io = io({
        transports: [ 'websocket' ] // disable HTTP long-polling
    })

    /**
     * Logger
     * @type {Logger}
     */
    this.logger = new Logger(logLevel)


    // Private variables
    //---------------------------

    /**
     * List of rooms
     * @type {Object.<string, RoomObj>}
     */
    const rooms = {}

     /**
      * List of players
      * @type {Object.<string, PlayerObj>}
      */
    const players = {}


    // Public methods
    //---------------------------

    /**
     * Run the server
     * @param {object} options server options
     *      - {Number} port: the port to run the server on
     */
    this.run = ({ port = SERVER_PORT, httpServer = null } = {}) =>
    {
        // Init Helpers
        Helpers.init({ io: this.io, players, rooms, logger: this.logger })

        // IO connection event
        this.io.on('connection', (socket) =>
        {
            // Connect
            Helpers.connect(socket)

            // Default subscribes
            socket.on('createRoom', createRoom(socket))
            socket.on('joinRoom', joinRoom(socket))
            socket.on('leaveRoom', leaveRoom(socket))
            socket.on('getRoom', getRoom(socket))
            socket.on('setPlayer', setPlayer(socket))
            socket.on('setRoomSettings', setRoomSettings(socket))
            socket.on('startGame', startGame(socket))

            // Custom subscribes
            subscribes.forEach(({ name, inputValidator }) =>
            {
                socket.on(name, customEvent(socket, name, inputValidator))
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
            this.logger.serverLog(`HTTP server running at localhost:${port}/`)
        }
        else
        {
            // Standalone mode
            this.io.listen(port)

            // Log port
            this.logger.serverLog(`WebSocket server running at localhost:${port}/`)
        }

    }


    // Private methods
    //---------------------------

    const getPlayer = (socket) =>
    {
        return players[socket.id]
    }

    const getPlayerRoom = (socket) =>
    {
        return rooms[players[socket.id].roomId]
    }

    /**
     * Get the player's current room if any
     */
    const getRoomIdFromCode = (code) =>
    {
        const roomIds = Object.keys(rooms)
        for (const roomId of roomIds) {
            if (rooms[roomId].code === code) {
                return roomId
            }
        }
        return null
    }

    const setPlayerData = (socket, data) =>
    {
        // Store the player data
        players[socket.id].data = data
    }

    const setPlayerName = (socket, name) =>
    {
        // Store the player name
        const playerName = name.slice(0, maxNameLength)
        players[socket.id].name = playerName
    }

    const formatPlayers = (playerIds, fields) =>
    {
        return playerIds.map((playerId) =>
        {
            const roomPlayer = players[playerId]
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
        }).filter(Boolean)
    }


    // Private default IO handlers
    //---------------------------

    const createRoom = (socket) => (data) =>
    {
        this.logger.log(socket.id, 'requesting to create a room.')

        // Get player
        const player = getPlayer(socket)

        // Check if not already in a room
        const playerRoom = getPlayerRoom(socket)
        if (playerRoom)
        {
            return Helpers.replyError(socket, 'createRoom', Errors.alreadyInRoom)
        }

        // Validate the user inputs
        if (!data || !validate.playerName(data.name))
        {
            return Helpers.replyError(socket, 'createRoom', Errors.invalid.playerName)
        }
        if (!playerDataValidator(data.data))
        {
            return Helpers.replyError(socket, 'createRoom', Errors.invalid.playerData)
        }

        // Create the room
        const roomId = `room_${uuid.v4()}`
        const roomCode = generate.roomCode()

        rooms[roomId] = {
            code: roomCode,
            gameInstance: null,
            host: socket.id,
            players: [socket.id],
            settings: {}
        }

        // Server log
        this.logger.serverLog(`Room created : ${roomId} with code : ${roomCode}`)

        // Join the room
        player.roomId = roomId

        // Make the host join the io room
        socket.join(roomId)

        // Update host name & data
        setPlayerName(socket, data.name)
        setPlayerData(socket, data.data)

        // Reply
        return Helpers.reply(socket, 'createRoom')
    }

    /**
     * @emits roomUpdated
     */
    const joinRoom = (socket) => (data) =>
    {
        this.logger.log(socket.id, 'requesting to join a room the room with code ' + (data ? data.code : null))

        // Get player
        const player = getPlayer(socket)

        // Check if not already in a room
        const playerRoom = getPlayerRoom(socket)
        if (playerRoom)
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.alreadyInRoom)
        }

        // Validate the user inputs
        if (!data || !validate.playerName(data.name))
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.invalid.playerName)
        }
        if (!validate.code(data.code))
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.invalid.code)
        }
        if (!playerDataValidator(data.data))
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.invalid.playerData)
        }

        // Check that the room exists
        const roomId = getRoomIdFromCode(data.code)
        if (!roomId)
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.roomNotFound)
        }

        // Check that the game instance is not started (still in lobby)
        const room = rooms[roomId]
        if (room.gameInstance !== null)
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.gameAlreadyStarted)
        }

        // Check that the room is not full
        if (room.players.length >= maxPlayers)
        {
            return Helpers.replyError(socket, 'joinRoom', Errors.roomIsFull)
        }

        // Join the room
        player.roomId = roomId
        room.players.push(socket.id)

        // Join the io room
        socket.join(roomId)

        // Update player name & data
        setPlayerName(socket, data.name)
        setPlayerData(socket, data.data)

        // Broadcast to others
        this.io.to(roomId).emit('roomUpdated')

        // Reply
        return Helpers.reply(socket, 'joinRoom')
    }

    const leaveRoom = (socket) => () =>
    {
        this.logger.log(socket.id, 'requesting to leave the room')

        // Get player room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom)
        {
            return Helpers.replyError(socket, 'leaveRoom', Errors.notInRoom)
        }

        // Leave the room, but don't remove the player
        Helpers.leaveRoom(socket.id, false)

        // Reply
        return Helpers.reply(socket, 'leaveRoom')
    }

    const getRoom = (socket) => () =>
    {
        this.logger.log(socket.id, 'requesting the room infos')

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
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
                const { name, data, publicId } = players[playerId]
                return { name, data, publicId }
            }),
            settings: playerRoom.settings
        }

        // Reply
        return Helpers.reply(socket, 'getRoom', infos)
    }

    /**
     * @emits roomUpdated
     */
    const setPlayer = (socket) => (data) =>
    {
        this.logger.log(socket.id, 'requesting to update player data')

        // Get player
        const player = getPlayer(socket)

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
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
        if (!data || !validate.playerName(data.name))
        {
            return Helpers.replyError(socket, 'setPlayer', Errors.invalid.playerName)
        }
        if (!playerDataValidator(data.data))
        {
            return Helpers.replyError(socket, 'startGame', Errors.invalid.playerData)
        }
        
        // Update player name & data
        setPlayerName(socket, data.name)
        setPlayerData(socket, data.data)

        // Broadcast to others
        this.io.to(player.roomId).emit('roomUpdated')

        // Reply
        return Helpers.reply(socket, 'setPlayer')
    }

    /**
     * @emits roomUpdated
     */
    const setRoomSettings = (socket) => (data) =>
    {
        this.logger.log(socket.id, 'requesting to update room infos.')

        // Get player
        const player = getPlayer(socket)

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
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
        if (!roomSettingsValidator(data))
        {
            return Helpers.replyError(socket, 'setRoomSettings', Errors.invalid.roomSettings)
        }

        // Store the data
        playerRoom.settings = data

        // Broadcast to others
        this.io.to(player.roomId).emit('roomUpdated')

        // Reply
        return Helpers.reply(socket, 'setRoomSettings')
    }

    /**
     * @emits gameStarted
     */
    const startGame = (socket) => () =>
    {
        this.logger.log(socket.id, 'requesting to start the game')

        // Get player
        const player = getPlayer(socket)

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
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
        if (playerRoom.players.length < minPlayers || playerRoom.players.length > maxPlayers)
        {
            return Helpers.replyError(socket, 'startGame', Errors.wrongPlayerCount)
        }

        // Validate the room settings
        if (!roomSettingsChecker(playerRoom.settings, playerRoom.players.length))
        {
            return Helpers.replyError(socket, 'startGame', Errors.incompatibleSettings)
        }

        // Create the RoomPusher
        const roomPusher = new RoomPusher({
            io: this.io,
            roomId: player.roomId,
            roomPlayers: formatPlayers(playerRoom.players, ['publicId', 'socket']),
            logger: this.logger
        })

        // Create the game instance and init it
        playerRoom.gameInstance = new gameClass()
        playerRoom.gameInstance.init({
            players: formatPlayers(playerRoom.players, ['publicId', 'name', 'data']),
            host: players[playerRoom.host].publicId,
            settings: playerRoom.settings,
            roomCode: playerRoom.code,
            roomPusher,
            logger: this.logger
        })

        // Broadcast to others
        this.io.to(player.roomId).emit('gameStarted')

        // Reply
        return Helpers.reply(socket, 'startGame')
    }

    const customEvent = (socket, name, inputValidator) => (data) =>
    {
        this.logger.log(socket.id, 'received custom event ' + name)

        // Get player
        const player = getPlayer(socket)

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
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

module.exports = Server