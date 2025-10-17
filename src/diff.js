let ignoredFields = new Set();
let ignoredPaths = new Set();

export function setIgnoredFields(fields) {
  ignoredFields.clear();
  ignoredPaths.clear();
  
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value === true) {
        const lowerKey = key.toLowerCase();
        if (key.includes('.')) {
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
  
  console.log(`Checking if ignored: key="${key}", path="${path}", currentPath="${currentPath}"`);
  
  if (ignoredFields.has(lowerKey)) {
    console.log(`  -> Ignored by field: ${lowerKey}`);
    return true;
  }

  if (ignoredPaths.has(currentPath)) {
    console.log(`  -> Ignored by path: ${currentPath}`);
    return true;
  }

  for (const ignoredPath of ignoredPaths) {
    if (currentPath.endsWith(ignoredPath) || currentPath.endsWith('.' + ignoredPath)) {
      console.log(`  -> Ignored by suffix match: ${ignoredPath}`);
      return true;
    }
    if (currentPath.startsWith(ignoredPath + '.')) {
      console.log(`  -> Ignored by parent path: ${ignoredPath}`);
      return true;
    }
  }
  
  return false;
}

function diffCheck(oldObj, newObj, path = "") {
  const result = {};
  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (key === "fps" && typeof oldVal === "number" && typeof newVal === "number") {
      if (Math.floor(oldVal) !== Math.floor(newVal)) {
        if (isIgnored(key, path)) continue;
        result[key] = { old: oldVal, new: newVal };
      }
      continue;
    }

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (typeof newVal === "object" && newVal !== null) {
      const currentPath = path ? `${path}.${key.toLowerCase()}` : key.toLowerCase();
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
  const result = {};

  for (const key in newObj) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    if (Array.isArray(newVal) && Array.isArray(oldVal)) {
      let idField = 'id';
      
      if (newVal.length > 0 && newVal[0]?.ProductId !== undefined) {
        idField = 'ProductId';
      } else if (oldVal.length > 0 && oldVal[0]?.ProductId !== undefined) {
        idField = 'ProductId';
      }

      const oldMap = new Map(oldVal.map((item) => item && [item[idField], item]).filter(Boolean));
      const newMap = new Map(newVal.map((item) => item && [item[idField], item]).filter(Boolean));

      const hasIds =
        newVal.some((item) => item && item[idField] !== undefined) ||
        oldVal.some((item) => item && item[idField] !== undefined);

      if (hasIds) {
        const added = newVal.filter((item) => !item || !oldMap.has(item[idField]));
        const removed = oldVal.filter((item) => !item || !newMap.has(item[idField]));
        const modified = [];

        newVal.forEach((newItem) => {
          if (newItem && newItem[idField] && oldMap.has(newItem[idField])) {
            const oldItem = oldMap.get(newItem[idField]);
            const currentPath = path ? `${path}.${key.toLowerCase()}` : key.toLowerCase();
            const itemDiff =
              key === "data" &&
              typeof newItem.fps === "number" &&
              typeof oldItem.fps === "number"
                ? diffCheck(oldItem, newItem, currentPath)
                : diff(oldItem, newItem, currentPath);

            if (Object.keys(itemDiff).length > 0) {
              modified.push({ id: newItem[idField], diff: itemDiff });
            }
          }
        });

        if (added.length || removed.length || modified.length) {
          if (isIgnored(key, path)) continue;
          result[key] = { added, removed, modified };
        }
      } else {
        if (isIgnored(key, path)) continue;
        result[key] = { old: oldVal, new: newVal };
      }
    } else if (typeof newVal === "object" && newVal !== null) {
      const currentPath = path ? `${path}.${key.toLowerCase()}` : key.toLowerCase();
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