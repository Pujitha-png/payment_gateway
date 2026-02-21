import { useEffect, useState } from "react";
import { getPayments } from "../api/api";

export default function Dashboard() {
  const [merchant, setMerchant] = useState({});
  const [stats, setStats] = useState({ totalTransactions: 0, totalAmount: 0, successRate: 0 });

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("merchant") || "{}");
    setMerchant(stored);

    getPayments()
      .then((res) => {
        const payments = res.data || [];
        const successful = payments.filter((payment) => payment.status === "success");
        const totalTransactions = payments.length;
        const totalAmount = successful.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const successRate = totalTransactions === 0 ? 0 : Math.round((successful.length / totalTransactions) * 100);
        setStats({ totalTransactions, totalAmount, successRate });
      })
      .catch(() => {
        setStats({ totalTransactions: 0, totalAmount: 0, successRate: 0 });
      });
  }, []);

  return (
    <div className="page fade-in">
      <div className="layout-wrap">
        <div data-testid="dashboard" className="rise-in">
          <h1 className="page-title">Merchant Dashboard</h1>

          <div data-testid="api-credentials" className="card info-card">
            <div className="credential-grid">
              <div className="credential-item">
                <label>API Key</label>
                <span data-testid="api-key" className="credential-value">{merchant.api_key || ""}</span>
              </div>
              <div className="credential-item">
                <label>API Secret</label>
                <span data-testid="api-secret" className="credential-value">{merchant.api_secret || ""}</span>
              </div>
            </div>
          </div>

          <div data-testid="stats-container" className="stats-grid section-gap">
            <div className="stat-card">
              <div className="stat-label">Total Transactions</div>
              <div data-testid="total-transactions" className="stat-value">{stats.totalTransactions}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Successful Volume</div>
              <div data-testid="total-amount" className="stat-value">₹{Math.round(stats.totalAmount / 100).toLocaleString("en-IN")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Success Rate</div>
              <div data-testid="success-rate" className="stat-value">{stats.successRate}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
