import type {ServerWebSocket} from "bun";
import type {MessageID} from "./server";

export type ClientID = `${string}-${string}-${string}-${string}-${string}`;

export class SocketClient<DataType = unknown> {
	constructor(socket: ServerWebSocket<DataType>, id?: ClientID) {
		this._id = id ?? crypto.randomUUID();
		this._socket = socket;
	}
	//Socket
	private _socket: ServerWebSocket<DataType>;
	public get socket() {
		return this._socket;
	}
	//ID
	private _id: ClientID;
	public get id() {
		return this._id;
	}
	//Send
	public send(messageID: MessageID, content: unknown) {
		const message = `ID(${messageID})|${JSON.stringify({data: content})}`;
		this.socket.send(message);
	}
}
