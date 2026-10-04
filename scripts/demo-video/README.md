# Three-minute JobSwitch demo

English narration uses OpenAI `gpt-4o-mini-tts`, voice `marin` (the user-selected conversational sample A). `story.json` is the editable script. This production uses authentic browser recordings of the deployed application. It does not manufacture UI results.

## Story and scope

1. Landing and the three-stage transition board.
2. The fictional $850 learning claim, its approval boundary, and exact policy page.
3. A **separate $240 practice expense**, explicitly introduced as a simulated case: missing receipt → recovered receipt → reviewed draft → simulated submission → acknowledgment → approved/unpaid.
4. Branded closing card and AI narration disclosure.

The practice emails remain inside JobSwitch. No real email, external claim submission, or provider connection is exercised by this video. The Kernel HR portal is **not** shown; do not describe this cut as a live portal-submission demonstration. Loading/operator pauses are condensed and the video is labeled edited for time. The deployed application can change independently of this branch.

## Assets and reproduction

Keep audio, browser recordings, word timing data, and rendered media outside the repository. The original production directory is `/Users/nolanliang/Documents/JobSwitch-demo`.

Prerequisites: Node with native `fetch`, Python 3, FFmpeg with libass/libfreetype, and agent-browser. The renderer uses macOS Arial and Georgia fonts; update font constants on other systems. Set `OPENAI_API_KEY` through a local environment file; do not paste it into commands or commit it.

```sh
node --env-file=/path/to/local.env scripts/demo-video/narrate.mjs /path/to/assets/audio
node --env-file=/path/to/local.env scripts/demo-video/transcribe.mjs /path/to/assets/audio
python3 scripts/demo-video/render.py /path/to/assets /path/to/ffmpeg
```

Audio and word timing files are cached by scene ID. After editing narration, move the corresponding MP3 **and** timing JSON out of the audio directory before regenerating. API generation incurs normal provider charges.

The renderer measures the narration, distributes reading pauses, renders 5,400 video frames at 30fps, normalizes narration, burns in captions, and creates an editable SRT. Word timestamps come from transcription of the generated audio. Check caption transcription against the script before publishing.

## Capture recipe

Use a dedicated browser session, a 1600×900 viewport, and synthetic workspaces. Inspect each current page snapshot before interacting; do not reuse stale element IDs. Start/stop `agent-browser record` around each scene. The expected files under `raw/` are:

- `01-landing.webm`: homepage → Explore the demo.
- `02-board-better.webm`: Transition board → close chat → scroll to show all three stage headings and their tasks.
- `03-evidence.webm`: exact policy-page evidence, then close the document.
- `04-case.webm`: Settings → practice case “An unclaimed expense after company access is disabled” → Inbox → initial employer email.
- `05-missing.webm`: related task showing the missing receipt and source evidence.
- `06-receipt.webm`: Deliver the next email → Inbox → recovered receipt.
- `07-review.webm`: Review the draft → inspect attachment → return → approve the **in-app simulated** send.
- `08-received.webm`: Deliver the next email → employer acknowledgment.
- `09-approved.webm`: final simulated approval → task with Approved · unpaid.

Wait for real application results, not a guessed delay. If the agent pauses after a service error, use Retry and wait for recovery. Do not edit application state to fake success. External demo HR submission and real AgentMail messages require separately approved payloads and are outside this capture recipe. Use the render script's recording windows to remove operator waits after reviewing contact sheets.

## Outputs

- `JobSwitch-3min-demo.mp4`: 1920×1080, H.264/AAC, captions included.
- `JobSwitch-3min-demo.srt`: editable subtitle track.
- `edit-manifest.json`: measured chapter boundaries.
- `audio/`: reusable per-scene narration and timing files.

The output is a first complete edit for user review; product footage and narration should be rechecked after any future application changes.

## Validation of the initial cut

The deployed UI was inspected with agent-browser because T3 was unavailable. The actual practice flow reached Approved · unpaid with a matching employer email. An agent service interruption recovered through Retry before completion. No external messages were sent. Representative frames were inspected across the video, generated speech was transcribed to check content and caption timing, and the MP4 was checked for H.264/AAC streams and a 180-second video timeline. This does not replace a human listening review of delivery and pronunciation.

Repository validation: `npm run typecheck`, all 87 tests, and `npm run build` passed. The build used placeholder Neon gateway configuration because this checkout had no gateway credentials; it made no live model calls. Audio API calls and browser product execution were verified separately. Initial build invocations failed on Node worker environment flags and missing gateway configuration, then passed with a clean build invocation and placeholders.
