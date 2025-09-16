import React, { useEffect, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useNavigate } from "react-router-dom";
import { RESERVATIONS_API_URL } from "./api";
import * as XLSX from "xlsx";

import { AD_CUSTOMERS_API_URL } from "./api";

/** API fetch wrapper */
async function safeFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const parsed = JSON.parse(text);
      msg = parsed?.message || parsed?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  if (contentType.includes("application/json") && text) {
    return JSON.parse(text);
  }
  return null;
}

/** ✅ ALERT COMPONENT */
const AlertMsg = ({ type, message }) =>
  message ? <div className={`alert alert-${type} my-2`}>{message}</div> : null;

export default function AdminCustomerPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [editCustomer, setEditCustomer] = useState({ name: "", email: "", phone: "" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showReservations, setShowReservations] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  /** ✅ Fetch customers */
  const fetchCustomers = useCallback(async () => {
    try {
      const data = await safeFetch(AD_CUSTOMERS_API_URL);
      setCustomers(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err) {
      setError("Müşteriler alınamadı: " + err.message);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  /** ✅ Helpers */
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  /** ✅ CRUD */
  const handleAddCustomer = async () => {
    if (!newCustomer.name) return setError("Müşteri adı gerekli");
    try {
      const payload = { ...newCustomer, createdAt: new Date().toISOString() };
      const created = await safeFetch(AD_CUSTOMERS_API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCustomers(p => [...p, created]);
      setNewCustomer({ name: "", email: "", phone: "" });
      showSuccess("Müşteri eklendi");
    } catch (err) { setError("Müşteri eklenemedi: " + err.message); }
  };

  const handleUpdateCustomer = async (id) => {
    try {
      const updated = await safeFetch(`${AD_CUSTOMERS_API_URL}/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCustomer),
      });
      setCustomers(p => p.map(c => c.id === id ? updated : c));
      setEditCustomerId(null);
      showSuccess("Müşteri güncellendi");
    } catch (err) { setError("Müşteri güncellenemedi: " + err.message); }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await safeFetch(`${AD_CUSTOMERS_API_URL}/${id}`, { method: "DELETE" });
      setCustomers(p => p.filter(c => c.id !== id));
      showSuccess("Müşteri silindi");
    } catch (err) { setError("Müşteri silinemedi: " + err.message); }
  };

  /** ✅ Filters & Export */
  const filteredCustomers = customers.filter(c =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const exportExcel = () => {
    const data = filteredCustomers.map(c => ({
      ID: c.id, Ad: c.name, Email: c.email, Telefon: c.phone,
      "Eklenme Tarihi": c.createdAt,
      "Rezervasyon Sayısı": c.reservations?.length || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customers.xlsx");
  };

  return (
    <div className="container my-4">
      {/* ✅ NAVBAR */}
      <nav className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <Link to="/reservations" className="btn btn-outline-primary me-2">Rezervasyonlar</Link>
          <Link to="/customer" className="btn btn-outline-secondary me-2">Müşteriler</Link>
          <Link to="/table" className="btn btn-outline-primary me-2">Masalar</Link>
          <button className="btn btn-danger" onClick={() => navigate("/")}>Çıkış</button>
        </div>
      </nav>

      <h2 className="mb-3">Müşteriler (Admin)</h2>

      {/* ✅ Add Customer */}
      <div className="mb-3 d-flex flex-wrap gap-2">
        {["name", "email", "phone"].map(field => (
          <input key={field} type={field==="email"?"email":"text"}
            className="form-control me-2" placeholder={field==="name"?"Ad":field==="email"?"Email":"Telefon"}
            value={newCustomer[field]}
            onChange={e => setNewCustomer({ ...newCustomer, [field]: e.target.value })}
          />
        ))}
        <button className="btn btn-success" onClick={handleAddCustomer}>Ekle</button>
      </div>

      {/* ✅ Search + Export */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <input type="text" className="form-control me-2" placeholder="Ara (isim, email, telefon)"
          value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <button className="btn btn-outline-success" onClick={exportExcel}>Excel’e Aktar</button>
      </div>

      {/* ✅ Alerts */}
      <AlertMsg type="danger" message={error} />
      <AlertMsg type="success" message={success} />

      {/* ✅ Customers Table */}
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>ID</th><th>Ad</th><th>Email</th><th>Telefon</th><th>Eklenme Tarihi</th><th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map(c => (
            <tr key={c.id}>
              {["id", "name", "email", "phone", "createdAt"].map(field => (
                <td key={field}>
                  {editCustomerId === c.id && field !== "id" && field !== "createdAt"
                    ? <input className="form-control" value={editCustomer[field]} onChange={e => setEditCustomer({ ...editCustomer, [field]: e.target.value })} />
                    : field==="createdAt" ? (c.createdAt ? new Date(c.createdAt).toLocaleString() : "") : c[field]
                  }
                </td>
              ))}
              <td>
                {editCustomerId === c.id ? (
                  <>
                    <button className="btn btn-primary btn-sm me-1" onClick={() => handleUpdateCustomer(c.id)}>Kaydet</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditCustomerId(null)}>İptal</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-warning btn-sm me-1" onClick={() => { setEditCustomerId(c.id); setEditCustomer(c); }}>Düzenle</button>
                    <button className="btn btn-danger btn-sm me-1" onClick={() => handleDeleteCustomer(c.id)}>Sil</button>
                    <button className="btn btn-info btn-sm" onClick={() => { setShowReservations(c.id); setActiveTab("active"); }}>Rezervasyonlar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Reservation Modal */}
      {showReservations && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Müşteri Rezervasyonları</h5>
                <button type="button" className="btn-close" onClick={() => setShowReservations(null)}></button>
              </div>
              <div className="modal-body">
                <ul className="nav nav-tabs mb-3">
                  {["active", "past"].map(tab => (
                    <li key={tab} className="nav-item">
                      <button className={`nav-link ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                        {tab === "active" ? "Aktif Rezervasyonlar" : "Geçmiş Rezervasyonlar"}
                      </button>
                    </li>
                  ))}
                </ul>

                {(() => {
                  const customer = customers.find(c => c.id === showReservations);
                  const reservations = customer?.reservations || [];
                  const filtered = reservations.filter(r => activeTab === "active" ? r.status === "Rezerve" : r.status !== "Rezerve");
                  return (
                    <table className="table table-bordered">
                      <thead>
                        <tr><th>ID</th><th>Masa</th><th>Tarih/Saat</th><th>Durum</th>{activeTab === "active" && <th>İşlemler</th>}</tr>
                      </thead>
                      <tbody>
                        {filtered.length ? filtered.map(r => (
                          <tr key={r.id}>
                            <td>{r.id}</td><td>{r.table?.tableNumber}</td>
                            <td>{new Date(r.reservationTime).toLocaleString()}</td><td>{r.status}</td>
                            {activeTab === "active" && (
                              <td>
                                <button className="btn btn-danger btn-sm" onClick={async () => {
                                  try {
                                    await safeFetch(`${RESERVATIONS_API_URL}/${r.id}`, { method: "DELETE" });
                                    setCustomers(prev => prev.map(cust => cust.id === showReservations
                                      ? { ...cust, reservations: cust.reservations.filter(res => res.id !== r.id) }
                                      : cust
                                    ));
                                  } catch (err) { alert("Rezervasyon silinemedi: " + err.message); }
                                }}>Sil</button>
                              </td>
                            )}
                          </tr>
                        )) : <tr><td colSpan={activeTab === "active" ? 5 : 4}>Rezervasyon yok</td></tr>}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
