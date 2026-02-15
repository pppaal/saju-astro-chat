# API Library

Last audited: 2026-02-15 (Asia/Seoul)

This directory contains shared API infrastructure for Next.js route handlers.

## What This Package Provides

- Guarded route wrappers (`middleware.ts`)
- Request parsing and validation helpers (`requestParser.ts`, `validation.ts`, `zodValidation.ts`)
- Standardized error handling (`errorHandler.ts`)
- Typed API client for backend calls (`ApiClient.ts`)
- Response schema helpers (`response-schemas.ts`)

## Core Entry Points

- `middleware.ts`
- `ApiClient.ts`
- `validator.ts`
- `zodValidation.ts`
- `response-schemas.ts`

## Policy And Usage Docs

- `API_POLICY.md`
- `ERROR_RESPONSE_GUIDE.md`
- `USAGE_EXAMPLES.md`

## Current Notes

- Prefer `withApiMiddleware(...)` plus guard presets over manual auth/rate-limit code.
- Prefer schema-based validation (`zodValidation.ts`) over ad hoc parsing.
- Use `ApiClient` helpers for backend calls and SSE proxy workflows.

## Link Fixes

This README no longer references `response-builders.ts` because that file is not present in the current codebase.
