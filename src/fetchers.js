export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

export async function fetchPlayerAvatars(playerTokens) {
  if (!playerTokens?.length) return [];

  try {
    const requests = playerTokens.map((token, index) => ({
      requestId: (index + 1).toString(),
      token,
      type: "AvatarHeadShot",
      size: "100x100",
      format: null,
      isCircular: false,
    }));

    const response = await fetch("https://thumbnails.roblox.com/v1/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requests),
    });

    const data = await response.json();
    return data.data?.filter((item) => item.state === "Completed" && item.imageUrl) || [];
  } catch (err) {
    console.error("Error fetching player avatars:", err);
    return [];
  }
}