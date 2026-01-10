import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getOrderPublic, createPayment, getPayment } from "../api/api";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState(null);
  const [showForm, setShowForm] = useState(null); // 'upi' | 'card'
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    getOrderPublic(orderId)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Order not found"));
  }, [orderId]);

  const handlePayment = async (method, paymentDetails) => {
    if (!order) return;

    setProcessing(true);
    setSuccess(null);
    setError(null);

    const body = { order_id: order.id, method };
    if (method === "upi") body.vpa = paymentDetails.vpa;
    if (method === "card") body.card = paymentDetails;

    try {
      const res = await createPayment(body);
      const paymentId = res.data.id;

      const poll = setInterval(async () => {
        const statusRes = await getPayment(paymentId);
        if (statusRes.data.status !== "processing") {
          clearInterval(poll);
          setProcessing(false);

          if (statusRes.data.status === "success") {
            setSuccess(statusRes.data);
          } else {
            setError("Payment failed");
          }
        }
      }, 2000);
    } catch {
      setProcessing(false);
      setError("Payment failed");
    }
  };

  return (
    <div
      data-test-id="checkout-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #42a5f5, #478ed1)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Segoe UI, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "28px",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
        }}
      >
        {!order && !error && <div style={{ textAlign: "center" }}>Loading order...</div>}

        {order && (
          <>
            {/* ORDER SUMMARY */}
            <div
              data-test-id="order-summary"
              style={{
                marginBottom: "20px",
                borderBottom: "1px solid #eee",
                paddingBottom: "12px",
                textAlign: "center",
              }}
            >
              <h2 style={{ marginBottom: "10px", color: "#1976d2" }}>Complete Payment</h2>
              <div style={{ fontSize: "14px", color: "#555" }}>
                <div>
                  Amount:{" "}
                  <strong data-test-id="order-amount">₹500</strong>
                </div>
                <div>
                  Order ID:{" "}
                  <span data-test-id="order-id">{order.id}</span>
                </div>
              </div>
            </div>

            {/* PAYMENT METHODS */}
            <div
              data-test-id="payment-methods"
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <button
                data-test-id="method-upi"
                onClick={() => setShowForm("upi")}
                style={methodButtonStyle(showForm === "upi")}
              >
                UPI
              </button>
              <button
                data-test-id="method-card"
                onClick={() => setShowForm("card")}
                style={methodButtonStyle(showForm === "card")}
              >
                Card
              </button>
            </div>

            {/* UPI FORM */}
            {showForm === "upi" && (
              <form
                data-test-id="upi-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePayment("upi", { vpa: e.target.vpa.value });
                }}
              >
                <input
                  data-test-id="vpa-input"
                  name="vpa"
                  placeholder="username@bank"
                  required
                  style={inputStyle}
                />
                <button
                  data-test-id="pay-button"
                  type="submit"
                  style={{ ...payButtonStyle, display: "block", margin: "0 auto" }}
                >
                  Pay ₹500
                </button>
              </form>
            )}

            {/* CARD FORM */}
            {showForm === "card" && (
              <form
                data-test-id="card-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const card = {
                    number: e.target.number.value,
                    expiry_month: e.target.expiry.value.split("/")[0],
                    expiry_year: e.target.expiry.value.split("/")[1],
                    cvv: e.target.cvv.value,
                    holder_name: e.target.name.value,
                  };
                  handlePayment("card", card);
                }}
              >
                <input
                  data-test-id="card-number-input"
                  name="number"
                  placeholder="Card Number"
                  required
                  style={inputStyle}
                />
                <input
                  data-test-id="expiry-input"
                  name="expiry"
                  placeholder="MM/YY"
                  required
                  style={inputStyle}
                />
                <input
                  data-test-id="cvv-input"
                  name="cvv"
                  placeholder="CVV"
                  required
                  style={inputStyle}
                />
                <input
                  data-test-id="cardholder-name-input"
                  name="name"
                  placeholder="Name on Card"
                  required
                  style={inputStyle}
                />
                <button
                  data-test-id="pay-button"
                  type="submit"
                  style={{ ...payButtonStyle, display: "block", margin: "0 auto" }}
                >
                  Pay ₹500
                </button>
              </form>
            )}

            {/* STATES */}
            {processing && (
              <div
                data-test-id="processing-state"
                style={{
                  marginTop: "15px",
                  color: "#f39c12",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                <span data-test-id="processing-message">Processing payment...</span>
              </div>
            )}

            {success && (
              <div
                data-test-id="success-state"
                style={{
                  marginTop: "15px",
                  color: "green",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                <div data-test-id="payment-id">{success.id}</div>
                <div data-test-id="success-message">Payment Successful 🎉</div>
              </div>
            )}

            {error && (
              <div
                data-test-id="error-state"
                style={{
                  marginTop: "15px",
                  color: "red",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
                <span data-test-id="error-message">{error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =======================
   STYLES
======================= */
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  transition: "border 0.2s ease",
};

const payButtonStyle = {
  width: "100%",
  padding: "12px",
  background: "linear-gradient(135deg, #1976d2, #1565c0)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "background 0.3s ease",
};

const methodButtonStyle = (active) => ({
  flex: 1,
  padding: "12px",
  borderRadius: "8px",
  border: active ? "2px solid #1976d2" : "1px solid #ccc",
  background: active ? "#eaf2ff" : "#f9f9f9",
  cursor: "pointer",
  fontWeight: active ? "600" : "500",
  transition: "all 0.2s ease",
});