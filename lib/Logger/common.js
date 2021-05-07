const { format, addColors } = require('winston')

addColors({
    server: 'blue',
    room: 'magenta',
    info: 'white'
})

const SERVER_PAD = 10

const levels = {
    server: 0,
    room: 1,
    error: 2,
    warn: 3,
    info: 4,
    debug: 5
}

const consoleFormat = format.printf(({ level, message, timestamp: ts, socket, room }) =>
{
    const levelStr = `[${level}]`.padEnd(SERVER_PAD)
    const context = socket || room || null
    const contextStr = context ? `{${context}}` : ''

    return `[${ts}] ${levelStr} ${contextStr} ${message}`
})

module.exports = {
    consoleFormat,
    levels
}