import React, { useEffect, useState } from "react";
import { USERS_API_URL } from "./api";

/** JWT Decode Helper */
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Payload = token.split(".")[1];
    const jsonPayload = atob(base64Payload);
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT decode error", e);
    return null;
  }
}

/** Modal Component */
function UserModal({ type, data, onClose, onSubmit, formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const title =
    type === "add"
      ? "Yeni Kullanıcı Ekle"
      : type === "edit"
      ? "Kullanıcı Düzenle"
      : "Kullanıcı Silme Onayı";

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {(type === "add" || type === "edit") && (
              <>
                <input
                  type="text"
                  className="form-control mb-2"
                  name="username"
                  placeholder="Kullanıcı Adı"
                  value={formData.username}
                  onChange={handleChange}
                />
                <input
                  type="password"
                  className="form-control mb-2"
                  name="password"
                  placeholder="Şifre"
                  value={formData.password}
                  onChange={handleChange}
                />
                <select
                  className="form-select"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="ROLE_USER">USER</option>
                  <option value="ROLE_ADMIN">ADMIN</option>
                </select>
              </>
            )}
            {type === "delete" && (
              <p>
                Kullanıcı <strong>{data.username}</strong> silinecek. Emin misiniz?
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            {(type === "add" || type === "edit") && (
              <button
                className={`btn btn-${type === "add" ? "success" : "primary"}`}
                onClick={onSubmit}
              >
                {type === "add" ? "Ekle" : "Kaydet"}
              </button>
            )}
            {type === "delete" && (
              <button className="btn btn-danger" onClick={onSubmit}>
                Sil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Main User Page */
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ type: null, data: null });
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "ROLE_USER",
  });
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");

  // JWT'den kullanıcı ve rolü al
  useEffect(() => {
    if (!token) {
      setError("Token bulunamadı, lütfen giriş yapın.");
      return;
    }

    const payload = parseJwt(token);
    if (!payload || payload.role !== "ROLE_ADMIN") {
      setError("Bu sayfayı sadece ADMIN görebilir.");
      return;
    }

    setUsername(payload.sub);
    setRole(payload.role);

  }, [token]);

  // Kullanıcıları getir
  const fetchUsers = async () => {
    try {
      const res = await fetch(USERS_API_URL, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Kullanıcılar alınamadı");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (role === "ROLE_ADMIN") fetchUsers();
  }, [role]);

  const handleModalSubmit = async () => {
    try {
      let res;
      if (modal.type === "add") {
        res = await fetch(USERS_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else if (modal.type === "edit") {
        res = await fetch(`${USERS_API_URL}/${modal.data.id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else if (modal.type === "delete") {
        res = await fetch(`${USERS_API_URL}/${modal.data.id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        });
      }

      if (!res.ok) throw new Error("İşlem başarısız");

      setModal({ type: null, data: null });
      setFormData({ username: "", password: "", role: "ROLE_USER" });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container my-4">
      <h2 className="mb-3">
        Kullanıcı Yönetimi {username && `- Hoş Geldin, ${username}`}
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {role === "ROLE_ADMIN" ? (
        <>
          <button
            className="btn btn-success mb-2"
            onClick={() => {
              setFormData({ username: "", password: "", role: "ROLE_USER" });
              setModal({ type: "add", data: null });
            }}
          >
            Yeni Kullanıcı Ekle
          </button>

          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Kullanıcı Adı</th>
                <th>Role</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.role.replace("ROLE_", "")}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm me-1"
                      onClick={() => {
                        setFormData({
                          username: u.username,
                          password: "",
                          role: u.role,
                        });
                        setModal({ type: "edit", data: u });
                      }}
                    >
                      Düzenle
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setModal({ type: "delete", data: u })}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {modal.type && (
            <UserModal
              type={modal.type}
              data={modal.data}
              onClose={() => setModal({ type: null, data: null })}
              onSubmit={handleModalSubmit}
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </>
      ) : (
        <div className="alert alert-warning">
          Bu sayfayı sadece <strong>ADMIN</strong> görebilir.
        </div>
      )}
    </div>
  );
}
