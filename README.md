# room.io

Room.io is a free real-time communication framework for creating client-server game architectures. It is powered by [socket.io](https://github.com/socketio/socket.io) and consists of a Node.js server (this repository) and a [JavaScript client library](https://github.com/oni0nknight/room.io-client).

Room.io offers a secure room and player management for games run on the server-side, with built-in support for player disconnection without interrupting the game.

It lets you cutomize the room settings and players data to adapt to your game.


## Installation

```bash
// with npm
npm install room.io

// with yarn
yarn add room.io
```

## How to use

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

You can attach the room.io server to a Node.js HTTP server.

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

Express applications can integrate as request handlers for HTTP servers. As such you can connect the room.io server to an Express app.

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

### Overview

Room.io exposes a single `createServer` function. Calling it with a configuration object returns a room.io server instance. Then calling the `run` method runs the server on the provided port.

```js
// Server configuration
const config = {
    gameClass: Game,
    minPlayers: 3,
    maxPlayers: 10,
    subscribes: [
        { name: 'toggleLight', inputValidator: (input) => (typeof input === 'string') }
    ],
    playerDataValidator: (data) => !!data && (data?.avatar instanceof Number),
    roomSettingsValidator: (settings) => !!settings && (typeof settings?.evilCount === 'string'),
    roomSettingsChecker: (settings, playerCount) => settings.evilCount < playerCount,
    logLevel: 'all',
    maxNameLength: 10
}

// Create the room.io server
const server = createServer(config)

// Run the server
server.run({ port: 3000, httpServer: httpServer })
```

### Server configuration

`gameClass` (Mandatory)  
A reference to a Game class on the server side.

`minPlayers` and `maxPlayers` (Mandatory)  
The minimum and maximum (inclusive) number of players per game.

`subscribes` (Optional)  
An array of subscriptions for client-server communication, corresponding to your game logic. A subscription consists of a name and an optional input-validator function.
When subscribing to the name `foo` for instance, whenever a client sends the event `foo`, the server runs the given validator function against the client input. If it returns true (or is not provided), then the server looks for a method `foo` on the Game instance of the player room and calls it with a single object parameter containing the following information:
```js
{
    playerId // publicId of the player who fired the event
    data // validated data sent by the player
}
```

`playerDataValidator` (Optional)  
A function callback run by the server against the input sent by players when trying to update their own player data. Must return a boolean value telling if the input is in the valid form.

`roomSettingsValidator` (Optional)  
A function callback run by the server against the input sent by the host player when trying to update the room settings. Must return a boolean value telling if the input is in the valid form.

`roomSettingsChecker` (Optional)  
A function callback run by the server when the game instance is starting. It receives 2 parameters: `roomSettings` (current room settings) and `playerCount` (current number of players) and must return a boolean value telling if the game can start with the current room settings. You can use it to ensure the room settings chosen by the host are valid for the current number of players.

`maxNameLength` (Optional)  
The maximum length (inclusive) for player names. Longer names are truncated to this value. You can enforce a length limit on the client side.


### Game class

A room.io server requires a reference to a Game class. This class represents your game logic on the server side, and can be any Javascript function or ES6 class. It has to expose a contructor (room.io uses the `new` operator) and a method `init`.

When a room host player launches the game, a new instance of the Game class is created and its method `init` is called with a initialization object containing useful information about the game.

```js
class Game {
    constructor() {}

    init({
        players // an array of players in the form { publicId, name, data }
        host // the publicId of the host player
        settings // the room settings
        roomCode // the room code
        roomPusher // a RoomPusher instance, used to push messages to players
        logger // a Logger instance to log messages on the server
    })
    {
        ...
    }
}
```

For each event name declared in the `subscribes` server config, your Game class should also expose a method named accordingly. Those subscription callback methods take a single object as parameter as such:
```js
toggleLight({ playerId, data}) {
    // playerId is the publicId of the player who sent the event
    // data is input sent along with the event
}
```

In those methods, you can return data to the requesting player, or send back an error:
```js
toggleLight({ playerId, data}) {
    if (!this.isMyTurnToPlay(playerId))
    {
        return { error: 'not your turn to play' }
    }

    const state = this.doToggleLight(data)
    return { response: `the light is now ${state}` }
}
```

### RoomPusher

When a game instance is created, the server provides a RoomPusher instance to the Game in the `init` call. This object can be used to send messages from the server to the players.

A RoomPusher instance exposes 3 methods:

```js
pushTo(playerPublicId, message, parameters)
```
Sends a `message` (string) to a specific `playerPublicId` (string), optionally with `parameters` (any).  


```js
pushToAll(message, parameters)
```
Sends a `message` (string) to every players in the room, optionally with `parameters` (any).  


```js
pushError(errorCode, parameters = {})
```
Sends an `errorCode` (string) to every players in the room, optionally with `parameters` (any).

## Logging

Room.io uses [winston](https://github.com/winstonjs/winston) to log messages on the server.
Use the `logger.level` setting from the configuration object to determine the logging level from the following supported values (default is `info`):

| Name          | Level |  Description    |
| ------------- | ----- | --------------- |
| `server`      | `0`   | Logs at the server level. Displayed in green. |
| `room`        | `1`   | Logs affecting the room and the game. Displayed in magenta. |
| `error`       | `2`   | Error logs. Displayed in red. |
| `warn`        | `3`   | Warning logs. Displayed in yellow. |
| `info`        | `4`   | Basic info logs. Displayed in white. |
| `debug`       | `5`   | Debug logs that can be used during development. Displayed in white. |

Logs of a higher level than the chosen `logger.level` are not shown.

## Testing

TODO

## License

[MIT](LICENSE)