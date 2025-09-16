import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const AdminPanel = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");


function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Payload = token.split(".")[1];
    const jsonPayload = atob(base64Payload); // base64 decode
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT decode error", e);
    return null;
  }
}

const payload = parseJwt(token);
const role = payload.role;
console.log(payload.sub);
  useEffect(() => {
    
    // Eğer token yoksa veya ADMIN değilse login'e at
    if (!token || !(payload.role === "ROLE_ADMIN" || payload.role==="ROLE_USER")) {
      navigate("/login");
     
    }
  }, [token, role, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const buttons = [
    { label: "Rezervasyonlar", path: "/reservations" },
    { label: "Masalar", path: "/table" },
    { label: "Müşteriler", path: "/customer" },
    { label: "Kullanıcılar", path: "/users" }, // user linki
  ];

  return (
    <div className="container" style={{ paddingTop: "50px", textAlign: "center" }}>
      <h1 className="mb-4">Hoş Geldin, {payload.sub} 👋</h1>
      <p className="mb-4">Lütfen aşağıdaki menüden işlem seçiniz:</p>

      <div className="d-flex flex-wrap justify-content-center gap-3 mb-4">
        {buttons.map((btn) => (
          <button
            key={btn.path}
            className="btn btn-outline-primary px-4 py-2"
            onClick={() => navigate(btn.path)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <button className="btn btn-danger" onClick={handleLogout}>
        Çıkış Yap
      </button>
    </div>
  );
};

export default AdminPanel;
