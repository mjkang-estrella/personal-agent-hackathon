import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2];
if (!dir || !process.env.OPENAI_API_KEY) throw new Error('Output directory and OPENAI_API_KEY required');
const scenes=JSON.parse(await readFile(new URL('./story.json',import.meta.url),'utf8'));
for (const s of scenes) {
 const dest=path.join(dir,`${s.id}.timing.json`);
 try { await readFile(dest); continue; } catch {}
 const form=new FormData();
 form.append('file',new Blob([await readFile(path.join(dir,`${s.id}.mp3`))],{type:'audio/mpeg'}),`${s.id}.mp3`);
 form.append('model','whisper-1'); form.append('response_format','verbose_json'); form.append('timestamp_granularities[]','word');form.append('language','en');form.append('prompt',s.text);
 const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form,signal:AbortSignal.timeout(90000)});
 if(!r.ok) throw new Error(`Transcription ${s.id}: HTTP ${r.status}`);
 await writeFile(dest,JSON.stringify(await r.json(),null,2)); console.log(`${s.id}: timed`);
}
