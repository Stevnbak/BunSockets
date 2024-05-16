import {encodeMessage} from "../shared";
import type {SocketClient} from "./client";

export type RoomID = `${string}-${string}-${string}-${string}-${string}`;

export class SocketRoom<MessageID extends string, ContentTypes extends {[key in MessageID]: any}> {
	constructor(members: SocketClient<any, MessageID, ContentTypes>[]) {
		this._id = crypto.randomUUID();
		if (members.length == 0) throw new Error("A room requires at least one member.");
		for (let member of members) {
			this.addMember(member);
		}
	}
	//ID
	private _id: RoomID;
	public get id() {
		return this._id;
	}
	//Clients
	private members: SocketClient<any, MessageID, ContentTypes>[] = [];
	public addMember(client: SocketClient<any, MessageID, ContentTypes>) {
		this.members.push(client);
		client.socket.subscribe(this._id);
	}
	public removeMember(client: SocketClient<any, MessageID, ContentTypes>): boolean {
		client.socket.unsubscribe(this._id);
		this.members.splice(this.members.findIndex((c) => c.id == client.id));
		return this.members.length == 0;
	}
	//Send
	public send<ID extends MessageID | "ERROR">(messageID: ID, content: ID extends "ERROR" ? string : ID extends MessageID ? ContentTypes[ID] : unknown): void {
		const message = encodeMessage(messageID, content);
		this.members[0].socket.publish(this._id, message);
		this.members[0].socket.send(message);
	}
}
