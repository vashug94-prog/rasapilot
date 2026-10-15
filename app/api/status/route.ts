import { NextResponse } from "next/server";
import { hasQlooCredentials } from "@/lib/qloo";

export const dynamic = "force-dynamic";

export function GET() {
  const live = hasQlooCredentials();
  return NextResponse.json({
    mode: live ? "live" : "demo",
    demo: !live,
    message: live ? "Qloo credentials are configured on the server." : "No Qloo credential is configured. The app is using labeled demonstration fixtures.",
  }, { headers: { "Cache-Control": "no-store" } });
}
