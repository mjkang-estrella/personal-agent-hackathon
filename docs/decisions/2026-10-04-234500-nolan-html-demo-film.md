# Fixture-driven HTML demonstration film

- Date: 2026-10-04 (UTC)
- Status: accepted
- Owner: Codex, implementing Nolan's video request

## Context

Nolan requested a three-minute English product video, selected voice A (Marin),
supplied ten exact narration paragraphs, and asked to extract product UI into an
automated HTML demo populated with fictional data. Other active chats are making
separate recordings; this work uses its own branch, checkout, and output folder.

## Decision

Use Playwright to drive the existing product with a browser-local response fixture.
Capture real rendered UI states, then sequence them in a standalone HTML player
with the already generated narration. Export the same timeline to an MP4. Keep
all film tooling under `scripts/html-film`; do not add a public app route or alter
production UI, state, approval checks, or APIs. Keep generated media outside Git.

This is an agent implementation choice within the user's requested scope. Every
frame is labeled as fictional with simulated actions; the narration is unchanged.
The film is an edited visual walkthrough of fixed states, not a live integration
test. No external submissions or email delivery occur during capture.

## Rationale

Fixed fixtures and deterministic timing make repeatable edits possible without
service latency, real side effects, or changes to the user-approved narration.
Using actual rendered components preserves the current product appearance.

## Consequences

The film does not validate provider integrations. Product UI changes may require
updating capture locators and regenerating screenshots. Sentence captions are
approximate. Playwright is a development dependency; FFmpeg remains an external
rendering prerequisite. The scripts run locally; the final HTML is self-contained and also opens offline.

## Links

- [Film instructions and storyboard](../../scripts/html-film/README.md)
- [Chat on every page](2026-10-04-223335-codex-chat-on-every-page.md)
