import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    hasSalesReportPublishToken: Boolean(process.env.SALES_REPORT_PUBLISH_TOKEN),
    hasBlobReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobTokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}