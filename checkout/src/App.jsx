import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Checkout from "./pages/Checkout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
