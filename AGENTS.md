# Bluegrass Bedding website

This is a static HTML/CSS/JavaScript website. Preserve the existing architecture and use pull requests for changes to main.

## Hard rule: no idle retry loops

If a merge, pull request, deployment, sync, pull, or other task fails or is blocked, you may try it at most 3 times in total, in case whatever was blocking it clears. After the third failed attempt, stop, report the status once, and wait for Robbie to respond or for genuinely new information to arrive (a new commit, comment, review, CI result, or event). Never retry on a schedule (for example hourly) for hours or days, and never re-attempt when nothing has changed and Robbie hasn't responded. Reason: an automation once retried every hour for 72 hours with no changes and burned tokens for nothing.

## Shared Git sync routine for Claude and Codex

This section records Robbie's authorized Mac workflow. It does not schedule jobs on other contributors' computers or replace this repository's task, review, testing, or release requirements.

- GitHub is the shared source for committed code. Chat histories, unpushed edits, ignored files, and local databases are not synchronized by this routine. Never add secrets to Git to make them sync; repositories intentionally holding credentials retain their stricter handling rules.
- Before coding, inspect the current branch, working-tree status, and worktrees; fetch the configured remote and identify its default branch (`main` or `master`). Follow an existing project's canonical-trunk and task-claim procedure where present. Do not rewrite a fork's remote or merge upstream into it as part of this routine.
- Keep the normal default-branch checkout clean. Update it only when idle and free of tracked/untracked changes and in-progress Git operations, using a fast-forward-only merge of its remote default branch. If dirty, divergent, on a task branch, or in active use, leave its files alone and report the blocker.
- Work on one isolated branch/worktree per task. Claude and Codex must not edit the same worktree concurrently. Resume an existing task through the project's prescribed workflow rather than replacing its branch. Use required claim tools in Morpheus-managed projects.
- After work, run the required checks, commit only the task's files, push the task branch, and open or update its PR. Report whether it is open or merged. Follow all project review and merge requirements; this routine does not authorize merging unrelated PRs or deploying applications.
- Robbie authorized one Mac sync every day at **8 a.m. America/New_York**. The existing Codex automation owns that schedule; these instructions alone do not install a scheduler. It fetches registered repositories and fast-forwards only clean, idle default-branch checkouts. Feature branches, active tasks, and unfinished edits are skipped. If activity cannot be established, fetch only. This is the narrow, explicit exception to any general prohibition on unsolicited timer jobs; do not create additional polling jobs.
- Never automatically stash, reset, clean, force-push, switch task branches, or discard files to make a sync succeed. The scheduled run must not install dependencies, restart services, or deploy. Report successful updates or new actionable failures once; stay quiet when already current or when a previously reported blocker is unchanged.
