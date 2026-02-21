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

    if (email === "test@example.com" && password.length > 0) {
      try {
        const res = await getTestMerchant();
        const merchant = {
          ...res.data,
          api_secret: res.data.api_secret || "secret_test_xyz789",
        };
        localStorage.setItem("merchant", JSON.stringify(merchant));
        navigate("/dashboard");
      } catch (err) {
        setError("Failed to fetch merchant data. Try again.");
      }
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="card auth-card">
        <h2 className="page-title">Merchant Login</h2>
        <p className="subtitle auth-note">Sign in to access your dashboard.</p>
        <form data-testid="login-form" className="form" onSubmit={handleLogin}>
          <input
            data-testid="email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            data-testid="password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
          <button
            data-testid="login-button"
            type="submit"
            className="button-primary"
          >
            Login
          </button>

          {error && (
            <div data-testid="error-message" className="error-text">
              {error}
            </div>
          )}
        </form>
        <p className="subtitle helper-text">
          Use <b>test@example.com</b> with any password
        </p>
      </div>
    </div>
  );
}
