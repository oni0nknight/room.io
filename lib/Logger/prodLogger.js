const { createLogger, format, transports } = require('winston')
const { combine, timestamp, json, colorize, errors } = format
const { consoleFormat, levels} = require('./common')

const MAX_FILES = 8
const MAX_SIZE = 100000000 // 10Mo

const buildProdLogger = ({ level, defaultMeta = {} }) => createLogger({
    level,

    levels,

    defaultMeta,

    format: combine(
        timestamp({ format: 'DD-MM-YYYY hh:mm:ss UTCZ' }),
        errors({ stack: true }),
        json()
    ),

    transports: [
        new transports.Console({
            format: combine(
                colorize({ level: false, message: true }),
                timestamp({ format: 'DD-MM-YYYY hh:mm:ss UTCZ' }),
                consoleFormat
            ),
        }),
        new transports.File({
            filename: 'server/server.log',
            level: 'error',
            maxsize: MAX_SIZE,
            maxFiles: MAX_FILES
        })
    ],

    exceptionHandlers: [
        new transports.File({ filename: 'server/exceptions.log' })
    ]
})

module.exports = buildProdLogger