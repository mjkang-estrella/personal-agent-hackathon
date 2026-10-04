"""Render actual browser recordings plus timed AI narration into a 180s demo.
Usage: python3 render.py /absolute/artifacts /absolute/ffmpeg
Requires raw recordings, audio MP3s, and word timing JSONs from transcribe.mjs.
"""
import json, pathlib, re, subprocess, sys
ROOT=pathlib.Path(sys.argv[1]).resolve(); FF=sys.argv[2]
STORY=json.loads((pathlib.Path(__file__).parent/'story.json').read_text())
OUT=ROOT/'render';OUT.mkdir(exist_ok=True)
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
SERIF='/System/Library/Fonts/Supplemental/Georgia.ttf'
def run(args):
    subprocess.run([FF,'-y','-hide_banner','-loglevel','error',*args],check=True)
def duration(file):
    r=subprocess.run([FF,'-i',str(file)],capture_output=True,text=True)
    m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',r.stderr)
    if not m: raise ValueError(f'Cannot read duration: {file}')
    return int(m[1])*3600+int(m[2])*60+float(m[3])
def clock(t):
    cs=round(t*100);return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'
def srtclock(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,36,&H00FFFFFF,&H00FFFFFF,&H00201912,&H00201912,0,0,0,0,100,100,0,0,1,0,0,2,120,120,27,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
lengths=[duration(ROOT/'audio'/f'{s["id"]}.mp3') for s in STORY]
pad=(180-sum(lengths))/len(STORY)
if pad<0.55: raise ValueError('Narration too long for comfortable 180-second edit')
files=['01-landing','02-board-better','03-evidence','04-case','05-missing','06-receipt','07-review','08-received','09-approved',None]
# Selected recording windows remove operator pauses; all UI content is original.
windows=[(0,14.9),(4,None),(0,15),(0,None),(0,10),(0,None),(0,None),(0,None),(0,None),(0,None)]
all_captions=[];offset=0;parts=[];manifest=[]
for i,(s,audio_len) in enumerate(zip(STORY,lengths)):
    target_frames=round((audio_len+pad)*30) if i<9 else 5400-sum(x['frames'] for x in manifest)
    d=target_frames/30
    timing=json.loads((ROOT/'audio'/f'{s["id"]}.timing.json').read_text())
    words=timing['words']
    punctuated=timing['text'].split()
    if len(punctuated)==len(words):
        words=[dict(w,word=t) for w,t in zip(words,punctuated)]
    captions=[];group=[]
    for j,w in enumerate(words):
        group.append(w)
        text=' '.join(v['word'] for v in group)
        if len(text)>65 or len(group)>=11 or (len(group)>=4 and w['word'].endswith(('.', '?', '!'))) or j==len(words)-1:
            captions.append((group[0]['start']+.35,min(group[-1]['end']+.5,d-.15),text));group=[]
    ass=header
    for start,end,text in captions:
        ass+=f'Dialogue: 0,{clock(start)},{clock(end)},Default,,0,0,0,,{text}\n'
        all_captions.append((start+offset,end+offset,text))
    subtitle=OUT/f'{s["id"]}.ass';subtitle.write_text(ass)
    title=OUT/f'{s["id"]}.title.txt';title.write_text(f'{i+1:02}   {s["title"]}')
    if files[i]:
        source=ROOT/'raw'/f'{files[i]}.webm';start,end=windows[i];end=end or duration(source)
        speed=min(1,(d-.3)/(end-start))
        inp=['-ss',str(start),'-t',str(end-start),'-i',str(source)]
        visual=f'setpts={speed}*(PTS-STARTPTS),fps=30,scale=1600:900,pad=1920:1080:160:70:color=0xf5f3ee,tpad=stop_mode=clone:stop_duration={d}'
    else:
        inp=['-f','lavfi','-i',f'color=c=0xf5f3ee:s=1920x1080:r=30:d={d}']
        visual=f"drawtext=fontfile='{BOLD}':text='jobswitch':fontsize=58:fontcolor=0x075de0:x=160:y=185,drawtext=fontfile='{SERIF}':text='Your next chapter.':fontsize=112:fontcolor=0x202936:x=160:y=330,drawtext=fontfile='{SERIF}':text='Handled.':fontsize=112:fontcolor=0x202936:x=160:y=465,drawtext=fontfile='{FONT}':text='Understand the policy.  Review the action.  Follow it through.':fontsize=34:fontcolor=0x526170:x=160:y=670,drawtext=fontfile='{FONT}':text='jobswitch-sooty.vercel.app':fontsize=28:fontcolor=0x075de0:x=160:y=770,drawtext=fontfile='{FONT}':text='AI-generated narration  |  Fictional demo data  |  Simulated practice email':fontsize=23:fontcolor=0x526170:x=160:y=885"
    badge='FICTIONAL DEMO  /  EDITED FOR TIME' if i<3 else 'SIMULATED PRACTICE CASE  /  EDITED FOR TIME'
    if i==9:badge='YOUR DOCUMENTS. YOUR DECISIONS.'
    visual+=f",drawbox=x=0:y=980:w=1920:h=100:color=0x182536:t=fill,drawtext=fontfile='{BOLD}':textfile='{title}':fontsize=28:fontcolor=0x202936:x=70:y=23,drawtext=fontfile='{FONT}':text='{badge}':fontsize=19:fontcolor=0x526170:x=w-tw-70:y=29,subtitles='{subtitle}',fade=t=in:st=0:d=0.15,fade=t=out:st={d-.15}:d=0.15"
    dest=OUT/f'{s["id"]}.mp4'
    run([*inp,'-i',str(ROOT/'audio'/f'{s["id"]}.mp3'),'-vf',visual,'-af','adelay=350|350,apad,loudnorm=I=-16:TP=-1.5:LRA=11','-t',str(d),'-r','30','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(dest)])
    parts.append(dest);manifest.append({'id':s['id'],'frames':target_frames,'duration':d,'start':offset});offset+=d
    print(f'{s["id"]} rendered ({d:.2f}s)',flush=True)
concat=OUT/'concat.txt';concat.write_text(''.join(f"file '{p}'\n" for p in parts))
run(['-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(ROOT/'JobSwitch-3min-demo.mp4')])
(ROOT/'JobSwitch-3min-demo.srt').write_text('\n'.join(f'{i+1}\n{srtclock(a)} --> {srtclock(b)}\n{t}\n' for i,(a,b,t) in enumerate(all_captions)))
(ROOT/'edit-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Completed {offset:.3f}s',flush=True)
