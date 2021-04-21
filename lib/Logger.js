/* eslint-disable no-console */

const LOG_LEVELS = {
    SERVER: 1,
    GAME: 2,
    INFO: 4,
    WARN: 8,
    ERROR: 16,
    ALL: 32
}

const chalk = require('chalk')
const PAD = 22

let logLevel = LOG_LEVELS.SERVER | LOG_LEVELS.GAME | LOG_LEVELS.ERROR

module.exports = {
    setLogLevel(logLvl) {
        switch (logLvl)
        {
            case 'all': {
                logLevel = LOG_LEVELS.ALL
                break
            }

            default: break
        }
    },

    log(prefix = '', ...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.INFO))
        {
            return
        }
        console.log(chalk.black.bold(prefix.padEnd(PAD)), '>', ...args)
    },

    gameLog(gameId, ...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.GAME))
        {
            return
        }
        const content = args.map((a) => chalk.magenta.bold(a)).join(' ')
        console.log(chalk.magenta.bold(`ROOM ${gameId}`.padEnd(PAD)) + ' > ' + content)
    },

    serverLog(...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.SERVER))
        {
            return
        }
        const content = args.map((a) => chalk.blue.bold(a)).join(' ')
        console.log(chalk.blue.bold('SERVER'.padEnd(PAD)) + ' > ' + content)
    },

    warn(prefix = '', ...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.WARN))
        {
            return
        }
        const content = args.map((a) => chalk.yellow.bold(a)).join(' ')
        console.warn(chalk.yellow.bold(prefix.padEnd(PAD)) + ' > ' + content)
    },

    error(prefix = '', ...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.ERROR))
        {
            return
        }
        const content = args.map((a) => chalk.red.bold(a)).join(' ')
        console.error(chalk.red.bold(prefix.padEnd(PAD)) + ' > ' + content)
    },

    gameError(...args) {
        if (!(logLevel & LOG_LEVELS.ALL) && !(logLevel & LOG_LEVELS.GAME) && !(logLevel & LOG_LEVELS.ERROR))
        {
            return
        }
        const content = args.map((a) => chalk.red.bold(a)).join(' ')
        console.log(chalk.red.bold('GAME'.padEnd(PAD)) + ' > ' + content)
    }
}