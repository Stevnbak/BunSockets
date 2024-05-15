import {decodeMessage, encodeMessage} from "../shared";

export default <MessageID extends string = string, ContentTypes extends {[key in MessageID]: any} = {[key in MessageID]: any}>(url: string, handlers?: handlers<MessageID, ContentTypes>) => {
	return new Socket<MessageID, ContentTypes>(url, handlers);
};
export class Socket<MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	private socket: WebSocket;
	// Listener
	private listeners: {id: "ERROR" | MessageID; cb: <ID extends MessageID | "ERROR">(message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void}[] = [];
	public on<ID extends MessageID | "ERROR">(id: ID, cb: (message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void): void {
		this.listeners.push({id, cb: (m: any) => cb(m)});
	}

	//Send message
	public send<ID extends MessageID | "ERROR">(messageID: ID | "ERROR", content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) {
		const message = encodeMessage(messageID, content);
		this.socket.send(message);
	}

	//Main
	constructor(url: string, handlers?: handlers<MessageID, ContentTypes>) {
		this.socket = new WebSocket(url);
		// message is received
		this.socket.addEventListener("message", (event) => {
			//Parse message
			let parsedMsg = decodeMessage(event.data.toString());
			if (!parsedMsg) return this.send("ERROR", "Unrecognized message format.");
			//Call listener callbacks
			for (let listener of this.listeners) {
				if (listener.id == parsedMsg.id) listener.cb(parsedMsg.data);
			}
		});
		// socket opened
		this.socket.addEventListener("open", (event) => {
			if (handlers?.open != undefined) handlers.open(this);
		});
		// socket closed
		this.socket.addEventListener("close", (event) => {
			if (handlers?.close) handlers.close(this, event.code, event.reason);
		});
		// error handler
		this.socket.addEventListener("error", (event) => {
			if (handlers?.error) handlers.error(this, event.message);
		});
		this.on("ERROR", (msg) => {
			if (handlers?.error) handlers.error(this, msg);
		});
	}
}
type handlers<MessageID extends string, ContentTypes extends {[key in MessageID]: any}> = {
	open?: (current: Socket<MessageID, ContentTypes>) => void;
	close?: (current: Socket<MessageID, ContentTypes>, code: number, reason: string) => void;
	error?: (current: Socket<MessageID, ContentTypes>, error: string) => void;
};
