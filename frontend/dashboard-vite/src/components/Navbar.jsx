import { useNavigate } from "react-router-dom";

export default function Navbar({ app = "dashboard" }) {
  const navigate = useNavigate();
  const merchant = JSON.parse(localStorage.getItem("merchant") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("merchant");
    navigate("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#1976d2",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div style={{ fontWeight: "bold", fontSize: "1.2rem", cursor: "pointer" }} onClick={() => navigate(app === "dashboard" ? "/dashboard" : "/checkout")}>
        {app === "dashboard" ? "Payment Dashboard" : "Checkout"}
      </div>

      {app === "dashboard" ? (
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem" }}>Hello, {merchant.name || "Merchant"}</span>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#fff",
              color: "#1976d2",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onMouseOver={(e) => { e.target.style.backgroundColor = "#f0f0f0"; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = "#fff"; }}
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: "#fff",
            color: "#1976d2",
            border: "none",
            borderRadius: "6px",
            padding: "6px 12px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onMouseOver={(e) => { e.target.style.backgroundColor = "#f0f0f0"; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = "#fff"; }}
        >
          Back
        </button>
      )}
    </nav>
  );
}
