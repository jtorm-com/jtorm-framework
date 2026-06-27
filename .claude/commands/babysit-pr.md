---
description: Drive a GitHub PR through the Codex review gate — poll, triage, fix valid findings, rebut false positives, resolve, re-poll until Codex returns a clean thumbs-up.
argument-hint: <pr-number>
---

# /babysit-pr — Codex review gate loop

Drive PR **#$1** on `jtorm-com/jtorm-framework` until Codex's automated review passes with a clean
👍 against the current head, then report it gate-ready. **Codex review is the quality gate**: the PR
is not mergeable until Codex's latest review (against the current head commit) has no valid
unresolved findings **and** the `test` CI check is green.

Use `gh ... --repo jtorm-com/jtorm-framework` for every call (local `origin` is GitLab).

## Loop — repeat until clean
1. **Ensure Codex is triggered.** Look for a Codex review/summary tied to the **current head SHA**
   (`gh pr view $1 --json reviews,comments,headRefOid,statusCheckRollup`). If there's none ~3–5 min
   after the latest push, or the only Codex review is against an **older** SHA, post a comment
   `@codex review` to (re)trigger:
   `gh pr comment $1 --repo jtorm-com/jtorm-framework --body "@codex review"`.
2. **Poll.** Re-fetch every ~30–60s until Codex posts its review for the current head. Its summary
   carries a 👍 (clean) or a list of findings/threads.
3. **Triage each finding.**
   - **Valid** → fix it. Bug/behaviour change ⇒ **write a failing test first** (repo rule), then fix,
     then `npm test` green. Match the terse style; respect the locked architecture in `AGENTS.md`.
     Never weaken security or types to satisfy a comment.
   - **False positive** → do **not** change code. Reply on the thread with a concise, factual reason
     (cite `AGENTS.md` "known non-issues" where relevant, e.g. trailing-`;`, parser arithmetic,
     zero-match throw, get{t} global).
4. **Resolve threads** you addressed (fixed or rebutted). Commit fixes (conventional commits; patch-
   bump any touched `@jtorm/*` package). Push.
5. **Re-trigger + re-poll.** Any push makes the prior 👍 **stale** — re-request `@codex review` and
   wait for a fresh review against the new head. Go to 1.
6. **Done** when Codex's latest review (current head) is a clean 👍 with zero open valid findings and
   `test` is green.

## Rules (inherit repo + user git-workflow)
- A Codex 👍 authorises merge **only against the current head commit** — every push invalidates it; re-poll.
- Apply valid fixes only; **document every skipped false positive on its thread** — no silent dismissals.
- Failing-test-first for any fix; keep `npm test` green; `npm run typecheck` clean.
- **Do not merge from this command** — report gate-ready; merging is a separate, explicitly authorised step.
- If Codex stays silent after two `@codex review` nudges (~10 min), stop and report — it likely isn't
  installed/enabled for this repo (an account-level setup), not a code problem.

## Report (table)
| Finding | Verdict (valid / false-positive) | Action (fix commit SHA / rebuttal) |
Then: Codex verdict (👍 / open findings) · `test` CI · mergeable (y/n) · head SHA reviewed.
