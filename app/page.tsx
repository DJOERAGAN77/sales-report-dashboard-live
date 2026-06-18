export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type CreditClaimMonthPayload = {
  year_month?: string;
  current_month?: {
    total_amount?: number | null;
    orders?: number | null;
    clients?: number | null;
    lines?: number | null;
    quantity?: number | null;
    credit_note_amount?: number | null;
    credit_note_orders?: number | null;
    claim_amount?: number | null;
    claim_orders?: number | null;
  };
  top_reasons?: Record<string, any>[];
  top_clients?: Record<string, any>[];
  top_countries?: Record<string, any>[];
  top_channels?: Record<string, any>[];
  top_product_types?: Record<string, any>[];
  top_skus?: Record<string, any>[];
  document_type_sections?: Record<string, CreditClaimDocumentSection>;
  data_quality?: Record<string, any>[];
};

type CreditClaimDocumentSection = {
  document_type?: string;
  current_month?: {
    total_amount?: number | null;
    orders?: number | null;
    clients?: number | null;
    quantity?: number | null;
  };
  top_reasons?: Record<string, any>[];
  top_clients?: Record<string, any>[];
  top_channels?: Record<string, any>[];
  top_product_types?: Record<string, any>[];
  top_skus?: Record<string, any>[];
};

type CreditClaimSnapshot = {
  success?: boolean;
  latest_month?: string | null;
  available_months?: string[];
  monthly_trend?: Record<string, any>[];
  current_month?: CreditClaimMonthPayload["current_month"];
  ytd?: {
    year?: number | null;
    credit_note_amount?: number | null;
    credit_note_orders?: number | null;
    claim_amount?: number | null;
    claim_orders?: number | null;
    total_amount?: number | null;
    orders?: number | null;
  };
  months?: Record<string, CreditClaimMonthPayload>;
};


type InventoryRiskSnapshot = {
  success?: boolean;
  source_file?: string | null;
  warehouse?: string | null;
  as_of?: string | null;
  summary?: {
    total_skus_with_stock?: number | null;
    risk_skus?: number | null;
    dead_stock_skus?: number | null;
    slow_mover_skus?: number | null;
    overstock_skus?: number | null;
    watchlist_skus?: number | null;
    new_no_sales_history_skus?: number | null;
    new_no_sales_history_stock_units?: number | null;
    stock_units_at_risk?: number | null;
  };
  slow_movers?: Record<string, any>[];
  dead_stock?: Record<string, any>[];
  overstock?: Record<string, any>[];
  watchlist?: Record<string, any>[];
  new_no_sales_history?: Record<string, any>[];
};

