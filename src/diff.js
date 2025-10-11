function diffCheck(oldObj, newObj) {
  const result = {};
  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (key === "fps" && typeof oldVal === "number" && typeof newVal === "number") {
      if (Math.floor(oldVal) !== Math.floor(newVal)) {
        result[key] = { old: oldVal, new: newVal };
      }
      continue;
    }

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (typeof newVal === "object" && newVal !== null) {
      const subDiff = diff(oldVal, newVal);
      if (Object.keys(subDiff).length > 0) {
        result[key] = subDiff;
      }
    } else {
      result[key] = { old: oldVal, new: newVal };
    }
  }
  return result;
}

export function diff(oldObj = {}, newObj = {}) {
  const result = {};

  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (Array.isArray(newVal) && Array.isArray(oldVal)) {
      const oldMap = new Map(oldVal.map((item) => item && [item.id, item]).filter(Boolean));
      const newMap = new Map(newVal.map((item) => item && [item.id, item]).filter(Boolean));

      const hasIds =
        newVal.some((item) => item && item.id !== undefined) ||
        oldVal.some((item) => item && item.id !== undefined);

      if (hasIds) {
        const added = newVal.filter((item) => !item || !oldMap.has(item.id));
        const removed = oldVal.filter((item) => !item || !newMap.has(item.id));
        const modified = [];

        newVal.forEach((newItem) => {
          if (newItem && newItem.id && oldMap.has(newItem.id)) {
            const oldItem = oldMap.get(newItem.id);
            const itemDiff =
              key === "data" &&
              typeof newItem.fps === "number" &&
              typeof oldItem.fps === "number"
                ? diffCheck(oldItem, newItem)
                : diff(oldItem, newItem);

            if (Object.keys(itemDiff).length > 0) {
              modified.push({ id: newItem.id, diff: itemDiff });
            }
          }
        });

        if (added.length || removed.length || modified.length) {
          result[key] = { added, removed, modified };
        }
      } else {
        result[key] = { old: oldVal, new: newVal };
      }
    } else if (typeof newVal === "object" && newVal !== null) {
      const subDiff = diff(oldVal, newVal);
      if (Object.keys(subDiff).length > 0) {
        result[key] = subDiff;
      }
    } else {
      result[key] = { old: oldVal, new: newVal };
    }
  }

  return result;
}