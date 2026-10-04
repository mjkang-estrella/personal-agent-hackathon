import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {installFixture} from './mock.js';
const out=process.argv[2];if(!out)throw new Error('Provide output directory');
await mkdir(out,{recursive:true});
const fixture=JSON.parse(await readFile(process.argv[3],'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const ctx=await browser.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1});
await ctx.addInitScript(installFixture,fixture);
const page=await ctx.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror',e=>console.error('PAGE ERROR',e.message));
const shots=[];
async function shot(id){
 await page.waitForTimeout(350);
 await page.addStyleTag({content:'nextjs-portal,.toast{display:none!important} *{caret-color:transparent!important}'});
 await page.screenshot({path:path.join(out,id+'.png')});
 const html=await page.evaluate(()=>{
  const css=[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n')}catch{return ''}}).join('\n');
  const body=document.body.cloneNode(true);body.querySelectorAll('script,nextjs-portal').forEach(x=>x.remove());
  const scrolls=[...document.querySelectorAll('*')].filter(e=>e.scrollTop>0).map(e=>({tag:e.tagName,cls:e.className,top:e.scrollTop}));
  return '<!doctype html><html><head><meta charset="utf-8"><style>'+css+'\n:root{--font-dm-sans:Arial}body{pointer-events:none}nextjs-portal,.toast{display:none!important}</style></head><body>'+body.innerHTML+'<script>const s='+JSON.stringify(scrolls)+';s.forEach(x=>{for(const e of document.getElementsByTagName(x.tag))if(e.className===x.cls)e.scrollTop=x.top});<\/script></body></html>';
 });
 await writeFile(path.join(out,id+'.html'),html);shots.push(id);console.log('Captured '+id);
}
const btn=(name)=>page.getByRole('button',{name,exact:true});
const click=async(name)=>{await btn(name).click();};
try{
 await page.goto('http://localhost:3127/');
 await page.getByRole('heading',{level:1}).waitFor();
 await shot('01-intro');
 await page.goto('http://localhost:3127/workspace');
 await page.getByText('Your $850 claim is ready to review.',{exact:true}).waitFor();
 await shot('02-next-step');

 await page.getByLabel('Message your assistant').fill('What is confirmed, and what is still missing?');
 await page.getByLabel('Message your assistant').press('Enter');
 await page.getByText('Northstar HR confirmed prior approval,',{exact:false}).waitFor();
 await shot('03-chat');
 await page.getByRole('button',{name:/My documents/}).click();
 await shot('03-documents');

 await page.locator('.document-row').filter({hasText:'Northstar · Benefits handbook'}).click();
 await click('Next page');
 await shot('03-evidence');
 await click('Close document');
 await click('Transition board');
 await shot('04-board');
 await page.getByText('Before leaving',{exact:true}).scrollIntoViewIfNeeded();
 await shot('04-stages');
 await page.getByRole('button',{name:/Review claim/}).first().click();
 await shot('05-claim');
 await page.locator('.claim-review').evaluate(e=>e.scrollIntoView({block:'center'}));
 await shot('05-review');
 await click('Approve & submit claim');
 await shot('05-submitted');
 await click('Send demo HR document request');
 await page.getByText('Latest from HR',{exact:true}).evaluate(e=>e.scrollIntoView({block:'start'}));
 await shot('06-request');
 await click('Use demo certificate');
 await page.locator('.email-preview').last().evaluate(e=>e.scrollIntoView({block:'center'}));
 await shot('07-reply');
 await click('Review attachment contents');
 await shot('07-certificate');
 await click('Close document');
 await page.getByRole('button',{name:'Approve & send reply',exact:true}).scrollIntoViewIfNeeded();
 await shot('07-approve');
 await click('Approve & send reply');
 await click('Send demo HR approval');
 await page.locator('.panel-content').evaluate(e=>e.scrollTop=0);
 await shot('08-approved');
 await click('Close task details');
 await shot('09-board');


 await writeFile(path.join(out,'capture-list.json'),JSON.stringify(shots));
}finally{await browser.close();}
