import type {ServerWebSocket} from "bun";

export type ClientID = `${string}-${string}-${string}-${string}-${string}`;

export class SocketClient<DataType, MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	constructor(socket: ServerWebSocket<ClientData<DataType>>, id?: ClientID) {
		this._id = id ?? crypto.randomUUID();
		this._socket = socket;
	}
	//Socket
	private _socket: ServerWebSocket<ClientData<DataType>>;
	public get socket() {
		return this._socket;
	}
	//ID
	private _id: ClientID;
	public get id() {
		return this._id;
	}
	//Send
	public send<ID extends MessageID>(messageID: ID, content: ContentTypes[ID]): void;
	public send(messageID: "ERROR", content: string): void;
	public send(messageID: string, content: any) {
		const message = JSON.stringify({id: messageID, data: content});
		this.socket.send(message);
	}
	//Data
	public get data() {
		return this.socket.data.data;
	}
}

export type ClientData<DataType = unknown> = {id: ClientID; data: DataType};
