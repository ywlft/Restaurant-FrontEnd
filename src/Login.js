import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = ({ setIsLoggedIn, setRole }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error("Kullanıcı adı veya şifre hatalı");

    const data = await res.json();
    console.log("Login response:", data); // << rol ve username burada görünmeli

    // LocalStorage'a kaydet
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);       // ÖNEMLİ
    localStorage.setItem("username", data.username);

    setIsLoggedIn(true);
    setRole(data.role);

    navigate("/admin");
  } catch (err) {
    setError(err.message);
  }
};

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <form
        onSubmit={handleLogin}
        className="card p-4 shadow"
        style={{ minWidth: "320px" }}
      >
        <h3 className="text-center mb-3">Admin Girişi</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <input
          type="text"
          placeholder="Kullanıcı Adı"
          className="form-control mb-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Şifre"
          className="form-control mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary w-100">
          Giriş Yap
        </button>
      </form>
    </div>
  );
};

export default Login;
