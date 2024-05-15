import {encodeMessage} from "../shared";
import type {ClientID, SocketClient} from "./client";

export type RoomID = `${string}-${string}-${string}-${string}-${string}`;

export class SocketRoom<MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	constructor(members: SocketClient<any, MessageID, ContentTypes>[]) {
		this._id = crypto.randomUUID();
		if (members.length == 0) throw new Error("A room requires at least one member.");
		this.members = members;
	}
	//ID
	private _id: RoomID;
	public get id() {
		return this._id;
	}
	//Clients
	private members: SocketClient<any, MessageID, ContentTypes>[];
	public addMember(client: SocketClient<any, MessageID, ContentTypes>) {
		this.members.push(client);
	}
	public removeMember(clientId: ClientID): boolean {
		this.members.splice(this.members.findIndex((c) => c.id == clientId));
		return this.members.length == 0;
	}
	//Send
	public send<ID extends MessageID | "ERROR">(messageID: ID, content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown): void {
		const message = encodeMessage(messageID, content);
		for (let member of this.members) {
			member.socket.send(message);
		}
	}
}
