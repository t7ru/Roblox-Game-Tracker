function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function contentChunks(gameName, content, messages) {
	if (content.length <= 1900) return [content];

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
	return chunks;
}

export async function sendWebhook(
	webhookUrl,
	gameName,
	content,
	messages,
	embeds,
) {
	if (!webhookUrl) return;

	const texts = contentChunks(gameName, content, messages);
	const embedBatches = embeds.length ? chunk(embeds, 10) : [[]];

	const payloads = [
		{
			content: texts[0],
			...(embedBatches[0]?.length ? { embeds: embedBatches[0] } : {}),
		},
	];

	for (let i = 1; i < texts.length; i++) {
		payloads.push({ content: texts[i] });
	}
	for (let i = 1; i < embedBatches.length; i++) {
		payloads.push({ embeds: embedBatches[i] });
	}

	for (let i = 0; i < payloads.length; i++) {
		await dispatch(webhookUrl, payloads[i]);
		if (i < payloads.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}
}

async function dispatch(webhookUrl, body) {
	await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}
