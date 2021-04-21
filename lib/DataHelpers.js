'use strict'

const CODE_LENGTH = 6

/* eslint-disable no-magic-numbers */

module.exports = {

    // List of helper functions on the data
    validate:
    {
        boolean: (value) => {
            return value === true || value === false
        },

        playerName: (playerName) => {
            return (playerName && (typeof playerName === 'string') && playerName.trim().length)
        },

        code: (code) => {
            return (code && (typeof code === 'string') && code.trim().length === CODE_LENGTH)
        },
    },

    generate:
    {
        roomCode: () => {
            return Array(CODE_LENGTH).fill().map(() => {
                return (Math.random() * 16 | 0).toString(16).toUpperCase()
            }).join('')
        },
    }
}