let cookie = "";
let cloudapi = "";
let csrf;

export function initAuth({ cookie: c = "", cloudapi: k = "" } = {}) {
	cookie = c;
	cloudapi = k;
	csrf = undefined;
}

export async function roblox(
	url,
	{ method = "GET", body, auth = "none" } = {},
) {
	const headers = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	if (auth === "cookie" && cookie)
		headers.Cookie = `.ROBLOSECURITY=${cookie}`;
	if (auth === "cloudapi" && cloudapi) headers["x-api-key"] = cloudapi;
	if (csrf && method !== "GET") headers["X-CSRF-TOKEN"] = csrf;

	const opts = {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	};

	let res = await fetch(url, opts);
	if (res.status === 403 && method !== "GET" && auth === "cookie") {
		const token = res.headers.get("x-csrf-token");
		if (token) {
			csrf = token;
			headers["X-CSRF-TOKEN"] = token;
			res = await fetch(url, { ...opts, headers });
		}
	}
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res.json();
}

export async function robloxPages(
	url,
	{ auth = "none", pick, param = "cursor" },
) {
	const items = [];
	const pageUrl = new URL(url);
	for (;;) {
		const json = await roblox(pageUrl.toString(), { auth });
		items.push(...pick(json));
		const next = json.nextPageCursor ?? json.nextPageToken;
		if (!next) break;
		pageUrl.searchParams.set(param, next);
	}
	return items;
}

export async function fetchJSON(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res.json();
}

async function thumbnailBatch(requests) {
	const res = await fetch("https://thumbnails.roblox.com/v1/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requests),
	});
	const data = await res.json();
	return data.data ?? [];
}

export async function fetchAssetThumbnails(assetIds, size) {
	const map = new Map();
	for (let i = 0; i < assetIds.length; i += 100) {
		const chunk = assetIds.slice(i, i + 100);
		try {
			const json = await fetchJSON(
				`https://thumbnails.roblox.com/v1/assets?assetIds=${chunk.join(",")}&size=${size}&format=Png`,
			);
			for (const row of json.data ?? []) {
				if (row.state === "Completed" && row.imageUrl)
					map.set(row.targetId, row.imageUrl);
			}
		} catch (err) {
			console.error("Error fetching asset thumbnails:", err);
		}
	}
	return map;
}

export async function fetchThumbnails(items) {
	const map = new Map();
	for (let i = 0; i < items.length; i += 100) {
		const chunk = items.slice(i, i + 100);
		const requests = chunk.map((item) => ({
			requestId: String(item.targetId),
			targetId: item.targetId,
			type: item.type,
			size: item.size ?? "420x420",
			format: "Png",
			isCircular: false,
		}));
		try {
			for (const row of await thumbnailBatch(requests)) {
				if (row.state === "Completed" && row.imageUrl)
					map.set(Number(row.requestId), row.imageUrl);
			}
		} catch (err) {
			console.error("Error fetching thumbnails:", err);
		}
	}
	return map;
}

export async function fetchPlayerAvatars(playerTokens) {
	if (!playerTokens?.length) return [];

	try {
		const requests = playerTokens.map((token, i) => ({
			requestId: String(i + 1),
			token,
			type: "AvatarHeadShot",
			size: "100x100",
			format: "Png",
			isCircular: false,
		}));
		return (await thumbnailBatch(requests)).filter(
			(item) => item.state === "Completed" && item.imageUrl,
		);
	} catch (err) {
		console.error("Error fetching player avatars:", err);
		return [];
	}
}
