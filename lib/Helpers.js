const uuid = require('uuid')

let io = null
let players = null
let rooms = null
let logger = null

const Helpers = {

    init(params) {
        io = params.io
        players = params.players
        rooms = params.rooms
        logger = params.logger
    },

    sendError(socket, error, args = {}) {
        logger.error(socket.id, 'ERROR => ' + error.serverLog)
        
        if (error.code)
        {
            socket.emit('error', {
                code: error.code,
                args
            })
        }
    },

    replyError(socket, query, error, args = {}) {
        logger.error(socket.id, 'ERROR => ' + error.serverLog)
        
        if (error.code)
        {
            socket.emit(query + '_error', {
                code: error.code,
                args
            })
        }
    },

    reply(socket, query, params) {
        socket.emit(query + '_response', params)
    },

    /**
     * Connects the socket to the server by creating a player in the players list.
     * It also handles cases of reconnection.
     * @param {Socket} socket client socket
     * @emits reconnected event sent to the player in the case of a reconnection
     * @emits registered event sent if the connection succeeds. It is sent after "reconnection" in the case of a reconnection.
     *                   The "registered" event sends the player public ID as a parameter.
     */
    connect(socket) {
        // Try to retreive the former player, if this is a reconnexion
        const oldPlayerID = socket.handshake.query ? socket.handshake.query.playerID : null
        const oldPlayer = oldPlayerID ? players[oldPlayerID] : null

        // Case of re-connection
        if (oldPlayer && oldPlayer.online === false && oldPlayer.roomId !== null && rooms[oldPlayer.roomId])
        {
            logger.log(socket.id, 'reconnecting the player')

            // Create a new player with all the old player infos
            players[socket.id] = {
                ...oldPlayer,
                online: true
            }

            // Remove the former player
            delete players[oldPlayerID]

            // Change the player list of the room
            const room = rooms[oldPlayer.roomId]
            room.players = room.players.map((playerID) =>
            {
                return playerID === oldPlayerID ? socket.id : playerID
            })

            // Make the player rejoin the io room
            socket.join(oldPlayer.roomId)

            // Warn the other players that the playeer is reconnected
            io.to(oldPlayer.roomId).emit('playerRejoined', { playerId: oldPlayer.publicId, name: oldPlayer.name })

            // Send an event to the player
            socket.emit('reconnected')
        }
        // Case of a new player
        else
        {
            logger.log(socket.id, 'new connection')

            // Register the new player
            players[socket.id] = {
                socket,
                publicId: `player_${uuid.v4()}`,
                name: '',
                data: {},
                roomId: null,
                online: true
            }
        }

        // Tell the player that they are registered
        socket.emit('registered', players[socket.id].publicId)
    },
    
    /**
     * Handles a socket disconnection.
     * @param {Socket} socket client socket
     */
    disconnect (socket) {
        logger.log(socket.id, 'disconnection')

        // If the player is in a room : leave the room
        const player = players[socket.id]
        if (player.roomId && rooms[player.roomId])
        {
            // Leave the room
            Helpers.leaveRoom(socket.id, true)
        }
        // If the player is not in a room : remove the player
        else
        {
            // Remove the player
            delete players[socket.id]
        }
    },

    /**
     * Make a player leave his/her room. It behaves differently if the game instance is started or not.
     * It automatically destroys the room in these situations:
     *      - the game is not started and the host is leaving
     *      - the game is started and the last player leaves the room
     * The player can also be removed from the player list if the game instance is not started and if "removePlayer" is set to true
     * @param {String} playerId player private ID (socket ID)
     * @param {Boolean} removePlayer Tells if the player should be removed after leaving the room
     * @emits playerLeft event sent to all the remaining players in the room, if the game instance is started. The leaving player's public ID is sent as parameter
     * @emits roomUpdated event sent to all the remaining players in the room, if the game instance is not started
     */
    leaveRoom(playerId, removePlayer) {
        logger.serverLog(`${playerId} is leaving his/her room`)

        // Get the player and the room
        const player = players[playerId]
        const room = (player && player.roomId) ? rooms[player.roomId] : null
        if (!player || !room)
        {
            return
        }

        const roomId = player.roomId

        // Case 1 : the game has started
        if (room.gameInstance !== null)
        {
            // Set player offline
            player.online = false

            // Check if there are online players left
            const stillOnlinePlayers = room.players.filter((pId) =>
            {
                return players[pId].online === true
            })

            // Case 1.1 : there are still online players in the room
            if (stillOnlinePlayers.length)
            {
                // Warn the other players that this player left
                io.to(roomId).emit('playerLeft', { playerId: player.publicId, name: player.name })
            }
            // Case 1.2 : there is no more online players
            else
            {
                // Destroy the room
                Helpers.destroyRoom(roomId)
            }
        }
        // Case 2 : the game hasn't started yet (players are in the lobby)
        else
        {
            const isHost = room.host === playerId

            // Case 2.1 : the leaving player is the host
            if (isHost)
            {
                // Destroy the room
                Helpers.destroyRoom(roomId)
            }
            // Case 2.2 : the leaving player is not the host
            else
            {
                // Remove the player from the room
                room.players = room.players.filter((pId) =>
                {
                    return pId !== playerId
                })

                // Warn the other players that this player left
                io.to(roomId).emit('roomUpdated')

                // Reset the player room ID
                player.roomId = null

                // Leave the io room
                player.socket.leave(roomId)
            }

            if (removePlayer)
            {
                // Remove the player
                delete players[playerId]
            }
        }
    },
    
    /**
     * Destroys the given room
     * @param {String} roomId the room ID
     * @emits roomDestroyed event sent to all the players still in the room (if any)
     */
    destroyRoom(roomId) {
        logger.serverLog(`Destroying the room ${roomId}`)

        // Get the room
        const room = rooms[roomId]
        if (!room)
        {
            return
        }

        // Warn the players that the room is destoyed
        io.to(roomId).emit('roomDestroyed')

        // Iterate through the room players
        room.players.forEach((playerId) =>
        {
            // Get the corresponding player
            const player = players[playerId]
            if (player)
            {
                // Reset the player room ID
                player.roomId = null

                // Leave the io room
                player.socket.leave(roomId)

                // Remove completely the player if offline (they won't be able to reconnect as the game is destroyed)
                if (player.online === false)
                {
                    delete players[playerId]
                }
            }
        })

        // Remove the room
        delete rooms[roomId]
    }
}

module.exports = Helpers