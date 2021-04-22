'use strict'

/* eslint-disable camelcase */

const errors =
{
    // General errors
    //=============================================

    unhandled : { code: 'err_000', serverLog: 'Unhandled error' },

    alreadyInRoom : { code: 'err_100', serverLog: 'You cannot do this action because you are already in a game' },
    notInRoom : { code: 'err_101', serverLog: 'You cannot do this action because you are not in a game' },
    roomNotFound : { code: 'err_102', serverLog: 'Impossible to find a game with that code' },
    roomIsFull : { code: 'err_103', serverLog: 'The room is already full' },
    gameAlreadyStarted : { code: 'err_104', serverLog: 'You cannot do this action because the game is already started' },
    gameNotStarted : { code: 'err_105', serverLog: 'You cannot do this action because the game is not started' },
    notHost : { code: 'err_106', serverLog: 'You cannot do this action because you are not the game host' },
    wrongPlayerCount : { code: 'err_107', serverLog: 'There are too many or too few players' },
    missingCallback : { code: 'err_108', serverLog: 'Missing callback with the event name in the Game instance' },
    incompatibleSettings : { code: 'err_109', serverLog: 'The entered settings are not compatible with the number of players' },

    invalid : {
        playerName: { code: 'err_200', serverLog: 'Invalid player name' },
        playerData: { code: 'err_201', serverLog: 'Invalid player data' },
        code: { code: 'err_202', serverLog: 'Invalid room code' },
        roomSettings: { code: 'err_203', serverLog: 'Invalid room settings' },
        input: { code: 'err_204', serverLog: 'Invalid user input' },
    },
}

module.exports = errors