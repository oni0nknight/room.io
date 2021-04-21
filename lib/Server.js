const express = require('express')
const httpServer = require('http').Server
const ioListen = require('socket.io').listen
const uuid = require('uuid')

const Helpers = require('./Helpers')
const Logger = require('./Logger')
const { Conditions } = require('./Conditions')
const Errors = require('./Errors')
const Push = require('./Push')
const { validate, generate } = require('./DataHelpers')

const SERVER_PORT = 8080
const MIN_PLAYERS = 3
const MAX_PLAYERS = 5
const MAX_NAME_LENGTH = 10


// Logger
//=================================================

const nodeArgs = process.argv.slice(2)
const logArgIdx = nodeArgs.findIndex((a) => a === '--log' || a === '-l')
if (logArgIdx >= 0 && logArgIdx <= nodeArgs.length - 2)
{
    Logger.setLogLevel(nodeArgs[logArgIdx + 1])
}


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

export function Server(GameClass)
{
    // Public variables
    //---------------------------

    /**
     * Express app
     */
    this.app = express()

    /**
     * HTTP server
     */
    this.http = httpServer(this.app)


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

    /**
     * Custom subscribes
     */
    const subscribes = {}

    /**
     * socket.io object
     */
    const io = ioListen(this.http)


    // Public methods
    //---------------------------

    /**
     * Run the server
     * @param {object} options server options
     *      - {Number} port: the port to run the server on
     */
    this.run = ({ port = SERVER_PORT }) =>
    {
        // Init Helpers
        Helpers.init({ io, players, rooms })

        // IO connection event
        io.on('connection', (socket) =>
        {
            // Connect
            Helpers.connect(socket)

            // Default subscribes
            socket.on('createRoom', createRoom(socket))
            socket.on('joinRoom', joinRoom(socket))
            socket.on('leaveRoom', leaveRoom(socket))
            socket.on('updatePlayer', updatePlayer(socket))
            socket.on('updateRoomSettings', updateRoomSettings(socket))
            socket.on('getRoomPlayers', getRoomPlayers(socket))
            socket.on('getRoomInfos', getRoomInfos(socket))
            socket.on('startGame', startGame(socket))

            // Custom subscribes
            subscribes.forEach(({ event, obj }) =>
            {
                socket.on(event, customEvent(socket, event, obj))
            })

            // Disconnect
            socket.on('disconnect', () => { Helpers.disconnect(socket) })
        })

        // Open HTTP server
        this.http.listen(port)

        // Log port
        Logger.serverLog(`Server running at localhost:${port}/`)
    }

    /**
     * subscribe a custom event
     * @param {string} name event name
     * @param {Function} cb callback
     */
    this.subscribe = ({ name, cb, conditions = [], valid = () => true }) =>
    {
        subscribes[name] = { cb, conditions, valid }
    }

    /**
     * unsubscribe a custom event
     * @param {string} name event name
     */
     this.unsubscribe = (name) =>
    {
        delete subscribes[name]
    }

    /**
     * Send an event to all players in a room
     * @param {string} roomId the room ID
     * @param {string} message the event name
     * @param {object} params the event parameters
     */
    this.emit = (roomId, message, params) =>
    {
        io.to(roomId).emit(message, params)
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
        const playerName = name.slice(0, MAX_NAME_LENGTH)
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

    const checkCondition = (socket, condition) =>
    {
        let error = null
        const playerRoom = getPlayerRoom(socket)

        switch (condition)
        {
            case Conditions.IsHost:
            {
                // Check that the player is the host
                if (playerRoom.host !== socket.id)
                {
                    error = Errors.notHost
                }
                break
            }

            case Conditions.GameNotStarted:
            {
                // Check that the game is not already started
                if (playerRoom.gameInstance !== null)
                {
                    error = Errors.gameAlreadyStarted
                }
                break
            }

            default: error = 'unknown conditions'
        }

        return { error }
    }


    // Private default IO handlers
    //---------------------------

    const createRoom = (socket) => (data) =>
    {
        Logger.log(socket.id, 'requesting to create a room.')

        // Get player
        const player = getPlayer(socket)

        // Check if not already in a room
        const playerRoom = getPlayerRoom(socket)
        if (playerRoom) {
            Helpers.replyError(socket, 'createRoom', Errors.alreadyInRoom)
            return
        }

        // Validate the user inputs
        if (!data || !validate.playerName(data.name)) {
            Helpers.replyError(socket, 'createRoom', Errors.invalid.playerName)
            return
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
        Logger.serverLog(`Room created : ${roomId} with code : ${roomCode}`)

        // Join the room
        player.roomId = roomId

        // Make the host join the io room
        socket.join(roomId)

        // Update host name & data
        setPlayerName(socket, data.name)
        setPlayerData(socket, data.data)

        // Reply
        Helpers.reply(socket, 'createRoom')
    }

    const joinRoom = (socket) => (data) =>
    {
        Logger.log(socket.id, 'requesting to join a room the room with code ' + (data ? data.code : null))

        // Get player
        const player = getPlayer(socket)

        // Check if not already in a room
        const playerRoom = getPlayerRoom(socket)
        if (playerRoom) {
            Helpers.replyError(socket, 'joinRoom', Errors.alreadyInRoom)
            return
        }

        // Validate the user inputs
        if (!data || !validate.playerName(data.name)) {
            Helpers.replyError(socket, 'joinRoom', Errors.invalid.playerName)
            return
        }
        if (!validate.code(data.code)) {
            Helpers.replyError(socket, 'joinRoom', Errors.invalid.code)
            return
        }

        // Check that the room exists
        const roomId = getRoomIdFromCode(data.code)
        if (!roomId) {
            Helpers.replyError(socket, 'joinRoom', Errors.roomNotFound)
            return
        }

        // Check that the game instance is not started (still in lobby)
        const room = rooms[roomId]
        if (room.gameInstance !== null) {
            Helpers.replyError(socket, 'joinRoom', Errors.gameAlreadyStarted)
            return
        }

        // Check that the room is not full
        if (room.players.length >= MAX_PLAYERS) {
            Helpers.replyError(socket, 'joinRoom', Errors.roomIsFull)
            return
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
        io.to(roomId).emit('playersUpdated')

        // Reply
        Helpers.reply(socket, 'joinRoom')
    }

    const leaveRoom = (socket) => () =>
    {
        Logger.log(socket.id, 'requesting to leave the room')

        // Get player room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'leaveRoom', Errors.notInRoom)
            return
        }

        // Leave the room, but don't remove the player
        Helpers.leaveRoom(socket.id, false)

        // Reply
        Helpers.reply(socket, 'leaveRoom')
    }

    const updatePlayer = (socket) => (data) =>
    {
        Logger.log(socket.id, 'requesting to update player data')

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'updatePlayer', Errors.notInRoom)
            return
        }

        // Check that the game is not already started
        if (playerRoom.gameInstance !== null) {
            Helpers.replyError(socket, 'updatePlayer', Errors.gameAlreadyStarted)
            return
        }

        // Validate the user inputs
        if (!data || !validate.playerName(data.name)) {
            Helpers.replyError(socket, 'updatePlayer', Errors.invalid.playerName)
            return
        }
        
        // Update player name & data
        setPlayerName(socket, data.name)
        setPlayerData(socket, data.data)

        // Broadcast to others
        io.to(playerRoom.roomId).emit('playersUpdated')

        // Reply
        Helpers.reply(socket, 'updatePlayer')
    }

    const updateRoomSettings = (socket) => (data) =>
    {
        Logger.log(socket.id, 'requesting to update room infos.')

        // Get player
        const player = getPlayer(socket)

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'updateRoomSettings', Errors.notInRoom)
            return
        }

        // Check that the player is the host
        const isHost = playerRoom.host === socket.id
        if (!isHost) {
            Helpers.replyError(socket, 'updateRoomSettings', Errors.notHost)
            return
        }

        // Store the data
        playerRoom.settings = data

        // Broadcast to others
        io.to(player.roomId).emit('roomSettingsUpdated')

        // Reply
        Helpers.reply(socket, 'updateRoomSettings')
    }

    const getRoomPlayers = (socket) => () =>
    {
        Logger.log(socket.id, 'requesting room players')

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'getRoomPlayers', Errors.notInRoom)
            return
        }

        // Send response
        const playersIds = playerRoom.players
        const data = playersIds.map((playerId) => {
            const player = players[playerId]
            return {
                name: player.name,
                data: player.data,
                publicId: player.publicId
            }
        })

        // Reply
        Helpers.reply(socket, 'getRoomPlayers', data)
    }

    const getRoomInfos = (socket) => () =>
    {
        Logger.log(socket.id, 'requesting the room infos')

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'getRoomInfos', Errors.notInRoom)
            return
        }

        // Send response
        const infos = {
            code: playerRoom.code,
            isHost: playerRoom.host === socket.id,
            settings: playerRoom.settings
        }

        // Reply
        Helpers.reply(socket, 'getRoomInfos', infos)
    }

    const startGame = (socket) => () =>
    {
        Logger.log(socket.id, 'requesting to start the game')

        // Get player
        const player = this.getPlayer()

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom) {
            Helpers.replyError(socket, 'startGame', Errors.notInRoom)
            return
        }

        // Check that the player is the host
        const isHost = playerRoom.host === socket.id
        if (!isHost) {
            Helpers.replyError(socket, 'startGame', Errors.notHost)
            return
        }

        // Check that the game is not already started
        if (playerRoom.gameInstance !== null) {
            Helpers.replyError(socket, 'startGame', Errors.gameAlreadyStarted)
            return
        }

        // Check that the number of players is valid
        if (playerRoom.players.length < MIN_PLAYERS || playerRoom.players.length > MAX_PLAYERS) {
            Helpers.replyError(socket, 'startGame', Errors.wrongPlayerCount)
            return
        }

        // Create the push handler
        const formattedPlayersForPushHandler = formatPlayers(playerRoom.players, ['publicId', 'socket'])
        const pushHandler = new Push(io, player.roomId, formattedPlayersForPushHandler)

        // Create the game instance and init it
        const formattedPlayersForGame = formatPlayers(playerRoom.players, ['publicId', 'name', 'data'])
        playerRoom.gameInstance = new GameClass(pushHandler, playerRoom.code)
        playerRoom.gameInstance.init({
            players: formattedPlayersForGame,
            settings: playerRoom.settings
        })

        // Broadcast to others
        io.to(player.roomId).emit('gameStarted')

        // Reply
        Helpers.reply(socket, 'startGame')
    }

    const customEvent = (socket, event, { conditions, cb, valid }) => (args) =>
    {
        Logger.log(socket.id, 'received custom event ' + event)
        let error = null

        // Check that the player is in a room
        const playerRoom = getPlayerRoom(socket)
        if (!playerRoom)
        {
            error = Errors.notInRoom
        }

        // Check that the game is started in that room
        if (!playerRoom.gameInstance) {
            error = Errors.gameNotStarted
        }

        // Validate user inputs
        if (!valid(args))
        {
            error = Errors.invalid.input
        }
        
        // Check custom conditions
        if (!error)
        {
            conditions.forEach((condition) =>
            {
                const checked = checkCondition(socket, condition)
                if (checked.error)
                {
                    error = checked.error
                    return
                }
            })
        }

        // Reply
        if (error)
        {
            Helpers.replyError(socket, event, error)
        }
        else
        {
            const response = cb(args)
            Helpers.reply(socket, event, response)
        }
    }

}
