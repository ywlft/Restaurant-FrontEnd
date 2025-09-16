import React, { useEffect, useState, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  TABLES_API_URL,
  RESERVATIONS_API_URL,
  CUSTOMERS_API_URL,
} from "./api";
import { Link,useNavigate } from "react-router-dom";


/**
 * ReservationManager
 * - Tablo görünümü, filtreleme, arama, sıralama, pagination
 * - Modal ile add/edit
 * - Bulk delete, CSV export
 *
 * Not: backend'de zaten conflict kontrolü var (500 dönüyor). Burada client-side
 * ön kontrol yapılır; yine de backend hatalarını kullanıcıya gösteriyoruz.
 */
export default function ReservationManager() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Filters & UI state
  const [search, setSearch] = useState("");
  const [filterTableId, setFilterTableId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState(""); // yyyy-mm-dd
  const [tab, setTab] = useState("upcoming"); // upcoming | past | all

  // Table UI
  const [sortBy, setSortBy] = useState("reservationTime");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Selection + modal
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // reservation object or null
  const [form, setForm] = useState({
    id: null,
    customerId: "",
    tableId: "",
    reservationTime: "",
    status: "Rezerve",
  });

  // Safe fetch helper (parses body if present)
  async function safeFetch(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      // try to parse JSON error
      try {
        const parsed = text ? JSON.parse(text) : null;
        const msg = parsed?.message || parsed?.error || text || res.statusText;
        throw new Error(msg);
      } catch (e) {
        throw new Error(text || res.statusText);
      }
    }
    if (contentType.includes("application/json") && text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return null;
  }

  // Load data
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [c, t, r] = await Promise.all([
        safeFetch(CUSTOMERS_API_URL).catch(() => []),
        safeFetch(TABLES_API_URL).catch(() => []),
        safeFetch(RESERVATIONS_API_URL).catch(() => []),
      ]);
      setCustomers(Array.isArray(c) ? c : []);
      setTables(Array.isArray(t) ? t : []);
      setReservations(Array.isArray(r) ? r : []);
    } catch (e) {
      setError("Veri yüklenirken hata: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Utilities -----
  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const showInfo = (msg) => {
    setInfo(msg);
    setTimeout(() => setInfo(""), 3000);
  };

  // check conflict on client side: 1 hour before/after (inclusive)
  const hasConflict = (tableId, candidateISO, ignoreReservationId = null) => {
    if (!candidateISO) return false;
    const candidate = new Date(candidateISO).getTime();
    const from = candidate - 60 * 60 * 1000; // 1 hour before
    const to = candidate + 60 * 60 * 1000; // 1 hour after
    return reservations.some((r) => {
      if (!r || !r.reservationTime) return false;
      if (ignoreReservationId && r.id === ignoreReservationId) return false;
      if (Number(r.table?.id) !== Number(tableId)) return false;
      const t = new Date(r.reservationTime).getTime();
      return t >= from && t <= to;
    });
  };

  // format datetime for display
  const fmt = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso.replace("T", " ");
    }
  };

  // ----- Filters, search, sort, pagination -----
  const filtered = useMemo(() => {
    const now = new Date();
    return reservations
      .filter((r) => {
        // tab: upcoming / past / all
        if (tab === "upcoming" && r.reservationTime && new Date(r.reservationTime) < now) return false;
        if (tab === "past" && r.reservationTime && new Date(r.reservationTime) >= now) return false;
         if (tab === "active") {
        // Zamanı geçmiş ve durumu COMPLETED veya İptal olmayanları göster
        if (!r.reservationTime || new Date(r.reservationTime) >= now) return false;
        if (r.status === "COMPLETED" || r.status === "İptal") return false;
      }  
        return true;
      })
      .filter((r) => {
        if (filterTableId && String(r.table?.id) !== String(filterTableId)) return false;
        if (filterStatus && String(r.status) !== String(filterStatus)) return false;
        if (filterDate) {
          if (!r.reservationTime) return false;
          // compare dates only
          if (!r.reservationTime.startsWith(filterDate)) return false;
        }
        if (search) {
          const s = search.toLowerCase();
          const customerName = String(r.customer?.name || "").toLowerCase();
          const tableNumber = String(r.table?.tableNumber || "").toLowerCase();
          const status = String(r.status || "").toLowerCase();
          const time = String(r.reservationTime || "").toLowerCase();
          return (
            customerName.includes(s) ||
            tableNumber.includes(s) ||
            status.includes(s) ||
            time.includes(s)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const A = a[sortBy];
        const B = b[sortBy];
        // special handling for nested fields
        if (sortBy === "customer") {
          const an = a.customer?.name || "";
          const bn = b.customer?.name || "";
          return an.localeCompare(bn) * dir;
        }
        if (sortBy === "table") {
          const at = a.table?.tableNumber || 0;
          const bt = b.table?.tableNumber || 0;
          return (at - bt) * dir;
        }
        if (sortBy === "reservationTime") {
          const at = a.reservationTime ? new Date(a.reservationTime).getTime() : 0;
          const bt = b.reservationTime ? new Date(b.reservationTime).getTime() : 0;
          return (at - bt) * dir;
        }
        if (typeof A === "string") return A.localeCompare(B) * dir;
        return (A || 0) - (B || 0);
      });
  }, [reservations, tab, filterTableId, filterStatus, filterDate, search, sortBy, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  // ----- Selection helpers -----
  const toggleSelect = (id) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelectedIds(s);
  };
  const selectAllOnPage = () => {
    const s = new Set(selectedIds);
    pageData.forEach((r) => s.add(r.id));
    setSelectedIds(s);
  };
  const unselectAllOnPage = () => {
    const s = new Set(selectedIds);
    pageData.forEach((r) => s.delete(r.id));
    setSelectedIds(s);
  };

  // ----- CRUD actions -----
  const openNewModal = () => {
    setEditing(null);
    setForm({
      id: null,
      customerId: "",
      tableId: "",
      reservationTime: "",
      status: "Rezerve",
    });
    setModalOpen(true);
    resetMessages();
  };

  const openEditModal = (r) => {
    setEditing(r);
    setForm({
      id: r.id,
      customerId: r.customer?.id || "",
      tableId: r.table?.id || "",
      reservationTime: r.reservationTime || "",
      status: r.status || "Rezerve",
    });
    setModalOpen(true);
    resetMessages();
  };

  const handleSave = async () => {
    resetMessages();
    // basic validation
    if (!form.customerId || !form.tableId || !form.reservationTime) {
      setError("Lütfen müşteri, masa ve tarih/saat seçin.");
      return;
    }
    // no past
    if (new Date(form.reservationTime) < new Date()) {
      setError("Geçmiş tarihlere izin yok.");
      return;
    }
    // local conflict check
    if (hasConflict(form.tableId, form.reservationTime, form.id)) {
      setError("Bu masa için seçilen aralıkta başka bir rezervasyon mevcut.");
      return;
    }

    try {
      const payload = {
        customer: { id: Number(form.customerId) },
        table: { id: Number(form.tableId) },
        reservationTime: form.reservationTime,
        status: form.status,
      };

      if (form.id) {
        // update
        await safeFetch(`${RESERVATIONS_API_URL}/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: form.id }),
        });
        showInfo("Rezervasyon güncellendi");
      } else {
        // create
        await safeFetch(RESERVATIONS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showInfo("Rezervasyon oluşturuldu");
      }

      setModalOpen(false);
      await loadAll();
    } catch (e) {
      // backend returns detailed error JSON sometimes
      setError("Sunucu hatası: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) return;
    try {
      await safeFetch(`${RESERVATIONS_API_URL}/${id}`, { method: "DELETE" });
      showInfo("Rezervasyon silindi");
      await loadAll();
      // remove from selection if present
      const s = new Set(selectedIds);
      s.delete(id);
      setSelectedIds(s);
    } catch (e) {
      setError("Silme hatası: " + e.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      setError("Önce seçim yapın.");
      return;
    }
    if (!window.confirm(`${selectedIds.size} rezervasyonu silmek istiyor musunuz?`)) return;
    try {
      // delete sequentially to keep things simple
      for (const id of Array.from(selectedIds)) {
        await safeFetch(`${RESERVATIONS_API_URL}/${id}`, { method: "DELETE" });
      }
      showInfo("Seçili rezervasyonlar silindi");
      setSelectedIds(new Set());
      await loadAll();
    } catch (e) {
      setError("Toplu silme hatası: " + e.message);
    }
  };

  // CSV export
  const exportCSV = () => {
    const headers = ["id", "customer", "tableNumber", "reservationTime", "status"];
    const rows = filtered.map((r) => [
      r.id,
      r.customer?.name || r.customer?.id || "",
      r.table?.tableNumber || "",
      r.reservationTime || "",
      r.status || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // UI helpers
  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };
const handleLogout = () => navigate("/");
  return (
    
    <div className="container my-4">
         {/* 👇 Buraya geçiş butonlarını ekledim */}
      <div className="mb-3">
        <Link to="/reservations" className="btn btn-outline-secondary me-2">Rezervasyonlar</Link>
        <Link to="/customer" className="btn btn-outline-primary me-2">Müşteriler</Link>
        <Link to="/table" className="btn btn-outline-primary me-2">Masalar</Link>
        <button className="btn btn-danger" onClick={handleLogout}>Çıkış</button>
      </div>
       
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Rezervasyon Yönetimi</h3>
        <div>
          <button className="btn btn-primary me-2" onClick={openNewModal}>Yeni Rezervasyon</button>
          <button className="btn btn-outline-secondary me-2" onClick={exportCSV}>CSV Dışa Aktar</button>
          <button className="btn btn-outline-danger" onClick={handleBulkDelete}>Seçiliyi Sil</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      {/* Filters */}
      <div className="card mb-3 p-3">
        <div className="row g-2">
          <div className="col-md-3">
            <input className="form-control" placeholder="Ara (müşteri, masa, durum...)" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="col-md-2">
            <select className="form-select" value={filterTableId} onChange={(e) => { setFilterTableId(e.target.value); setPage(1); }}>
              <option value="">Tüm Masalar</option>
              {tables.map((t) => <option key={t.id} value={t.id}>Masa {t.tableNumber} - {t.capacity}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">Tüm Durumlar</option>
              <option>Rezerve</option>
              <option>İptal</option>
              <option>COMPLETED</option>
            </select>
          </div>
          <div className="col-md-2">
            <input type="date" className="form-control" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(1); }} />
          </div>
          <div className="col-md-3 d-flex align-items-center">
            <div className="btn-group me-2">
                <button className={`btn btn-sm ${tab === "active" ? "btn-outline-primary active" : "btn-outline-secondary"}`} onClick={() => setTab("active")}>Aktif</button>
              <button className={`btn btn-sm ${tab === "upcoming" ? "btn-outline-primary active" : "btn-outline-secondary"}`} onClick={() => setTab("upcoming")}>Yaklaşan</button>
              <button className={`btn btn-sm ${tab === "past" ? "btn-outline-primary active" : "btn-outline-secondary"}`} onClick={() => setTab("past")}>Geçmiş</button>
              <button className={`btn btn-sm ${tab === "all" ? "btn-outline-primary active" : "btn-outline-secondary"}`} onClick={() => setTab("all")}>Tümü</button>
            </div>
            <small className="text-muted">Sonuç: <strong>{total}</strong></small>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive mb-3">
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr>
              <th style={{width: 40}}>
                <input type="checkbox" checked={pageData.every(r => selectedIds.has(r.id)) && pageData.length>0}
                  onChange={(e) => e.target.checked ? selectAllOnPage() : unselectAllOnPage()} />
              </th>
              <th onClick={() => toggleSort("id")} style={{cursor: "pointer"}}>ID {sortBy==="id" ? (sortDir==="asc"?"↑":"↓") : ""}</th>
              <th onClick={() => toggleSort("customer")} style={{cursor: "pointer"}}>Müşteri {sortBy==="customer" ? (sortDir==="asc"?"↑":"↓") : ""}</th>
              <th onClick={() => toggleSort("table")} style={{cursor: "pointer"}}>Masa {sortBy==="table" ? (sortDir==="asc"?"↑":"↓") : ""}</th>
              <th onClick={() => toggleSort("reservationTime")} style={{cursor: "pointer"}}>Tarih {sortBy==="reservationTime" ? (sortDir==="asc"?"↑":"↓") : ""}</th>
              <th>Durum</th>
              <th style={{width: 160}}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted">Gösterilecek rezervasyon yok</td></tr>
            )}
            {pageData.map((r) => (
              <tr key={r.id} className={selectedIds.has(r.id) ? "table-active" : ""}>
                <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                <td>{r.id}</td>
                <td>{r.customer?.name || r.customer?.id}</td>
                <td>Masa {r.table?.tableNumber || r.table?.id} ({r.table?.capacity ?? "-"})</td>
                <td>{r.reservationTime ? r.reservationTime.replace("T", " ") : "-"}</td>
                <td><span className={`badge ${r.status === "Rezerve" ? "bg-primary" : r.status === "İptal" ? "bg-secondary" : "bg-success"}`}>{r.status}</span></td>
                <td>
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEditModal(r)}>Düzenle</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.id)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <select className="form-select form-select-sm" style={{width: 110, display: "inline-block"}} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
            {[5,10,20,50].map(n => <option key={n} value={n}>{n} / sayfa</option>)}
          </select>
        </div>
        <div>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page<=1 ? "disabled":""}`}>
                <button className="page-link" onClick={()=>setPage(p=>Math.max(1,p-1))}>&laquo;</button>
              </li>
              {Array.from({length: totalPages}).map((_,i)=> {
                const num=i+1;
                // show few pages in control
                if (totalPages>9 && Math.abs(num-page)>4 && num!==1 && num!==totalPages) {
                  if (num===2 || num===totalPages-1) return <li key={num} className="page-item disabled"><span className="page-link">...</span></li>;
                  return null;
                }
                return (
                  <li key={num} className={`page-item ${num===page?"active":""}`}>
                    <button className="page-link" onClick={()=>setPage(num)}>{num}</button>
                  </li>
                );
              })}
              <li className={`page-item ${page>=totalPages ? "disabled":""}`}>
                <button className="page-link" onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>&raquo;</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Modal (simple Bootstrap-like) */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{backgroundColor: "rgba(0,0,0,0.4)"}}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? "Rezervasyon Düzenle" : "Yeni Rezervasyon"}</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Müşteri</label>
                    <select className="form-select" value={form.customerId} onChange={(e)=>setForm({...form, customerId:e.target.value})}>
                      <option value="">Seçiniz</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone?`(${c.phone})`:''}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Masa</label>
                    <select className="form-select" value={form.tableId} onChange={(e)=>setForm({...form, tableId:e.target.value})}>
                      <option value="">Seçiniz</option>
                      {tables.map(t => <option key={t.id} value={t.id}>Masa {t.tableNumber} - {t.capacity} kişi</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Tarih & Saat</label>
                    <input type="datetime-local" className="form-control" min={new Date().toISOString().slice(0,16)}
                      value={form.reservationTime || ""} onChange={(e)=>setForm({...form, reservationTime:e.target.value})} />
                    <div className="form-text">Geçmiş tarihlere izin yok. Backend de benzer kontrol yapar.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Durum</label>
                    <select className="form-select" value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})}>
                      <option>Rezerve</option>
                      <option>İptal</option>
                      <option>COMPLETED</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setModalOpen(false)}>İptal</button>
                <button className="btn btn-primary" onClick={handleSave}>{editing ? "Güncelle" : "Kaydet"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
