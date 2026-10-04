import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const out = process.argv[2];
if (!out || !process.env.OPENAI_API_KEY) throw new Error('Provide output directory and OPENAI_API_KEY through environment.');
await mkdir(out, { recursive: true });
const scenes = JSON.parse(await readFile(new URL('./story.json', import.meta.url), 'utf8'));
for (const scene of scenes) {
  const file = path.join(out, `${scene.id}.mp3`);
  try { await readFile(file); console.log(`${scene.id}: cached`); continue; } catch {}
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'marin', input: scene.text, response_format: 'mp3', instructions: 'Speak in natural American English. Warm, confident founder introducing a useful product to a friend. Conversational, lightly energetic, clear articulation. No sales pitch or dramatic delivery. Keep a brisk but comfortable product-demo pace with short pauses between sentences.' }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`Speech generation failed for ${scene.id}: HTTP ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`${scene.id}: generated`);
}
