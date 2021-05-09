# room.io

A real-time communication framework for creating client-server games on the web.

[![Version npm](https://img.shields.io/npm/v/room.io.svg?style=flat)](https://www.npmjs.com/package/room.io) [![npm Downloads](https://img.shields.io/npm/dm/room.io.svg?style=flat)](https://npmcharts.com/compare/room.io?minimal=true) [![Dependencies](https://img.shields.io/david/oni0nknight/room.io)](https://david-dm.org/oni0nknight/room.io)

[![NPM](https://nodei.co/npm/room.io.png?compact=true)](https://nodei.co/npm/room.io/)

This repository exposes the Node.js server. The client part is a convinient (but not mandatory) way to connect to your room.io server. It is provided in a separated repository: [room.io-client](https://github.com/oni0nknight/room.io-client).


## Motivation

`room.io` lets you focus on what's important: your game. It encapsulates for you the boring boilerplate code of room creation, player connection/disconnection or game settings. All that with security built-in to avoid unauthorized players to mess your server up.

It uses [socket.io](https://github.com/socketio/socket.io) for the messages transport. You game runs on the server and client browsers connect to it via a websocket bidirectional channel.

## Installation

```bash
# with npm
npm install room.io

# with yarn
yarn add room.io
```

## Quick Start

### Standalone

```js
const { createServer } = require('room.io')
const server = createServer({
    gameClass: Game,
    minPlayers: 2,
    maxPlayers: 6
})
server.run()
```

### With an HTTP server

You can attach the `room.io` server to a Node.js HTTP server.

```js
const httpServer = require('http').createServer()
const { createServer } = require('room.io')
const server = createServer({
    gameClass: Game,
    minPlayers: 2,
    maxPlayers: 6
})
server.run({ httpServer })
```

### With Express

Express applications can integrate as request handlers for HTTP servers. As such you can connect the `room.io` server to an Express app.

```js
const app = require('express')()
const httpServer = require('http').createServer(app)
const { createServer } = require('room.io')
const server = createServer({
    gameClass: Game,
    minPlayers: 2,
    maxPlayers: 6
})
server.run({ httpServer })
```

## API

### Create a room.io server

`room.io` exposes a single `createServer` function. Calling it with a configuration object returns a `room.io` server instance. Then calling the `run` method runs the server on the provided port.

```js
const { createServer } = require('room.io')

// Create the room.io server
const server = createServer({
    gameClass: Game,
    minPlayers: 3,
    maxPlayers: 10,
    maxNameLength: 10,
    actions: [
        { name: 'toggleLight', inputValidator: (input) => (typeof input === 'string') }
    ],
    playerDataValidator: (data) => !!data && (data?.avatar instanceof Number),
    roomSettingsValidator: (settings) => !!settings && (typeof settings?.lightCount === 'string'),
    roomSettingsChecker: (settings, playerCount) => settings.lightCount <= playerCount,
    logger: {
        level: 'info'
    }
})

// Run the server
server.run({ port: 3000 })
```

`gameClass` (Mandatory)  
A reference to your game class on the server side.

`minPlayers` and `maxPlayers` (Mandatory)  
The minimum and maximum (inclusive) number of players per game.

`maxNameLength` (Optional)  
The maximum length (inclusive) for player names. Longer names are truncated to this value. You can enforce a length limit on the client side.

`actions` (Optional)  
The list of actions necessary for your game. An action consists of a name and an optional input-validator function.
If you have a `toggleLight` action for instance, whenever a client sends the event `toggleLight` the server looks for a method `toggleLight` on the room game instance and calls it. If an input-validator function is provided, it is called before that and passed the client input. If the validator returns a falsy value, the action is not executed and an error is sent back to the calling client.

`playerDataValidator` (Optional)  
A function run against the payload sent by players when trying to update their own player data. Must return a boolean value telling if the payload is in the valid form.

`roomSettingsValidator` (Optional)  
A function run against the payload sent by the host player when trying to update the room settings. Must return a boolean value telling if the payload is in the valid form.

`roomSettingsChecker` (Optional)  
A function run when the game instance is starting. It receives 2 parameters: `roomSettings` (current room settings) and `playerCount` (current number of players) and must return a boolean value telling if the game can start with the current room settings. You can use it to ensure the room settings chosen by the host are valid for the current number of players.

`logger` (Optional)
A configuration object for the server logger. Supported keys are `level` for the log level and `defaultMeta` for the default metadata added to each log.


### Game class

The game class contains your game logic, it represents an instance of your game running on your server. It can be any JavaScript function or ES6 class and has to expose a contructor (it is instanciated with the `new` operator) and an `init` method.

When the host player launches the game, a new instance of your game class is created and its method `init` is called with a initialization object containing context data.

```js
class Game {
    constructor() {}

    init({
        players // the list of players in the room. In the form { publicId, name, data }
        host // the publicId of the host player
        settings // the room settings
        roomCode // the room code
        roomPusher // a RoomPusher instance. Can be used to push messages to players
        logger // the room logger, used to log messages on the server
    })
    {
        // Initialize your game here
    }
}
```

### Actions

Actions are used to update your game state. They are the interface between client players and the game running in the room.

In addition to the `init` method, your game class must expose methods named after every `actions` declared in the server config. Actions take a single object as parameter containing the requester `playerId` and `data` as such:
```js
toggleLight({
    playerId // publicId of the player who sent the action event
    data // data sent with the action event
})
{
    // Your game logic
}
```

#### Return response

Actions can send back a response to the caller. Simply return an object with a `response` key containing whatever data you want to return. Returns must be synchronous. If you need to perform asynchronous actions, use the [RoomPusher](#roompusher) to send *another* message to client(s) when your action is done.

```js
talk({ playerId, data})
{
    // do stuff with data
    
    return { response: `You just said ${data}` }
}
```

> *Note:* the response must be a simple type or a serializable datastructure.

#### Return error

Actions can also send back an error to the caller. Your game UI should prevent your players from accidentaly do an action they are not supposed to do, but still always check for access rights and data validity as UIs can be hijacked.

To send back an error, simply return an object with an `error` key containing your error. Returns must be synchronous too.

```js
rollDice({ playerId }) {
    if (!this.isMyTurnToPlay(playerId))
    {
        return { error: { code: 'E_NOT_YOUR_TURN' } }
    }

    // ...
}
```

> *Notes:*
> - The error content must be a simple type or a serializable datastructure.
> - `room.io` sends low-level errors that are always in the form: `{ code: 'err_xxx' }`. You can stick to the same formalism for your custom errors, but that is not mandatory. See [`room.io-client`](https://github.com/oni0nknight/room.io-client#errors) for the full list of `room.io` errors.

### RoomPusher

When a game instance is created, the server provides a RoomPusher instance to the Game in the `init` call. This object can be used to send messages from the server to the players.

The `pushTo` method sends a event to a specific player (public id), optionally with a payload.
```js
say({ playerId, data }) {
    const { targetId, message } = data

    // Transmit the message to the target
    this.roomPusher.pushTo(targetId, 'incomingMessage', {
        from: playerId,
        message
    })
}
```

The `pushToAll` method sends a event to every players in the room, optionally with a payload.
```js
yell({ playerId, data }) {
    const { message } = data

    // Transmit the message to everyone
    this.roomPusher.pushToAll('incomingMessage', {
        from: playerId,
        message
    })
}
```

> *Note:* `pushToAll` always sends to every player, including the action requester if `pushToAll` is called in a game action.


The `pushError` method sends an error to every players in the room, optionally with a payload.
```js
rollDice({ playerId }) {
    if (!this.isMyTurnToPlay(playerId))
    {
        // Warn everyone that playerId is trying to cheat
        this.roomPusher.pushError('E_CHEAT_DETECTED', { playerId })
        return
    }

    // ...
}
```

## Logging

`room.io` uses [winston](https://github.com/winstonjs/winston) to log messages on the server.
Use the `logger.level` setting from the configuration object to determine the logging level from the following supported values (default is `info`):

| Name          | Level |  Description    |
| ------------- | ----- | --------------- |
| `server`      | `0`   | Logs at the server level. Displayed in green. |
| `room`        | `1`   | Logs affecting the room and the game. Displayed in magenta. |
| `error`       | `2`   | Error logs. Displayed in red. |
| `warn`        | `3`   | Warning logs. Displayed in yellow. |
| `info`        | `4`   | Basic info logs. Displayed in white. |
| `debug`       | `5`   | Debug logs that can be used during development. Displayed in white. |

Logs of level greater than than the chosen `logger.level` are not shown.

## Testing

TODO

## License

[MIT](LICENSE)
