# Destiny Logging

Last audited: 2026-03-17 (Asia/Hong_Kong)

## Goal

Destiny logging should answer two questions without re-running the engine:

1. What did the core decide?
2. How did the user react to that decision?

The current recommendation is to reuse the existing `UserInteraction` table and store a normalized destiny envelope in `metadata`.

## Current Storage Surfaces

### Existing tables

- `UserInteraction`
  - lightweight event log
  - good fit for runtime destiny events
- `CounselorChatSession`
  - session transcript and message history
  - not a substitute for analytics or regression logging
- `ConsultationHistory`
  - saved long-form content
  - not a substitute for runtime event traces

## Recommended Write Path

Use `UserInteraction` with:

- `service`
  - `calendar`
  - `counselor`
  - `report`
- `type`
  - event name such as `destiny_answer_rendered`
- `theme`
  - requested theme if available
- `metadata`
  - canonical destiny envelope

This avoids a new migration while giving enough structure for replay, QA, and product analytics.

## Canonical Metadata Shape

Shared type:

- `src/lib/destiny-matrix/core/logging.ts`

Main builder:

- `buildDestinyInteractionMetadata(...)`

Important fields:

- `eventType`
- `service`
- `lang`
- `theme`
- `sessionId`
- `questionId`
- `questionText`
- `focusDomain`
- `phase`
- `phaseLabel`
- `topDecisionId`
- `topDecisionAction`
- `topDecisionLabel`
- `topScenarioIds`
- `topPatternIds`
- `policyMode`
- `allowedActions`
- `blockedActions`
- `softChecks`
- `hardStops`
- `riskControl`
- `confidence`
- `crossAgreement`
- `graphRagAnchorCount`
- `graphRagTopAnchorId`
- `graphRagTopAnchorSection`
- `userRating`
- `userFollowupCount`
- `metadataVersion`

## Event Set

Current recommended event names:

- `destiny_question_opened`
- `destiny_answer_rendered`
- `destiny_followup_sent`
- `destiny_feedback_submitted`
- `destiny_report_viewed`
- `destiny_calendar_action_viewed`

These should be treated as product events, not low-level transport logs.

## Minimum Logging By Surface

### Counselor

Log at least:

- when the answer is rendered
- when the user sends a follow-up
- when the user gives a rating

Must include:

- question text
- canonical focus domain
- top decision label
- top scenarios
- policy mode
- guardrails

### Calendar

Log at least:

- when a user opens the action plan
- when a user saves or acts on a recommended date

Must include:

- focus domain
- top decision label
- allowed and blocked actions
- phase
- risk control

### Report

Log at least:

- when the report is rendered
- when a user reaches the action-plan section
- when a user downloads or saves the report

Must include:

- focus domain
- top decision label
- top scenario ids
- confidence
- cross agreement
- GraphRAG anchor summary

## What Not To Log

Do not log:

- full raw birth data in analytics events
- full matrix payloads
- full chat transcripts in `UserInteraction`
- PII beyond what is already needed for the existing authenticated session model

For analytics and QA, log the engine decision, not the whole private input.

## Use In Regression And Calibration

The point of this schema is not just analytics dashboards.

It enables:

- real user question regression review
- domain hit analysis
- follow-up and dissatisfaction clustering
- comparison between `focusDomain` and asked theme
- later calibration against outcome labels

## Next Step To Wire It In

Recommended order:

1. counselor answer rendered event
2. counselor follow-up event
3. calendar action-plan opened event
4. report viewed event

That is enough to start collecting real product feedback without a schema migration.
