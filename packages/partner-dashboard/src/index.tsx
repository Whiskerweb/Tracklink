import { useEffect, useState } from "react";

interface PartnerDashboardProps {
  token: string;
  apiBaseUrl?: string;
}

interface AnalyticsData {
  summary: {
    clicks: number;
    leads: number;
    sales: number;
    earnings: number;
  };
  timeline: Array<{
    date: string;
    clicks: number;
    leads: number;
    sales: number;
    earnings: number;
  }>;
}

export function PartnerDashboard({ token, apiBaseUrl = "http://localhost:4000" }: PartnerDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // First, get partner ID from token
        const tokenResponse = await fetch(`${apiBaseUrl}/partners/embed-token/${token}`);
        if (!tokenResponse.ok) {
          throw new Error("Invalid token");
        }

        const tokenData = await tokenResponse.json();
        const partnerId = tokenData.partnerId;

        // Then fetch analytics
        const analyticsResponse = await fetch(`${apiBaseUrl}/partners/${partnerId}/analytics`);
        if (!analyticsResponse.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const analytics = await analyticsResponse.json();
        setData(analytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [token, apiBaseUrl]);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <h2>Partner Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "40px" }}>
        <div style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Clicks</h3>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>{data.summary.clicks.toLocaleString()}</p>
        </div>

        <div style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Leads</h3>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>{data.summary.leads.toLocaleString()}</p>
        </div>

        <div style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Sales</h3>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>{data.summary.sales.toLocaleString()}</p>
        </div>

        <div style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>Earnings</h3>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>
            ${data.summary.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div>
        <h3>Timeline</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Date</th>
              <th style={{ textAlign: "right", padding: "10px" }}>Clicks</th>
              <th style={{ textAlign: "right", padding: "10px" }}>Leads</th>
              <th style={{ textAlign: "right", padding: "10px" }}>Sales</th>
              <th style={{ textAlign: "right", padding: "10px" }}>Earnings</th>
            </tr>
          </thead>
          <tbody>
            {data.timeline.map((item) => (
              <tr key={item.date} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{new Date(item.date).toLocaleDateString()}</td>
                <td style={{ textAlign: "right", padding: "10px" }}>{item.clicks}</td>
                <td style={{ textAlign: "right", padding: "10px" }}>{item.leads}</td>
                <td style={{ textAlign: "right", padding: "10px" }}>{item.sales}</td>
                <td style={{ textAlign: "right", padding: "10px" }}>
                  ${item.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

