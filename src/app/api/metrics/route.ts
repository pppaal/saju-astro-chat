import { NextResponse } from "next/server";
import { getMetricsSnapshot, toPrometheus, toOtlp } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.METRICS_TOKEN;
  const auth = request.headers.get("authorization") || "";
  const clientToken = auth.replace(/^Bearer\s+/i, "");
  const mask = (val: string) => (val ? `${val.slice(0, 4)}***${val.slice(-4)}` : "(empty)");
  if (!token || auth !== `Bearer ${token}`) {
    console.warn("[metrics] unauthorized", {
      expected: mask(token || ""),
      received: mask(clientToken),
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "";
  if (format === "prom" || format === "prometheus") {
    return new NextResponse(toPrometheus(), {
      status: 200,
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }
  if (format === "otlp" || format === "otel") {
    return NextResponse.json(toOtlp(), { status: 200 });
  }

  const snap = getMetricsSnapshot();
  return NextResponse.json(snap);
}
