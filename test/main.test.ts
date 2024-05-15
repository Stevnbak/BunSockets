import client from "../client";
import server from "../server";

//Create tests
import {describe, it, expect, beforeAll, afterAll} from "bun:test";
import type {RoomID, SocketRoom} from "./server/rooms";
describe("WebSockets", () => {
	it("test message", async () => {
		const socketServer = server<unknown, "TEST", {TEST: string}>();
		const bunServer = Bun.serve({
			port: 3000,
			fetch(req, server) {
				if (socketServer.connect(req, server, undefined)) {
					return;
				}
				return new Response("Non WebSocket connection");
			},
			websocket: socketServer.handler
		});
		socketServer.on("TEST", (client, message) => {
			console.log("Server: Test message recieved.");
			client.send("TEST", message);
		});
		try {
			expect(
				await new Promise<string | undefined>((resolve) => {
					const socketClient = client<"TEST", {TEST: string}>("ws://localhost:3000", {
						open: () => {
							console.log("Connection created!");
							socketClient.send("TEST", "test");
						},
						close: (code, reason) => {
							console.log("Closed connection with code " + code + ' and reason "' + reason + '"!');
							resolve("close");
						},
						error: (error) => {
							console.error(error);
							resolve("error");
						}
					});
					socketClient.on("TEST", (msg) => {
						console.log("Client: Test message recieved.");
						resolve(msg);
					});
				})
			).toMatch("test");
		} catch (e) {
			throw e;
		} finally {
			bunServer.stop();
		}
	});
	it("multiple clients", async () => {
		const socketServer = server<unknown, "TEST" | "ROOM" | "ALL", {TEST: number; ROOM: number; ALL: undefined}>();
		const bunServer = Bun.serve({
			port: 3000,
			fetch(req, server) {
				if (socketServer.connect(req, server, undefined)) {
					return;
				}
				return new Response("Non WebSocket connection");
			},
			websocket: socketServer.handler
		});
		let room: SocketRoom<"TEST" | "ROOM" | "ALL", {TEST: number; ROOM: number; ALL: undefined}> | undefined;
		socketServer.connected((client) => {
			if (!room) room = socketServer.createRoom([client.id]);
			else room.addMember(client);
		});
		let connections = 0;
		socketServer.on("TEST", (client, message) => {
			console.log("Server: Test message recieved:", message);
			connections++;
			if (connections == 4) {
				socketServer.broadcast("all", "ALL", undefined);
				room?.send("ROOM", connections);
			}
		});
		try {
			expect(
				await new Promise<string | undefined>((resolve) => {
					let responses = 0;
					const clients = [];
					for (let i = 0; i < 4; i++) {
						clients.push(
							client<"TEST" | "ROOM" | "ALL", {TEST: number; ROOM: number; ALL: undefined}>("ws://localhost:3000", {
								open: (current) => {
									console.log("Connection created!");
									current.send("TEST", i);
								},
								close: (current, code, reason) => {
									console.log("Closed connection with code " + code + ' and reason "' + reason + '"!');
									resolve("close");
								},
								error: (current, error) => {
									console.error(error);
									resolve("error");
								}
							})
						);
						clients[i].on("ROOM", (msg) => {
							console.log("Client: Test message recieved from room: ", msg);
							responses++;
							if (responses == 4 * 2) resolve(responses.toString());
						});
						clients[i].on("ALL", (msg) => {
							console.log("Client: Test message recieved from broadcast.");
							responses++;
							if (responses == 4 * 2) resolve(responses.toString());
						});
					}
				})
			).toMatch("8");
		} catch (e) {
			throw e;
		} finally {
			bunServer.stop();
		}
	});
});
