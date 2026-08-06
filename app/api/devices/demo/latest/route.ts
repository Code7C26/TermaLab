import { NextRequest, NextResponse } from "next/server";
import { clamp, simulatedTemperature } from "@/lib/temperature.js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = clamp(
    Number(request.nextUrl.searchParams.get("target")) || 63,
    40,
    100,
  );
  const start = clamp(
    Number(request.nextUrl.searchParams.get("start")) || 8,
    -20,
    target,
  );
  const elapsed = clamp(
    Number(request.nextUrl.searchParams.get("elapsed")) || 0,
    0,
    3_600_000,
  );

  return NextResponse.json(
    {
      deviceId: "demo",
      deviceName: "Módulo central",
      temperature: simulatedTemperature(start, target, elapsed),
      target,
      connected: true,
      source: "demo",
      measuredAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
