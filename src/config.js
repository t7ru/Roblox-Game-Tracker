import fs from "fs";

const CONFIG_FILE = "./config.json";

export function loadConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    console.log("Configuration loaded successfully.");
    config.games = config.games || [];
    return config;
  } catch (err) {
    console.error("Failed to load configuration file:", err);
    process.exit(1);
  }
}

export function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (err) {
    console.error("Failed to read state file:", err);
    return {};
  }
}

export function saveState(stateFile, state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Failed to write state file:", err);
  }
}