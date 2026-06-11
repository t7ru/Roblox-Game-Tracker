import { createHash } from "node:crypto";

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
		const oldFp = fp(committed[key]);
		const newFp = fp(candidate[key]);

		if (oldFp === newFp) {
			pend.delete(key);
			continue;
		}

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
