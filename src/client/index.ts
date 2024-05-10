export default <MessageID extends string = string, ContentTypes extends {[key in MessageID]: any} = {[key in MessageID]: any}>(url: string, handlers?: {open?: () => void; close?: (code: number, reason: string) => void; error?: (error: string) => void}) => {
	return new Socket<MessageID, ContentTypes>(url, handlers);
};
class Socket<MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	private socket: WebSocket;
	// Listener
	private listeners: {id: "ERROR" | MessageID; cb: <ID extends MessageID | "ERROR">(message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void}[] = [];
	public on<ID extends MessageID | "ERROR">(id: ID, cb: (message: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) => void): void {
		this.listeners.push({id, cb: (m: any) => cb(m)});
	}

	//Send message
	public send<ID extends MessageID | "ERROR">(messageID: "ERROR" | MessageID, content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown) {
		const message = JSON.stringify({id: messageID, data: content});
		this.socket.send(message);
	}

	//Main
	constructor(url: string, handlers?: {open?: () => void; close?: (code: number, reason: string) => void; error?: (error: string) => void}) {
		this.socket = new WebSocket(url);
		// message is received
		this.socket.addEventListener("message", (event) => {
			//Parse message
			const msg = event.data.toString();
			let parsedMsg: {id: MessageID; data: any};
			try {
				parsedMsg = JSON.parse(msg);
			} catch {
				this.send("ERROR", "Unrecognized message format.");
				return;
			}
			//Call listener callbacks
			for (let listener of this.listeners) {
				if (listener.id == parsedMsg.id) listener.cb(parsedMsg.data);
			}
		});
		// socket opened
		this.socket.addEventListener("open", (event) => {
			if (handlers?.open != undefined) handlers.open();
		});
		// socket closed
		this.socket.addEventListener("close", (event) => {
			if (handlers?.close) handlers.close(event.code, event.reason);
		});
		// error handler
		this.socket.addEventListener("error", (event) => {
			if (handlers?.error) handlers.error(event.message);
		});
		this.on("ERROR", (msg) => {
			if (handlers?.error) handlers.error(msg);
		});
	}
}
