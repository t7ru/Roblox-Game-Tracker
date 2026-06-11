import { createHash } from "node:crypto";
import { diff } from "./diff.js";

const pending = new Map();

function fp(value) {
	return createHash("sha256")
		.update(JSON.stringify(value ?? null))
		.digest("hex");
}

export function evaluate(gameKey, committed, candidate) {
	const keys = new Set([...Object.keys(committed), ...Object.keys(candidate)]);
	const confirmed = [];
	let anyPending = false;

	const pend = pending.get(gameKey) ?? new Map();

	for (const key of keys) {
		if (!Object.keys(diff(committed[key], candidate[key], key)).length) {
			pend.delete(key);
			continue;
		}

		const newFp = fp(candidate[key]);

		if (pend.get(key) === newFp) {
			pend.delete(key);
			confirmed.push(key);
		} else {
			pend.set(key, newFp);
			anyPending = true;
		}
	}

	if (pend.size) pending.set(gameKey, pend);
	else pending.delete(gameKey);

	if (confirmed.length) return { status: "confirmed", keys: confirmed };
	if (anyPending) return { status: "pending" };
	return { status: "unchanged" };
}
