import { NextResponse } from "next/server";
import { QlooError, hasQlooCredentials, searchQlooEntity } from "@/lib/qloo";
import { REFERENCE_TYPES, type ReferenceType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Send a valid JSON search request." }, { status: 400 }); }
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
  const type = body.type;
  if (query.length < 2) return NextResponse.json({ error: "Enter at least two characters to search." }, { status: 400 });
  if (typeof type !== "string" || !REFERENCE_TYPES.includes(type as ReferenceType)) return NextResponse.json({ error: "Choose a supported reference type." }, { status: 400 });
  if (!hasQlooCredentials()) return NextResponse.json({ mode: "demo", source: "Demonstration fixture", results: [], message: "Entity search is unavailable in demo mode; no live Qloo lookup was made." });
  try {
    const results = await searchQlooEntity({ name: query, type: type as ReferenceType });
    return NextResponse.json({ mode: "live", source: "Qloo live response", results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof QlooError && error.status && error.status >= 400 && error.status < 500 ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Qloo entity search failed." }, { status });
  }
}
