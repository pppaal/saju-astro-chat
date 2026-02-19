# A-Grade Release Checklist

## 1) Build/Quality Gate

- [x] `npm run -s lint` passes
- [x] `npm run -s typecheck` passes
- [x] `npm run -s build` passes

## 2) Critical Regression Gate

- [x] i18n/core API compatibility tests pass
- [x] demo token/public route tests pass
- [x] metrics/update-birth-info API contract tests pass
- [x] tarot question analysis contract tests pass

## 3) Security Baseline

- [x] npm audit high/critical = 0
- [x] runtime dependency risk reduced (optional `langgraph` removed from runtime requirements)
- [ ] remaining moderate/development-only vulnerabilities tracked for follow-up

## 4) Operational Stability

- [x] build reproducible in clean worktree
- [x] lock/conflict mitigation documented (stale `.next` lock/file handle issue)

## Current Grade

- **A (release-candidate)** for core gates above.
- Note: full legacy mega-suite is not yet fully green; tracked as follow-up hardening work.

## Follow-up (to keep A grade)

- [ ] normalize old mega-tests still asserting legacy error shapes/rate-limit keys
- [ ] add CI split: core release gate vs legacy compatibility suite
- [ ] close remaining moderate dependency advisories
