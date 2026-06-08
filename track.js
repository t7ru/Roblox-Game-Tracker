import { loadConfig, loadState, saveState } from "./src/config.js";
import {
	buildFetches,
	fetchCreatorGames,
	remapCdn1024,
} from "./src/endpoints.js";
import { evaluate } from "./src/confirm.js";
import { canonicalize } from "./src/normalize.js";
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
			state[key] = canonicalize(json);
		} catch (err) {
			console.error(`Error fetching ${key} for ${game.name}:`, err);
			return null;
		}
	}

	if (game.endpoints?.creatorgames && hasCookie) {
		try {
			const creator = state.metadata?.data?.[0]?.creator;
			state.creatorgames = canonicalize(
				creator ? await fetchCreatorGames(creator) : { data: [] },
			);
		} catch (err) {
			console.error(`Error fetching creatorgames for ${game.name}:`, err);
			return null;
		}
	}

	return state;
}

async function checkChanges() {
	try {
		console.log(`[${new Date().toISOString()}] Checking for changes...`);
		let stateDirty = false;

		for (const game of config.games) {
			if (game.disabled === true) {
				console.log(`Skipping ${game.name} (disabled)`);
				continue;
			}

			const gameKey = `${game.name}_${game.universeId}`;
			const candidate = await fetchGameState(game);
			if (!candidate) {
				console.warn(
					`Skipping ${game.name} this poll — incomplete fetch`,
				);
				continue;
			}

			const committed = lastState[gameKey] ?? {};
			const result = evaluate(gameKey, committed, candidate);

			if (result.status === "unchanged") continue;

			if (result.status === "pending") {
				console.log(`Changes pending confirmation for ${game.name}`);
				continue;
			}

			const gameChanges = diff(committed, candidate);
			if (!Object.keys(gameChanges).length) continue;

			if (!game.webhookUrl) {
				console.log(
					`No webhook URL configured for ${game.name}, skipping notification`,
				);
				lastState[gameKey] = candidate;
				stateDirty = true;
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
				{ [gameKey]: candidate },
				gameKey,
				game,
			);

			await sendWebhook(
				game.webhookUrl,
				game.name,
				content,
				messages,
				embeds,
			);
			console.log(`Changes confirmed for ${game.name}, webhook sent.`);

			lastState[gameKey] = candidate;
			stateDirty = true;
		}

		if (stateDirty) saveState(STATE_FILE, lastState);
		else console.log("No confirmed changes.");
	} catch (err) {
		console.error("Error checking changes:", err);
	}
}

checkChanges();
setInterval(checkChanges, INTERVAL);
