import { createHash } from "node:crypto";

const pending = new Map();

export function fingerprint(state) {
	return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

export function evaluate(gameKey, committed, candidate) {
	const committedFp = fingerprint(committed);
	const candidateFp = fingerprint(candidate);

	if (candidateFp === committedFp) {
		pending.delete(gameKey);
		return { status: "unchanged" };
	}

	if (pending.get(gameKey) === candidateFp) {
		pending.delete(gameKey);
		return { status: "confirmed" };
	}

	pending.set(gameKey, candidateFp);
	return { status: "pending" };
}
