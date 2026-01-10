import { useEffect, useState } from "react";
import API, { getPayments } from "../api/api";

export default function Dashboard() {
  const [merchant, setMerchant] = useState({});
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total: 0, amount: 0, successRate: 0 });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("merchant") || "{}");
    setMerchant(stored);

    getPayments()
      .then((res) => {
        setPayments(res.data || []);
        const total = res.data.length;
        const successPayments = res.data.filter((p) => p.status === "success");
        const amount = successPayments.reduce((sum, p) => sum + p.amount, 0);
        const successRate =
          total > 0 ? Math.round((successPayments.length / total) * 100) : 0;
        setStats({ total, amount, successRate });
      })
      .catch(console.error);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#f0f2f5",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "800px",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "20px",
            color: "#2c3e50",
            fontSize: "1.8rem",
            fontWeight: "600",
          }}
        >
          Merchant Dashboard
        </h1>

        {/* API Credentials */}
        <div
          style={{
            marginBottom: "20px",
            background: "#fafafa",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
          }}
        >
          <h2
            style={{
              marginBottom: "10px",
              fontSize: "1.1rem",
              color: "#34495e",
              borderBottom: "1px solid #ddd",
              paddingBottom: "5px",
            }}
          >
            API Credentials
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "0.95rem",
            }}
          >
            <div>
              <strong>API Key:</strong>{" "}
              <span style={{ color: "#555" }}>{merchant.api_key || "N/A"}</span>
            </div>
            <div>
              <strong>API Secret:</strong>{" "}
              <span style={{ color: "#555" }}>{merchant.api_secret || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              flex: "1 1 30%",
              background: "#e3f2fd",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #bbdefb",
            }}
          >
            <h4 style={{ margin: "0 0 5px", color: "#1976d2" }}>Transactions</h4>
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>{stats.total}</p>
          </div>
          <div
            style={{
              flex: "0 1 20%", // reduced size of middle card
              background: "#e8f5e9",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #c8e6c9",
            }}
          >
            <h4 style={{ margin: "0 0 5px", color: "#388e3c" }}>Amount</h4>
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>₹{stats.amount}</p>
          </div>
          <div
            style={{
              flex: "1 1 30%",
              background: "#fff3e0",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              border: "1px solid #ffe0b2",
            }}
          >
            <h4 style={{ margin: "0 0 5px", color: "#f57c00" }}>Success Rate</h4>
            <p style={{ fontSize: "1.1rem", fontWeight: "600" }}>
              {stats.successRate}%
            </p>
          </div>
        </div>

        {/* Recent Payments Table */}
        <div>
          <h2
            style={{
              marginBottom: "10px",
              color: "#2c3e50",
              fontSize: "1.2rem",
              borderBottom: "1px solid #ddd",
              paddingBottom: "5px",
            }}
          >
            Recent Payments
          </h2>
          {payments.length === 0 ? (
            <p style={{ color: "#777" }}>No payments yet.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
                fontSize: "0.9rem",
              }}
            >
              <thead style={{ background: "#1976d2", color: "#fff" }}>
                <tr>
                  <th style={{ padding: "10px" }}>Payment ID</th>
                  <th style={{ padding: "10px" }}>Order ID</th>
                  <th style={{ padding: "10px" }}>Amount</th>
                  <th style={{ padding: "10px" }}>Method</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      textAlign: "center",
                      background: i % 2 === 0 ? "#fafafa" : "#fff",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <td style={{ padding: "10px" }}>{p.id}</td>
                    <td style={{ padding: "10px" }}>{p.order_id}</td>
                    <td style={{ padding: "10px" }}>₹{p.amount}</td>
                    <td style={{ padding: "10px" }}>{p.method}</td>
                    <td
                      style={{
                        padding: "10px",
                        fontWeight: "bold",
                        color:
                          p.status === "success"
                            ? "green"
                            : p.status === "failed"
                            ? "red"
                            : "orange",
                      }}
                    >
                      {p.status}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
