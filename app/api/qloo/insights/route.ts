import { NextResponse } from "next/server";
import { QlooError, getQlooPlaceInsights, hasQlooCredentials } from "@/lib/qloo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Send a valid JSON Insights request." }, { status: 400 }); }
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 120) : "";
  const ids = Array.isArray(body.entityIds) ? body.entityIds : [];
  if (city.length < 2) return NextResponse.json({ error: "Add a city or region with at least two characters." }, { status: 400 });
  if (ids.length > 8 || ids.some(id => typeof id !== "string" || id.length < 3 || id.length > 240)) return NextResponse.json({ error: "Use up to eight entity IDs returned by Qloo search." }, { status: 400 });
  if (!hasQlooCredentials()) return NextResponse.json({ mode: "demo", source: "Demonstration fixture", results: [], message: "Insights are unavailable in demo mode; no live Qloo request was made." });
  try {
    const results = await getQlooPlaceInsights({ city, entityIds: ids as string[] });
    return NextResponse.json({ mode: "live", source: "Qloo live response", results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof QlooError && error.status && error.status >= 400 && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Qloo Insights request failed." }, { status });
  }
}
