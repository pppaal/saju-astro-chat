// app/api/db-ping/route.ts
/**
 * Database ping endpoint for health checks
 * Uses the new API middleware for consistent error handling
 */

import { NextRequest } from "next/server";
import { Client } from "pg";
import {
  withApiMiddleware,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from "@/lib/api/middleware";
import { captureServerError } from "@/lib/telemetry";

export const runtime = "nodejs";

/**
 * Authorize admin requests
 */
function authorize(req: NextRequest): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  return req.headers.get("x-admin-token") === token;
}

/**
 * GET /api/db-ping
 * Health check endpoint for database connectivity
 */
export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    // Admin authorization required
    if (!authorize(req)) {
      return apiError(ErrorCodes.UNAUTHORIZED, "Admin token required");
    }

    const dbUrl = process.env.DATABASE_URL;
    const ca = process.env.DB_CA_PEM;

    if (!dbUrl || !ca) {
      return apiError(
        ErrorCodes.SERVICE_UNAVAILABLE,
        "Database not configured"
      );
    }

    try {
      const client = new Client({
        connectionString: dbUrl,
        ssl: { ca, rejectUnauthorized: true },
      });

      await client.connect();
      const result = await client.query("SELECT 1 as ping");
      await client.end();

      return apiSuccess({
        ok: true,
        rows: result.rows,
        checkedAt: new Date().toISOString(),
      });
    } catch (e: unknown) {
      captureServerError(e, { route: "/api/db-ping" });
      return apiError(
        ErrorCodes.DATABASE_ERROR,
        e instanceof Error ? e.message : "Database connection failed"
      );
    }
  },
  {
    route: "/api/db-ping",
    rateLimit: { limit: 10, windowSeconds: 60 },
  }
);
