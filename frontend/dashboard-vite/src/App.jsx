import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Webhooks from "./pages/Webhooks";
import Docs from "./pages/Docs";
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

        <Route
          path="/dashboard/webhooks"
          element={
            <>
              <Navbar app="dashboard" />
              <Webhooks />
            </>
          }
        />

        <Route
          path="/dashboard/docs"
          element={
            <>
              <Navbar app="dashboard" />
              <Docs />
            </>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
