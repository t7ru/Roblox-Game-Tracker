# Roblox Game Tracker

*If you don't want to deal with the hassle of hosting it yourself, you can contact me and I will host it for the low low price of $1.99 a month. Negotiable of course.*

## Setup
1. **Clone to your server **
    ```
    git clone https://github.com/t7ru/Roblox-Game-Tracker.git
    ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Update `config.json`**
   ```json
   {
     "interval": 60000,
     "stateFile": "./lastState.json",
     "games": [
       {
         "name": "Placeholder Game",
         "universeId": "123456789",
         "placeId": "987654321",
         "iconSize": "128x128",
         "webhookUrl": "https://discord.com/api/webhooks/YOURWEBHOOKID/YOURWEBHOOKTOKEN",
         "disabled": false,
         "endpoints": {
           "metadata": true,
           "media": true,
           "playability": true,
           "servers": true,
           "gamepasses": true,
           "developerproducts": true,
           "badges": true,
           "icon": true
         }
       }
     ]
   }
   ```

4. **Run the tracker**
   ```
   node index.js
   ```

## Configuration Reference

| Key                  | Description                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------|
| `interval`           | Polling interval in milliseconds (default `60000`).                                               |
| `stateFile`          | Path to cached state JSON (default `./lastState.json`).                                           |
| `games[]`            | Array of game definitions.                                                                         |
| `games[].name`       | Friendly game name (used in logs and webhook title).                                              |
| `games[].universeId` | Roblox universe ID for the experience.                                                            |
| `games[].placeId`    | Place ID used by server and icon endpoints.                                                       |
| `games[].iconSize`   | Icon size (`50x50`, `128x128`, `150x150`, `256x256`, `420x420`, `512x512`; default `128x128`).     |
| `games[].webhookUrl` | Discord webhook URL; required to send notifications for this game.                                |
| `games[].disabled`   | Set `true` to skip tracking the game.                                                             |
| `games[].endpoints`  | Toggle specific endpoints (`metadata`, `media`, `playability`, `servers`, `gamepasses`, `developerproducts`, `badges`, `icon`). |

All endpoint toggles default to `false` if omitted.

If you need a real example for the config file, the repository includes a default `config.json`.