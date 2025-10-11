import { loadConfig, loadState, saveState } from "./src/config.js";
import { buildEndpoints } from "./src/endpoints.js";
import { diff } from "./src/diff.js";
import { formatDiffMessage } from "./src/formatters.js";
import { fetchJSON, fetchPlayerAvatars } from "./src/fetchers.js";
import { sendWebhook } from "./src/webhook.js";

const config = loadConfig();
const INTERVAL = config.interval || 60000;
const STATE_FILE = config.stateFile || "./lastState.json";
let lastState = loadState(STATE_FILE);

async function checkChanges() {
  try {
    console.log(`[${new Date().toISOString()}] Checking for changes...`);
    const newState = {};

    for (const game of config.games) {
      if (game.disabled === true) {
        console.log(`Skipping ${game.name} (disabled)`);
        continue;
      }

      const gameKey = `${game.name}_${game.universeId}`;
      newState[gameKey] = {};

      const endpoints = buildEndpoints(game);
      for (const [endpointKey, url] of Object.entries(endpoints)) {
        try {
          newState[gameKey][endpointKey] = await fetchJSON(url);
        } catch (err) {
          console.error(`Error fetching ${endpointKey} for ${game.name}:`, err);
        }
      }
    }

    const changes = diff(lastState, newState);
    if (Object.keys(changes).length === 0) {
      console.log("No changes detected.");
      return;
    }

    for (const [gameKey, gameChanges] of Object.entries(changes)) {
      const universeId = gameKey.split("_").pop();
      const game = config.games.find((g) => g.universeId === universeId);
      if (!game) continue;

      if (!game.webhookUrl) {
        console.log(`No webhook URL configured for ${game.name}, skipping it...`);
        continue;
      }

      const messages = formatDiffMessage(gameChanges, "", game.name);
      let content = `**[${game.name}] Changes Detected**\n**----------------**\n`;
      content += messages.join("\n");

      const embeds = [];

      if (newState[gameKey].servers?.data) {
        const allPlayerTokens = newState[gameKey].servers.data
          .flatMap((server) => server.playerTokens || [])
          .filter(Boolean);

        if (allPlayerTokens.length > 0) {
          const playerAvatars = await fetchPlayerAvatars(allPlayerTokens);
          playerAvatars.slice(0, 10).forEach((avatar) => {
            if (embeds.length < 10) {
              embeds.push({
                title: `Player in ${game.name}`,
                image: { url: avatar.imageUrl },
                color: 0x00ff00,
              });
            }
          });
        }
      }

      if (gameChanges.media?.data?.new) {
        const newMediaItems = gameChanges.media.data.new;
        const oldMediaItems = gameChanges.media.data.old || [];
        const oldMediaMap = new Map(oldMediaItems.map((item) => [item.imageId, item]));

        for (const newItem of newMediaItems) {
          if (embeds.length >= 10) break;
          const oldItem = oldMediaMap.get(newItem.imageId);
          if (!oldItem || JSON.stringify(newItem) !== JSON.stringify(oldItem)) {
            if (newItem.assetType === "Image" && newItem.imageId) {
              try {
                const assetUrl = `https://assetdelivery.roblox.com/v2/assetId/${newItem.imageId}`;
                const assetInfo = await fetchJSON(assetUrl);
                const assetLocation = assetInfo.locations?.[0]?.location;
                if (assetLocation) {
                  embeds.push({
                    title: `Media Updated - ${game.name}`,
                    image: { url: assetLocation },
                    color: 0x0000ff,
                  });
                }
              } catch (err) {
                console.error(
                  `Failed to fetch media asset for imageId ${newItem.imageId}:`,
                  err
                );
              }
            }
          }
        }
      }

      if (gameChanges.icon?.data) {
        let newIconUrl = null;
        let oldIconUrl = null;

        if (gameChanges.icon.data.new) {
          newIconUrl = gameChanges.icon.data.new[0]?.imageUrl;
          oldIconUrl = gameChanges.icon.data.old?.[0]?.imageUrl;
        } else if (gameChanges.icon.data[0]?.imageUrl) {
          newIconUrl = gameChanges.icon.data[0].imageUrl.new;
          oldIconUrl = gameChanges.icon.data[0].imageUrl.old;
        }

        if (newIconUrl && newIconUrl !== oldIconUrl && embeds.length < 10) {
          embeds.push({
            title: `Icon Updated - ${game.name}`,
            image: { url: newIconUrl },
            color: 0xffff00,
          });
        }
      }

      await sendWebhook(game.webhookUrl, game.name, content, messages, embeds);
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