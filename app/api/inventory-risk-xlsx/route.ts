import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeSheetName(name: string) {
  return name
    .replace(/[\\/?*[\]:]/g, " ")
    .slice(0, 31)
    .trim() || "Sheet";
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, any>[]) {
  const safeRows = rows && rows.length > 0 ? rows : [{ Message: "No data available" }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);

  const columnNames = Object.keys(safeRows[0] || {});
  worksheet["!cols"] = columnNames.map((columnName) => ({
    wch: Math.min(Math.max(columnName.length + 2, 12), 40),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(name));
}

export async function GET() {
  const snapshotUrl = process.env.NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL;

  if (!snapshotUrl) {
    return Response.json(
      { success: false, error: "NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(`${snapshotUrl}?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return Response.json(
      { success: false, error: `Could not load dashboard snapshot: ${response.status}` },
      { status: 500 },
    );
  }

  const snapshot = await response.json();
  const inventoryRisk = snapshot?.inventory_risk || {};
  const summary = inventoryRisk.summary || {};
  const logic = inventoryRisk.logic || {};
  const thresholds = inventoryRisk.thresholds || {};

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, "Summary", [
    {
      Warehouse: inventoryRisk.warehouse || "01",
      AsOf: inventoryRisk.as_of || "",
      SourceFile: inventoryRisk.source_file || "",
      TotalSKUsWithStock: summary.total_skus_with_stock ?? "",
      RiskSKUs: summary.risk_skus ?? "",
      DeadStockSKUs: summary.dead_stock_skus ?? "",
      SlowMoverSKUs: summary.slow_mover_skus ?? "",
      OverstockSKUs: summary.overstock_skus ?? "",
      WatchlistSKUs: summary.watchlist_skus ?? "",
      NewNoSalesHistorySKUs: summary.new_no_sales_history_skus ?? "",
      StockUnitsAtRisk: summary.stock_units_at_risk ?? "",
    },
  ]);

  addSheet(workbook, "Slow Movers All", inventoryRisk.slow_movers || []);
  addSheet(workbook, "Dead Stock", inventoryRisk.dead_stock || []);
  addSheet(workbook, "Overstock Risk", inventoryRisk.overstock || []);
  addSheet(workbook, "Watchlist", inventoryRisk.watchlist || []);
  addSheet(workbook, "New No Sales History", inventoryRisk.new_no_sales_history || []);

  addSheet(
    workbook,
    "Logic",
    Object.entries(logic).map(([Key, Description]) => ({
      Key,
      Description,
    })),
  );

  addSheet(
    workbook,
    "Thresholds",
    Object.entries(thresholds).map(([ProductType, value]) => ({
      ProductType,
      ...(typeof value === "object" && value !== null ? value : { Value: value }),
    })),
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const fileName = `inventory_slow_movers_${inventoryRisk.as_of || "snapshot"}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
