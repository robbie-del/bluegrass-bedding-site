# Bluegrass Bedding website

This is a static HTML/CSS/JavaScript website. Preserve the existing architecture and use pull requests for changes to main.

## Shared Git sync routine for Claude and Codex

- GitHub is the shared source for committed code. Conversations, secrets, databases, and unpushed edits are not synchronized by Git.
- Before each coding task, identify the repository, read its agent instructions, inspect `git status --short --branch` and `git worktree list`, and fetch origin. If the network is unavailable, disclose that freshness could not be verified.
- Keep the normal Mac repository folder on a clean `main`. Before starting work, when no other task is using that checkout, update it with `git merge --ff-only origin/main`. Stop the update if the folder has tracked or untracked changes, is on another branch, has diverged, or has a merge/rebase in progress. Never automatically stash, reset, clean, discard, or force-push to make synchronization succeed.
- Give each coding task its own branch and Git worktree based on freshly fetched `origin/main`. When continuing an existing PR, use its branch and inspect its relationship to main rather than creating a replacement. Do not let Claude and Codex edit the same worktree concurrently. Keep task worktrees outside the normal repository folder.
- Finish by running the relevant checks, committing only the task's changes, pushing its branch, and opening or updating its PR. Do not commit secrets, local databases, logs, or unrelated work. Report the PR link and whether it is open or merged. An open PR is not part of main.
- Merging and deploying are separate from saving work: do not automatically merge a PR or deploy unless the user authorized it. After an authorized merge, fast-forward the clean, idle Mac main checkout and verify its HEAD matches origin/main. If it cannot be updated safely, state the blocker once.
- Do not launch a background pull into an active worktree. The user authorized one daily repository check at 8 a.m. America/New_York on 2026-09-17. It may fetch and report newly actionable drift; it must not rewrite working files, merge PRs, or create additional polling jobs. Stay quiet when nothing meaningful changes.
