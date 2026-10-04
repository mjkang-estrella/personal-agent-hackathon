#!/usr/bin/env python3
"""Build synthetic PDFs, MIME email, staged fixtures and an offline preview. No network."""
import hashlib
import html
import json
import re
import zipfile
from datetime import datetime
from email import policy
from email.message import EmailMessage
from email.utils import format_datetime, formataddr
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

ROOT=Path(__file__).resolve().parent
SOURCE=json.loads((ROOT/'source/scenarios.json').read_text())
STAMP='2026-10-04T20:00:00Z'
NOTICE='FICTIONAL DEMO DATA - NOT A REAL EMPLOYMENT RECORD'
rl_config.invariant=1

def dump(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')

def make_pdf(path,doc,scenario):
 brand={'previous':'NORTHSTAR STUDIO','next':'ORBIT LABS','personal':'PERSONAL RECORDS'}[doc['employer']]
 accent={'previous':'#185C50','next':'#344DB2','personal':'#68573C'}[doc['employer']]
 styles={
  'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=23,leading=28,textColor=colors.HexColor('#152936'),spaceAfter=10),
  'meta':ParagraphStyle('meta',fontName='Helvetica',fontSize=9,leading=13,textColor=colors.HexColor('#526674'),spaceAfter=16),
  'heading':ParagraphStyle('heading',fontName='Helvetica-Bold',fontSize=10,leading=14,textColor=colors.HexColor(accent),spaceBefore=12,spaceAfter=5),
  'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=16,textColor=colors.HexColor('#233642'),spaceAfter=4),
 }
 def frame(c,d):
  c.saveState();w,h=d.pagesize
  c.setFillColor(colors.HexColor(accent));c.rect(0,h-15,w,15,fill=1,stroke=0)
  c.setFont('Helvetica-Bold',11);c.drawString(48,h-49,brand)
  c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#62737E'));c.drawRightString(w-48,h-49,'JOBSWITCH / SYNTHETIC ATTACHMENT')
  c.setStrokeColor(colors.HexColor('#DAE1E5'));c.line(48,64,w-48,64)
  c.setFont('Helvetica-Bold',7);c.drawString(48,48,NOTICE)
  c.setFont('Helvetica',7);c.drawString(48,35,doc['id']+' | '+scenario['id']);c.drawRightString(w-48,35,f'Page {d.page}')
  c.restoreState()
 story=[Paragraph(escape(doc['title'].split(' | ',1)[-1]),styles['title']),Paragraph(escape(f"Issued {doc['issuedAt']} | Alex Morgan | Document {doc['id']}"),styles['meta'])]
 for section in doc['sections']:
  story.append(KeepTogether([Paragraph(escape(section['heading']),styles['heading']),Paragraph(escape(section['text']),styles['body'])]))
 pdf=SimpleDocTemplate(str(path),pagesize=(612,792),leftMargin=48,rightMargin=48,topMargin=86,bottomMargin=84,title=doc['title'],author='JobSwitch Synthetic Demo',subject=NOTICE,creator='JobSwitch demo-data/build.py')
 pdf.build(story,onFirstPage=frame,onLaterPages=frame)

def sender(key):return formataddr(tuple(SOURCE['people'][key]))
def message_id(id):return f'<{id}@jobswitch.example>'
def render_body(m):
 return m['body']+'\n\n---\nFictional JobSwitch demo. All people, policies and events in this message are synthetic. Addresses use reserved .example domains. Do not deliver to real people.\n'

CSS='''
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#F3F5F7;color:#172B37;font:16px/1.6 system-ui,-apple-system,sans-serif}main{max-width:1160px;margin:auto;padding:36px 24px 70px}a{color:#2859A0;text-decoration:none}a:hover{text-decoration:underline}header.hero{background:#152E3E;color:#fff;padding:36px;border-radius:16px;margin-bottom:24px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:#8ED6C4}h1{font-size:34px;line-height:1.2;margin:10px 0 16px}h2{font-size:24px;margin:34px 0 12px}h3{font-size:19px;margin:8px 0}p{margin:10px 0}.sub{color:#596D79;font-size:14px}.hero .sub{color:#CAD9E2}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card,article,.note{background:white;border:1px solid #D8E1E7;padding:24px;border-radius:12px}.pill{display:inline-block;background:#EDF2F7;border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 6px 2px 0}.mailhead{background:#F0F4F7;border-radius:8px;padding:14px;font-size:13px;overflow-wrap:anywhere}.body{white-space:pre-wrap;font:15px/1.7 system-ui,sans-serif;overflow-wrap:anywhere}.attachment{display:inline-block;border:1px solid #CFDBE4;border-radius:6px;padding:8px 12px;margin:5px 8px 5px 0;font-size:13px}details{margin-top:14px}summary{cursor:pointer;font-weight:600}blockquote{margin:12px 0;padding:10px 15px;border-left:3px solid #649283;background:#F4F8F6;font-size:14px}nav{display:flex;gap:14px;flex-wrap:wrap;margin:20px 0}.timeline article{margin:18px 0}.expect{border-left:4px solid #2D7564;padding:10px 16px;margin:15px 0;background:#F2F8F5}.warning{border-left-color:#BB8A30;background:#FFF9ED}code{font-size:13px;overflow-wrap:anywhere}ul{padding-left:20px}footer{margin-top:30px;color:#667D8A;font-size:12px}button{padding:8px 14px;border:1px solid #CCD7DF;border-radius:8px;background:white;color:#213F54;cursor:pointer}button[aria-pressed=true]{background:#213F54;color:white}.hidden{display:none!important}@media(max-width:720px){.grid{grid-template-columns:1fr}main{padding:18px 12px}.hero{padding:24px!important}h1{font-size:28px}article,.card{padding:18px}}
'''
def page(title,body):return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+CSS+'</style></head><body><main>'+body+'</main></body></html>'

manifest={'schemaVersion':'1.0','fictional':True,'profile':SOURCE['scenarios'][0]['profile'],'reviewedBase':SOURCE['canonicalRepositoryBase'],'scenarios':[]}
cards=[]
for s in SOURCE['scenarios']:
 directory=ROOT/'scenarios'/s['id'];(directory/'attachments').mkdir(parents=True,exist_ok=True);(directory/'emails').mkdir(exist_ok=True)
 docs={};docmeta={}
 for d in s['documents']:
  file=directory/'attachments'/(d['id']+'.pdf');make_pdf(file,d,s)
  pages=[p.extract_text() for p in PdfReader(file).pages]
  docs[d['id']]={'id':d['id'],'name':file.name,'employer':d['employer'],'kind':d['kind'],'pages':pages,'addedAt':STAMP}
  docmeta[d['id']]={'id':d['id'],'title':d['title'],'path':'attachments/'+file.name,'mimeType':'application/pdf','bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pages':len(pages)}
 messages=[]
 for m in s['messages']:
  msg=EmailMessage(policy=policy.SMTP)
  msg['From']=sender(m['sender']);msg['To']=', '.join(sender(t) for t in m['to']);msg['Subject']=m['subject'];msg['Date']=format_datetime(datetime.fromisoformat(m['date']));msg['Message-ID']=message_id(m['id'])
  msg['X-JobSwitch-Synthetic']='true';msg['X-JobSwitch-Scenario']=s['id'];msg['X-JobSwitch-Stage']=m['stage']
  if m['inReplyTo']:
   msg['In-Reply-To']=message_id(m['inReplyTo']);msg['References']=message_id(m['inReplyTo'])
  body=render_body(m);msg.set_content(body)
  msg.add_alternative('<html lang="en"><body><div style="font-family:Arial;max-width:680px">'+''.join('<p>'+html.escape(p).replace('\n','<br>')+'</p>' for p in body.split('\n\n'))+'</div></body></html>',subtype='html')
  for a in m['attachments']:
   path=directory/docmeta[a]['path'];msg.add_attachment(path.read_bytes(),maintype='application',subtype='pdf',filename=path.name)
  for i,part in enumerate(msg.walk()):
   if part.is_multipart():part.set_boundary('jobswitch-'+m['id']+'-'+str(i))
  (directory/'emails'/(m['id']+'.eml')).write_bytes(msg.as_bytes())
  text=f"From: {sender(m['sender'])}\nTo: {', '.join(sender(t) for t in m['to'])}\nDate: {m['date']}\nSubject: {m['subject']}\nMessage-ID: {message_id(m['id'])}\nAttachments: {', '.join(docmeta[a]['path'] for a in m['attachments']) or '(none)'}\n\n{body}"
  (directory/'emails'/(m['id']+'.txt')).write_text(text)
  docs[m['id']]={'id':m['id'],'name':m['subject']+'.txt','employer':'personal' if m['direction']=='outbound' else ('previous' if m['sender'] in ['northstar','it','payroll','expenses'] else 'next'),'kind':'other','pages':[text],'addedAt':m['date']}
  messages.append({**m,'from':{'name':SOURCE['people'][m['sender']][0],'address':SOURCE['people'][m['sender']][1]},'recipients':[{'name':SOURCE['people'][t][0],'address':SOURCE['people'][t][1]} for t in m['to']],'messageId':message_id(m['id']),'body':body,'emlPath':'emails/'+m['id']+'.eml','textPath':'emails/'+m['id']+'.txt','attachments':[docmeta[a] for a in m['attachments']]})
 dump(directory/'messages.json',messages)
 stages=[];available=[];visible=[]
 for st in s['steps']:
  incoming=[m for m in s['messages'] if m['stage']==st['id']]
  release=[]
  for m in incoming:
   for id in [m['id']]+m['attachments']:
    if id not in available:available.append(id);release.append(id)
   visible.append(m['id'])
  bundle={'schemaVersion':'1.0','scenarioId':s['id'],'stage':st['id'],'initialProfile':s['profile'],'visibleMessageIds':list(visible),'documents':[docs[id] for id in available]}
  bundle_path='stages/'+st['id']+'.json';dump(directory/bundle_path,bundle)
  stages.append({**st,'releaseMessageIds':[m['id'] for m in incoming],'releaseDocumentIds':release,'inputBundle':bundle_path,'requiresUserApproval':any(m['direction']=='outbound' for m in incoming)})
 sm={k:s[k] for k in ['id','title','summary','inspiration','initialClock','profile']};sm.update({'schemaVersion':'1.0','fictional':True,'independentScenario':True,'documents':list(docmeta.values()),'messagesFile':'messages.json','steps':stages,'initialBundle':'stages/initial.json'})
 dump(directory/'scenario.json',sm)
 readme=f"# {s['title']}\n\n{s['summary']}\n\n**Synthetic scenario. Run independently; do not combine all eight cases into one workspace.**\n\n- Employee: Alex Morgan\n- Previous employer: Northstar Studio\n- Next employer: Orbit Labs\n- Default departure: 2026-10-16\n- Default start: 2026-10-19\n- Initial simulated time: {s['initialClock']}\n\n## Origin and scope\n\n{s['inspiration']}\n\nOnly workflow patterns inspired these records. Every message, date, policy and attachment was newly authored. No private source email or PDF is bundled.\n\n## Replay\n\nLoad only `stages/initial.json` first. Each subsequent stage is a cumulative input snapshot; replace the input set or upsert by document ID, never append snapshots blindly. `initialProfile` is the starting profile, not an instruction to revert later date changes. These are adapter-ready inputs, not complete `Workspace` objects or a supported import API.\n\n"
 for n,st in enumerate(stages):
  readme+=f"### {n}. {st['title']}\n\n- Stage: `{st['id']}`\n- Trigger: {st['trigger']}\n- Expected: {st['expected']}\n- Must not: {st['mustNot']}\n- Input bundle: [`{st['inputBundle']}`]({st['inputBundle']})\n"
  for e in st['evidence']:readme+=f"- Evidence `{e['sourceId']}`: \"{e['quote']}\"\n"
  readme+='\n'
 readme+='## Email and attachments\n\nOpen [index.html](index.html) locally for the staged viewer. Each `.eml` contains its listed PDF attachments as MIME parts. TXT copies are for review or current app upload; EML/JSON require an adapter. No messages are sent by this package.\n'
 (directory/'README.md').write_text(readme)
 body=f'<nav><a href="../../index.html">All scenarios</a><a href="README.md">Replay guide</a><a href="scenario.json">Scenario JSON</a></nav><header class="hero"><div class="eyebrow">{s["id"]} / Synthetic case</div><h1>{html.escape(s["title"])}</h1><p>{html.escape(s["summary"])}</p><p class="sub">Alex Morgan · Northstar Studio → Orbit Labs · Independent replay</p></header><div class="note"><strong>Start with the initial stage.</strong> Future messages and attachments are hidden below until you select a later stage. The full dataset is on disk for developers; the agent must receive only the chosen input bundle.</div><nav id="stage-controls">'
 for i,st in enumerate(stages):body+=f'<button data-stage="{i}" aria-pressed="{str(i==0).lower()}">{i}. {html.escape(st["title"])}</button>'
 body+='</nav><div class="timeline">'
 for i,st in enumerate(stages):
  body+=f'<section data-release="{i}" class="{"hidden" if i else ""}"><h2>{i}. {html.escape(st["title"])}</h2><div class="expect"><strong>Expected:</strong> {html.escape(st["expected"])}<br><strong>Do not:</strong> {html.escape(st["mustNot"])}<br><a href="{st["inputBundle"]}">Developer input for this stage</a></div>'
  for m in messages:
   if m['stage']!=st['id']:continue
   body+=f'<article><span class="pill">{m["direction"]}</span><span class="pill">{html.escape(m["date"])}</span><h3>{html.escape(m["subject"])}</h3><div class="mailhead">From: {html.escape(sender(m["sender"]))}<br>To: {html.escape(", ".join(sender(t) for t in m["to"]))}</div><pre class="body">{html.escape(m["body"])}</pre>'
   for a in m['attachments']:body+=f'<a class="attachment" href="{a["path"]}">PDF · {html.escape(a["title"])}</a>'
   body+=f'<p><a href="{m["emlPath"]}" download>Download email with attachments (.eml)</a> · <a href="{m["textPath"]}">Plain text</a></p></article>'
  body+='</section>'
 body+='</div><footer>'+NOTICE+'</footer><script>document.querySelectorAll("[data-stage]").forEach(b=>b.addEventListener("click",()=>{const n=Number(b.dataset.stage);document.querySelectorAll("[data-release]").forEach(e=>e.classList.toggle("hidden",Number(e.dataset.release)>n));document.querySelectorAll("[data-stage]").forEach(e=>e.setAttribute("aria-pressed",String(e===b)));}));</script>'
 (directory/'index.html').write_text(page(s['title'],body))
 entry={'id':s['id'],'title':s['title'],'summary':s['summary'],'path':'scenarios/'+s['id'],'messageCount':len(messages),'pdfCount':len(docs)-len(messages),'stageCount':len(stages)}
 manifest['scenarios'].append(entry)
 cards.append(f'<div class="card"><div class="eyebrow" style="color:#286C5F">{s["id"]}</div><h3><a href="{entry["path"]}/index.html">{html.escape(s["title"])}</a></h3><p>{html.escape(s["summary"])}</p><span class="pill">{len(messages)} emails</span><span class="pill">{entry["pdfCount"]} PDFs</span><p><a href="{entry["path"]}/index.html">Open scenario →</a></p></div>')
dump(ROOT/'manifest.json',manifest)
index='<header class="hero"><div class="eyebrow">JobSwitch / Team demo library</div><h1>Eight transitions worth following through.</h1><p>42 synthetic emails. 16 PDF attachments. One consistent employee and two fictional employers.</p><p class="sub">Alex Morgan · Northstar Studio → Orbit Labs</p></header><div class="note"><strong>Use one case at a time.</strong> Each story starts with incomplete information and releases follow-ups in stages. These files do not change the live app or send email. <a href="README.md">Read the integration guide</a>.</div><nav><a href="jobswitch-demo-data.zip" download>Download complete ZIP</a><a href="manifest.json">Developer manifest</a><a href="source/scenarios.json">Editable source</a></nav><div class="grid">'+''.join(cards)+'</div><footer>'+NOTICE+' · Reserved .example addresses · English-only dataset</footer>'
(ROOT/'index.html').write_text(page('JobSwitch | Eight synthetic scenarios',index))
# Stable archive metadata makes a rebuild reviewable. The archive never includes itself.
with zipfile.ZipFile(ROOT/'jobswitch-demo-data.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(ROOT.rglob('*')):
  if not p.is_file() or p.suffix=='.zip' or '__pycache__' in p.parts:continue
  info=zipfile.ZipInfo('demo-data/'+p.relative_to(ROOT).as_posix(),date_time=(2026,10,4,20,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
  z.writestr(info,p.read_bytes())
print('Built 8 scenarios, 42 emails, 16 PDFs, staged inputs and ZIP.')
