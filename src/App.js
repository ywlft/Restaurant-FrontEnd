import React, { useEffect, useState, useCallback, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  TABLES_API_URL,
  RESERVATIONS_API_URL,
  CUSTOMERS_API_URL,
} from "./api";

// Toast component
const Toast = ({ message, type }) => {
  if (!message) return null;
  return (
    <div
      className={`toast align-items-center text-white ${
        type === "success" ? "bg-success" : "bg-danger"
      } border-0 show position-fixed top-0 end-0 m-3`}
      role="alert"
    >
      <div className="d-flex">
        <div className="toast-body">{message}</div>
      </div>
    </div>
  );
};

function App() {
  // Yeni state'ler
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    tableId: "",
    reservationDate: "",
    reservationTime: "",
  });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sadece aktif rezervasyonlar
  const activeReservations = useMemo(() => {
    return reservations.filter(
      (r) => r.status !== "COMPLETED" && r.status !== "İptal"
    );
  }, [reservations]);

  // Güvenli fetch
  const safeFetch = useCallback(async (url, options) => {
    const res = await fetch(url, options);
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) throw new Error(text || res.statusText);
    if (contentType.includes("application/json") && text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("JSON parse hatası:", e);
        return null;
      }
    }
    return null;
  }, []);

  // Müşterileri çek
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await safeFetch(CUSTOMERS_API_URL);
        if (data) setCustomers(data);
      } catch (err) {
        console.error("Müşteriler alınamadı", err);
      }
    };
    fetchCustomers();
  }, [safeFetch]);

  const fetchTables = useCallback(async () => {
    try {
      const data = await safeFetch(TABLES_API_URL);
      if (data) setTables(data);
    } catch (err) {
      setError("Masalar alınamadı: " + err.message);
    }
  }, [safeFetch]);

  const fetchReservations = useCallback(async () => {
    try {
      const data = await safeFetch(RESERVATIONS_API_URL);
      if (data) setReservations(data);
    } catch (err) {
      setError("Rezervasyonlar alınamadı: " + err.message);
    }
  }, [safeFetch]);

  useEffect(() => {
    fetchTables();
    fetchReservations();
    setFormData((prev) => ({
      ...prev,
      reservationDate: new Date().toISOString().split("T")[0],
    }));
  }, [fetchTables, fetchReservations]);

  // Masa uygunluğu
  const isTableAvailable = useCallback(
    (tableId, time) => {
      if (!time) return true;
      const selectedTime = new Date(time).getTime();
      const from = selectedTime - 30 * 60 * 1000;
      const to = selectedTime + 30 * 60 * 1000;
      return !activeReservations.some((r) => {
        if (r.table?.id !== tableId) return false;
        const rTime = new Date(r.reservationTime).getTime();
        return rTime >= from && rTime <= to;
      });
    },
    [activeReservations]
  );

  // Masa durumu
  const tableStatus = (table) => {
    if (!formData.reservationDate) return "Boş";
    const dayReservations = activeReservations.filter(
      (r) =>
        r.table?.id === table.id &&
        r.reservationTime.startsWith(formData.reservationDate)
    );
    if (dayReservations.length === 0) return "Boş";
    const totalSlots = 30 * 29;
    if (dayReservations.length >= totalSlots) return "Dolu";
    return "Kısmen Dolu";
  };

  const getMinDate = () => new Date().toISOString().split("T")[0];
  const getMaxDate = () =>
    new Date(new Date().setMonth(new Date().getMonth() + 3))
      .toISOString()
      .split("T")[0];

  const generateTimeOptions = () => {
    const options = [];
    if (!formData.reservationDate) return options;
    for (let h = 9; h <= 23; h++) {
      ["00", "30"].forEach((m) => {
        const val = `${formData.reservationDate}T${h
          .toString()
          .padStart(2, "0")}:${m}`;
        options.push(
          <option key={val} value={val}>
            {h.toString().padStart(2, "0")}:{m}
          </option>
        );
      });
    }
    return options;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  // Telefon değişimi ve eski müşteri kontrolü
const handlePhoneChange = async (e) => {
  const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
  setFormData((prev) => ({ ...prev, phone }));

  if (phone.length === 10) {
    try {
      // Backend'deki telefon sorgulama endpoint'ini kullanıyoruz
      const res = await safeFetch(`${CUSTOMERS_API_URL}?phone=${phone}`);
      if (res && res.length > 0) {
        const customer = res[0];
        // Maskeli isim: ilk harf + kalan harfler yıldız
        const maskedName =
          customer.name.charAt(0) +
          "*".repeat(Math.max(customer.name.length - 1, 4));

        setFormData((prev) => ({ ...prev, name: maskedName }));
        setIsNameLocked(true);
      } else {
        // Müşteri yoksa formu temizle
        setFormData((prev) => ({ ...prev, name: "" }));
        setIsNameLocked(false);
      }
    } catch (err) {
      console.error(err);
      setFormData((prev) => ({ ...prev, name: "" }));
      setIsNameLocked(false);
    }
  } else {
    // Telefon eksikse formu temizle
    setFormData((prev) => ({ ...prev, name: "" }));
    setIsNameLocked(false);
  }
};

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    const { name, phone, email, tableId, reservationTime } = formData;

    if (!name || !phone || !tableId || !reservationTime) {
      setError("İsim, Telefon, Masa ve Tarih zorunludur");
      return;
    }

    const now = new Date();
    if (new Date(reservationTime) < now) {
      setError("Geçmiş tarihler seçilemez");
      return;
    }

    if (!isTableAvailable(Number(tableId), reservationTime)) {
      setError(
        "Seçilen masa için 30dk öncesi ve sonrası arasında başka bir rezervasyon mevcut!"
      );
      return;
    }

    try {
      // Eğer eski müşteri değilse oluştur
      let customerId = null;
      if (!isNameLocked) {
        const customer = await safeFetch(CUSTOMERS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            email,
            createdAt: new Date().toISOString(),
          }),
        });
        if (!customer?.id) {
          setError("Müşteri oluşturulamadı.");
          return;
        }
        customerId = customer.id;
      } else {
        // isNameLocked = true → telefon bazlı customer al
        const existingCustomer = await safeFetch(
          `${CUSTOMERS_API_URL}?phone=${phone}`
        );
        if (!existingCustomer || existingCustomer.length === 0) {
          setError("Müşteri bulunamadı");
          return;
        }
        customerId = existingCustomer[0].id;
      }

      await safeFetch(RESERVATIONS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { id: customerId },
          table: { id: Number(tableId) },
          reservationTime,
          status: "Rezerve",
        }),
      });

      setFormData({
        name: "",
        phone: "",
        email: "",
        tableId: "",
        reservationDate: getMinDate(),
        reservationTime: "",
      });
      setIsNameLocked(false);

      fetchReservations();
      showSuccess("Rezervasyon başarıyla oluşturuldu ✅");
    } catch (err) {
      setError("Hata: " + err.message);
    }
  };

  const availableTables = useMemo(() => {
    return tables.map((t) => ({
      ...t,
      available:
        formData.reservationTime &&
        isTableAvailable(t.id, formData.reservationTime),
    }));
  }, [tables, formData.reservationTime, isTableAvailable]);

  return (
    <div className="container my-4">
      <h2 className="mb-3 text-center">✨ Restoran Rezervasyon Sistemi ✨</h2>

      <Toast message={error || successMsg} type={error ? "error" : "success"} />

      {/* Masa Listesi */}
      <div className="row">
        {tables.map((t) => {
          const dayReservations = activeReservations.filter(
            (r) =>
              r.table?.id === t.id &&
              r.reservationTime.startsWith(formData.reservationDate)
          );
          const status = tableStatus(t);
          const isSelected = formData.tableId === t.id.toString();
          return (
            <div key={t.id} className="col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
              <div
                className={`card shadow-sm border-${
                  status === "Dolu"
                    ? "danger"
                    : status === "Kısmen Dolu"
                    ? "warning"
                    : "success"
                } ${isSelected ? "border-3" : ""}`}
              >
                <div className="card-body text-center p-2">
                  <h6 className="card-title mb-1">Masa {t.tableNumber}</h6>
                  <p className="mb-1 small">Kapasite: {t.capacity} kişi</p>
                  <p className="mb-1 small">
                    Durum:{" "}
                    <span
                      className={`badge ${
                        status === "Dolu"
                          ? "bg-danger"
                          : status === "Kısmen Dolu"
                          ? "bg-warning text-dark"
                          : "bg-success"
                      }`}
                    >
                      {status}
                    </span>
                  </p>

                  {dayReservations.length > 0 && (
                    <div className="mb-1">
                      <strong className="small">Rezervasyon Saatleri:</strong>
                      <div className="d-flex flex-wrap justify-content-center mt-1">
                        {dayReservations.map((r) => (
                          <span
                            key={r.id}
                            className="badge bg-primary me-1 mb-1"
                          >
                            {new Date(r.reservationTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            -{" "}
                            {r.customer?.name
                              ? r.customer.name.charAt(0) +
                                "*".repeat(
                                  Math.max(r.customer.name.length - 1, 4)
                                )
                              : "Misafir"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {status !== "Dolu" && (
                    <button
                      className={`btn ${
                        isSelected ? "btn-success" : "btn-outline-success"
                      } btn-sm mt-2`}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, tableId: t.id.toString() })
                      }
                      disabled={!formData.reservationTime}
                    >
                      {isSelected ? "Seçildi" : "Bu Masayı Seç"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <hr />

      {/* Rezervasyon Formu */}
      <h4 className="mb-3">Rezervasyon Formu</h4>
        <p className="text-muted small mb-3">
    Daha önce rezervasyon yaptıysanız, sadece telefon numaranızı girmeniz yeterlidir.
  </p>
      <form className="mb-3 d-flex flex-wrap" onSubmit={handleSubmit}>
       <input
  type="text"
  placeholder="İsim"
  value={formData.name}
  readOnly={isNameLocked}
  className="form-control me-2 mb-2"
  onChange={(e) => {
    if (!isNameLocked)
      setFormData({ ...formData, name: e.target.value });
  }}
/>
        <input
          type="tel"
          id="phone"
          placeholder="(5xx) xxx xx xx"
          value={formData.phone}
          onChange={handlePhoneChange}
          className="form-control me-2 mb-2"
          minLength={10}
          maxLength={10}
        />
        <input
          type="email"
          className="form-control me-2 mb-2"
          placeholder="E-Posta (opsiyonel)"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          type="date"
          className="form-control me-2 mb-2"
          style={{ minWidth: 160 }}
          value={formData.reservationDate || getMinDate()}
          onChange={(e) =>
            setFormData({
              ...formData,
              reservationDate: e.target.value,
              reservationTime: "",
              tableId: "",
            })
          }
          min={getMinDate()}
          max={getMaxDate()}
        />
        <select
          className="form-select me-2 mb-2"
          style={{ minWidth: 160 }}
          value={formData.reservationTime}
          onChange={(e) =>
            setFormData({
              ...formData,
              reservationTime: e.target.value,
              tableId: "",
            })
          }
          disabled={!formData.reservationDate}
        >
          <option value="">Saat Seç</option>
          {generateTimeOptions()}
        </select>
        <select
          className="form-select me-2 mb-2"
          style={{ minWidth: 160 }}
          value={formData.tableId}
          onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
          disabled={!formData.reservationDate || !formData.reservationTime}
        >
          <option value="">Masa Seç</option>
          {availableTables.map((t) => (
            <option key={t.id} value={t.id} disabled={!t.available}>
              Masa {t.tableNumber} - {t.capacity} kişi{" "}
              {t.available ? "" : "(Dolmuş)"}
            </option>
          ))}
        </select>
        <button className="btn btn-success mb-2" type="submit">
          Rezervasyon Yap
        </button>
      </form>
    </div>
  );
}

export default App;
