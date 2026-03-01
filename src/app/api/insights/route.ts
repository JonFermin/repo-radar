import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { generateInsights } from "@/lib/ai-insights";
import { getDb } from "@/lib/db";
import type { ScanData } from "@/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Accept either analysisId (to fetch from DB) or scanData directly
  let scanData: ScanData;

  if (body.analysisId) {
    try {
      const sql = getDb();
      const result = await sql`
        SELECT scan_data FROM analyses WHERE id = ${body.analysisId}
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: "Analysis not found" },
          { status: 404 }
        );
      }

      scanData = result[0].scan_data as ScanData;
    } catch (err) {
      console.error("Failed to fetch analysis from DB:", err);
      return NextResponse.json(
        { error: "Failed to fetch analysis data" },
        { status: 500 }
      );
    }
  } else if (body.scanData) {
    scanData = body.scanData;
  } else {
    return NextResponse.json(
      { error: "Missing analysisId or scanData" },
      { status: 400 }
    );
  }

  const insights = await generateInsights(scanData);

  // Update DB if we have an analysisId
  if (body.analysisId) {
    try {
      const sql = getDb();
      await sql`
        UPDATE analyses SET insights = ${JSON.stringify(insights)}
        WHERE id = ${body.analysisId}
      `;
    } catch (err) {
      console.error("Failed to update insights in DB:", err);
    }
  }

  return NextResponse.json(insights);
}
