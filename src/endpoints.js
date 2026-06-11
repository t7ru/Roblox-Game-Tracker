import { roblox, robloxPages } from "./fetchers.js";

export const ICON_SIZES = new Set([
	"50x50",
	"128x128",
	"150x150",
	"256x256",
	"420x420",
	"512x512",
]);

export const EVENT_THUMB_SIZES = new Set([
	"150x150",
	"250x250",
	"384x216",
	"420x420",
	"480x270",
	"512x512",
	"576x324",
	"768x432",
]);

export function resolveIconSize(size) {
	return ICON_SIZES.has(size) ? size : "128x128";
}

export function resolveEventThumbSize(size) {
	return EVENT_THUMB_SIZES.has(size) ? size : "420x420";
}

export const BADGE_ICON_SIZE = "150x150";

function fetchExperienceEvents(uid, params) {
	const qs = new URLSearchParams({
		visibility: "public",
		limit: "100",
		...params,
	});
	return robloxPages(
		`https://apis.roblox.com/virtual-events/v2/universes/${uid}/experience-events?${qs}`,
		{ pick: (j) => j.data ?? [] },
	);
}

export function buildFetches(game, hasCookie, hasCloudApi) {
	const {
		universeId: uid,
		placeId: pid,
		endpoints: on = {},
		iconSize,
	} = game;
	const fetches = [];
	const cookie = hasCookie ? "cookie" : "none";
	const cloud = hasCloudApi ? "cloudapi" : "none";

	if (on.metadata)
		fetches.push({
			key: "metadata",
			run: () =>
				roblox(`https://games.roblox.com/v1/games?universeIds=${uid}`),
		});
	if (on.media)
		fetches.push({
			key: "media",
			run: () =>
				roblox(
					`https://games.roblox.com/v2/games/${uid}/media?fetchAllExperienceRelatedMedia=true`,
				),
		});
	if (on.playability)
		fetches.push({
			key: "playability",
			run: () =>
				roblox(
					`https://games.roblox.com/v1/games/multiget-playability-status?universeIds=${uid}`,
					{ auth: cookie },
				),
		});
	if (on.servers)
		fetches.push({
			key: "servers",
			run: () =>
				roblox(
					`https://games.roblox.com/v1/games/${pid}/servers/0?sortOrder=2&excludeFullGames=false&limit=50`,
				),
		});
	if (on.votes)
		fetches.push({
			key: "votes",
			run: () =>
				roblox(
					`https://games.roblox.com/v1/games/votes?universeIds=${uid}`,
				),
		});
	if (on.productinfo)
		fetches.push({
			key: "productinfo",
			run: () =>
				roblox(
					`https://games.roblox.com/v1/games/games-product-info?universeIds=${uid}`,
				),
		});
	if (on.subplaces)
		fetches.push({
			key: "subplaces",
			run: async () => ({
				data: await robloxPages(
					`https://develop.roblox.com/v2/universes/${uid}/places?limit=100`,
					{ auth: cookie, pick: (j) => j.data ?? [] },
				),
			}),
		});
	if (on.virtualevents)
		fetches.push({
			key: "virtualevents",
			run: async () => {
				const now = new Date().toISOString();
				const [upcoming, active, past] = await Promise.all([
					fetchExperienceEvents(uid, { startsAfter: now }),
					fetchExperienceEvents(uid, {
						startsBefore: now,
						endsAfter: now,
					}),
					fetchExperienceEvents(uid, { endsBefore: now }),
				]);
				const byId = new Map();
				for (const e of [...upcoming, ...active, ...past])
					byId.set(String(e.id), e);
				return { data: [...byId.values()] };
			},
		});
	if (on.agerecommendation)
		fetches.push({
			key: "agerecommendation",
			run: () =>
				roblox(
					"https://apis.roblox.com/experience-guidelines-api/experience-guidelines/get-age-recommendation",
					{ method: "POST", body: { universeId: Number(uid) } },
				),
		});
	if (on.gamepasses)
		fetches.push({
			key: "gamepasses",
			run: async () => ({
				gamePasses: await robloxPages(
					`https://apis.roblox.com/game-passes/v1/universes/${uid}/game-passes?pageSize=100&passView=Full`,
					{ pick: (j) => j.gamePasses ?? [], param: "pageToken" },
				),
			}),
		});
	if (on.developerproducts)
		fetches.push({
			key: "developerproducts",
			run: async () => ({
				developerProducts: await robloxPages(
					`https://apis.roblox.com/developer-products/v2/universes/${uid}/developerproducts?limit=100`,
					{ pick: (j) => j.developerProducts ?? [] },
				),
			}),
		});
	if (on.experiencestore)
		fetches.push({
			key: "experiencestore",
			run: async () => ({
				developerProducts: await robloxPages(
					`https://apis.roblox.com/experience-store/v1/universes/${uid}/store?limit=100`,
					{ auth: cookie, pick: (j) => j.developerProducts ?? [] },
				),
			}),
		});
	if (on.badges)
		fetches.push({
			key: "badges",
			run: async () => ({
				data: await robloxPages(
					`https://badges.roblox.com/v1/universes/${uid}/badges?limit=100&sortOrder=Asc`,
					{ pick: (j) => j.data ?? [] },
				),
			}),
		});
	if (on.placeversions)
		fetches.push({
			key: "placeversions",
			run: () =>
				roblox("https://develop.roblox.com/v1/assets/latest-versions", {
					method: "POST",
					auth: "cookie",
					body: {
						assetIds: [Number(pid)],
						versionStatus: "Published",
					},
				}),
		});
	if (on.subscriptions)
		fetches.push({
			key: "subscriptions",
			run: () =>
				roblox(
					`https://apis.roblox.com/v1/subscriptions/active-subscription-products?subscriptionProductType=1&subscriptionProviderId=${uid}`,
					{ auth: cookie },
				),
		});
	if (on.clouduniverse)
		fetches.push({
			key: "clouduniverse",
			run: () =>
				roblox(`https://apis.roblox.com/cloud/v2/universes/${uid}`, {
					auth: "cloudapi",
				}),
		});
	if (on.serverrestarts)
		fetches.push({
			key: "serverrestarts",
			run: () =>
				roblox(
					`https://apis.roblox.com/server-management/v1/universes/${uid}/restarts`,
					{ auth: "cloudapi" },
				),
		});
	if (on.icon) {
		const size =
			iconSize === "1024x1024" ? "512x512" : resolveIconSize(iconSize);
		fetches.push({
			key: "icon",
			run: () =>
				roblox(
					`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${pid}&size=${size}&format=Png&isCircular=false`,
				),
		});
	}

	return fetches;
}

export async function fetchCreatorGames(creator) {
	if (!creator?.id) return { data: [] };
	const base =
		creator.type === "Group"
			? `https://games.roblox.com/v2/groups/${creator.id}/gamesV2?accessFilter=2&limit=50&sortOrder=Desc`
			: `https://games.roblox.com/v2/users/${creator.id}/games?accessFilter=2&limit=50&sortOrder=Asc`;
	return {
		data: await robloxPages(base, {
			auth: "cookie",
			pick: (j) => j.data ?? [],
		}),
	};
}

export function remapCdn1024(json, iconSize) {
	if (iconSize !== "1024x1024" || !json?.data) return;
	for (const item of json.data) {
		item.imageUrl = item.imageUrl?.replace(
			/\/\d+\/\d+(\/Image\/)/,
			"/1024/1024$1",
		);
	}
}

export async function fetchGameIcon(placeId, iconSize) {
	const size =
		iconSize === "1024x1024" ? "512x512" : resolveIconSize(iconSize);
	const json = await roblox(
		`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&size=${size}&format=Png&isCircular=false`,
	);
	remapCdn1024(json, iconSize);
	return json.data?.[0]?.imageUrl;
}
