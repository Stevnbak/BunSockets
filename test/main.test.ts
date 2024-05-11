import client from "../client";
import server from "../server";

//Create tests
import {describe, it, expect, beforeAll, afterAll} from "bun:test";
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
});
