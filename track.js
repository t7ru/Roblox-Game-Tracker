import { loadConfig, loadState, saveState } from "./src/config.js";
import {
	buildFetches,
	fetchCreatorGames,
	remapCdn1024,
} from "./src/endpoints.js";
import { diff, setIgnoredFields } from "./src/diff.js";
import { formatDiffMessage } from "./src/formatters.js";
import { initAuth } from "./src/fetchers.js";
import { buildImageEmbeds } from "./src/embeds.js";
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

			const embeds = await buildImageEmbeds(
				gameChanges,
				newState,
				gameKey,
				game.name,
				game.eventThumbSize,
			);

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
