'use strict'

module.exports = class RoomPusher {
    constructor({ io, roomId, roomPlayers, logger }) {
        this.io = io
        this.roomId = roomId
        this.logger = logger

        // store players sockets by publicIds
        this.sockets = roomPlayers.reduce((acc, { publicId, socket }) =>
        {
            acc[publicId] = socket
            return acc
        }, {})
    }

    pushTo(playerPublicId, message, params) {
        const socket = this.sockets[playerPublicId]
        if (socket)
        {
            socket.emit(message, params)
        }
        else
        {
            this.logger.gameError('Push.pushTo (' + message + '): Player not found (' + playerPublicId + '). No message has been sent.')
        }
    }

    pushToAll(message, params) {
        this.io.to(this.roomId).emit(message, params)
    }

    pushError(error, args = {}) {
        this.io.to(this.roomId).emit('error', {
            code: error.code,
            args
        })
    }

}