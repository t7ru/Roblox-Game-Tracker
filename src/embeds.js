import {
	fetchAssetThumbnails,
	fetchPlayerAvatars,
	fetchThumbnails,
} from "./fetchers.js";
import {
	BADGE_ICON_SIZE,
	fetchGameIcon,
	resolveEventThumbSize,
} from "./endpoints.js";

function addedItems(section) {
	if (!section) return [];
	if (section.added?.length) return section.added;
	if (section.new?.length) return section.new;
	return [];
}

function push(embeds, title, url, color) {
	if (!url) return;
	const png = url.replace(/\/Image\/Jpeg(\/|$)/i, "/Image/Png$1");
	embeds.push({ title, image: { url: png }, color });
}

function collectMediaItems(gameChanges) {
	const data = gameChanges.media?.data;
	if (!data) return [];

	const items = addedItems(data).filter(
		(i) => i.assetType === "Image" && i.imageId,
	);

	if (data.old && data.new) {
		const oldMap = new Map(data.old.map((i) => [i.imageId, i]));
		for (const item of data.new) {
			if (item.assetType !== "Image" || !item.imageId) continue;
			const prev = oldMap.get(item.imageId);
			if (!prev || JSON.stringify(prev) !== JSON.stringify(item))
				items.push(item);
		}
	}
	return items;
}

export async function buildImageEmbeds(gameChanges, newState, gameKey, game) {
	const { name: gameName, eventThumbSize, placeId, iconSize } = game;
	const thumbSize = resolveEventThumbSize(eventThumbSize);
	const embeds = [];
	const seenEvents = new Set();

	if (gameChanges.servers && newState[gameKey].servers?.data) {
		const tokens = newState[gameKey].servers.data
			.flatMap((s) => s.playerTokens ?? [])
			.filter(Boolean);
		for (const { imageUrl } of await fetchPlayerAvatars(tokens)) {
			push(embeds, `Player in ${gameName}`, imageUrl, 0x00ff00);
		}
	}

	if (gameChanges.media) {
		const items = collectMediaItems(gameChanges);
		const thumbs = await fetchAssetThumbnails(
			items.map((i) => i.imageId),
			thumbSize,
		);
		for (const item of items) {
			push(
				embeds,
				`Media Updated - ${gameName}`,
				thumbs.get(item.imageId),
				0x0000ff,
			);
		}
	}

	if (gameChanges.icon && placeId) {
		const url = await fetchGameIcon(placeId, iconSize);
		if (url) push(embeds, `Icon Updated - ${gameName}`, url, 0xffff00);
	}

	for (const key of ["virtualevents", "pastevents"]) {
		if (!gameChanges[key]) continue;
		const events = addedItems(gameChanges[key].data);
		const thumbs = await fetchAssetThumbnails(
			events.map((e) => e.thumbnails?.[0]?.mediaId).filter(Boolean),
			thumbSize,
		);
		for (const event of events) {
			const id = event.id != null ? String(event.id) : "";
			if (!id || seenEvents.has(id)) continue;
			seenEvents.add(id);

			const mediaId = event.thumbnails?.[0]?.mediaId;
			if (!mediaId) continue;
			const title = event.displayTitle || event.title || "Event";
			push(embeds, `Event - ${title}`, thumbs.get(mediaId), 0x9b59b6);
		}
	}

	if (gameChanges.badges) {
		const badges = addedItems(gameChanges.badges.data);
		if (badges.length) {
			const thumbs = await fetchThumbnails(
				badges.map((b) => ({
					targetId: b.id,
					type: "BadgeIcon",
					size: BADGE_ICON_SIZE,
				})),
			);
			for (const b of badges) {
				push(embeds, `Badge - ${b.name}`, thumbs.get(b.id), 0xe67e22);
			}
		}
	}

	const productAdds = [
		...addedItems(gameChanges.gamepasses?.gamePasses).map((p) => ({
			label: "Game Pass",
			name: p.displayName || p.name,
			assetId: p.displayIconImageAssetId,
		})),
		...addedItems(gameChanges.developerproducts?.developerProducts).map(
			(p) => ({
				label: "Dev Product",
				name: p.Name,
				assetId: p.IconImageAssetId,
			}),
		),
		...addedItems(gameChanges.experiencestore?.developerProducts).map(
			(p) => ({
				label: "Store Item",
				name: p.Name,
				assetId: p.IconImageAssetId,
			}),
		),
	].filter((p) => p.assetId > 0);

	if (productAdds.length) {
		const thumbs = await fetchAssetThumbnails(
			productAdds.map((p) => p.assetId),
			thumbSize,
		);
		for (const p of productAdds) {
			push(
				embeds,
				`${p.label} - ${p.name}`,
				thumbs.get(p.assetId),
				0x3498db,
			);
		}
	}

	return embeds;
}
