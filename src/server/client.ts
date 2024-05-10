import type {ServerWebSocket} from "bun";

export type ClientID = `${string}-${string}-${string}-${string}-${string}`;

export class SocketClient<DataType, MessageID extends string> {
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
	public send(messageID: MessageID, content: unknown) {
		const message = `ID(${messageID})|${JSON.stringify({data: content})}`;
		this.socket.send(message);
	}
	//Data
	public get data() {
		return this.socket.data.data;
	}
}

export type ClientData<DataType = unknown> = {id: ClientID; data: DataType};
