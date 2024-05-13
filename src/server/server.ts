import type {WebSocketHandler, Server} from "bun";
import {SocketClient, type ClientData, type ClientID} from "./client";
import {decodeMessage, encodeMessage} from "../shared";
export default <DataType = unknown, MessageID extends string = string, ContentTypes extends {[key in MessageID]: any} = {[key in MessageID]: any}>() => {
	return new SocketServer<DataType, MessageID, ContentTypes>();
};
class SocketServer<DataType, MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	// Listeners
	private listeners: {id: MessageID | "ERROR"; cb: <ID extends MessageID | "ERROR">(client: SocketClient<DataType, MessageID, ContentTypes>, message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void}[] = [];
	private openListener: ((client: SocketClient<DataType, MessageID, ContentTypes>) => void) | undefined;
	private closeListener: ((client?: SocketClient<DataType, MessageID, ContentTypes>) => void) | undefined;
	public connected(cb: (client: SocketClient<DataType, MessageID, ContentTypes>) => void): void {
		this.openListener = cb;
	}
	public disconnected(cb: (client?: SocketClient<DataType, MessageID, ContentTypes>) => void): void {
		this.closeListener = cb;
	}
	public on<ID extends MessageID | "ERROR">(id: ID, cb: (client: SocketClient<DataType, MessageID, ContentTypes>, message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void): void {
		this.listeners.push({id, cb: (c, m: any) => cb(c, m)});
	}

	//Clients
	private _clients: {[key: ClientID]: SocketClient<DataType, MessageID, ContentTypes> | undefined} = {};
	public get clients() {
		return this._clients;
	}
	private addClient(client: SocketClient<DataType, MessageID, ContentTypes>) {
		this._clients[client.id] = client;
	}
	private removeClient(id: ClientID) {
		delete this._clients[id];
	}
	public send<ID extends MessageID | "ERROR">(clientID: ClientID, messageID: ID, content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown): void {
		let client = this._clients[clientID];
		if (!client) throw new Error("No client exists with that ID.");
		const message = encodeMessage(messageID, content);
		client.socket.send(message);
	}

	// Bun handler
	public handler: WebSocketHandler<ClientData<DataType>> = {
		message: (socket, msg: string) => {
			//Find client
			let client = this._clients[socket.data.id];
			if (!client) {
				//Recreate client
				client = new SocketClient<DataType, MessageID, ContentTypes>(socket, socket.data.id);
				this.addClient(client);
				if (this.openListener) this.openListener(client);
			}
			//Parse message
			let parsedMsg = decodeMessage(msg);
			if (!parsedMsg) return this.send(socket.data.id, "ERROR", "Unrecognized message format.");
			//Error?
			if (parsedMsg.id == "ERROR") console.error(`Client(${client.id}) send an error message: \"${parsedMsg.data}\"`);
			//Call listener callbacks
			for (let listener of this.listeners) {
				if (listener.id == parsedMsg.id) listener.cb<typeof parsedMsg.id>(client, parsedMsg.data as typeof parsedMsg.id extends MessageID ? ContentTypes[typeof parsedMsg.id] : any);
			}
		},
		open: async (socket) => {
			const client = new SocketClient<DataType, MessageID, ContentTypes>(socket, socket.data.id);
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
