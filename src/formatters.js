export function formatFieldName(field) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function formatDiffMessage(changes, path = "", gameName = "") {
  const messages = [];

  for (const [key, value] of Object.entries(changes)) {
    const currentPath = path ? `${path}.${key}` : key;
    const fieldName = formatFieldName(key);

    if (value && typeof value === "object" && "old" in value && "new" in value) {
      messages.push(
        `🔄 **${fieldName}** changed from \`${value.old}\` to \`${value.new}\``
      );
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
          messages.push(`   📝 **Item ID ${item.id}**:`);
          const subMessages = formatDiffMessage(item.diff, currentPath, gameName);
          subMessages.forEach((msg) => messages.push(`      ${msg}`));
        });
      }
    } else if (value && typeof value === "object") {
      messages.push(`📂 **${fieldName}** has changes:`);
      const subMessages = formatDiffMessage(value, currentPath, gameName);
      subMessages.forEach((msg) => messages.push(`   ${msg}`));
    }
  }

  return messages;
}