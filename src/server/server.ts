import type {WebSocketHandler, ServerWebSocket, Server} from "bun";
import {SocketClient, type ClientID} from "./client";
export default <DataType = unknown>() => {
	return new SocketServer<DataType>();
};
class SocketServer<DataType = unknown> {
	// Listener
	private listeners: {id: MessageID; cb: (client: SocketClient, message: unknown) => void}[] = [];
	public on(id: MessageID, cb: (client: SocketClient, message: unknown) => void) {
		this.listeners.push({id, cb});
	}

	//Clients
	private clients: {[key: ClientID]: SocketClient | undefined} = {};
	private addClient(client: SocketClient) {
		this.clients[client.id] = client;
	}
	private removeClient(id: ClientID) {
		delete this.clients[id];
	}
	public send(clientID: ClientID, messageID: MessageID, content: unknown) {
		let client = this.clients[clientID];
		if (!client) throw new Error("No client exists with that ID.");
		const message = `ID(${messageID})|${JSON.stringify({data: content})}`;
		client.socket.send(message);
	}

	// Bun handler
	public handler: WebSocketHandler<ClientData<DataType>> = {
		message: (socket, msg: string) => {
			//Parse message
			const id: MessageID | undefined = msg
				.match(/ID\(.*\)/)?.[0]
				.replace("ID(", "")
				.replace(")", "");
			let parsedMsg: {data: unknown};
			try {
				parsedMsg = JSON.parse(msg.replace(`ID(${id})|`, ""));
			} catch {
				this.send(socket.data.id, "ERROR", "Unrecognized message format.");
				return;
			}
			//Find client
			const client = this.clients[socket.data.id];
			if (!client) {
				this.send(socket.data.id, "ERROR", "Client doesn't exist, please reconnect.");
				return;
			}
			//Error?
			if (id == "ERROR") {
				console.error(`Client(${client.id}) send an error message: \"${parsedMsg.data}\"`);
			}
			//Call listener callbacks
			for (let listener of this.listeners) {
				if (listener.id == id) listener.cb(client, parsedMsg.data);
			}
		},
		open: async (socket) => {
			const client = new SocketClient(socket, socket.data.id);
			this.addClient(client);
		},
		close: (socket) => {
			this.removeClient(socket.data.id);
		}
	};
	// Bun upgrade
	public connect(req: Request, server: Server, data: DataType) {
		if (server?.upgrade<ClientData<DataType>>(req, {data: {id: crypto.randomUUID(), data}})) {
			return true;
		} else {
			return false;
		}
	}
}

export type MessageID = "ERROR" | string;
export type ClientData<DataType = unknown> = {id: ClientID; data: DataType};
