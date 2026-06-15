type Kpi = {
  Sales?: number | null;
  Cost?: number | null;
  GrossProfit?: number | null;
  GrossMarginPct?: number | null;
  Orders?: number | null;
  Clients?: number | null;
  Quantity?: number | null;
  AOV?: number | null;
};

type MonthSnapshot = {
  year: number;
  month: number;
  label: string;
  current_month_kpi: Kpi;
  last_year_month_kpi: Kpi;
  current_ytd_kpi: Kpi;
  last_year_ytd_kpi: Kpi;
  top_channels: Record<string, any>[];
  top_countries: Record<string, any>[];
  top_products: Record<string, any>[];
  top_clients: Record<string, any>[];
  comparison_by_channel: Record<string, any>[];
};

type SnapshotData = {
  success?: boolean;
  source?: string;
  generated_at?: string;
  latest_month?: string;
  available_months?: string[];
  monthly_trend?: Record<string, any>[];
  months?: Record<string, MonthSnapshot>;
};

async function getSnapshot(): Promise<SnapshotData> {
  const snapshotUrl = process.env.NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL;

  if (!snapshotUrl) {
    return {
      success: false,
      source: "Missing NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL",
    };
  }

  const response = await fetch(snapshotUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      success: false,
      source: `Failed to load snapshot: ${response.status}`,
    };
  }

  return response.json();
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return `${value.toFixed(1)}%`;
}

