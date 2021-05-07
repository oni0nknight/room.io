const buildDevLogger = require('./devLogger')
const buildProdLogger = require('./prodLogger')

const createLogger = ({ level, defaultMeta }) =>
{
    const logger = (process.env.NODE_ENV === 'development')
        ? buildDevLogger({ level, defaultMeta })
        : buildProdLogger({ level, defaultMeta })

    return logger
}

module.exports = { createLogger }