import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out=process.argv[2];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// The final HTML must play offline without any external resource requests.
await page.route(/^https?:/,r=>r.abort());
await page.goto(pathToFileURL(path.join(out,'index.html')).href+'?capture');
await page.waitForFunction(()=>window.filmReady&&document.querySelector('audio').readyState>=1);
const duration=await page.locator('audio').evaluate(a=>a.duration);assert.ok(Math.abs(duration-180)<.05);
const scenes=JSON.parse(await readFile(path.join(out,'scenes.json')));
for(const [i,s] of scenes.entries()){
 await page.evaluate(t=>window.renderFilm(t),s.start+1);
 assert.ok(await page.locator('#title').innerText());
 if(i<9)assert.ok(await page.locator('#shot').evaluate(im=>im.complete&&im.naturalWidth===1600));
 await page.screenshot({path:path.join(out,`frame-${String(i+1).padStart(2,'0')}.jpg`),type:'jpeg',quality:85});
}
assert.deepEqual(errors,[]);
await writeFile(path.join(out,'verification.json'),JSON.stringify({duration,scenes:10,offline:true,pageErrors:errors},null,2));
await browser.close();console.log('Offline HTML passed: ten scenes, 180-second audio, no page errors.');
