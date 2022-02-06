/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

const { parse } = require("next/dist/compiled/content-type");
import getRawBody from "raw-body";

const parseJson = (str: string) => {
	if (str.length === 0) {
		// special-case empty json body, as it's a common client-side mistake
		return {};
	}

	try {
		return JSON.parse(str);
	} catch (e) {
		console.error("Invalid JSON");
	}
};

export default async (req: any): Promise<{ parsedBody: unknown; rawBody: unknown } | undefined> => {
	const contentType = parse(req.headers["content-type"] || "text/plain");
	const { type, parameters } = contentType;
	const encoding = parameters.charset || "utf-8";
	const limit = "1mb";

	let buffer;

	try {
		buffer = await getRawBody(req, { encoding, limit });
	} catch (e) {
		console.error("Invalid body");
	}

	if (!buffer) {
		return undefined;
	}

	const rawBody = buffer.toString();
	let parsedBody;
	if (type === "application/json" || type === "application/ld+json") {
		parsedBody = parseJson(rawBody);
	} else if (type === "application/x-www-form-urlencoded") {
		const qs = require("querystring");
		parsedBody = qs.decode(rawBody);
	} else {
		parsedBody = rawBody;
	}

	return { parsedBody, rawBody };
};
