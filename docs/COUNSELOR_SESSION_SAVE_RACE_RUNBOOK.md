# Counselor Session Save Race Runbook

## Scope

- Route: `POST /api/counselor/session/save`
- Failure signature: Prisma `P2002` (`Unique constraint failed on fields: (id)`)

## Why this happens

- The client can send near-simultaneous saves for the same `sessionId`:
  - debounced autosave
  - `beforeunload` beacon save
- Two requests may both pass pre-create read, then one create wins and the other gets `P2002`.

## Current server behavior

- If session exists and owner is same user: update.
- If create hits `P2002`: refetch owner and recover via update when same user.
- If collided owner is different user: return `403 FORBIDDEN`.

## Logs to watch

- Recovery warning:
  - `"[Counselor session save] create race detected (P2002), attempting recovery"`
- Owner mismatch warning:
  - `"[Counselor session save] create race belongs to another user"`
- Successful persistence info:
  - `"[Counselor session save] session persisted"` with `saveMode`:
    - `create`
    - `update`
    - `create-race-recovery`

## Staging validation checklist

1. Start one counselor chat session and capture its `sessionId`.
2. Fire two concurrent `POST /api/counselor/session/save` calls with same `sessionId` and same authenticated user.
3. Expected:
   - both requests return `200`
   - at least one request may log race warning
   - one final persistence log with `saveMode=create-race-recovery`
4. Fire concurrent saves using same `sessionId` but different authenticated users.
5. Expected:
   - one user gets `403`
   - log contains owner mismatch warning

## Production monitoring checks

1. Alert when `create race belongs to another user` appears repeatedly for same `sessionId`.
2. Track ratio of `saveMode=create-race-recovery` to total saves.
3. Investigate sudden spikes in `P2002` warnings after client release.
