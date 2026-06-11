const ID_KEYS = new Set([
	"id",
	"productid",
	"universeid",
	"placeid",
	"badgeid",
	"assetid",
	"targetid",
]);

export function cdnImageHash(url) {
	if (!url) return null;
	const m = url.match(/rbxcdn\.com\/([^/]+)/);
	return m?.[1] ?? url;
}

function itemId(item) {
	if (item?.id != null) return String(item.id);
	if (item?.ProductId != null) return String(item.ProductId);
	return null;
}

export function canonicalize(value) {
	if (value == null || typeof value !== "object") {
		if (typeof value === "number" && value > Number.MAX_SAFE_INTEGER)
			return String(value);
		return value;
	}

	if (Array.isArray(value)) {
		const ids = value.map(itemId);
		if (ids.length && ids.every(Boolean)) {
			const byId = new Map();
			for (const item of value)
				byId.set(itemId(item), canonicalize(item));
			return [...byId.values()].sort((a, b) =>
				itemId(a).localeCompare(itemId(b)),
			);
		}
		return value.map(canonicalize);
	}

	const out = {};
	for (const [key, val] of Object.entries(value)) {
		if (key === "userRsvpStatus") continue;
		if (
			key === "imageUrl" &&
			typeof val === "string" &&
			val.includes("rbxcdn.com")
		) {
			out.imageHash = cdnImageHash(val);
			continue;
		}
		if (ID_KEYS.has(key.toLowerCase()) && val != null)
			out[key] = String(val);
		else out[key] = canonicalize(val);
	}
	return out;
}
