'use strict'

module.exports = class RoomPusher {
    constructor({ io, roomId, sockets, logger }) {
        this.io = io
        this.roomId = roomId
        this.logger = logger
        this.sockets = sockets
    }

    pushTo(playerPublicId, event, payload) {
        const socket = this.sockets[playerPublicId]
        if (socket)
        {
            socket.emit(event, payload)
        }
        else
        {
            this.logger.error('Push.pushTo (' + event + '): Player not found (' + playerPublicId + '). No message has been sent.')
        }
    }

    pushToAll(event, payload) {
        this.io.to(this.roomId).emit(event, payload)
    }

    pushError(errorCode, payload = {}) {
        this.io.to(this.roomId).emit('error', {
            code: errorCode,
            payload
        })
    }

}