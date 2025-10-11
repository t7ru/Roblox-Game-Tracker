export function buildEndpoints(game) {
  const endpoints = {};
  const { universeId, placeId, endpoints: enabledEndpoints, iconSize } = game;

  if (enabledEndpoints?.metadata) {
    endpoints.metadata = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
  }
  if (enabledEndpoints?.media) {
    endpoints.media = `https://games.roblox.com/v2/games/${universeId}/media?fetchAllExperienceRelatedMedia=true`;
  }
  if (enabledEndpoints?.playability) {
    endpoints.playability = `https://games.roblox.com/v1/games/multiget-playability-status?universeIds=${universeId}`;
  }
  if (enabledEndpoints?.servers) {
    endpoints.servers = `https://games.roblox.com/v1/games/${placeId}/servers/0?sortOrder=2&excludeFullGames=false&limit=10`;
  }
  if (enabledEndpoints?.gamepasses) {
    endpoints.gamepasses = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=10&sortOrder=1`;
  }
  if (enabledEndpoints?.developerproducts) {
    endpoints.developerproducts = `https://apis.roblox.com/developer-products/v2/universes/${universeId}/developerproducts?limit=100`;
  }
  if (enabledEndpoints?.badges) {
    endpoints.badges = `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=100&sortBy=Rank`;
  }
  if (enabledEndpoints?.icon) {
    const validSizes = ["50x50", "128x128", "150x150", "256x256", "420x420", "512x512"];
    const size = validSizes.includes(iconSize) ? iconSize : "128x128";
    endpoints.icon = `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&size=${size}&format=Png&isCircular=false`;
  }

  return endpoints;
}