export async function sendWebhook(webhookUrl, gameName, content, messages, embeds) {
  if (!webhookUrl) return;

  const payload = {
    content: content.length > 1900 ? content.substring(0, 1900) + "..." : content,
  };

  if (embeds.length > 0) {
    payload.embeds = embeds;
  }

  if (content.length <= 1900) {
    await dispatch(webhookUrl, payload);
    return;
  }

  const chunks = [];
  let current = `**[${gameName}] Changes Detected**\n**----------------**\n`;

  for (const message of messages) {
    if (current.length + message.length + 1 > 1900) {
      chunks.push(current);
      current = message + "\n";
    } else {
      current += message + "\n";
    }
  }
  if (current.trim()) chunks.push(current);

  for (let i = 0; i < chunks.length; i++) {
    const chunkPayload = { content: chunks[i] };
    if (i === 0 && embeds.length > 0) {
      chunkPayload.embeds = embeds;
    }
    await dispatch(webhookUrl, chunkPayload);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function dispatch(webhookUrl, body) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}