import { useEffect, useState } from "react";
import API from "../api/api";

export default function Transactions() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    API.get("/payments")
      .then((res) => setPayments(res.data || []))
      .catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: "900px", margin: "30px auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Transactions</h2>
      <div style={{ overflowX: "auto" }}>
        <table
          data-test-id="transactions-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#007bff", color: "#fff" }}>
              <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>Payment ID</th>
              <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>Order ID</th>
              <th style={{ padding: "12px", textAlign: "right", border: "1px solid #ddd" }}>Amount</th>
              <th style={{ padding: "12px", textAlign: "center", border: "1px solid #ddd" }}>Method</th>
              <th style={{ padding: "12px", textAlign: "center", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "12px", textAlign: "center", border: "1px solid #ddd" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px", border: "1px solid #ddd" }}>
                  No transactions found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.id}
                  data-test-id="transaction-row"
                  data-payment-id={p.id}
                  style={{
                    borderBottom: "1px solid #ddd",
                    backgroundColor: "#fff",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
                >
                  <td data-test-id="payment-id" style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {p.id}
                  </td>
                  <td data-test-id="order-id" style={{ padding: "10px", border: "1px solid #ddd" }}>
                    {p.order_id}
                  </td>
                  <td data-test-id="amount" style={{ padding: "10px", textAlign: "right", border: "1px solid #ddd" }}>
                    ₹{p.amount}
                  </td>
                  <td data-test-id="method" style={{ padding: "10px", textAlign: "center", border: "1px solid #ddd" }}>
                    {p.method.toUpperCase()}
                  </td>
                  <td
                    data-test-id="status"
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      color: p.status === "success" ? "green" : p.status === "failed" ? "red" : "#555",
                      fontWeight: "bold",
                      border: "1px solid #ddd",
                    }}
                  >
                    {p.status.toUpperCase()}
                  </td>
                  <td data-test-id="created-at" style={{ padding: "10px", textAlign: "center", border: "1px solid #ddd" }}>
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
