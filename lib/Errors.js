'use strict'

/* eslint-disable camelcase */

const errors =
{
    // General errors
    //=============================================

    unhandled : { code: 'err_000', debug_msg: 'Unhandled error' },


    // Errors that can legitimely happen
    //=============================================

    roomNotFound : { code: 'err_100', debug_msg: 'Impossible to find a game with that code' },
    incompatibleSettings : { code: 'err_101', debug_msg: 'The entered settings are not compatible with the number of players' },
    roomIsFull : { code: 'err_102', debug_msg: 'The room is already full' },
    wrongPlayerCount : { code: 'err_103', debug_msg: 'There are too many or too few players' },
    invalid : {
        playerName: { code: 'err_150', debug_msg: 'Invalid player name' },
        input: { code: 'err_151', debug_msg: 'Invalid input' },
        code: { code: 'err_155', debug_msg: 'Invalid room code' },
    },


    // Errors that are not supposed to happen
    //=============================================

    alreadyInRoom : { code: 'err_200', debug_msg: 'You cannot do this action because you are already in a game' },
    notInRoom : { code: 'err_201', debug_msg: 'You cannot do this action because you are not in a game' },
    gameNotStarted : { code: 'err_202', debug_msg: 'You cannot do this action because the game is not started' },
    notHost : { code: 'err_203', debug_msg: 'You cannot do this action because you are not the game host' },
    gameAlreadyStarted : { code: 'err_204', debug_msg: 'You cannot do this action because the game is already started' },
}

module.exports = errors