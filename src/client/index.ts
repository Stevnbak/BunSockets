export default (url: string, handlers?: {open?: () => void; close?: (code: number, reason: string) => void; error?: (error: string) => void}) => {
	return new Socket(url, handlers);
};
class Socket<MessageID extends string = string> {
	private socket: WebSocket;
	// Listener
	private listeners: {id: "ERROR" | MessageID; cb: (message: unknown) => void}[] = [];
	public on(id: MessageID, cb: (message: unknown) => void) {
		this.listeners.push({id, cb});
	}

	//Send message
	public send(messageID: "ERROR" | MessageID, content: unknown) {
		const message = `ID(${messageID})|${JSON.stringify({data: content})}`;
		this.socket.send(message);
	}

	//Main
	constructor(url: string, handlers?: {open?: () => void; close?: (code: number, reason: string) => void; error?: (error: string) => void}) {
		this.socket = new WebSocket(url);
		// message is received
		this.socket.addEventListener("message", (event) => {
			//Parse message
			const msg = event.data.toString();
			let parsedMsg: {id: MessageID; data: unknown};
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
	}
}
