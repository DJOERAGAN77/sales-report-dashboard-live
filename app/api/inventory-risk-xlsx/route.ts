import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyRow = Record<string, any>;

const RISK_SORT: Record<string, number> = {
  "Dead Stock": 1,
  "Overstock Risk": 2,
  "Slow Mover": 3,
  "Watchlist": 4,
  "New / No Sales History": 5,
};

const FIXED_COLUMN_WIDTHS: Record<string, number> = {
  "Risk Priority": 4,
  "Recommended Action": 14,
  "Risk Level": 14,
  "Risk Reason": 14,
  "SKU": 14,
  "Product Name": 14,
  "Product Type": 14,
  "Category": 14,
  "Stock": 8,
  "Planned In": 9,
  "Planned Out": 9,
  "Available Stock": 10,
  "Gross Exposure": 10,
  "Sold 90D": 8,
  "Sold 180D": 8,
  "Sold All Time": 9,
  "Sell-through 90D %": 10,
  "Slow Threshold %": 10,
  "Days Inventory": 10,
  "Watchlist Days": 9,
  "Overstock Days": 9,
  "First Sold Date": 12,
  "Last Sold Date": 12,
  "Days Since Last Sale": 10,
  "First Seen Date": 12,
  "Days Since First Seen": 10,
};


function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sheet";
}

function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function toDateText(value: any) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function recommendedAction(riskLevel: string) {
  if (riskLevel === "Dead Stock") {
    return "Clearance / discount / stop reorder";
  }

  if (riskLevel === "Overstock Risk") {
    return "Review pricing, promo, channel push, stop new buying";
  }

  if (riskLevel === "Slow Mover") {
    return "Monitor, reduce reorder, consider promo";
  }

  if (riskLevel === "Watchlist") {
    return "Watch next month before action";
  }

  if (riskLevel === "New / No Sales History") {
    return "Observe only; not counted as slow mover yet";
  }

  return "";
}

function formatInventoryRows(rows: AnyRow[]) {
  return (rows || []).map((row) => {
    const riskLevel = String(row.RiskLevel || "");

    return {
      "Risk Priority": RISK_SORT[riskLevel] || 99,
      "Recommended Action": recommendedAction(riskLevel),
      "Risk Level": riskLevel,
      "Risk Reason": row.RiskReason || "",
      "SKU": row.SKU || "",
      "Product Name": row.ProductName || "",
      "Product Type": row.ProductType || "",
      "Category": row.Category || "",
      "Stock": toNumber(row.Stock),
      "Planned In": toNumber(row.PlannedInStock),
      "Planned Out": toNumber(row.PlannedOutStock),
      "Available Stock": toNumber(row.AvailableStock),
      "Gross Exposure": toNumber(row.GrossInventoryExposure),
      "Sold 90D": toNumber(row.QtySold90D),
      "Sold 180D": toNumber(row.QtySold180D),
      "Sold All Time": toNumber(row.QtySoldAllTime),
      "Sell-through 90D %": toNumber(row.SellThrough90D),
      "Slow Threshold %": toNumber(row.CategorySlowThreshold),
      "Days Inventory": toNumber(row.DaysOfInventory),
      "Watchlist Days": toNumber(row.CategoryWatchlistDays),
      "Overstock Days": toNumber(row.CategoryOverstockDays),
      "First Sold Date": toDateText(row.FirstSoldDate),
      "Last Sold Date": toDateText(row.LastSoldDate),
      "Days Since Last Sale": toNumber(row.DaysSinceLastSale),
      "First Seen Date": toDateText(row.FirstSeenDate),
      "Days Since First Seen": toNumber(row.DaysSinceFirstSeen),
    };
  });
}

function formatThresholdRows(thresholds: AnyRow) {
  return Object.entries(thresholds || {}).map(([ProductType, value]) => ({
    "Product Type": ProductType,
    "Slow Sell-through %": (value as AnyRow)?.slow_sell_through ?? "",
    "Watchlist Days": (value as AnyRow)?.watchlist_days ?? "",
    "Overstock Days": (value as AnyRow)?.overstock_days ?? "",
    "Meaning": "Used to classify Inventory Risk by Product Type",
  }));
}

