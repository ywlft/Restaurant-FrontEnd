import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import ReservationPage from "./ReservationPage";
import CustomerPage from "./Customer";
import Table from "./Table";
import Login from "./Login";
import AdminPanel from "./AdminPanel";
import PrivateRoute from "./PrivateRoute";
import UsersPage from "./UserPage"; // kullanıcı yönetim sayfası

const Root = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(""); // "ADMIN" veya "USER"

  return (
    <BrowserRouter>
      <Routes>
        {/* Ana sayfa: herkes görebilir */}
        <Route path="/" element={<App />} />
        {/* Login */}
        <Route
          path="/login"
          element={<Login setIsLoggedIn={setIsLoggedIn} setRole={setRole} />}
        />

        {/* Admin Panel */}
        <Route
          path="/admin"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} role={role} requiredRole="ROLE_ADMIN">
              <AdminPanel setIsLoggedIn={setIsLoggedIn} />
            </PrivateRoute>
          }
        />

        {/* Admin Customer Page */}
        <Route
          path="/customer"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} role={role} requiredRole="ROLE_ADMIN">
              <CustomerPage />
            </PrivateRoute>
          }
        />

        {/* Admin Table Page */}
        <Route
          path="/table"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} role={role} requiredRole="ROLE_ADMIN">
              <Table />
            </PrivateRoute>
          }
        />

        {/* Admin Reservations Page */}
        <Route
          path="/reservations"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} role={role} requiredRole="ROLE_ADMIN">
              <ReservationPage />
            </PrivateRoute>
          }
        />

        {/* Admin Users Page */}
        <Route
          path="/users"
          element={
            <PrivateRoute isLoggedIn={isLoggedIn} role={role} requiredRole="ROLE_ADMIN">
              <UsersPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Root />);
