import { loadConfig, loadState, saveState } from "./src/config.js";
import {
	buildFetches,
	fetchCreatorGames,
	remapCdn1024,
} from "./src/endpoints.js";
import { diff, setIgnoredFields } from "./src/diff.js";
import { formatDiffMessage } from "./src/formatters.js";
import { initAuth, fetchJSON, fetchPlayerAvatars } from "./src/fetchers.js";
import { sendWebhook } from "./src/webhook.js";

const config = loadConfig();
initAuth({ cookie: config.cookie, cloudapi: config.cloudapi });

const INTERVAL = config.interval || 60000;
const STATE_FILE = config.stateFile || "./lastState.json";
const hasCookie = Boolean(config.cookie);
const hasCloudApi = Boolean(config.cloudapi);
let lastState = loadState(STATE_FILE);

setIgnoredFields(config.ignoredFields || {});

async function fetchGameState(game) {
	const gameKey = `${game.name}_${game.universeId}`;
	const state = {};

	for (const { key, run } of buildFetches(game, hasCookie, hasCloudApi)) {
		try {
			const json = await run();
			if (key === "icon") remapCdn1024(json, game.iconSize);
			state[key] = json;
		} catch (err) {
			console.error(`Error fetching ${key} for ${game.name}:`, err);
			state[key] = lastState?.[gameKey]?.[key] ?? {};
		}
	}

	if (game.endpoints?.creatorgames && hasCookie) {
		try {
			const creator = state.metadata?.data?.[0]?.creator;
			state.creatorgames = creator
				? await fetchCreatorGames(creator)
				: { data: [] };
		} catch (err) {
			console.error(`Error fetching creatorgames for ${game.name}:`, err);
			state.creatorgames = lastState?.[gameKey]?.creatorgames ?? {};
		}
	}

	return state;
}

async function checkChanges() {
	try {
		console.log(`[${new Date().toISOString()}] Checking for changes...`);
		const newState = {};

		for (const game of config.games) {
			if (game.disabled === true) {
				console.log(`Skipping ${game.name} (disabled)`);
				continue;
			}
			newState[`${game.name}_${game.universeId}`] =
				await fetchGameState(game);
		}

		const changes = diff(lastState, newState);
		if (Object.keys(changes).length === 0) {
			console.log("No changes detected.");
			return;
		}

		for (const [gameKey, gameChanges] of Object.entries(changes)) {
			const universeId = gameKey.split("_").pop();
			const game = config.games.find((g) => g.universeId === universeId);
			if (!game?.webhookUrl) {
				console.log(
					`No webhook URL configured for ${game?.name ?? gameKey}, skipping...`,
				);
				continue;
			}

			const messages = formatDiffMessage(
				gameChanges,
				"",
				game.name,
				game,
			);
			let content = `**[${game.name}] Changes Detected**\n**----------------**\n`;
			content += messages.join("\n");

			const embeds = [];

			if (newState[gameKey].servers?.data) {
				const tokens = newState[gameKey].servers.data
					.flatMap((s) => s.playerTokens ?? [])
					.filter(Boolean);
				if (tokens.length) {
					for (const avatar of (
						await fetchPlayerAvatars(tokens)
					).slice(0, 10)) {
						if (embeds.length >= 10) break;
						embeds.push({
							title: `Player in ${game.name}`,
							image: { url: avatar.imageUrl },
							color: 0x00ff00,
						});
					}
				}
			}

			if (gameChanges.media?.data?.new) {
				const oldMap = new Map(
					(gameChanges.media.data.old ?? []).map((item) => [
						item.imageId,
						item,
					]),
				);
				for (const newItem of gameChanges.media.data.new) {
					if (embeds.length >= 10) break;
					const oldItem = oldMap.get(newItem.imageId);
					if (
						oldItem &&
						JSON.stringify(newItem) === JSON.stringify(oldItem)
					)
						continue;
					if (newItem.assetType !== "Image" || !newItem.imageId)
						continue;
					try {
						const asset = await fetchJSON(
							`https://assetdelivery.roblox.com/v2/assetId/${newItem.imageId}`,
						);
						const url = asset.locations?.[0]?.location;
						if (url)
							embeds.push({
								title: `Media Updated - ${game.name}`,
								image: { url },
								color: 0x0000ff,
							});
					} catch (err) {
						console.error(
							`Failed to fetch media asset ${newItem.imageId}:`,
							err,
						);
					}
				}
			}

			if (gameChanges.icon?.data) {
				let newIconUrl;
				let oldIconUrl;
				if (gameChanges.icon.data.new) {
					newIconUrl = gameChanges.icon.data.new[0]?.imageUrl;
					oldIconUrl = gameChanges.icon.data.old?.[0]?.imageUrl;
				} else if (gameChanges.icon.data[0]?.imageUrl) {
					newIconUrl = gameChanges.icon.data[0].imageUrl.new;
					oldIconUrl = gameChanges.icon.data[0].imageUrl.old;
				}
				if (
					newIconUrl &&
					newIconUrl !== oldIconUrl &&
					embeds.length < 10
				) {
					embeds.push({
						title: `Icon Updated - ${game.name}`,
						image: { url: newIconUrl },
						color: 0xffff00,
					});
				}
			}

			await sendWebhook(
				game.webhookUrl,
				game.name,
				content,
				messages,
				embeds,
			);
			console.log(`Changes detected for ${game.name}, webhook sent.`);
		}

		saveState(STATE_FILE, newState);
		lastState = newState;
	} catch (err) {
		console.error("Error checking changes:", err);
	}
}

checkChanges();
setInterval(checkChanges, INTERVAL);
