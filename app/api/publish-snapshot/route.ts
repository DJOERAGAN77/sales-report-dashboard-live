import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SALES_REPORT_PUBLISH_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { success: false, error: "BLOB_READ_WRITE_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const snapshot = await request.json();

    const blob = await put(
      "dashboard_snapshot.json",
      JSON.stringify(snapshot),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    );

    return NextResponse.json({
      success: true,
      hasSalesReportPublishToken: Boolean(process.env.SALES_REPORT_PUBLISH_TOKEN),
      hasBlobReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      blobTokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}