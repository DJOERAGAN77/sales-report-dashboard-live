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
  top_product_types?: Record<string, any>[];
  top_clients: Record<string, any>[];
  data_quality?: Record<string, any>[];
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

type PageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSignedGrowthValue(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";

  const sign = value >= 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function growthColor(value: number | null) {
  if (value === null || Number.isNaN(value)) return "#6b7280";
  return value >= 0 ? "#047857" : "#b91c1c";
}

function formatMonthYearLabel(value: string) {
  const match = String(value).match(/^(\d{4})-(\d{2})$/);

  if (!match) return String(value);

  const year = Number(match[1]);
  const month = Number(match[2]);

  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCompactMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  const absValue = Math.abs(value);

  if (absValue >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }

  if (absValue >= 1000) {
    return `€${Math.round(value / 1000)}k`;
  }

  return `€${Math.round(value)}`;
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

function ExecutiveSummary({
  selectedMonth,
  current,
  previous,
  currentYtd,
  previousYtd,
}: {
  selectedMonth: MonthSnapshot;
  current: Kpi;
  previous: Kpi;
  currentYtd: Kpi;
  previousYtd: Kpi;
}) {
  const monthlySalesGrowth = growthPct(current.Sales, previous.Sales);
  const ytdSalesGrowth = growthPct(currentYtd.Sales, previousYtd.Sales);

  const marginChange =
    current.GrossMarginPct !== null &&
    current.GrossMarginPct !== undefined &&
    previous.GrossMarginPct !== null &&
    previous.GrossMarginPct !== undefined
      ? current.GrossMarginPct - previous.GrossMarginPct
      : null;

  return (
    <section style={summarySectionStyle}>
      <div>
        <p style={eyebrowStyle}>Executive summary</p>
        <h2 style={summaryTitleStyle}>{selectedMonth.label} performance overview</h2>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <p style={labelStyle}>Monthly sales vs LY</p>
          <strong style={{ ...summaryValueStyle, color: growthColor(monthlySalesGrowth) }}>
            {formatSignedGrowthValue(monthlySalesGrowth)}
          </strong>
          <p style={smallMutedStyle}>
            {formatMoney(current.Sales)} vs {formatMoney(previous.Sales)}
          </p>
        </div>

        <div style={summaryCardStyle}>
          <p style={labelStyle}>YTD sales vs LY</p>
          <strong style={{ ...summaryValueStyle, color: growthColor(ytdSalesGrowth) }}>
            {formatSignedGrowthValue(ytdSalesGrowth)}
          </strong>
          <p style={smallMutedStyle}>
            {formatMoney(currentYtd.Sales)} vs {formatMoney(previousYtd.Sales)}
          </p>
        </div>

        <div style={summaryCardStyle}>
          <p style={labelStyle}>Gross margin change</p>
          <strong style={{ ...summaryValueStyle, color: growthColor(marginChange) }}>
            {marginChange === null ? "-" : `${marginChange >= 0 ? "+" : ""}${marginChange.toFixed(1)} pts`}
          </strong>
          <p style={smallMutedStyle}>
            Current margin: {formatPercent(current.GrossMarginPct)}
          </p>
        </div>
      </div>
    </section>
  );
}

function DataQualityNotice({
  selectedMonth,
}: {
  selectedMonth: MonthSnapshot;
}) {
  const dataQualityRows = selectedMonth.data_quality || [];

  if (dataQualityRows.length === 0) {
    return (
      <section style={successNoticeStyle}>
        <strong>Data quality</strong>
        <p style={{ margin: "6px 0 0" }}>
          No major data quality issues found for this report month.
        </p>
      </section>
    );
  }

  return (
    <section style={warningNoticeStyle}>
      <strong>Data quality note</strong>
      <p style={{ margin: "6px 0 12px" }}>
        Some data quality items still need review for this report month.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={miniTableStyle}>
          <thead>
            <tr>
              <th style={miniThStyle}>Issue</th>
              <th style={miniThRightStyle}>Rows</th>
              <th style={miniThStyle}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {dataQualityRows.map((row, index) => (
              <tr key={`${row.Issue}-${index}`}>
                <td style={miniTdStyle}>{String(row.Issue || "-")}</td>
                <td style={miniTdRightStyle}>{formatNumber(row.Rows)}</td>
                <td style={miniTdStyle}>{String(row.Severity || "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniLineChart({
  title,
  rows,
  xKey,
  yKey,
}: {
  title: string;
  rows: Record<string, any>[];
  xKey: string;
  yKey: string;
}) {
  const cleanRows = rows
    .filter((row) => row[xKey] && !Number.isNaN(Number(row[yKey])))
    .map((row) => ({
      label: formatMonthYearLabel(String(row[xKey])),
      value: Number(row[yKey]) || 0,
    }));

  if (cleanRows.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={smallMutedStyle}>No chart data available.</p>
      </section>
    );
  }

  const width = 1000;
  const height = 340;
  const paddingLeft = 80;
  const paddingRight = 35;
  const paddingTop = 45;
  const paddingBottom = 70;

  const tickStep = 100000;
  const maxRawValue = Math.max(...cleanRows.map((row) => row.value), 1);
  const axisMax = Math.ceil(maxRawValue / tickStep) * tickStep;

  const tickValues: number[] = [];

  for (let value = 0; value <= axisMax; value += tickStep) {
    tickValues.push(value);
  }

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = cleanRows.map((row, index) => {
    const x =
      cleanRows.length === 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (index / (cleanRows.length - 1)) * plotWidth;

    const y =
      paddingTop +
      plotHeight -
      (row.value / (axisMax || 1)) * plotHeight;

    return { ...row, x, y };
  });

  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      <div style={chartCardStyle}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto" }}
          role="img"
        >
          {tickValues.map((tick) => {
            const y =
              paddingTop +
              plotHeight -
              (tick / (axisMax || 1)) * plotHeight;

            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {formatCompactMoney(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#d1d5db"
            strokeWidth="1"
          />
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#d1d5db"
            strokeWidth="1"
          />

          <polyline
            points={pointString}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
          />

          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="#2563eb" />

              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#111827"
              >
                {formatCompactMoney(point.value)}
              </text>

              <text
                x={point.x}
                y={height - 35}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function HorizontalBarChartSection({
  title,
  rows,
  labelKey,
  valueKey = "Sales",
  limit = 10,
}: {
  title: string;
  rows: Record<string, any>[];
  labelKey: string;
  valueKey?: string;
  limit?: number;
}) {
  const cleanRows = rows
    .filter((row) => row[labelKey] !== undefined && row[valueKey] !== undefined)
    .map((row) => ({
      label: String(row[labelKey] ?? "-"),
      value: Number(row[valueKey]) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const maxValue = Math.max(...cleanRows.map((row) => row.value), 1);

  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      {cleanRows.length === 0 ? (
        <p style={smallMutedStyle}>No chart data available.</p>
      ) : (
        <div style={chartCardStyle}>
          {cleanRows.map((row) => {
            const widthPercent = Math.max((row.value / maxValue) * 100, 2);

            return (
              <div key={row.label} style={barRowStyle}>
                <div style={barLabelStyle}>{row.label}</div>
                <div style={barTrackStyle}>
                  <div style={{ ...barFillStyle, width: `${widthPercent}%` }} />
                </div>
                <div style={barValueStyle}>{formatMoney(row.value)}</div>
              </div>
            );
          })}
        </div>
      )}
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

export default async function Home({ searchParams }: PageProps) {
  const snapshot = await getSnapshot();
  const params = searchParams ? await searchParams : {};

  const months = snapshot.months || {};
  const availableMonths =
    snapshot.available_months ||
    Object.keys(months).sort();

  const latestMonthKey =
    snapshot.latest_month ||
    availableMonths[availableMonths.length - 1];

  const requestedMonth = Array.isArray(params.month)
    ? params.month[0]
    : params.month;

  const selectedMonthKey =
    requestedMonth && months[requestedMonth]
      ? requestedMonth
      : latestMonthKey;

  const selectedMonth = selectedMonthKey ? months[selectedMonthKey] : undefined;

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
              Updated: {formatDateTime(snapshot.generated_at)}
            </p>
            <p style={smallMutedStyle}>
              Sales orders are recorded based on orders with open &amp; partial status.
            </p>
          </div>
        </div>

        <form style={monthSelectorStyle}>
          <label style={monthSelectorLabelStyle} htmlFor="month">
            Select report month
          </label>

          <select
            id="month"
            name="month"
            defaultValue={selectedMonthKey || ""}
            style={monthSelectStyle}
          >
            {[...availableMonths].reverse().map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {String(months[monthKey]?.label || formatMonthYearLabel(monthKey))}
              </option>
            ))}
          </select>

          <button type="submit" style={monthButtonStyle}>
            View report
          </button>
        </form>

        <ExecutiveSummary
          selectedMonth={selectedMonth}
          current={current}
          previous={previous}
          currentYtd={currentYtd}
          previousYtd={previousYtd}
        />

        <DataQualityNotice selectedMonth={selectedMonth} />

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

        <MiniLineChart
          title="Monthly Sales Trend — Last 12 Months"
          rows={(snapshot.monthly_trend || [])
            .filter((row) => String(row.YearMonth || "") <= String(selectedMonthKey || ""))
            .slice(-12)}
          xKey="YearMonth"
          yKey="Sales"
        />

        <HorizontalBarChartSection
          title="Top Sales Channels by Sales"
          rows={selectedMonth.top_channels || []}
          labelKey="SalesChannel"
        />

        <SimpleTable
          title="Top Sales Channels"
          rows={selectedMonth.top_channels || []}
          labelKey="SalesChannel"
        />

        <HorizontalBarChartSection
          title="Top Countries by Sales"
          rows={selectedMonth.top_countries || []}
          labelKey="DeliveryCountry"
        />

        <SimpleTable
          title="Top Countries"
          rows={selectedMonth.top_countries || []}
          labelKey="DeliveryCountry"
        />

        <HorizontalBarChartSection
          title="Top Product Types by Sales"
          rows={selectedMonth.top_product_types || []}
          labelKey="ProductType"
        />

        <SimpleTable
          title="Top Product Types"
          rows={selectedMonth.top_product_types || []}
          labelKey="ProductType"
        />

        <HorizontalBarChartSection
          title="Top Products by Sales"
          rows={selectedMonth.top_products || []}
          labelKey="ProductName"
        />

        <SimpleTable
          title="Top Products"
          rows={selectedMonth.top_products || []}
          labelKey="ProductName"
        />

        <HorizontalBarChartSection
          title="Top Clients by Sales"
          rows={selectedMonth.top_clients || []}
          labelKey="ClientName"
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

const chartCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const barRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px 1fr 120px",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const barLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const barTrackStyle: React.CSSProperties = {
  height: 16,
  background: "#eef2ff",
  borderRadius: 999,
  overflow: "hidden",
};

const barFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#2563eb",
  borderRadius: 999,
};

const barValueStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#4b5563",
  textAlign: "right",
};

const monthSelectorStyle: React.CSSProperties = {
  marginTop: 28,
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const monthSelectorLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  fontWeight: 700,
};

const monthSelectStyle: React.CSSProperties = {
  minWidth: 220,
  height: 42,
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  WebkitTextFillColor: "#111827",
  fontSize: 14,
  lineHeight: "20px",
  appearance: "auto",
};

const monthButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const summarySectionStyle: React.CSSProperties = {
  marginTop: 28,
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const summaryTitleStyle: React.CSSProperties = {
  margin: "6px 0 18px",
  fontSize: 24,
  lineHeight: 1.2,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid #eef0f3",
  borderRadius: 14,
  padding: 16,
  background: "#fafafa",
};

const summaryValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 28,
  lineHeight: 1.1,
};

const warningNoticeStyle: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 14,
  padding: 16,
};

const successNoticeStyle: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid #10b981",
  background: "#ecfdf5",
  color: "#065f46",
  borderRadius: 14,
  padding: 16,
};

const miniTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "rgba(255,255,255,0.55)",
};

const miniThStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.12)",
  fontSize: 13,
};

const miniThRightStyle: React.CSSProperties = {
  ...miniThStyle,
  textAlign: "right",
};

const miniTdStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  fontSize: 13,
};

const miniTdRightStyle: React.CSSProperties = {
  ...miniTdStyle,
  textAlign: "right",
};