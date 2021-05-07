const { createLogger, format, transports, addColors } = require('winston')
const { combine, timestamp, colorize } = format
const { consoleFormat, levels} = require('./common')

addColors({
    server: 'blue',
    room: 'magenta',
    info: 'white'
})

const buildDevLogger = ({ level, defaultMeta = {} }) => createLogger({
    level,

    levels,

    defaultMeta,

    transports: [
        new transports.Console({
            format: combine(
                colorize({ level: false, message: true }),
                timestamp({ format: 'DD-MM-YYYY hh:mm:ss UTCZ' }),
                consoleFormat
            ),
        })
    ],
})

module.exports = buildDevLogger