function formatLogicRows(logic: AnyRow) {
  return Object.entries(logic || {}).map(([Key, Description]) => ({
    "Logic Key": Key,
    "Description": Description,
  }));
}

function getColumnWidth(header: string, rows: AnyRow[]) {
  if (FIXED_COLUMN_WIDTHS[header]) {
    return FIXED_COLUMN_WIDTHS[header];
  }

  const isNumericHeader =
    header.includes("Stock") ||
    header.includes("Sold") ||
    header.includes("Days") ||
    header.includes("%") ||
    header.includes("Priority") ||
    header.includes("Exposure");

  if (isNumericHeader) {
    return 9;
  }

  const maxContentWidth = Math.max(
    header.length + 2,
    ...rows.slice(0, 100).map((row) => String(row[header] ?? "").length + 2),
    10,
  );

  return Math.min(maxContentWidth, 18);
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: AnyRow[]) {
  const safeRows = rows && rows.length > 0 ? rows : [{ Message: "No data available" }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);

  const headers = Object.keys(safeRows[0] || {});
  worksheet["!cols"] = headers.map((header) => ({
    wch: getColumnWidth(header, safeRows),
  }));

  worksheet["!rows"] = [
    {
      hpt: 30,
    },
  ];

  for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: columnIndex });

    if (worksheet[address]) {
      worksheet[address].s = {
        alignment: {
          wrapText: true,
          vertical: "center",
          horizontal: "center",
        },
        font: {
          bold: true,
        },
      };
    }
  }

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: safeRows.length, c: Math.max(headers.length - 1, 0) },
    }),
  };

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
  const thresholds = inventoryRisk.thresholds || {};
  const logic = inventoryRisk.logic || {};

  const allRiskRows = formatInventoryRows(inventoryRisk.slow_movers || []).sort(
    (a, b) =>
      Number(a["Risk Priority"] || 99) - Number(b["Risk Priority"] || 99) ||
      Number(b["Gross Exposure"] || 0) - Number(a["Gross Exposure"] || 0),
  );

  const deadStockRows = formatInventoryRows(inventoryRisk.dead_stock || []);
  const overstockRows = formatInventoryRows(inventoryRisk.overstock || []);
  const slowMoverRows = allRiskRows.filter((row) => row["Risk Level"] === "Slow Mover");
  const watchlistRows = formatInventoryRows(inventoryRisk.watchlist || []);
  const newNoSalesRows = formatInventoryRows(inventoryRisk.new_no_sales_history || []);

  const workbook = XLSX.utils.book_new();

  addSheet(workbook, "00 Summary", [
    {
      "Warehouse": inventoryRisk.warehouse || "01",
      "As Of": inventoryRisk.as_of || "",
      "Source File": inventoryRisk.source_file || "",
      "Total SKUs With Stock": summary.total_skus_with_stock ?? "",
      "Risk SKUs": summary.risk_skus ?? "",
      "Dead Stock SKUs": summary.dead_stock_skus ?? "",
      "Slow Mover SKUs": summary.slow_mover_skus ?? "",
      "Overstock SKUs": summary.overstock_skus ?? "",
      "Watchlist SKUs": summary.watchlist_skus ?? "",
      "New / No Sales History SKUs": summary.new_no_sales_history_skus ?? "",
      "Stock Units at Risk": summary.stock_units_at_risk ?? "",
      "Note": "Risk SKUs exclude New / No Sales History SKUs.",
    },
  ]);

  addSheet(workbook, "01 Action List", allRiskRows);
  addSheet(workbook, "02 Overstock Risk", overstockRows);
  addSheet(workbook, "03 Slow Movers", slowMoverRows);
  addSheet(workbook, "04 Dead Stock", deadStockRows);
  addSheet(workbook, "05 Watchlist", watchlistRows);
  addSheet(workbook, "06 New No Sales", newNoSalesRows);
  addSheet(workbook, "07 Thresholds", formatThresholdRows(thresholds));
  addSheet(workbook, "08 Logic", formatLogicRows(logic));

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