function growthPct(current?: number | null, previous?: number | null) {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatGrowth(current?: number | null, previous?: number | null) {
  const growth = growthPct(current, previous);

  if (growth === null || Number.isNaN(growth)) return "vs LY unavailable";

  const sign = growth >= 0 ? "+" : "";

  return `${sign}${growth.toFixed(1)}% vs LY`;
}

function KpiCard({
  label,
  value,
  previous,
  type = "number",
}: {
  label: string;
  value?: number | null;
  previous?: number | null;
  type?: "money" | "number" | "percent";
}) {
  const formattedValue =
    type === "money"
      ? formatMoney(value)
      : type === "percent"
        ? formatPercent(value)
        : formatNumber(value);

  return (
    <div style={cardStyle}>
      <p style={labelStyle}>{label}</p>
      <h2 style={valueStyle}>{formattedValue}</h2>
      <p style={deltaStyle}>{formatGrowth(value, previous)}</p>
    </div>
  );
}

function formatComparisonValue(
  value?: number | null,
  type: "money" | "number" | "percent" = "number"
) {
  if (type === "money") return formatMoney(value);
  if (type === "percent") return formatPercent(value);
  return formatNumber(value);
}

function formatGrowthOnly(current?: number | null, previous?: number | null) {
  const growth = growthPct(current, previous);

  if (growth === null || Number.isNaN(growth)) return "-";

  const sign = growth >= 0 ? "+" : "";

  return `${sign}${growth.toFixed(1)}%`;
}

function ComparisonTable({
  title,
  currentLabel,
  previousLabel,
  rows,
}: {
  title: string;
  currentLabel: string;
  previousLabel: string;
  rows: {
    metric: string;
    current?: number | null;
    previous?: number | null;
    type?: "money" | "number" | "percent";
  }[];
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={thRightStyle}>{currentLabel}</th>
              <th style={thRightStyle}>{previousLabel}</th>
              <th style={thRightStyle}>Change</th>
              <th style={thRightStyle}>Growth / Decline</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const current = row.current ?? null;
              const previous = row.previous ?? null;
              const change =
                current !== null && previous !== null ? current - previous : null;

              return (
                <tr key={row.metric}>
                  <td style={tdStyle}>{row.metric}</td>
                  <td style={tdRightStyle}>
                    {formatComparisonValue(current, row.type)}
                  </td>
                  <td style={tdRightStyle}>
                    {formatComparisonValue(previous, row.type)}
                  </td>
                  <td style={tdRightStyle}>
                    {formatComparisonValue(change, row.type)}
                  </td>
                  <td style={tdRightStyle}>
                    {formatGrowthOnly(current, previous)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimpleTable({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: Record<string, any>[];
  labelKey: string;
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      {rows.length === 0 ? (
        <p style={{ color: "#777" }}>No data available.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{labelKey}</th>
                <th style={thRightStyle}>Sales</th>
                <th style={thRightStyle}>Gross Profit</th>
                <th style={thRightStyle}>Orders</th>
                <th style={thRightStyle}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, index) => (
                <tr key={`${title}-${index}`}>
                  <td style={tdStyle}>{String(row[labelKey] ?? "-")}</td>
                  <td style={tdRightStyle}>{formatMoney(row.Sales)}</td>
                  <td style={tdRightStyle}>{formatMoney(row.GrossProfit)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.Orders)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.Quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function Home() {
  const snapshot = await getSnapshot();

  const months = snapshot.months || {};
  const availableMonths =
    snapshot.available_months ||
    Object.keys(months).sort();

  const latestMonthKey =
    snapshot.latest_month ||
    availableMonths[availableMonths.length - 1];

  const selectedMonth = latestMonthKey ? months[latestMonthKey] : undefined;

  if (!selectedMonth) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={eyebrowStyle}>Sales Report Live</p>
          <h1 style={h1Style}>Dashboard Snapshot</h1>
          <p style={mutedStyle}>
            No dashboard data has been published yet.
          </p>

          <pre style={preStyle}>{JSON.stringify(snapshot, null, 2)}</pre>
        </div>
      </main>
    );
  }

  const current = selectedMonth.current_month_kpi || {};
  const previous = selectedMonth.last_year_month_kpi || {};
  const currentYtd = selectedMonth.current_ytd_kpi || {};
  const previousYtd = selectedMonth.last_year_ytd_kpi || {};

    const monthlyComparisonRows = [
    {
      metric: "Sales",
      current: current.Sales,
      previous: previous.Sales,
      type: "money" as const,
    },
    {
      metric: "Gross Profit",
      current: current.GrossProfit,
      previous: previous.GrossProfit,
      type: "money" as const,
    },
    {
      metric: "Gross Margin",
      current: current.GrossMarginPct,
      previous: previous.GrossMarginPct,
      type: "percent" as const,
    },
    {
      metric: "Orders",
      current: current.Orders,
      previous: previous.Orders,
      type: "number" as const,
    },
    {
      metric: "Clients",
      current: current.Clients,
      previous: previous.Clients,
      type: "number" as const,
    },
    {
      metric: "Quantity",
      current: current.Quantity,
      previous: previous.Quantity,
      type: "number" as const,
    },
  ];

  const ytdComparisonRows = [
    {
      metric: "YTD Sales",
      current: currentYtd.Sales,
      previous: previousYtd.Sales,
      type: "money" as const,
    },
    {
      metric: "YTD Gross Profit",
      current: currentYtd.GrossProfit,
      previous: previousYtd.GrossProfit,
      type: "money" as const,
    },
    {
      metric: "YTD Gross Margin",
      current: currentYtd.GrossMarginPct,
      previous: previousYtd.GrossMarginPct,
      type: "percent" as const,
    },
    {
      metric: "YTD Orders",
      current: currentYtd.Orders,
      previous: previousYtd.Orders,
      type: "number" as const,
    },
    {
      metric: "YTD Clients",
      current: currentYtd.Clients,
      previous: previousYtd.Clients,
      type: "number" as const,
    },
    {
      metric: "YTD Quantity",
      current: currentYtd.Quantity,
      previous: previousYtd.Quantity,
      type: "number" as const,
    },
  ];

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <div>
            <p style={eyebrowStyle}>Sales Report Live</p>
            <h1 style={h1Style}>Management Dashboard</h1>
            <p style={mutedStyle}>
              Latest published month: <b>{selectedMonth.label}</b>
            </p>
          </div>

          <div style={statusBoxStyle}>
            <p style={labelStyle}>Source</p>
            <strong>{snapshot.source || "Snapshot"}</strong>
            <p style={smallMutedStyle}>
              Updated: {snapshot.generated_at || "-"}
            </p>
            <p style={smallMutedStyle}>
              Sales orders are recorded based on orders with open &amp; partial status.
            </p>
          </div>
        </div>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Monthly Performance</h2>

          <div style={gridStyle}>
            <KpiCard label="Sales" value={current.Sales} previous={previous.Sales} type="money" />
            <KpiCard label="Gross Profit" value={current.GrossProfit} previous={previous.GrossProfit} type="money" />
            <KpiCard label="Gross Margin" value={current.GrossMarginPct} previous={previous.GrossMarginPct} type="percent" />
            <KpiCard label="Orders" value={current.Orders} previous={previous.Orders} />
            <KpiCard label="Clients" value={current.Clients} previous={previous.Clients} />
            <KpiCard label="Quantity" value={current.Quantity} previous={previous.Quantity} />
          </div>
        </section>

        <ComparisonTable
          title={`Sales Comparison — ${selectedMonth.label} vs same month last year`}
          currentLabel={selectedMonth.label}
          previousLabel={`Same month LY`}
          rows={monthlyComparisonRows}
        />

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>YTD Performance</h2>

          <div style={gridStyle}>
            <KpiCard label="YTD Sales" value={currentYtd.Sales} previous={previousYtd.Sales} type="money" />
            <KpiCard label="YTD Gross Profit" value={currentYtd.GrossProfit} previous={previousYtd.GrossProfit} type="money" />
            <KpiCard label="YTD Gross Margin" value={currentYtd.GrossMarginPct} previous={previousYtd.GrossMarginPct} type="percent" />
            <KpiCard label="YTD Orders" value={currentYtd.Orders} previous={previousYtd.Orders} />
            <KpiCard label="YTD Clients" value={currentYtd.Clients} previous={previousYtd.Clients} />
            <KpiCard label="YTD Quantity" value={currentYtd.Quantity} previous={previousYtd.Quantity} />
          </div>
        </section>

        <ComparisonTable
          title={`YTD Comparison — ${selectedMonth.year} vs ${selectedMonth.year - 1}`}
          currentLabel={`YTD ${selectedMonth.year}`}
          previousLabel={`YTD ${selectedMonth.year - 1}`}
          rows={ytdComparisonRows}
        />

        <SimpleTable
          title="Top Sales Channels"
          rows={selectedMonth.top_channels || []}
          labelKey="SalesChannel"
        />

        <SimpleTable
          title="Top Countries"
          rows={selectedMonth.top_countries || []}
          labelKey="DeliveryCountry"
        />

        <SimpleTable
          title="Top Products"
          rows={selectedMonth.top_products || []}
          labelKey="ProductName"
        />

        <SimpleTable
          title="Top Clients"
          rows={selectedMonth.top_clients || []}
          labelKey="ClientName"
        />
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f7f8",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
  color: "#111",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#666",
  fontSize: 14,
};

const h1Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 40,
  lineHeight: 1.1,
};

const mutedStyle: React.CSSProperties = {
  color: "#666",
  marginTop: 12,
};

const smallMutedStyle: React.CSSProperties = {
  color: "#777",
  fontSize: 12,
  margin: "8px 0 0",
};

const statusBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6e6e6",
  borderRadius: 16,
  padding: 16,
  minWidth: 240,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const sectionStyle: React.CSSProperties = {
  marginTop: 32,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  marginBottom: 16,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: 20,
  background: "#fff",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: "#777",
  fontSize: 13,
};

const valueStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 26,
};

const deltaStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#666",
  fontSize: 13,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #eee",
  background: "#fafafa",
  fontSize: 13,
  color: "#555",
};

const thRightStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 14,
};

const tdRightStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};

const preStyle: React.CSSProperties = {
  background: "#111",
  color: "#f5f5f5",
  padding: 16,
  borderRadius: 12,
  overflowX: "auto",
  fontSize: 13,
};