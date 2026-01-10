import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTestMerchant } from "../api/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [error, setError] = useState(""); 
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (email === "test@example.com" && password === "test123") {
      try {
        const res = await getTestMerchant();
        localStorage.setItem("merchant", JSON.stringify(res.data));
        navigate("/dashboard");
      } catch (err) {
        setError("Failed to fetch merchant data. Try again.");
      }
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #42a5f5, #478ed1)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px 30px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "400px"
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#1976d2" }}>Merchant Login</h2>
        <form data-test-id="login-form" onSubmit={handleLogin}>
          <input
            data-test-id="email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "1rem"
            }}
          />
          <input
            data-test-id="password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "1rem"
            }}
          />
          <button
            data-test-id="login-button"
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              background: "#1976d2",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => (e.target.style.background = "#1565c0")}
            onMouseOut={(e) => (e.target.style.background = "#1976d2")}
          >
            Login
          </button>

          {error && (
            <div
              data-test-id="error-message"
              style={{
                color: "red",
                marginTop: "15px",
                textAlign: "center",
                fontWeight: "bold"
              }}
            >
              {error}
            </div>
          )}
        </form>
        <p style={{ marginTop: "20px", textAlign: "center", color: "#555" }}>
          Use <b>test@example.com</b> / password <b>test123</b>
        </p>
      </div>
    </div>
  );
}