type SnapshotData = {
  success?: boolean;
  source?: string;
  generated_at?: string;
  latest_month?: string;
  available_months?: string[];
  monthly_trend?: Record<string, any>[];
  months?: Record<string, MonthSnapshot>;
  credit_claim?: CreditClaimSnapshot;
  inventory_risk?: InventoryRiskSnapshot;
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
    next: {
      revalidate: 0,
    },
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

function getDataQualityIssueRows(
  selectedMonth: MonthSnapshot,
  issueName: string
) {
  return (selectedMonth.data_quality || []).filter((row) =>
    String(row.Issue || "").toLowerCase().includes(issueName.toLowerCase())
  );
}

function hasDataQualityIssue(
  selectedMonth: MonthSnapshot,
  issueName: string
) {
  return getDataQualityIssueRows(selectedMonth, issueName).length > 0;
}

function isReviewLabel(value: string) {
  const normalized = String(value || "").trim().toLowerCase();

  return [
    "unmapped",
    "unspecified",
    "missing",
    "not found",
    "unknown",
  ].includes(normalized);
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

  if (growth === null || Number.isNaN(growth)) return null;

  const sign = growth >= 0 ? "+" : "";

  return `${sign}${growth.toFixed(1)}% vs LY`;
}

function KpiCard({
  label,
  value,
  previous,
  type = "number",
  tone = "default",
}: {
  label: string;
  value?: number | null;
  previous?: number | null;
  type?: "money" | "number" | "percent";
  tone?: "default" | "highlight";
}) {
  const formattedValue =
    type === "money"
      ? formatMoney(value)
      : type === "percent"
        ? formatPercent(value)
        : formatNumber(value);

  const growthText = formatGrowth(value, previous);

  return (
    <div style={tone === "highlight" ? highlightCardStyle : cardStyle}>
      <p style={tone === "highlight" ? highlightLabelStyle : labelStyle}>{label}</p>
      <h2 style={valueStyle}>{formattedValue}</h2>
      {growthText && <p style={deltaStyle}>{growthText}</p>}
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
      <div style={{ marginBottom: 14 }}>
        <strong>Data quality summary</strong>
        <p style={{ margin: "6px 0 0" }}>
          Some data quality items still need review for this report month.
        </p>
      </div>

      <div style={qualitySummaryGridStyle}>
        {dataQualityRows.map((row, index) => (
          <div key={`${row.Issue}-${index}`} style={qualitySummaryCardStyle}>
            <p style={qualityIssueLabelStyle}>{String(row.Issue || "-")}</p>
            <strong style={qualityIssueValueStyle}>
              {formatNumber(row.Rows)}
            </strong>
            <p style={smallMutedStyle}>{String(row.Severity || "-")} severity</p>
          </div>
        ))}
      </div>

      <details style={qualityDetailsStyle}>
        <summary style={detailsSummaryStyle}>View data quality details</summary>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
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
      </details>
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
    .map((row) => {
      const label = formatMonthYearLabel(String(row[xKey]));
      const parts = label.split(" ");
      const yearLabel = parts.length > 1 ? parts[parts.length - 1] : "";
      const monthLabel = parts.length > 1 ? parts.slice(0, -1).join(" ") : label;

      return {
        label,
        monthLabel,
        yearLabel,
        value: Number(row[yKey]) || 0,
      };
    });

  if (cleanRows.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={smallMutedStyle}>No chart data available.</p>
      </section>
    );
  }

  const width = 1000;
  const height = 360;
  const paddingLeft = 80;
  const paddingRight = 35;
  const paddingTop = 45;
  const paddingBottom = 90;

  const maxRawValue = Math.max(...cleanRows.map((row) => row.value), 1);
  const paddedMaxValue = maxRawValue * 1.15;
  const roughStep = paddedMaxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const normalizedStep = roughStep / magnitude;

  let niceStepMultiplier = 1;

  if (normalizedStep <= 1) {
    niceStepMultiplier = 1;
  } else if (normalizedStep <= 2) {
    niceStepMultiplier = 2;
  } else if (normalizedStep <= 5) {
    niceStepMultiplier = 5;
  } else {
    niceStepMultiplier = 10;
  }

  const tickStep = Math.max(niceStepMultiplier * magnitude, 1);
  const axisMax = Math.max(tickStep, Math.ceil(paddedMaxValue / tickStep) * tickStep);

  const tickValues: number[] = [];

  for (let value = 0; value <= axisMax + tickStep * 0.5; value += tickStep) {
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
                y={height - 52}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                <tspan x={point.x} dy="0">
                  {point.monthLabel}
                </tspan>
                {point.yearLabel && (
                  <tspan x={point.x} dy="16">
                    {point.yearLabel}
                  </tspan>
                )}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}


function MiniDualLineChart({
  title,
  rows,
  xKey,
  firstKey,
  firstLabel,
  secondKey,
  secondLabel,
}: {
  title: string;
  rows: Record<string, any>[];
  xKey: string;
  firstKey: string;
  firstLabel: string;
  secondKey: string;
  secondLabel: string;
}) {
  const cleanRows = rows
    .filter((row) => row[xKey])
    .map((row) => {
      const label = formatMonthYearLabel(String(row[xKey]));
      const parts = label.split(" ");
      const yearLabel = parts.length > 1 ? parts[parts.length - 1] : "";
      const monthLabel = parts.length > 1 ? parts.slice(0, -1).join(" ") : label;

      return {
        label,
        monthLabel,
        yearLabel,
        firstValue: Number(row[firstKey]) || 0,
        secondValue: Number(row[secondKey]) || 0,
      };
    });

  if (cleanRows.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={smallMutedStyle}>No chart data available.</p>
      </section>
    );
  }

  const width = 1000;
  const height = 390;
  const paddingLeft = 80;
  const paddingRight = 35;
  const paddingTop = 55;
  const paddingBottom = 95;

  const maxRawValue = Math.max(
    ...cleanRows.flatMap((row) => [row.firstValue, row.secondValue]),
    1
  );
  const paddedMaxValue = maxRawValue * 1.15;
  const roughStep = paddedMaxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const normalizedStep = roughStep / magnitude;

  let niceStepMultiplier = 1;

  if (normalizedStep <= 1) {
    niceStepMultiplier = 1;
  } else if (normalizedStep <= 2) {
    niceStepMultiplier = 2;
  } else if (normalizedStep <= 5) {
    niceStepMultiplier = 5;
  } else {
    niceStepMultiplier = 10;
  }

  const tickStep = Math.max(niceStepMultiplier * magnitude, 1);
  const axisMax = Math.max(tickStep, Math.ceil(paddedMaxValue / tickStep) * tickStep);

  const tickValues: number[] = [];

  for (let value = 0; value <= axisMax + tickStep * 0.5; value += tickStep) {
    tickValues.push(value);
  }

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = cleanRows.map((row, index) => {
    const x =
      cleanRows.length === 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (index / (cleanRows.length - 1)) * plotWidth;

    const firstY =
      paddingTop +
      plotHeight -
      (row.firstValue / (axisMax || 1)) * plotHeight;

    const secondY =
      paddingTop +
      plotHeight -
      (row.secondValue / (axisMax || 1)) * plotHeight;

    return { ...row, x, firstY, secondY };
  });

  const firstPointString = points.map((point) => `${point.x},${point.firstY}`).join(" ");
  const secondPointString = points.map((point) => `${point.x},${point.secondY}`).join(" ");

  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      <div style={chartCardStyle}>
        <div style={chartLegendStyle}>
          <span style={chartLegendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#2563eb" }} />
            {firstLabel}
          </span>
          <span style={chartLegendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#f97316" }} />
            {secondLabel}
          </span>
        </div>

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
            points={firstPointString}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
          />

          <polyline
            points={secondPointString}
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
          />

          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle cx={point.x} cy={point.firstY} r="5" fill="#2563eb" />
              <circle cx={point.x} cy={point.secondY} r="5" fill="#f97316" />

              <text
                x={point.x}
                y={point.firstY - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#111827"
              >
                {formatCompactMoney(point.firstValue)}
              </text>

              <text
                x={point.x}
                y={point.secondY + 22}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#111827"
              >
                {formatCompactMoney(point.secondValue)}
              </text>

              <text
                x={point.x}
                y={height - 52}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                <tspan x={point.x} dy="0">
                  {point.monthLabel}
                </tspan>
                {point.yearLabel && (
                  <tspan x={point.x} dy="16">
                    {point.yearLabel}
                  </tspan>
                )}
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
            const needsReview = isReviewLabel(row.label);

            return (
              <div key={row.label} style={barRowStyle}>
                <div style={barLabelStyle}>
                  {row.label}
                  {needsReview && <span style={reviewBadgeStyle}>Review</span>}
                </div>

                <div style={barTrackStyle}>
                  <div
                    style={{
                      ...barFillStyle,
                      width: `${widthPercent}%`,
                      background: needsReview ? "#f59e0b" : "#2563eb",
                    }}
                  />
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

function csvDownloadHref(orderNumbers: string[]) {
  const csvContent = ["OrderNumber", ...orderNumbers].join("\n");

  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function safeFileName(value: string) {
  return String(value || "orders")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function OrderNumbersCell({
  row,
  label,
}: {
  row: Record<string, any>;
  label: string;
}) {
  const orderNumbers = Array.isArray(row.OrderNumbers)
    ? row.OrderNumbers.map((item: any) => String(item))
    : [];

  const orderCount = Number(row.Orders || orderNumbers.length || 0);

  if (orderNumbers.length === 0) {
    return <>{formatNumber(orderCount)}</>;
  }

  return (
    <details style={orderDetailsStyle}>
      <summary style={orderSummaryStyle}>
        {formatNumber(orderCount)}
      </summary>

      <div style={orderPanelStyle}>
        <div style={orderPanelHeaderStyle}>
          <strong>{formatNumber(orderNumbers.length)} order number(s)</strong>

          <a
            href={csvDownloadHref(orderNumbers)}
            download={`order_numbers_${safeFileName(label)}.csv`}
            style={downloadLinkStyle}
          >
            Download CSV
          </a>
        </div>

        <div style={orderListStyle}>
          {orderNumbers.map((orderNumber) => (
            <div key={orderNumber} style={orderNumberStyle}>
              {orderNumber}
            </div>
          ))}
        </div>
      </div>
    </details>
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
  const displayRows = rows.slice(0, 20);

  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>

      {displayRows.length === 0 ? (
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
              {displayRows.map((row, index) => {
                const rowLabel = String(row[labelKey] || `row-${index}`);

                return (
                  <tr key={index}>
                    <td style={tdStyle}>
                      {String(row[labelKey] || "-")}
                    </td>

                    <td style={tdRightStyle}>
                      {formatMoney(row.Sales)}
                    </td>

                    <td style={tdRightStyle}>
                      {formatMoney(row.GrossProfit)}
                    </td>

                    <td style={tdRightStyle}>
                      <OrderNumbersCell row={row} label={rowLabel} />
                    </td>

                    <td style={tdRightStyle}>
                      {formatNumber(row.Quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details style={detailsBoxStyle}>
      <summary style={detailsHeaderStyle}>{title}</summary>
      <div style={{ marginTop: 14 }}>{children}</div>
    </details>
  );
}


function InventoryRiskTable({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, any>[];
}) {
  const displayRows = (rows || []).slice(0, 20);

  return (
    <DetailsSection title={title}>
      {displayRows.length === 0 ? (
        <p style={mutedStyle}>No inventory risk data available.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Risk</th>
                <th style={thRightStyle}>Stock</th>
                <th style={thRightStyle}>Available</th>
                <th style={thRightStyle}>Sold 90D</th>
                <th style={thRightStyle}>Sold 180D</th>
                <th style={thRightStyle}>Days no sale</th>
                <th style={thRightStyle}>Days inventory</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, index) => (
                <tr key={index}>
                  <td style={tdStyle}><strong>{String(row.SKU || "-")}</strong></td>
                  <td style={tdStyle}>{String(row.ProductName || "-")}</td>
                  <td style={tdStyle}>{String(row.ProductType || "-")}</td>
                  <td style={tdStyle}>{String(row.RiskLevel || "-")}</td>
                  <td style={tdRightStyle}>{formatNumber(row.Stock)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.PlannedInStock)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.PlannedOutStock)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.AvailableStock)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.GrossInventoryExposure)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.QtySold90D)}</td>
                  <td style={tdRightStyle}>{formatPercent(row.SellThrough90D)}</td>
                  <td style={tdRightStyle}>{formatNumber(row.DaysOfInventory)}</td>
                  <td style={tdStyle}>{String(row.RiskReason || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailsSection>
  );
}

function InventoryRiskSection({
  inventoryRisk,
}: {
  inventoryRisk?: InventoryRiskSnapshot;
}) {
  if (!inventoryRisk?.success) {
    return null;
  }

  const summary = inventoryRisk.summary || {};

  return (
    <section id="inventory-risk" style={sectionStyle}>
      <p style={eyebrowStyle}>Inventory</p>
      <h2 style={sectionTitleStyle}>Slow Movers / Overstock Risk</h2>
      <p style={mutedStyle}>
        Warehouse {inventoryRisk.warehouse || "01"} only. Slow mover uses sell-through, days of inventory,
        planned incoming stock, and product-type thresholds.
      </p>

      <div style={downloadRowStyle}>
        <a href="/api/inventory-risk-xlsx" style={downloadButtonStyle}>
          Download Slow Movers Excel (.xlsx)
        </a>
      </div>

      <div style={logicBoxStyle}>
        <strong>Slow mover logic</strong>
        <ul style={logicListStyle}>
          <li><b>Gross Exposure</b> = Stock + Planned In.</li>
          <li><b>Sell-through 90D</b> = Sold 90D / (Sold 90D + Gross Exposure).</li>
          <li><b>Days Inventory</b> = Gross Exposure / average daily sales over 90 days.</li>
          <li><b>New / No Sales History</b>: current stock exists, but SKU never appeared in sales history; shown separately, not counted as slow mover.</li>
          <li><b>Dead Stock</b>: SKU has sales history, but no sales in 180 days.</li>
          <li><b>Overstock Risk</b>: sell-through is below category threshold and days inventory is above category limit.</li>
          <li><b>Slow Mover</b>: sell-through is below category threshold, but SKU still had sales within 180 days.</li>
          <li><b>Watchlist</b>: days inventory is high but not yet critical.</li>
        </ul>
      </div>

      <div style={gridStyle}>
        <KpiCard label="Risk SKUs" value={summary.risk_skus} />
        <KpiCard label="Dead Stock SKUs" value={summary.dead_stock_skus} />
        <KpiCard label="Slow Mover SKUs" value={summary.slow_mover_skus} />
        <KpiCard label="Overstock SKUs" value={summary.overstock_skus} />
        <KpiCard label="Watchlist SKUs" value={summary.watchlist_skus} />
        <KpiCard label="New / No Sales History" value={summary.new_no_sales_history_skus} />
        <KpiCard label="Stock Units at Risk" value={summary.stock_units_at_risk} />
      </div>

      <InventoryRiskTable
        title="View Slow Movers / Overstock Risk SKUs"
        rows={inventoryRisk.slow_movers || []}
      />

      <InventoryRiskTable
        title="View Dead Stock SKUs"
        rows={inventoryRisk.dead_stock || []}
      />

      <InventoryRiskTable
        title="View Overstock SKUs"
        rows={inventoryRisk.overstock || []}
      />

      <InventoryRiskTable
        title="View Watchlist SKUs"
        rows={inventoryRisk.watchlist || []}
      />

      <InventoryRiskTable
        title="View New / No Sales History SKUs"
        rows={inventoryRisk.new_no_sales_history || []}
      />
    </section>
  );
}


function CreditClaimSummaryTable({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: Record<string, any>[];
  labelKey: string;
}) {
  const displayRows = (rows || []).slice(0, 20);

  return (
    <DetailsSection title={title}>
      {displayRows.length === 0 ? (
        <p style={mutedStyle}>No data available.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{labelKey}</th>
                <th style={thRightStyle}>Amount</th>
                <th style={thRightStyle}>Orders</th>
                <th style={thRightStyle}>Quantity</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, index) => {
                const rowLabel = `${title}_${String(row[labelKey] || index)}`;

                return (
                  <tr key={index}>
                    <td style={tdStyle}>{String(row[labelKey] || "-")}</td>
                    <td style={tdRightStyle}>{formatMoney(row.TotalAmount)}</td>
                    <td style={tdRightStyle}>
                      <OrderNumbersCell row={row} label={rowLabel} />
                    </td>
                    <td style={tdRightStyle}>{formatNumber(row.Quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DetailsSection>
  );
}

function CreditClaimSkuTable({
  title,
  rows,
}: {
  title: string;
  rows: Record<string, any>[];
}) {
  const displayRows = (rows || []).slice(0, 15);

  return (
    <DetailsSection title={title}>
      {displayRows.length === 0 ? (
        <p style={mutedStyle}>No SKU data available.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Product</th>
                <th style={thRightStyle}>Amount</th>
                <th style={thRightStyle}>Orders</th>
                <th style={thRightStyle}>Quantity</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, index) => {
                const skuLabel = `${title}_${String(row.Item || row.SKU || index)}`;

                return (
                  <tr key={index}>
                    <td style={tdStyle}>
                      <strong>{String(row.Item || row.SKU || "-")}</strong>
                    </td>
                    <td style={tdStyle}>
                      {String(row.ProductName || row.ItemDescription || "-")}
                    </td>
                    <td style={tdRightStyle}>{formatMoney(row.TotalAmount)}</td>
                    <td style={tdRightStyle}>
                      <OrderNumbersCell row={row} label={skuLabel} />
                    </td>
                    <td style={tdRightStyle}>{formatNumber(row.Quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DetailsSection>
  );
}

function CreditClaimDataQualityTable({
  rows,
}: {
  rows: Record<string, any>[];
}) {
  const displayRows = rows || [];

  return (
    <DetailsSection title="View Credit Note & Claim Data Quality">
      {displayRows.length === 0 ? (
        <p style={mutedStyle}>No Credit Note & Claim data quality issues.</p>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Issue</th>
                <th style={thRightStyle}>Rows</th>
                <th style={thStyle}>Severity</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((row, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{String(row.Issue || "-")}</td>
                  <td style={tdRightStyle}>{formatNumber(row.Rows)}</td>
                  <td style={tdStyle}>{String(row.Severity || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailsSection>
  );
}

function CreditClaimDocumentTypeBlock({
  title,
  section,
}: {
  title: string;
  section?: CreditClaimDocumentSection;
}) {
  if (!section) {
    return null;
  }

  const current = section.current_month || {};

  return (
    <>
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>

        <div style={gridStyle}>
          <KpiCard
            label={`${title} Amount`}
            value={current.total_amount}
            type="money"
          />

          <KpiCard
            label={`${title} Orders`}
            value={current.orders}
          />

          <KpiCard
            label={`${title} Clients`}
            value={current.clients}
          />

          <KpiCard
            label={`${title} Quantity`}
            value={current.quantity}
          />
        </div>
      </section>

      <CreditClaimSummaryTable
        title={`Top ${title} Reasons`}
        rows={section.top_reasons || []}
        labelKey="ReasonCategory"
      />

      <CreditClaimSummaryTable
        title={`Top ${title} Clients`}
        rows={section.top_clients || []}
        labelKey="ClientName"
      />

      <CreditClaimSummaryTable
        title={`Top ${title} Sales Channels`}
        rows={section.top_channels || []}
        labelKey="SalesChannel"
      />

      {title !== "Claim" && (
        <>
          <CreditClaimSummaryTable
            title={`Top ${title} Product Types`}
            rows={section.top_product_types || []}
            labelKey="ProductType"
          />

          <CreditClaimSkuTable
            title={`View Top ${title} SKUs`}
            rows={section.top_skus || []}
          />
        </>
      )}
    </>
  );
}

function CreditClaimSection({
  creditClaim,
  selectedMonthKey,
  selectedSalesMonth,
}: {
  creditClaim?: CreditClaimSnapshot;
  selectedMonthKey?: string;
  selectedSalesMonth?: MonthSnapshot;
}) {
  if (!creditClaim?.success) {
    return null;
  }

  const months = creditClaim.months || {};
  const selectedCreditClaimMonth =
    selectedMonthKey && months[selectedMonthKey]
      ? months[selectedMonthKey]
      : creditClaim.latest_month && months[creditClaim.latest_month]
        ? months[creditClaim.latest_month]
        : undefined;

  if (!selectedCreditClaimMonth) {
    return null;
  }

  const current = selectedCreditClaimMonth.current_month || {};
  const ytd = creditClaim.ytd || {};
  const selectedSales = Number(selectedSalesMonth?.current_month_kpi?.Sales || 0);
  const creditClaimRateOfSales = selectedSales > 0
    ? (Number(current.total_amount || 0) / selectedSales) * 100
    : null;

  const selectedTrendMonth = String(
    selectedMonthKey ||
    creditClaim.latest_month ||
    ""
  );

  const trendRows = Object.keys(months)
    .filter((yearMonth) => yearMonth <= selectedTrendMonth)
    .sort()
    .slice(-12)
    .map((yearMonth) => {
      const monthPayload = months[yearMonth]?.current_month || {};

      return {
        YearMonth: yearMonth,
        CreditNoteAmount: Number(monthPayload.credit_note_amount || 0),
        ClaimAmount: Number(monthPayload.claim_amount || 0),
      };
    });

  const documentSections = selectedCreditClaimMonth.document_type_sections || {};
  const creditNoteSection = documentSections["Credit Note"];
  const claimSection = documentSections["Claim"];

  return (
    <>
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Credit Note & Claim</h2>

        <p style={mutedStyle}>
          Credit Note and Claim data from warehouse 03B.
        </p>

        <p style={creditClaimNoticeStyle}>
          Missing Sales Channel is included as a separate group because it affects Credit Note / Claim analysis.
        </p>

        <div style={gridStyle}>
          <KpiCard
            label="Credit Note Amount"
            value={current.credit_note_amount}
            type="money"
          />

          <KpiCard
            label="Claim Amount"
            value={current.claim_amount}
            type="money"
          />

          <KpiCard
            label="Credit Note Orders"
            value={current.credit_note_orders}
          />

          <KpiCard
            label="Claim Orders"
            value={current.claim_orders}
          />
        </div>

        <div style={highlightGridStyle}>
          <KpiCard
            label="Total CN / Claim Amount"
            value={current.total_amount}
            type="money"
            tone="highlight"
          />

          <KpiCard
            label="Total CN / Claim Orders"
            value={current.orders}
            tone="highlight"
          />

          <KpiCard
            label="CN / Claim % of Sales"
            value={creditClaimRateOfSales}
            type="percent"
            tone="highlight"
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Credit Note & Claim YTD</h2>

        <div style={gridStyle}>
          <KpiCard
            label="YTD Credit Note Amount"
            value={ytd.credit_note_amount}
            type="money"
          />

          <KpiCard
            label="YTD Claim Amount"
            value={ytd.claim_amount}
            type="money"
          />

          <KpiCard
            label="YTD Credit Note Orders"
            value={ytd.credit_note_orders}
          />

          <KpiCard
            label="YTD Claim Orders"
            value={ytd.claim_orders}
          />
        </div>
      </section>

      <MiniDualLineChart
        title="Credit Note & Claim Monthly Amount Trend"
        rows={trendRows}
        xKey="YearMonth"
        firstKey="CreditNoteAmount"
        firstLabel="Credit Note"
        secondKey="ClaimAmount"
        secondLabel="Claim"
      />

      <CreditClaimDocumentTypeBlock
        title="Credit Note"
        section={creditNoteSection}
      />

      <CreditClaimDocumentTypeBlock
        title="Claim"
        section={claimSection}
      />

      <CreditClaimDataQualityTable
        rows={selectedCreditClaimMonth.data_quality || []}
      />
    </>
  );
}


function MiniAnchorNav() {
  const links = [
    { href: "#summary", label: "Summary" },
    { href: "#monthly", label: "Monthly" },
    { href: "#ytd", label: "YTD" },
    { href: "#trend", label: "Trend" },
    { href: "#channels", label: "Channels" },
    { href: "#countries", label: "Countries" },
    { href: "#products", label: "Products" },
    { href: "#clients", label: "Clients" },
    { href: "#credit-claim", label: "CN / Claim" },
    { href: "#inventory-risk", label: "Inventory" },
  ];

  return (
    <nav style={anchorNavStyle} aria-label="Dashboard sections">
      {links.map((link) => (
        <a key={link.href} href={link.href} style={anchorLinkStyle}>
          {link.label}
        </a>
      ))}
    </nav>
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
      <MiniAnchorNav />
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

        <div id="summary">
          <ExecutiveSummary
          selectedMonth={selectedMonth}
          current={current}
          previous={previous}
          currentYtd={currentYtd}
          previousYtd={previousYtd}
          />
        </div>

        <div id="data-quality">
          <DataQualityNotice selectedMonth={selectedMonth} />
        </div>


        <section id="monthly" style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Monthly Performance</h2>

          {hasDataQualityIssue(selectedMonth, "Missing / Zero Cost") && (
            <div style={marginWarningStyle}>
              Gross Profit and Gross Margin may be affected by missing or zero cost data.
              Please review the Data Quality section before using margin figures for final decisions.
            </div>
          )}

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

        <section id="ytd" style={sectionStyle}>
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

        <div id="trend">
          <MiniLineChart
          title="Monthly Sales Trend — Last 12 Months"
          rows={(snapshot.monthly_trend || [])
            .filter((row) => String(row.YearMonth || "") <= String(selectedMonthKey || ""))
            .slice(-12)}
          xKey="YearMonth"
          yKey="Sales"
          />
        </div>

        <div id="channels">
          <HorizontalBarChartSection
          title="Top Sales Channels by Sales"
          rows={selectedMonth.top_channels || []}
          labelKey="SalesChannel"
        />

        <DetailsSection title="View Sales Channel details">
          <SimpleTable
            title="Top Sales Channels"
            rows={selectedMonth.top_channels || []}
            labelKey="SalesChannel"
          />
        </DetailsSection>
        </div>

        <div id="countries">
          <HorizontalBarChartSection
          title="Top Countries by Sales"
          rows={selectedMonth.top_countries || []}
          labelKey="DeliveryCountry"
        />

        <DetailsSection title="View Country details">
          <SimpleTable
            title="Top Countries"
            rows={selectedMonth.top_countries || []}
            labelKey="DeliveryCountry"
          />
        </DetailsSection>
        </div>

        <div id="products">
          <HorizontalBarChartSection
          title="Top Product Types by Sales"
          rows={selectedMonth.top_product_types || []}
          labelKey="ProductType"
        />

        <DetailsSection title="View Product Type details">
          <SimpleTable
            title="Top Product Types"
            rows={selectedMonth.top_product_types || []}
            labelKey="ProductType"
          />
        </DetailsSection>

        <HorizontalBarChartSection
          title="Top Products by Sales"
          rows={selectedMonth.top_products || []}
          labelKey="ProductName"
        />

        <DetailsSection title="View Product details">
          <SimpleTable
            title="Top Products"
            rows={selectedMonth.top_products || []}
            labelKey="ProductName"
          />
        </DetailsSection>
        </div>

        <div id="clients">
          <HorizontalBarChartSection
          title="Top Clients by Sales"
          rows={selectedMonth.top_clients || []}
          labelKey="ClientName"
        />

        <DetailsSection title="View Client details">
          <SimpleTable
            title="Top Clients"
            rows={selectedMonth.top_clients || []}
            labelKey="ClientName"
          />
        </DetailsSection>
        </div>

        <div id="credit-claim">
          <CreditClaimSection
          creditClaim={snapshot.credit_claim}
          selectedMonthKey={selectedMonthKey}
          selectedSalesMonth={selectedMonth}
          />
        </div>

        <InventoryRiskSection inventoryRisk={snapshot.inventory_risk} />
      </div>
    </main>
  );
}


const downloadRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  margin: "12px 0 16px",
};

const downloadButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #1f2937",
  background: "#1f2937",
  color: "#ffffff",
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
};

const logicBoxStyle: React.CSSProperties = {
  border: "1px solid #dbe3ef",
  background: "#f8fafc",
  borderRadius: 14,
  padding: "14px 16px",
  margin: "14px 0 18px",
  color: "#1f2937",
};

const logicListStyle: React.CSSProperties = {
  margin: "10px 0 0",
  paddingLeft: 20,
  lineHeight: 1.65,
  fontSize: 13,
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f7f8",
  padding: "32px 32px 32px 178px",
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

const anchorNavStyle: React.CSSProperties = {
  position: "fixed",
  top: 32,
  left: 16,
  zIndex: 40,
  width: 126,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 10,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  boxShadow: "0 1px 6px rgba(15, 23, 42, 0.08)",
};

const anchorLinkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "7px 9px",
  borderRadius: 10,
  background: "#f9fafb",
  border: "1px solid #eef2f7",
  color: "#111827",
  textDecoration: "none",
  fontSize: 12,
  boxShadow: "none",
};

const sectionStyle: React.CSSProperties = {
  marginTop: 32,
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  background: "#fff",
  border: "1px solid #e6e6e6",
  borderRadius: 16,
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

const highlightCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: "#0f172a",
  border: "1px solid #0f172a",
  color: "#fff",
};

const highlightGridStyle: React.CSSProperties = {
  ...gridStyle,
  marginTop: 16,
};

const creditClaimNoticeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: "#777",
  fontSize: 13,
};

const highlightLabelStyle: React.CSSProperties = {
  ...labelStyle,
  color: "#cbd5e1",
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

const chartLegendStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  marginBottom: 10,
  fontSize: 13,
  color: "#374151",
};

const chartLegendItemStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
};

const legendDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  display: "inline-block",
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
  padding: "7px 9px",
  borderBottom: "1px solid rgba(0,0,0,0.12)",
  fontSize: 13,
};

const miniThRightStyle: React.CSSProperties = {
  ...miniThStyle,
  textAlign: "right",
};

const miniTdStyle: React.CSSProperties = {
  padding: "7px 9px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  fontSize: 13,
};

const miniTdRightStyle: React.CSSProperties = {
  ...miniTdStyle,
  textAlign: "right",
};

const marginWarningStyle: React.CSSProperties = {
  margin: "0 0 18px",
  border: "1px solid #f59e0b",
  background: "#fffbeb",
  color: "#92400e",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.5,
};

const reviewBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 8,
  padding: "2px 7px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 11,
  fontWeight: 700,
};

const qualitySummaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const qualitySummaryCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  border: "1px solid rgba(146,64,14,0.2)",
  borderRadius: 12,
  padding: 14,
};

const qualityIssueLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
};

const qualityIssueValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 26,
  lineHeight: 1,
};

const qualityDetailsStyle: React.CSSProperties = {
  marginTop: 14,
};

const detailsSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const detailsBoxStyle: React.CSSProperties = {
  marginTop: 12,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const detailsHeaderStyle: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 700,
  color: "#111827",
};

const orderDetailsStyle: React.CSSProperties = {
  position: "relative",
};

const orderSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
  color: "#2563eb",
  fontWeight: 700,
  listStyle: "none",
};

const orderPanelStyle: React.CSSProperties = {
  marginTop: 10,
  minWidth: 260,
  maxWidth: 420,
  maxHeight: 360,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
  padding: 12,
  textAlign: "left",
};

const orderPanelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const downloadLinkStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#2563eb",
  textDecoration: "none",
};

const orderListStyle: React.CSSProperties = {
  maxHeight: 260,
  overflowY: "auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 6,
};

const orderNumberStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 8,
  background: "#f9fafb",
  border: "1px solid #eef0f3",
  fontSize: 12,
  fontFamily: "monospace",
};