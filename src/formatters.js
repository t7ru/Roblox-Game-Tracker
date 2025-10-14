export function formatFieldName(field) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function formatDiffMessage(changes, path = "", gameName = "", gameConfig = null) {
  const messages = [];

  for (const [key, value] of Object.entries(changes)) {
    const currentPath = path ? `${path}.${key}` : key;
    const fieldName = formatFieldName(key);

    if (value && typeof value === "object" && "old" in value && "new" in value) {
      let changeMessage = `🔄 **${fieldName}** changed from \`${value.old}\` to \`${value.new}\``;
      if (key.toLowerCase() === 'universeid') {
        changeMessage = `🔄 **Game Universe ID** changed from \`${value.old}\` to \`${value.new}\``;
      } else if (key.toLowerCase() === 'placeid') {
        changeMessage = `🔄 **Game Place ID** changed from \`${value.old}\` to \`${value.new}\``;
      }
      messages.push(changeMessage);
    } else if (
      value &&
      typeof value === "object" &&
      ("added" in value || "removed" in value || "modified" in value)
    ) {
      if (value.added?.length) {
        messages.push(`➕ **${value.added.length}** new item(s) added to **${fieldName}**`);
        value.added.forEach((item) => {
          if (item?.name) {
            messages.push(`   • ${item.name}${item.id ? ` (ID: ${item.id})` : ""}`);
          } else if (item?.id) {
            messages.push(`   • Item ID: ${item.id}`);
          }
        });
      }

      if (value.removed?.length) {
        messages.push(`➖ **${value.removed.length}** item(s) removed from **${fieldName}**`);
        value.removed.forEach((item) => {
          if (item?.name) {
            messages.push(`   • ${item.name}${item.id ? ` (ID: ${item.id})` : ""}`);
          } else if (item?.id) {
            messages.push(`   • Item ID: ${item.id}`);
          }
        });
      }

      if (value.modified?.length) {
        messages.push(`✏️ **${value.modified.length}** item(s) modified in **${fieldName}**`);
        value.modified.forEach((item) => {
          let itemLabel = `Item ID ${item.id}`;

          if (gameConfig) {
            if (item.id === gameConfig.universeId) {
              itemLabel = `${item.id} (Universe)`;
            } else if (item.id === gameConfig.placeId) {
              itemLabel = `${item.id} (Place)`;
            }
          }
          
          messages.push(`   📝 **${itemLabel}**:`);
          const subMessages = formatDiffMessage(item.diff, currentPath, gameName, gameConfig);
          subMessages.forEach((msg) => messages.push(`      ${msg}`));
        });
      }
    } else if (value && typeof value === "object") {
      messages.push(`📂 **${fieldName}** has changes:`);
      const subMessages = formatDiffMessage(value, currentPath, gameName, gameConfig);
      subMessages.forEach((msg) => messages.push(`   ${msg}`));
    }
  }

  return messages;
}