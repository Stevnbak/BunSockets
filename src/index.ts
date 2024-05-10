import c from "./client";
export const client = c;

import s from "./server";
export const server = s;

export type {ClientData} from "./server/server";
export type {ClientID, SocketClient} from "./server/client";
