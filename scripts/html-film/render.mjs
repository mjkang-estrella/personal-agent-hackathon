import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
const out=process.argv[2];const ffmpeg=process.env.FFMPEG||'ffmpeg';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.goto('http://localhost:3128/?capture');await page.waitForFunction(()=>window.filmReady);
await page.evaluate(()=>window.renderFilm(86));await page.screenshot({path:path.join(out,'preview.png')});
const fps=10;
const child=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',path.join(out,'narration.wav'),'-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-t','180','-movflags','+faststart',path.join(out,'JobSwitch-3min-demo.mp4')],{stdio:['pipe','inherit','inherit']});
let failure;child.on('error',e=>failure=e);child.stdin.on('error',e=>failure=e);
const completion=new Promise(resolve=>child.on('close',resolve));
try{for(let frame=0;frame<180*fps;frame++){
 if(failure)throw failure;
 await page.evaluate(t=>window.renderFilm(t),frame/fps);
 const jpeg=await page.screenshot({type:'jpeg',quality:92});
 if(!child.stdin.write(jpeg))await once(child.stdin,'drain');
 if(frame%(fps*15)===0)console.log('Rendered '+frame/fps+' / 180 seconds');
}child.stdin.end();const code=await completion;if(code!==0)throw new Error('Encoder failed: '+code);console.log('MP4 complete');}finally{await browser.close();if(child.exitCode===null)child.kill();}
