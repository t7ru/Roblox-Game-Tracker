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
	for (;;) {
		const json = await roblox(url, { auth });
		items.push(...pick(json));
		const next = json.nextPageCursor ?? json.nextPageToken;
		if (!next) break;
		url = `${url}${url.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(next)}`;
	}
	return items;
}

export async function fetchJSON(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res.json();
}

export async function fetchPlayerAvatars(playerTokens) {
	if (!playerTokens?.length) return [];

	try {
		const requests = playerTokens.map((token, i) => ({
			requestId: String(i + 1),
			token,
			type: "AvatarHeadShot",
			size: "100x100",
			format: null,
			isCircular: false,
		}));

		const res = await fetch("https://thumbnails.roblox.com/v1/batch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(requests),
		});
		const data = await res.json();
		return (
			data.data?.filter(
				(item) => item.state === "Completed" && item.imageUrl,
			) ?? []
		);
	} catch (err) {
		console.error("Error fetching player avatars:", err);
		return [];
	}
}
