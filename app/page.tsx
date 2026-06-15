type SnapshotData = {
  test?: boolean;
  source?: string;
  last_updated?: string;
  generated_at?: string;
  latest_month?: string;
  months?: Record<string, any>;
};

async function getSnapshot(): Promise<SnapshotData> {
  const snapshotUrl = process.env.NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL;

  if (!snapshotUrl) {
    return {
      source: "Missing NEXT_PUBLIC_DASHBOARD_SNAPSHOT_URL",
    };
  }

  const response = await fetch(snapshotUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      source: `Failed to load snapshot: ${response.status}`,
    };
  }

  return response.json();
}

export default async function Home() {
  const snapshot = await getSnapshot();

  const availableMonths = snapshot.months
    ? Object.keys(snapshot.months).sort().reverse()
    : [];

  const latestMonth =
    snapshot.latest_month || availableMonths[0] || "No month data yet";

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ color: "#666", marginBottom: 8 }}>Sales Report Live</p>

        <h1 style={{ fontSize: 36, margin: 0 }}>
          Dashboard Snapshot
        </h1>

        <p style={{ color: "#666", marginTop: 12 }}>
          This page reads the latest dashboard snapshot published from the
          local Sales Report app.
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          <div style={cardStyle}>
            <p style={labelStyle}>Status</p>
            <h2 style={valueStyle}>Connected</h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>Source</p>
            <h2 style={valueStyle}>{snapshot.source || "Snapshot"}</h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>Latest month</p>
            <h2 style={valueStyle}>{latestMonth}</h2>
          </div>

          <div style={cardStyle}>
            <p style={labelStyle}>Available months</p>
            <h2 style={valueStyle}>{availableMonths.length}</h2>
          </div>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2>Raw snapshot preview</h2>
          <pre
            style={{
              background: "#111",
              color: "#f5f5f5",
              padding: 16,
              borderRadius: 12,
              overflowX: "auto",
              fontSize: 13,
            }}
          >
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}

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
  fontSize: 24,
};