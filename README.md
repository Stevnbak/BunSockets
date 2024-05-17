# BunSockets

[![NPM Version](https://badgen.net/npm/v/bunsockets)![NPM Downloads](https://badgen.net/npm/dm/bunsockets)](https://www.npmjs.com/package/bunsockets)

BunSockets is an API for use with the [bun](https://bun.sh) websocket server.

## Features

-   Client- and serverside websocket events
-   Sending & recieving messages using IDs and any content type
-   Socket data
-   Custom rooms
-   Types for everything (including custom types for specific message IDs)
-   Speed: It is using bun's websocket server and is therefore really fast:
    -   ![Bun speed test](https://github.com/Stevnbak/BunSockets/assets/40050761/8b803e00-b224-4974-9266-123ebf49cf94)

## Table of contents

-   [Installation](#installation)
-   [Server setup](#server-setup)
    -   [Integration with bun.serve()](#integration-with-bunserve)
    -   [Integration with bunrest](#integration-with-bunrest)
-   [Client setup](#client-setup)
-   [Basic server events](#basic-server-events)
-   [Sending messages](#sending-messages)
-   [Recieving messages](#recieving-messages)
-   [Socket data](#socket-data)
-   [Rooms](#rooms)
-   [Typescript types](#typescript-types)

## Installation

This project requires being run using bun, to download bun go [here](https://bun.sh/).

To install this project run

```shell
bun install bunsockets
```

## Server setup

Then the websocket server handler can be set up by doing

```typescript
import server from "bunsockets/server";
const websockets = server();
```

### Integration with [bun.serve()](https://bun.sh/docs/api/http#bun-serve)

The websocket server handler can be used directly through bun.serve() with the following code:

```typescript
import server from "bunsockets/server";
const websockets = server();

Bun.serve({
	fetch(req, server) {
		// upgrade the request to a WebSocket
		if (websockets.upgrade(req, server, null)) {
			return; // do not return a Response
		}
		return new Response("Upgrade failed", {status: 500});
	},
	// tell websocket handler to use bunsockets
	websocket: websockets.handler
});
```

Now the bun http server will upgrade any websocket request through bunsockets and use the bunsockets message handler.

### Integration with [bunrest](https://github.com/lau1944/bunrest)

The websocket server handler can also be used through 3rd party projects that is based upon bun's http and websocket server.

On such example is using bunrest, which is an express-like API for bun.

To use bunsockets with bunrest use the following code:

```typescript
import server from "bunsockets/server";
const websockets = server();

import restserver from "bunrest";
const app = restserver();

app.ws(websockets.handler.message, {...websockets.handler});
```

## Client setup

The client websocket handler can be set up in the same way as the server:

```typescript
import client from "bunsockets/client";
const socket = client("ws://localhost:3000");
```

This will try to establish a websocket connection the a bunsocket server running on localhost:3000.

## Basic server events

The server contains specific events for when a client connects or disconnects, these can be used like this:

```typescript
import server from "bunsockets/server";
const websockets = server();
...server integration...
websockets.connected((client) => {
    //Your logic here
});
websockets.disconnected((client) => {
    //Your logic here
});
```

## Sending messages

Sending messages from the server to a client can be done through a reference to the client object itself or by using the clients id, both of these can be obtained through the connected event or by recieving a message from the client.

Sending a message from the server to a client can then be done like this:

```typescript
client.send("messageid", "Message content");
```

or through the server itself:

```typescript
websockets.send(client.id, "messageid", "Message content");
```

Sending a messages from a client to the server can similarly be done by using the client websocket connection from [#Client setup](#client-setup):

```typescript
socket.send("messageid", "Message content");
```

## Recieving messages

Recieving messages is done by adding listeners to specific message ids.

For the server it looks like this to run a function everytime a client sends a message with the id "test":

```typescript
websockets.on("test", (client, content) => {
	// Your logic here
});
```

And for the client it looks like this:

```typescript
socket.on("test", (content) => {
	// Your logic here
});
```

## Socket data

On the server side it is possible to add data to a socket upon the creation of the connection.

If used directly through bun.serve() this can be done by simply adding the data value as the last parameter in the upgrade function.

So the setup code for bun.serve() becomes:

```typescript
import server from "bunsockets/server";
const websockets = server();

Bun.serve({
	fetch(req, server) {
		// data can be set to anything
		const data = {ip: server.requestIP(req)};
		// upgrade the request to a WebSocket
		if (websockets.upgrade(req, server, data)) {
			return; // do not return a Response
		}
		return new Response("Upgrade failed", {status: 500});
	},
	// tell websocket handler to use bunsockets
	websocket: websockets.handler
});
```

Or if done through bunrest, just follow the bunrest way to add socket data, see [here](https://github.com/lau1944/bunrest?tab=readme-ov-file#websocket).

## Rooms

Rooms can be created to easily send a single message to a group of clients.

A room requires at least 1 member when being created, and is then created like this:

```typescript
websockets.on("CREATE_ROOM", (client) => {
	const room = websockets.createRoom([client.id]);
});
```

Members can be added or removed from a room like this:

```typescript
room.addMember(client);
room.removeMember(client);
```

A message can be sent to a room in the same way it's sent to a client.

When done directly through the room object it looks like this:

```typescript
room.send("messageid", "Message content");
```

And when done through the server object, simply use broadcast instead of send:

```typescript
websockets.broadcast(room.id, "messageid", "Message content");
```

It is also possible to send a message to all clients connected to the server by broadcasting to "all" instead of a specific room, which looks like this:

```typescript
websockets.broadcast("all", "messageid", "Message content");
```

## Typescript types

It is possible to add custom types for message IDs and related content for both client and server.

This can be done by adding types to the initial websocket handler setup.

To add 2 possible message ids ("TEST" and "NUMBER") can be done like this:

```typescript
import server from "bunsockets/server";
const websockets = server<"TEST" | "NUMBER">();
```

And to add type string to the "TEST" messages and type number to the "NUMBER" messages can be done like this:
To add 2 possible message ids ("TEST" and "NUMBER") can be done like this:

```typescript
import server from "bunsockets/server";
const websockets = server<"TEST" | "NUMBER", {TEST: string; NUMBER: number}>();
```

For the client it is done in the same way, so it becomes like this:

```typescript
import client from "bunsockets/client";
const socket = client<"TEST" | "NUMBER", {TEST: string; NUMBER: number}>("ws://localhost:3000");
```

Now every message content recieved from these message IDs will automatically have the correct type, and only "TEST", "NUMBER" and "ERROR" will be accepted message ids.

Typees can also be added to the socket data previously mentioned.

This can be done by adding a third type to the server creation like this:

```typescript
import server from "bunsockets/server";
const websockets = server<"TEST" | "NUMBER", {TEST: string; NUMBER: number}, {ip: string}>();
```
