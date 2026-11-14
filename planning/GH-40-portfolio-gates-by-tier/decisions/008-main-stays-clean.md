# 008: Nothing from the epic reaches `main` until the epic is complete

**Date:** 2026-11-12 (said by the owner when approving the issues: "we wont be deploying anything, so main remains
clean until the epic clears out! all chages go to dev branch / or epic branch and once ready we merge itno main")

**Question:** where does the epic's work go while it is being built?

**Decision:** **every change of the epic is merged into one long-lived branch, not into `main`.** Ticket branches
are opened from that branch and their pull requests target it. When the epic is complete, that branch is merged
into `main` in one pull request, and only then is anything deployed.

- **Why:** Vercel deploys `main`; the live site must not show a half-built epic (for example a record with ten
  projects on a scene made for six).
- **Not chosen:** merging each ticket into `main` as it is finished.
- **Still open:** the branch's name. The owner said "dev branch / or epic branch". Proposed: `40-gates`, which
  follows the project's `<issue number>-short-name` rule. Also open: whether pull request #39 (the living record,
  targeting `main`) is merged into `main` first or becomes the start of this branch.
- **Consequence for tickets:** `Fixes #<n>` closes an issue only when it reaches the default branch, so a
  ticket's issue is closed by hand (or stays open) when its pull request is merged into the epic branch.
