'use strict'

const Logger = require('./Logger')

module.exports = class Push {
    constructor(io, roomId, roomPlayers) {
        this.io = io
        this.roomId = roomId
        this.roomPlayers = roomPlayers
    }

    pushTo(playerPublicId, message, params) {
        const player = this.roomPlayers.find((p) => p.publicId === playerPublicId)
        if (player && player.socket)
        {
            player.socket.emit(message, params)
        }
        else
        {
            Logger.gameError('Push.pushTo : Player not found (' + playerPublicId + '). No message has been sent.')
        }
    }

    pushToAll(message, params) {
        this.io.to(this.roomId).emit(message, params)
    }

    pushError(error, args = {}) {
        this.io.to(this.roomId).emit('err', {
            code: error.code,
            args
        })
    }

    gameStateUpdated(playerPublicId) {
        if (playerPublicId !== undefined)
        {
            this.pushTo(playerPublicId, 'gameStateUpdated')
        }
        else
        {
            this.pushToAll('gameStateUpdated')
        }
    }

}