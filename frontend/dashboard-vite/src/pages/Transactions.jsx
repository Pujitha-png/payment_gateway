import { useEffect, useState } from "react";
import { getPayments } from "../api/api";

export default function Transactions() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    getPayments()
      .then((res) => setPayments(res.data || []))
      .catch(() => setPayments([]));
  }, []);

  return (
    <div className="page fade-in">
      <div className="layout-wrap wide">
        <h2 className="page-title">Transactions</h2>
        <div className="table-wrap">
          <table data-testid="transactions-table" className="table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} data-testid="transaction-row" data-payment-id={payment.id}>
                  <td data-testid="payment-id">{payment.id}</td>
                  <td data-testid="order-id">{payment.order_id}</td>
                  <td data-testid="amount">₹{Math.round(Number(payment.amount || 0) / 100).toLocaleString("en-IN")}</td>
                  <td data-testid="method">{payment.method}</td>
                  <td data-testid="status">
                    <span className={`tag ${payment.status}`}>{payment.status}</span>
                  </td>
                  <td data-testid="created-at">{new Date(payment.created_at).toLocaleString("sv-SE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
