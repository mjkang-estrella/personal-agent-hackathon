# JobSwitch HTML film

A 180-second, local-only product walkthrough using the user's exact approved
English narration and Marin voice (sample A). This is a **fixture-driven visual
rehearsal**, not evidence that Kernel, AgentMail, or HR ran live. The film labels
simulated actions throughout. Submitted, approved, and paid remain separate.

The capture script drives the real Dashboard component, with API responses
replaced only inside an isolated browser context. It captures sixteen product
states as PNGs and read-only HTML snapshots. The player sequences those captures
with subtle camera motion, headings, narration, and approximate sentence captions.
It is intentionally a deterministic visual edit, not an uninterrupted screen recording.
The application, server APIs, authentication, and production demo are unchanged.

## Generate

Prerequisites: `npm ci`, Python 3, FFmpeg with libx264, and a Playwright Chromium
browser (`npx playwright install chromium`). Optionally set `CHROME_PATH` to an
existing Chrome for Testing executable and `FFMPEG` to an FFmpeg binary.

Use an output folder **outside the repository**. Keep original narration WAVs
`01.wav` through `10.wav` in a separate audio folder. These are the ten paragraphs
in `narration.txt`, exactly as approved; generation is separate and never rerun by
these scripts.

```sh
npm run dev -- --port 3127
# In another terminal, from this repository:
node --import tsx scripts/html-film/fixture.ts /absolute/output/fixture.json
node scripts/html-film/capture.mjs /absolute/output/shots /absolute/output/fixture.json
python3 scripts/html-film/assemble.py /absolute/output /absolute/narration-A
python3 -m http.server 3128 --bind 127.0.0.1 --directory /absolute/output
# In another terminal:
node scripts/html-film/render.mjs /absolute/output
```

Open http://localhost:3128 for the HTML player. Play/Pause and the scrubber work
with the narration; the end card identifies AI-generated speech. The MP4 output
is `JobSwitch-3min-demo.mp4`, 1920×1080 H.264 with AAC audio. HTML capture rendering
runs at 10 distinct frames per second, encoded at 30fps. Captions use proportional
sentence timing, not word-level forced alignment. The final HTML embeds its images, manifest, and audio and can be opened directly
as a file. The local HTTP server is only needed by the renderer. No cloud service
is required.

## Storyboard

| Time | Scene | Product view |
| --- | --- | --- |
| 0:00–0:16 | Introduction | Current landing page |
| 0:16–0:38 | A concrete next step | Chat arrival: $850 ready to review |
| 0:38–0:56 | Evidence and conversation | Chat, documents, exact policy page |
| 0:56–1:18 | Wider transition | Board and Before / Between / After |
| 1:18–1:45 | Review and submit | Policy evidence, exact claim, waiting state |
| 1:45–2:03 | HR follow-up | Simulated certificate request |
| 2:03–2:28 | Review the reply | Recipient, message, certificate, approval |
| 2:28–2:45 | Accurate outcome | Approved, unpaid |
| 2:45–2:55 | Recap | Board with tracked outcome |
| 2:55–3:00 | Close | JobSwitch end card |

`assemble.py` measures the input WAVs and fails if a clip exceeds its allotted
scene. Speech stays at its original speed. Remaining time becomes reading pauses.
The player and renderer use the same scene schedule.

## Validation

```sh
node --test scripts/html-film/mock.test.mjs
node scripts/html-film/verify.mjs /absolute/output
```

The verifier opens the final HTML from a `file:` URL with HTTP blocked, checks all
ten scenes and the 180-second audio, and saves representative frames. For the
application build in a checkout without runtime credentials, use explicit build
placeholders (no provider calls are exercised):

```sh
NEON_AI_GATEWAY_TOKEN=build-placeholder NEON_AI_GATEWAY_BASE_URL=https://example.invalid npm run build
```
