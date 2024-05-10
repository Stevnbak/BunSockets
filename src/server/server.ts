import type {WebSocketHandler, Server} from "bun";
import {SocketClient, type ClientData, type ClientID} from "./client";
import type {Type} from "typescript";
export default <DataType = unknown, MessageID extends string = string>() => {
	return new SocketServer<DataType, MessageID>();
};
class SocketServer<DataType = unknown, MessageID extends string = string, ContentTypes extends {[key in MessageID]: Type} = {[key in MessageID]: any}> {
	// Listeners
	private listeners: {id: "ERROR" | MessageID; cb: <ID extends MessageID | "ERROR">(client: SocketClient<DataType, MessageID>, message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void}[] = [];
	private openListener: ((client: SocketClient<DataType, MessageID>) => void) | undefined;
	private closeListener: ((client?: SocketClient<DataType, MessageID>) => void) | undefined;
	public connected(cb: (client: SocketClient<DataType, MessageID>) => void): void {
		this.openListener = cb;
	}
	public disconnected(cb: (client?: SocketClient<DataType, MessageID>) => void): void {
		this.closeListener = cb;
	}
	public on<ID extends MessageID | "ERROR">(id: ID, cb: <ID>(client: SocketClient<DataType, MessageID>, message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void): void {
		this.listeners.push({id, cb});
	}

	//Clients
	private _clients: {[key: ClientID]: SocketClient<DataType, MessageID> | undefined} = {};
	public get clients() {
		return this._clients;
	}
	private addClient(client: SocketClient<DataType, MessageID>) {
		this._clients[client.id] = client;
	}
	private removeClient(id: ClientID) {
		delete this._clients[id];
	}
	public send<ID extends MessageID | "ERROR">(clientID: ClientID, messageID: ID, content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) {
		let client = this._clients[clientID];
		if (!client) throw new Error("No client exists with that ID.");
		const message = `ID(${messageID})|${JSON.stringify({data: content})}`;
		client.socket.send(message);
	}

	// Bun handler
	public handler: WebSocketHandler<ClientData<DataType>> = {
		message: (socket, msg: string) => {
			//Parse message
			const id = msg
				.match(/ID\(.*\)/)?.[0]
				.replace("ID(", "")
				.replace(")", "") as "ERROR" | MessageID | undefined;
			let parsedMsg: {data: unknown};
			try {
				parsedMsg = JSON.parse(msg.replace(`ID(${id})|`, ""));
			} catch {
				this.send(socket.data.id, "ERROR", "Unrecognized message format.");
				return;
			}
			//Find client
			const client = this._clients[socket.data.id];
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
				if (listener.id == id) listener.cb<typeof id>(client, parsedMsg.data as typeof id extends "ERROR" ? string : typeof id extends MessageID ? ContentTypes[typeof id] : any);
			}
		},
		open: async (socket) => {
			const client = new SocketClient<DataType, MessageID>(socket, socket.data.id);
			this.addClient(client);
			if (this.openListener) this.openListener(client);
		},
		close: (socket) => {
			const client = this._clients[socket.data.id];
			this.removeClient(socket.data.id);
			if (this.closeListener) this.closeListener(client);
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
