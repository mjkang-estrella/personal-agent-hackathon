# Merge completed feature PRs and deploy a personal copy

- Date: 2026-10-04
- Status: accepted
- Owner: Nolan / user-directed workflow

## Context

Nolan requested a separate Vercel deployment under his account and explicitly instructed that each feature use a branch and that its PR be merged when the feature is finished.

## Decision

Create a task branch for each feature, review its diff, run relevant checks, commit and push it, and merge its PR when complete. This is standing user authorization; a separate routine merge confirmation is unnecessary. Respect required GitHub checks and reviews without bypassing them. Do not merge incomplete or unrelated work.

Deploy the current MVP to the jobswitch project in Nolan's Hobby account (scope `nolan-s`, signed-in user `n5liang-8090`) on Vercel, using the existing authorized demo services. The database and demo HR portal remain shared with the existing deployment. Store secrets only in ignored local configuration and server-side Vercel environment variables. Use a distinct session signing secret for the new deployment.

## Rationale

Feature branches and PRs retain reviewable history while allowing completed work to be integrated promptly. The personal Vercel project gives Nolan control over his deployment.

## Consequences

This supersedes only the no-automatic-merge portion of the [original workflow decision](2026-10-04-team-git-workflow.md). Deployment remains separately authorized; this request authorizes the initial personal deployment. No database migrations or demo messages are necessary for this deployment.

## Links

- [Repository instructions](../../AGENTS.md)
- [MVP architecture](2026-10-04-190000-codex-jobswitch-mvp.md)
