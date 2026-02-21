import { useNavigate } from "react-router-dom";

export default function Navbar({ app = "dashboard" }) {
  const navigate = useNavigate();
  const merchant = JSON.parse(localStorage.getItem("merchant") || "{}");
  const isDashboard = app === "dashboard";

  const handleLogout = () => {
    localStorage.removeItem("merchant");
    navigate("/login");
  };

  return (
    <nav className="panel navbar-shell">
      <button type="button" className="nav-brand" onClick={() => navigate(isDashboard ? "/dashboard" : "/checkout")}>
        {isDashboard ? "Gateway Console" : "Checkout"}
      </button>

      {isDashboard ? (
        <div className="navbar-actions">
          <span className="nav-user">{merchant.name || "Merchant"}</span>
          <button onClick={handleLogout} className="button-ghost">
            Logout
          </button>
        </div>
      ) : (
        <button onClick={() => navigate(-1)} className="button-ghost">
          Back
        </button>
      )}
    </nav>
  );
}
