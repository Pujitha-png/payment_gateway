import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createPayment, getOrderPublic, getPayment } from "../api/api";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id");

  const [order, setOrder] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successPaymentId, setSuccessPaymentId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    if (!orderIdParam) {
      setErrorMessage("Order not found");
      return;
    }

    getOrderPublic(orderIdParam)
      .then((response) => {
        setOrder(response.data);
        setErrorMessage("");
      })
      .catch(() => {
        setErrorMessage("Order not found");
      });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderIdParam]);

  const displayAmount = useMemo(() => {
    const amount = Number(order?.amount || 0);
    return `₹${(amount / 100).toFixed(2)}`;
  }, [order]);

  const payButtonLabel = useMemo(() => {
    const amount = Number(order?.amount || 0);
    return `Pay ₹${Math.round(amount / 100)}`;
  }, [order]);

  function resetStates() {
    setProcessing(false);
    setSuccessPaymentId("");
    setErrorMessage("");
  }

  async function startPolling(paymentId) {
    pollRef.current = setInterval(async () => {
      try {
        const response = await getPayment(paymentId);
        const status = response.data.status;
        if (status === "success") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setProcessing(false);
          setSuccessPaymentId(response.data.id);
          setErrorMessage("");
        }
        if (status === "failed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setProcessing(false);
          setSuccessPaymentId("");
          setErrorMessage(response.data.error_description || "Payment could not be processed");
        }
      } catch (error) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setProcessing(false);
        setSuccessPaymentId("");
        setErrorMessage("Payment could not be processed");
      }
    }, 2000);
  }

  async function submitUpi(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const vpa = form.vpa.value;

    resetStates();
    setProcessing(true);

    try {
      const createResponse = await createPayment({
        order_id: order.id,
        method: "upi",
        vpa,
      });
      await startPolling(createResponse.data.id);
    } catch (error) {
      setProcessing(false);
      setErrorMessage(error?.response?.data?.error?.description || "Payment could not be processed");
    }
  }

  async function submitCard(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const expiry = String(form.expiry.value || "").split("/");

    resetStates();
    setProcessing(true);

    try {
      const createResponse = await createPayment({
        order_id: order.id,
        method: "card",
        card: {
          number: form.number.value,
          expiry_month: expiry[0] || "",
          expiry_year: expiry[1] || "",
          cvv: form.cvv.value,
          holder_name: form.cardholder.value,
        },
      });
      await startPolling(createResponse.data.id);
    } catch (error) {
      setProcessing(false);
      setErrorMessage(error?.response?.data?.error?.description || "Payment could not be processed");
    }
  }

  return (
    <div className="checkout-shell">
      <div data-testid="checkout-container" className="checkout-card">
        <div data-testid="order-summary" className="order-summary">
          <h2 className="checkout-title">Complete Payment</h2>
          <div>
            <span>Amount: </span>
            <span data-testid="order-amount">{displayAmount}</span>
          </div>
          <div>
            <span>Order ID: </span>
            <span data-testid="order-id">{order?.id || orderIdParam || ""}</span>
          </div>
        </div>

        <div data-testid="payment-methods" className="method-row">
          <button
            data-testid="method-upi"
            data-method="upi"
            className={`method-btn ${selectedMethod === "upi" ? "active" : ""}`}
            onClick={() => setSelectedMethod("upi")}
          >
            UPI
          </button>
          <button
            data-testid="method-card"
            data-method="card"
            className={`method-btn ${selectedMethod === "card" ? "active" : ""}`}
            onClick={() => setSelectedMethod("card")}
          >
            Card
          </button>
        </div>

        <form
          data-testid="upi-form"
          className="method-form"
          style={{ display: selectedMethod === "upi" ? "block" : "none" }}
          onSubmit={submitUpi}
        >
          <input data-testid="vpa-input" name="vpa" placeholder="username@bank" type="text" required className="input" />
          <button data-testid="pay-button" type="submit" className="pay-button">{payButtonLabel}</button>
        </form>

        <form
          data-testid="card-form"
          className="method-form"
          style={{ display: selectedMethod === "card" ? "block" : "none" }}
          onSubmit={submitCard}
        >
          <input data-testid="card-number-input" name="number" placeholder="Card Number" type="text" required className="input" />
          <input data-testid="expiry-input" name="expiry" placeholder="MM/YY" type="text" required className="input" />
          <input data-testid="cvv-input" name="cvv" placeholder="CVV" type="text" required className="input" />
          <input data-testid="cardholder-name-input" name="cardholder" placeholder="Name on Card" type="text" required className="input" />
          <button data-testid="pay-button" type="submit" className="pay-button">{payButtonLabel}</button>
        </form>

        <div data-testid="processing-state" className="state-box" style={{ display: processing ? "block" : "none" }}>
          <div className="spinner"></div>
          <span data-testid="processing-message">Processing payment...</span>
        </div>

        <div data-testid="success-state" className="state-box state-success" style={{ display: successPaymentId ? "block" : "none" }}>
          <h2>Payment Successful!</h2>
          <div>
            <span>Payment ID: </span>
            <span data-testid="payment-id">{successPaymentId}</span>
          </div>
          <span data-testid="success-message">Your payment has been processed successfully</span>
        </div>

        <div data-testid="error-state" className="state-box state-error" style={{ display: errorMessage ? "block" : "none" }}>
          <h2>Payment Failed</h2>
          <span data-testid="error-message">{errorMessage || "Payment could not be processed"}</span>
          <button
            data-testid="retry-button"
            type="button"
            className="method-btn"
            onClick={() => {
              setErrorMessage("");
              setSuccessPaymentId("");
              setProcessing(false);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
