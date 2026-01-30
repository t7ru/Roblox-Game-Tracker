let ignoredFields = new Set();
let ignoredPaths = new Set();

export function setIgnoredFields(fields) {
  ignoredFields.clear();
  ignoredPaths.clear();

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value === true) {
        const lowerKey = key.toLowerCase();
        if (key.includes(".")) {
          ignoredPaths.add(lowerKey);
        } else {
          ignoredFields.add(lowerKey);
        }
      }
    }
  }
}

function isIgnored(key, path = "") {
  const lowerKey = key.toLowerCase();
  const currentPath = path ? `${path}.${lowerKey}` : lowerKey;

  console.log(
    `Checking if ignored: key="${key}", path="${path}", currentPath="${currentPath}"`,
  );

  if (ignoredFields.has(lowerKey)) {
    console.log(`  -> Ignored by field: ${lowerKey}`);
    return true;
  }

  if (ignoredPaths.has(currentPath)) {
    console.log(`  -> Ignored by path: ${currentPath}`);
    return true;
  }

  for (const ignoredPath of ignoredPaths) {
    if (
      currentPath.endsWith(ignoredPath) ||
      currentPath.endsWith("." + ignoredPath)
    ) {
      console.log(`  -> Ignored by suffix match: ${ignoredPath}`);
      return true;
    }
    if (currentPath.startsWith(ignoredPath + ".")) {
      console.log(`  -> Ignored by parent path: ${ignoredPath}`);
      return true;
    }
  }

  return false;
}

function diffCheck(oldObj, newObj, path = "") {
  oldObj = oldObj || {};
  newObj = newObj || {};

  const result = {};
  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (
      key === "fps" &&
      typeof oldVal === "number" &&
      typeof newVal === "number"
    ) {
      if (Math.floor(oldVal) !== Math.floor(newVal)) {
        if (isIgnored(key, path)) continue;
        result[key] = { old: oldVal, new: newVal };
      }
      continue;
    }

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (typeof newVal === "object" && newVal !== null) {
      const currentPath = path
        ? `${path}.${key.toLowerCase()}`
        : key.toLowerCase();
      const subDiff = diff(oldVal, newVal, currentPath);
      if (Object.keys(subDiff).length > 0) {
        if (isIgnored(key, path)) continue;
        result[key] = subDiff;
      }
    } else {
      if (isIgnored(key, path)) continue;
      result[key] = { old: oldVal, new: newVal };
    }
  }
  return result;
}

export function diff(oldObj = {}, newObj = {}, path = "") {
  oldObj = oldObj || {};
  newObj = newObj || {};

  const result = {};

  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (Array.isArray(newVal) && Array.isArray(oldVal)) {
      const oldArr = Array.isArray(oldVal) ? oldVal : [];
      const newArr = Array.isArray(newVal) ? newVal : [];

      let idField = "id";
      if (newArr.length > 0 && newArr[0]?.ProductId !== undefined) {
        idField = "ProductId";
      } else if (oldArr.length > 0 && oldArr[0]?.ProductId !== undefined) {
        idField = "ProductId";
      }

      const getId = (item) =>
        item && item[idField] !== undefined && item[idField] !== null
          ? item[idField]
          : undefined;

      const oldMap = new Map(
        oldArr
          .map((item) => {
            const id = getId(item);
            return id !== undefined ? [id, item] : undefined;
          })
          .filter(Boolean),
      );
      const newMap = new Map(
        newArr
          .map((item) => {
            const id = getId(item);
            return id !== undefined ? [id, item] : undefined;
          })
          .filter(Boolean),
      );

      const hasIds = oldMap.size > 0 || newMap.size > 0;

      if (hasIds) {
        const added = newArr.filter((item) => {
          const id = getId(item);
          if (id !== undefined) return !oldMap.has(id);
          return !oldArr.some(
            (o) => JSON.stringify(o) === JSON.stringify(item),
          );
        });

        const removed = oldArr.filter((item) => {
          const id = getId(item);
          if (id !== undefined) return !newMap.has(id);
          return !newArr.some(
            (n) => JSON.stringify(n) === JSON.stringify(item),
          );
        });

        const modified = [];

        newArr.forEach((newItem) => {
          const id = getId(newItem);
          if (id !== undefined && oldMap.has(id)) {
            const oldItem = oldMap.get(id);
            const currentPath = path
              ? `${path}.${key.toLowerCase()}`
              : key.toLowerCase();

            const itemDiff =
              key === "data" &&
              typeof newItem?.fps === "number" &&
              typeof oldItem?.fps === "number"
                ? diffCheck(oldItem, newItem, currentPath)
                : diff(oldItem, newItem, currentPath);

            if (Object.keys(itemDiff).length > 0) {
              modified.push({ id, diff: itemDiff });
            }
          }
        });

        if (added.length || removed.length || modified.length) {
          if (isIgnored(key, path)) continue;
          result[key] = { added, removed, modified };
        }
      } else {
        if (isIgnored(key, path)) continue;
        result[key] = { old: oldArr, new: newArr };
      }
    } else if (typeof newVal === "object" && newVal !== null) {
      const currentPath = path
        ? `${path}.${key.toLowerCase()}`
        : key.toLowerCase();
      const subDiff = diff(oldVal, newVal, currentPath);
      if (Object.keys(subDiff).length > 0) {
        if (isIgnored(key, path)) continue;
        result[key] = subDiff;
      }
    } else {
      if (isIgnored(key, path)) continue;
      result[key] = { old: oldVal, new: newVal };
    }
  }

  return result;
}
