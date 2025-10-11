# Roblox Game Tracker
This is a tracker script that basically monitors any Roblox game you want it to track. It was originally made for the Roblox game ALTER EGO to basically stalk its development and help document any changes made.

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
         "universeId": "YOURUNIVERSEIDHERE",
         "placeId": "YOURPLACEIDHERE",
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
   node track.js
   ```

## Configuration Reference

| Key                  | Description                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------|
| `interval`           | Polling interval in milliseconds (default `60000`).                                               |
| `stateFile`          | Path to cached state JSON (default `./lastState.json`).                                           |
| `ignoredFields`      | Object of field names to ignore for sending webhooks (e.g., `{"fps": true, "ping": true}`). Case-insensitive. |
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