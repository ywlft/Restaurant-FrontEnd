import React, { useEffect, useState, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link, useNavigate } from "react-router-dom";
import { TABLES_API_URL, RESERVATIONS_API_URL } from "./api";

/** Reusable Modal Component for Add/Edit/Delete */
function ModalComponent({ type, data, onClose, onSubmit, formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const title = type === "add" ? "Yeni Masa Ekle" : type === "edit" ? "Masa Düzenle" : "Masa Silme Onayı";

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {(type === "add" || type === "edit") && (
              <>
                <input type="text" className="form-control mb-2" name="tableNumber" value={formData.tableNumber} onChange={handleChange} placeholder="Masa Numarası"/>
                <input type="number" className="form-control mb-2" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Kapasite"/>
                <div className="form-check mb-2">
                  <input type="checkbox" className="form-check-input" id="emptyCheck" name="empty" checked={formData.empty} onChange={handleChange}/>
                  <label className="form-check-label" htmlFor="emptyCheck">Boş</label>
                </div>
              </>
            )}
            {type === "delete" && <p>Masa <strong>{data.tableNumber}</strong> silinecek. Emin misiniz?</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>İptal</button>
            {(type === "add" || type === "edit") && <button className={`btn btn-${type === "add" ? "success" : "primary"}`} onClick={onSubmit}>{type === "add" ? "Ekle" : "Kaydet"}</button>}
            {type === "delete" && <button className="btn btn-danger" onClick={onSubmit}>Sil</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Component for showing reservation badges */
function ReservationBadges({ reservations }) {
  const getColor = (r) => {
    if (r.status === "İptal") return "bg-danger text-light";
    if (r.status === "COMPLETED") return "bg-success text-light";
    return "bg-primary text-light";
  };
  return reservations.map((r) => (
    <span key={r.id} className={`badge me-1 mb-1 ${getColor(r)}`} title={`${r.customer?.name || "Anonim"} - ${r.reservationTime?.replace("T"," ")}`}>
      {r.reservationTime?.slice(11,16)} {r.customer?.name || "Anonim"}
    </span>
  ));
}

/** Main Table Page */
export default function TablePage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState({ status: "all", sort: "number", tab: "all", date: "" });
  const [modal, setModal] = useState({ type: null, data: null });
  const [formData, setFormData] = useState({ tableNumber: "", capacity: "", empty: true });

  /** Safe fetch function */
  const safeFetch = async (url, options) => {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    return text && res.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null;
  };

  /** Load tables and reservations */
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tablesData, reservationsData] = await Promise.all([
        safeFetch(TABLES_API_URL),
        safeFetch(RESERVATIONS_API_URL),
      ]);
      setTables(tablesData || []);
      setReservations(reservationsData || []);
    } catch (err) {
      setError("Veriler yüklenemedi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  /** Logout */
  const handleLogout = () => navigate("/");

  /** CRUD Handlers */
  const handleModalSubmit = async () => {
    try {
      if (modal.type === "add") {
        if (!formData.tableNumber || !formData.capacity) { setError("Lütfen tüm alanları doldurun."); return; }
        await safeFetch(TABLES_API_URL, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(formData) });
      } else if (modal.type === "edit") {
        await safeFetch(`${TABLES_API_URL}/${modal.data.id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(formData) });
      } else if (modal.type === "delete") {
        await safeFetch(`${TABLES_API_URL}/${modal.data.id}`, { method: "DELETE" });
      }
      setModal({ type: null, data: null });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  /** Filtered & Sorted tables */
  const filteredTables = useMemo(() => {
    return tables
      .filter(t => filter.status === "all" || (filter.status === "empty" ? t.empty : !t.empty))
      .sort((a, b) => filter.sort === "number" ? a.tableNumber - b.tableNumber : b.capacity - a.capacity);
  }, [tables, filter]);

  /** Filter reservations for table */
  const getFilteredReservations = (tableId) => {
    const now = new Date();
    return reservations.filter(r => r.table?.id === tableId && (() => {
      const rTime = r.reservationTime ? new Date(r.reservationTime) : null;
      if (filter.tab === "upcoming" && rTime <= now) return false;
      if (filter.tab === "past" && rTime >= now) return false;
      if (filter.tab === "active" && (!rTime || rTime > now || ["COMPLETED","İptal"].includes(r.status))) return false;
      if (filter.date && rTime) { const d = new Date(filter.date); if (rTime.toDateString() !== d.toDateString()) return false; }
      return true;
    })());
  };

  return (
    <div className="container my-4">
      {/* Navbar */}
      <nav className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <Link to="/reservations" className="btn btn-outline-primary me-2">Rezervasyonlar</Link>
          <Link to="/customer" className="btn btn-outline-primary me-2">Müşteriler</Link>
          <Link to="/table" className="btn btn-outline-secondary me-2">Masalar</Link>
          <button className="btn btn-danger" onClick={handleLogout}>Çıkış</button>
        </div>
      </nav>

      <h2 className="mb-3">Masalar & Rezervasyonlar</h2>

      {/* Filter */}
      <div className="row mb-3 g-2">
        <div className="col-md-2">
          <select className="form-select" value={filter.status} onChange={(e) => setFilter({...filter, status:e.target.value})}>
            <option value="all">Tümü</option>
            <option value="empty">Boş</option>
            <option value="full">Dolu</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={filter.sort} onChange={(e) => setFilter({...filter, sort:e.target.value})}>
            <option value="number">Masa Numarası</option>
            <option value="capacity">Kapasite (yüksek → düşük)</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={filter.tab} onChange={(e) => setFilter({...filter, tab:e.target.value})}>
            <option value="all">Tümü</option>
            <option value="upcoming">Yaklaşan</option>
            <option value="past">Geçmiş</option>
            <option value="active">Aktif</option>
          </select>
        </div>
        <div className="col-md-2">
          <input type="date" className="form-control" value={filter.date} onChange={(e) => setFilter({...filter, date:e.target.value})}/>
        </div>
        <div className="col-md-2">
          <button className="btn btn-success" onClick={() => { setFormData({tableNumber:"",capacity:"",empty:true}); setModal({type:"add",data:null}); }}>Yeni Masa Ekle</button>
        </div>
      </div>

      {/* Table List */}
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Kapasite</th>
              <th>Durum</th>
              <th>Rezervasyonlar</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {filteredTables.map(t => (
              <tr key={t.id} className={t.empty?"table-success":"table-danger"}>
                <td>Masa {t.tableNumber}</td>
                <td>{t.capacity} kişi</td>
                <td>{t.empty?"Boş":"Dolu"}</td>
                <td>
                  {getFilteredReservations(t.id).length ? <ReservationBadges reservations={getFilteredReservations(t.id)} /> : <span className="text-muted">Rezervasyon yok</span>}
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-dark me-1" onClick={() => { setFormData({...t}); setModal({type:"edit",data:t}); }}>Düzenle</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setModal({type:"delete",data:t})}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.type && <ModalComponent type={modal.type} data={modal.data} onClose={()=>setModal({type:null,data:null})} onSubmit={handleModalSubmit} formData={formData} setFormData={setFormData} />}

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {loading && <div className="alert alert-info mt-3">Yükleniyor...</div>}
    </div>
  );
}
