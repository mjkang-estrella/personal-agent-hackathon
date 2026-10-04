"""Build a portable, deterministic HTML film using captured product UI and approved audio."""
import base64, json, shutil, sys, wave
from pathlib import Path
out=Path(sys.argv[1]); audio=Path(sys.argv[2]); source=Path(__file__).parent
texts=(source/'narration.txt').read_text().strip().split('\n\n')
titles=['Your next chapter, with fewer loose ends','A clear next step','Answers you can trace','The whole transition, organized','You review. Your agent follows through.','Follow-ups stay connected','Every outgoing action stays yours','Approved does not mean paid','From the first step to the follow-through','JobSwitch']
durations=[16,22,18,22,27,18,25,17,10,5]
shots=[[(0,'01-intro')],[(0,'02-next-step')],[(0,'03-chat'),(5,'03-documents'),(10,'03-evidence')],[(0,'04-board'),(8,'04-stages')],[(0,'05-claim'),(6,'05-review'),(20,'05-submitted')],[(0,'06-request')],[(0,'07-reply'),(7,'07-certificate'),(14,'07-approve')],[(0,'08-approved')],[(0,'09-board')],[]]
scenes=[];cursor=0
with wave.open(str(out/'narration.wav'),'wb') as dst:
 for i,(text,duration) in enumerate(zip(texts,durations)):
  with wave.open(str(audio/f'{i+1:02}.wav'),'rb') as src:
   channels,width,rate=src.getnchannels(),src.getsampwidth(),src.getframerate();data=src.readframes(src.getnframes())
  if i==0:dst.setnchannels(channels);dst.setsampwidth(width);dst.setframerate(rate)
  seconds=len(data)/(channels*width*rate)
  lead=min(.75,max(0,(duration-seconds)/2));tail=duration-lead-seconds
  if tail<0:raise ValueError(f'Scene {i+1} is too short')
  dst.writeframes(b'\0'*round(lead*rate)*channels*width);dst.writeframes(data);dst.writeframes(b'\0'*round(tail*rate)*channels*width)
  scenes.append(dict(start=cursor,duration=duration,title=titles[i],text=text,lead=lead,speech=seconds,shots=shots[i]));cursor+=duration
(out/'scenes.json').write_text(json.dumps(scenes,indent=2))
assets={name:'data:image/png;base64,'+base64.b64encode((out/'shots'/f'{name}.png').read_bytes()).decode() for name in {name for scene in scenes for _,name in scene['shots']}}
html=(source/'player.html').read_text().replace('__ASSETS__',json.dumps(assets)).replace('__SCENES__',json.dumps(scenes)).replace('src="narration.wav"','src="data:audio/wav;base64,'+base64.b64encode((out/'narration.wav').read_bytes()).decode()+'"')
(out/'index.html').write_text(html)
print('Built HTML film and narration: 180 seconds')
