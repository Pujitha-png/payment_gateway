import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Navbar from "./components/Navbar"; // Make sure Navbar exists

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Wrap pages with Navbar */}
        <Route
          path="/dashboard"
          element={
            <>
              <Navbar app="dashboard" /> {/* Navbar with dashboard buttons */}
              <Dashboard />
            </>
          }
        />

        <Route
          path="/dashboard/transactions"
          element={
            <>
              <Navbar app="dashboard" />
              <Transactions />
            </>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
