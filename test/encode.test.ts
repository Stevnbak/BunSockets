import {decodeMessage, encodeMessage} from "../src/shared";

//Create tests
import {describe, it, expect} from "bun:test";
describe("Encoding & Decoding", () => {
	it("number", () => {
		test(100);
	});
	it("string", () => {
		test("string test!");
	});
	it("array", () => {
		test([1, 2, 3, "4", "5"]);
	});
	it("object", () => {
		test({key: "Value", number: 2, again: ["1", 2, 3]});
	});
});

function test(value: any) {
	const encoded = encodeMessage("test", value);
	const decoded = decodeMessage(encoded);
	if (!decoded) throw new Error("Wrong message format");
	console.log("Encoded:", encoded);
	console.log("Decoded:", decoded);
	expect(decoded.id).toEqual("test");
	expect(decoded.data).toEqual(value);
}
