export function encodeMessage(id: string, data: any): string {
	return btoa(`${id}|${data == undefined ? "undefined" : JSON.stringify(data)}`);
}
export function decodeMessage(msg: string): {id: string; data: any} | null {
	try {
		const splt = atob(msg).split("|");
		const id = splt[0];
		const data = splt[1] == "undefined" ? undefined : JSON.parse(splt[1]);
		return {id, data};
	} catch (err) {
		return null;
	}
}
